#!/usr/bin/env node

import { Command } from 'commander'
import { spawn } from 'child_process'
import DataStorage from './dataStorage'
import { readFileSync } from 'fs'
import { join } from 'path'

const packageJsonPath = join(__dirname, 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
const version = packageJson.version

const program = new Command()
program
  .version(version)
  .description('Record the command executed in a specific directory, so that the next time you enter that directory, you can simply type "fuck" to execute the previous command')
  .option('-c, --command <value>', 'the command you want to record')
  .option('-d, --dir <value>', 'the directory you want to record the command, default is current directory', process.cwd())
  .option('-l, --list', 'list all the directories you have recorded')
  .option('-r, --remove <value>', 'remove a specific directory, <current> will remove the current directorys command')
  .option('-i, --immediately <value>', 'execute the command immediately, default is true', true)
  .parse(process.argv)

const store = new DataStorage('fuck')
const options = program.opts()
const command = options.command
const currentDir = options.dir
const immediately = options.immediately

// 列出所有记录的目录
if (options.list) {
  const dirs = store.listItems()
  console.log('Recorded directories: ', dirs)
  process.exit(0)
}

// 删除特定目录的命令
if (options.remove) {
  let dir = options.remove
  if (options.remove === 'current') {
    dir = currentDir
  }
  store.removeItem(dir)
  console.log('Removed command for directory: ', dir)
  process.exit(0)
}

// 设置命令记录
if (command) {
  store.setItem(currentDir, command)
  console.log(`Recorded command "${command}" for directory: ${currentDir}`)

  if (immediately) {
    console.log('Executing')
    exitCommand(command)
  } else {
    console.log('Done')
  }
} else {
  // 执行上次的命令
  const lastCommand = store.getItem(currentDir)
  if (lastCommand) {
    console.log(`Executing last command "${lastCommand}" for directory: ${currentDir}`)
    exitCommand(lastCommand)
  } else {
    console.log(`No command recorded for directory: ${currentDir}`)
    process.exit(0)
  }
}

function exitCommand(codeStr: string) {
  if (!codeStr) {
    console.error('Command must be specified')
    process.exit(1)
  }

  const child = spawn(codeStr, {
    shell: true,
    stdio: 'inherit'
  })

  child.on('error', (error) => {
    console.error(`Error executing command: ${error.message}`)
    process.exit(1)
  })

  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`Command failed with code ${code}`)
    }
    process.exit(code || 0) // Exit with the child process exit code, or 0 if it's null/undefined
  })
}
