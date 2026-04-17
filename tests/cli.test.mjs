import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const rootDir = process.cwd()
const cliPath = path.join(rootDir, 'dist', 'index.js')

function stripAnsi(output) {
  return output.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
}

function createSandbox() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'command-recorder-test-'))
  const cwd = path.join(tempRoot, 'project')
  const appDataDir = path.join(tempRoot, 'appdata')

  fs.mkdirSync(cwd, { recursive: true })
  fs.mkdirSync(appDataDir, { recursive: true })

  return {
    cwd,
    appDataDir,
    cleanup: () => {
      fs.rmSync(tempRoot, { recursive: true, force: true })
    }
  }
}

function runCli(args, sandbox, options = {}) {
  const cwd = options.cwd || sandbox.cwd
  const extraEnv = options.env || {}
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd,
    env: {
      ...process.env,
      APPDATA: sandbox.appDataDir,
      ...extraEnv
    },
    encoding: 'utf8',
    input: options.input
  })

  return {
    status: result.status ?? 0,
    stdout: stripAnsi(result.stdout || ''),
    stderr: stripAnsi(result.stderr || '')
  }
}

test('records command and reads current command', () => {
  const sandbox = createSandbox()
  try {
    const recordResult = runCli(['-c', 'echo alpha', '-i', 'false'], sandbox)
    assert.equal(recordResult.status, 0)
    assert.match(recordResult.stdout, /Recorded command "echo alpha"/)

    const currentResult = runCli(['--current'], sandbox)
    assert.equal(currentResult.status, 0)
    assert.match(currentResult.stdout, /echo alpha/)
  } finally {
    sandbox.cleanup()
  }
})

test('shows history with limit from newest to oldest', () => {
  const sandbox = createSandbox()
  try {
    assert.equal(runCli(['-c', 'echo first', '-i', 'false'], sandbox).status, 0)
    assert.equal(runCli(['-c', 'echo second', '-i', 'false'], sandbox).status, 0)

    const historyResult = runCli(['--history', '1'], sandbox)
    assert.equal(historyResult.status, 0)
    assert.match(historyResult.stdout, /echo second/)
    assert.doesNotMatch(historyResult.stdout, /echo first/)
  } finally {
    sandbox.cleanup()
  }
})

test('supports alias save, list, and run', () => {
  const sandbox = createSandbox()
  try {
    const aliasResult = runCli(['--alias', 'dev', '-c', 'echo aliased', '-i', 'false'], sandbox)
    assert.equal(aliasResult.status, 0)
    assert.match(aliasResult.stdout, /Saved alias "dev" => "echo aliased"/)

    const aliasesResult = runCli(['--aliases'], sandbox)
    assert.equal(aliasesResult.status, 0)
    assert.match(aliasesResult.stdout, /dev => echo aliased/)

    const runResult = runCli(['--run', 'dev', '-i', 'false'], sandbox)
    assert.equal(runResult.status, 0)
    assert.match(runResult.stdout, /Running alias "dev" => "echo aliased"/)
  } finally {
    sandbox.cleanup()
  }
})

test('removes current record with --remove current', () => {
  const sandbox = createSandbox()
  try {
    assert.equal(runCli(['-c', 'echo to-remove', '-i', 'false'], sandbox).status, 0)

    const removeResult = runCli(['--remove', 'current'], sandbox)
    assert.equal(removeResult.status, 0)
    assert.match(removeResult.stdout, /Removed command for directory:/)

    const currentResult = runCli(['--current'], sandbox)
    assert.equal(currentResult.status, 0)
    assert.match(currentResult.stdout, /No command recorded for current directory/)
  } finally {
    sandbox.cleanup()
  }
})

test('returns error for invalid history value', () => {
  const sandbox = createSandbox()
  try {
    const invalidResult = runCli(['--history', 'abc'], sandbox)
    assert.equal(invalidResult.status, 1)
    assert.match(`${invalidResult.stdout}${invalidResult.stderr}`, /Invalid value for --history/)
  } finally {
    sandbox.cleanup()
  }
})

test('shows version with -v and rejects legacy -V', () => {
  const sandbox = createSandbox()
  try {
    const versionResult = runCli(['-v'], sandbox)
    assert.equal(versionResult.status, 0)
    assert.match(versionResult.stdout, /^\d+\.\d+\.\d+/)

    const legacyVersionResult = runCli(['-V'], sandbox)
    assert.equal(legacyVersionResult.status, 1)
    assert.match(`${legacyVersionResult.stdout}${legacyVersionResult.stderr}`, /unknown option '-V'/)
  } finally {
    sandbox.cleanup()
  }
})

