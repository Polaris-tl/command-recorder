#!/usr/bin/env node

import 'core-js/actual/array/find-last-index'
import { Command } from 'commander'
import path from 'path'
import { spawn } from 'child_process'
import fs from 'fs'
import inquirer from 'inquirer'
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
  .option('-l, --list', 'list all the directories you have recorded')
  .option('-r, --remove [value]', 'remove a specific directory, <current> will remove the current directorys command')
  .option('-i, --immediately [value]', 'execute the command immediately, default is true', true)
  .option('--current', 'show the current directory command')
  .parse(process.argv)

const store = new DataStorage('fuck')
const options = program.opts()
const command = options.command
const currentDir = process.cwd()
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
  const dir = options.remove
  if (!dir) {
    colorLog('Directory must be specified', 'red')
    process.exit(1)
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
  if (!lastCommand) {
    let packageJson: any = {}
    try {
      packageJson = JSON.parse(fs.readFileSync(process.cwd() + '/package.json', 'utf8'))
    } catch (error) {
      colorLog('package.json not found', 'yellow')
      process.exit(0)
    }
    const scripts = packageJson.scripts || {}
    const scriptNames = Object.keys(scripts)
    if (scriptNames.length === 0) {
      colorLog('没有可用的命令', 'yellow')
      process.exit(0)
    }
    const questions: any[] = [
      {
        type: 'list',
        name: 'selectedCommand',
        message: '请选择一个命令:',
        choices: scriptNames.map((i) => {
          return { name: `${i} ==> ${scripts[i]}`, value: i }
        })
      }
    ]
    inquirer
      .prompt(questions)
      .then((answers) => {
        console.log(answers)
        const selectedCommand = scripts[answers.selectedCommand]
        const dir = process.cwd()
        store.setItem(dir, selectedCommand)
        colorLog(`记录命令 "${selectedCommand}" 为目录: ${dir}`, 'green')
        if (immediately) {
          exitCommand(selectedCommand)
        }
      })
      .catch((error) => {
        console.error('执行失败:', error)
        process.exit(1)
      })
  } else {
    colorLog(`执行上次的命令 "${lastCommand}" 为目录: ${currentDir}`, 'green')
    exitCommand(lastCommand)
  }
}

function exitCommand(codeStr: string) {
  if (!codeStr) {
    colorLog('Command must be specified', 'red')
    process.exit(1)
  }

  // 获取 node_modules/.bin 路径
  const binPath = path.resolve(process.cwd(), 'node_modules/.bin')
  const child = spawn(codeStr, {
    shell: true,
    stdio: 'inherit',
    env: {
      ...process.env,
      PATH: `${binPath}:${process.env.PATH}` // 将 node_modules/.bin 添加到 PATH
    }
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
