#!/usr/bin/env node

import { Command } from 'commander'
import { spawn } from 'child_process'
import DataStorage from './dataStorage'

const program = new Command()

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m'
}
function colorLog(message: string, color: keyof typeof COLORS) {
  console.log(`${COLORS[color]}%s${COLORS.reset}`, message)
}

program
  .version('__VERSION__')
  .description('Record the command executed in a specific directory, so that the next time you enter that directory, you can simply type "fuck" to execute the previous command')
  .option('-c, --command <value>', 'the command you want to record')
  .option('-d, --dir <value>', 'the directory you want to record the command, default is current directory', process.cwd())
  .option('-l, --list', 'list all the directories you have recorded')
  .option('-r, --remove <value>', 'remove a specific directory, <current> will remove the current directorys command')
  .option('-i, --immediately <value>', 'execute the command immediately, default is true', true)
  .option('--current', 'show the current directory command')
  .parse(process.argv)

const store = new DataStorage('fuck')
const options = program.opts()
const command = options.command
const currentDir = options.dir
const immediately = options.immediately

// 列出所有记录的目录
if (process.argv.includes('--current')) {
  const command = store.getItem(currentDir)
  colorLog(`${command}`, 'green')
  process.exit(0)
}

// 列出所有记录的目录
if (options.list) {
  const dirs = store.listItems()
  dirs.forEach(({ key, value }, index) => {
    if (key === currentDir) {
      colorLog(`${index + 1}、✅ ${key} : ${value}`, 'green')
    } else {
      colorLog(`${index + 1}、${key} : ${value}`, 'yellow')
    }
  })
  process.exit(0)
}

// 删除特定目录的命令
if (options.remove) {
  let dir = options.remove
  if (options.remove === 'current') {
    dir = currentDir
  }
  store.removeItem(dir)
  colorLog('Removed command for directory: ' + dir, 'red')
  process.exit(0)
}

// 设置命令记录
if (command) {
  store.setItem(currentDir, command)
  colorLog(`Recorded command "${command}" for directory: ${currentDir}`, 'green')

  if (immediately) {
    colorLog('Executing...', 'green')
    exitCommand(command)
  }
} else {
  // 执行上次的命令
  const lastCommand = store.getItem(currentDir)
  if (lastCommand) {
    colorLog(`Executing last command "${lastCommand}" for directory: ${currentDir}`, 'green')
    exitCommand(lastCommand)
  } else {
    colorLog(`No command recorded for directory: ${currentDir}`, 'yellow')
    process.exit(0)
  }
}

function exitCommand(codeStr: string) {
  if (!codeStr) {
    colorLog('Command must be specified', 'red')
    process.exit(1)
  }

  const child = spawn(codeStr, {
    shell: true,
    stdio: 'inherit'
  })

  child.on('error', (error) => {
    colorLog(`Error executing command: ${error.message}`, 'red')
    process.exit(1)
  })

  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`Command failed with code ${code}`)
    }
    process.exit(code || 0) // Exit with the child process exit code, or 0 if it's null/undefined
  })
}