test('lists records with --list and handles empty list', () => {
  const sandbox = createSandbox()
  try {
    const emptyListResult = runCli(['--list'], sandbox)
    assert.equal(emptyListResult.status, 0)
    assert.match(emptyListResult.stdout, /No recorded commands yet/)

    const otherDir = path.join(path.dirname(sandbox.cwd), 'another-project')
    fs.mkdirSync(otherDir, { recursive: true })

    assert.equal(runCli(['-c', 'echo main', '-i', 'false'], sandbox).status, 0)
    assert.equal(runCli(['-c', 'echo other', '-i', 'false'], sandbox, { cwd: otherDir }).status, 0)

    const listResult = runCli(['--list'], sandbox)
    assert.equal(listResult.status, 0)
    assert.match(listResult.stdout, /echo main/)
    assert.match(listResult.stdout, /echo other/)
    assert.match(listResult.stdout, /✅/)
  } finally {
    sandbox.cleanup()
  }
})

test('returns errors for invalid remove and alias usage', () => {
  const sandbox = createSandbox()
  try {
    const removeWithoutValueResult = runCli(['--remove'], sandbox)
    assert.equal(removeWithoutValueResult.status, 1)
    assert.match(`${removeWithoutValueResult.stdout}${removeWithoutValueResult.stderr}`, /Directory must be specified/)

    const aliasWithoutCommandResult = runCli(['--alias', 'dev'], sandbox)
    assert.equal(aliasWithoutCommandResult.status, 1)
    assert.match(`${aliasWithoutCommandResult.stdout}${aliasWithoutCommandResult.stderr}`, /Alias requires --command/)
  } finally {
    sandbox.cleanup()
  }
})

test('handles missing alias and prints available aliases', () => {
  const sandbox = createSandbox()
  try {
    assert.equal(runCli(['--alias', 'dev', '-c', 'echo dev', '-i', 'false'], sandbox).status, 0)

    const missingAliasResult = runCli(['--run', 'build'], sandbox)
    assert.equal(missingAliasResult.status, 1)
    assert.match(`${missingAliasResult.stdout}${missingAliasResult.stderr}`, /Alias "build" not found/)
    assert.match(`${missingAliasResult.stdout}${missingAliasResult.stderr}`, /Available aliases:/)
    assert.match(`${missingAliasResult.stdout}${missingAliasResult.stderr}`, /dev => echo dev/)
  } finally {
    sandbox.cleanup()
  }
})

test('executes command immediately by default and can skip with -i false', () => {
  const sandbox = createSandbox()
  try {
    const executeNowResult = runCli(['-c', 'echo immediate'], sandbox)
    assert.equal(executeNowResult.status, 0)
    assert.match(executeNowResult.stdout, /Executing\.\.\./)
    assert.match(executeNowResult.stdout, /immediate/)

    const skipExecuteResult = runCli(['-c', 'echo delayed', '-i', 'false'], sandbox)
    assert.equal(skipExecuteResult.status, 0)
    assert.doesNotMatch(skipExecuteResult.stdout, /Executing\.\.\./)
    assert.doesNotMatch(skipExecuteResult.stdout, /(^|\n)delayed(\n|$)/)
  } finally {
    sandbox.cleanup()
  }
})

test('runs last command when no args are provided', () => {
  const sandbox = createSandbox()
  try {
    assert.equal(runCli(['-c', 'echo remembered', '-i', 'false'], sandbox).status, 0)

    const runLastResult = runCli([], sandbox)
    assert.equal(runLastResult.status, 0)
    assert.match(runLastResult.stdout, /执行上次的命令 "echo remembered"/)
    assert.match(runLastResult.stdout, /remembered/)
  } finally {
    sandbox.cleanup()
  }
})

test('shows package.json not found when no command and no record', () => {
  const sandbox = createSandbox()
  try {
    const noPackageResult = runCli([], sandbox)
    assert.equal(noPackageResult.status, 0)
    assert.match(noPackageResult.stdout, /package.json not found/)
  } finally {
    sandbox.cleanup()
  }
})

test('returns error for invalid immediately value', () => {
  const sandbox = createSandbox()
  try {
    const invalidImmediatelyResult = runCli(['-c', 'echo x', '-i', 'maybe'], sandbox)
    assert.equal(invalidImmediatelyResult.status, 1)
    assert.match(`${invalidImmediatelyResult.stdout}${invalidImmediatelyResult.stderr}`, /Invalid value for --immediately/)
  } finally {
    sandbox.cleanup()
  }
})
