#!/usr/bin/env node

import { spawn } from 'child_process'
import fs from 'fs'
import inquirer from 'inquirer'
import path from 'path'
import { Command } from 'commander'
import DataStorage, { HistoryItem } from './dataStorage'

type ImmediatelyOption = boolean | string | undefined
type RemoveOption = boolean | string | undefined
type HistoryOption = boolean | string | undefined
type PromptFunction = (questions: unknown[]) => Promise<Record<string, unknown>>

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

function parseImmediately(value: ImmediatelyOption): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (value === undefined) {
    return true
  }

  const normalized = value.trim().toLowerCase()
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
    return true
  }

  if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
    return false
  }

  throw new Error(`Invalid value for --immediately: "${value}". Please use true or false.`)
}

function normalizeRemoveTarget(value: RemoveOption, currentDir: string): string | null {
  if (typeof value !== 'string') {
    return null
  }

  if (value === 'current') {
    return currentDir
  }

  return path.resolve(value)
}

function parseHistoryLimit(value: HistoryOption): number {
  if (value === undefined || value === true) {
    return 10
  }

  if (typeof value !== 'string') {
    throw new Error(`Invalid value for --history: "${String(value)}". Please use a positive number.`)
  }

  const parsedLimit = Number.parseInt(value, 10)
  if (Number.isNaN(parsedLimit) || parsedLimit <= 0) {
    throw new Error(`Invalid value for --history: "${value}". Please use a positive number.`)
  }

  return parsedLimit
}

function formatTimestamp(item: HistoryItem): string {
  if (!item.createdAt) {
    return 'unknown-time'
  }

  const date = new Date(item.createdAt)
  if (Number.isNaN(date.getTime())) {
    return item.createdAt
  }

  return date.toLocaleString()
}

function resolvePrompt(): PromptFunction {
  const inquirerModule = inquirer as unknown as {
    prompt?: PromptFunction
    default?: {
      prompt?: PromptFunction
    }
  }

  const prompt = inquirerModule.prompt || inquirerModule.default?.prompt
  if (!prompt) {
    throw new Error('Inquirer prompt API is not available. Please check your inquirer version.')
  }

  return prompt
}

program
  .version('__VERSION__', '-v, --version')
  .description('Record the command executed in a specific directory, so that the next time you enter that directory, you can simply type "fuck" to execute the previous command')
  .option('-c, --command <value>', 'the command you want to record')
  .option('--alias <name>', 'save an alias for the command in current directory, use with --command')
  .option('--aliases', 'list all aliases in current directory')
  .option('--run <name>', 'run a command by alias name in current directory')
  .option('-l, --list', 'list all the directories you have recorded')
  .option('--history [value]', 'show command history for current directory, default: 10')
  .option('--pick', 'pick and run one command from current directory history')
  .option('-r, --remove [value]', 'remove command for a directory, use "current" to remove the current directory command')
  .option('-i, --immediately [value]', 'execute the command immediately, default is true', true)
  .option('--current', 'show the current directory command')
  .parse(process.argv)

const store = new DataStorage('fuck')
const options = program.opts<{
  command?: string
  alias?: string
  aliases?: boolean
  run?: string
  list?: boolean
  history?: HistoryOption
  pick?: boolean
  remove?: RemoveOption
  immediately?: ImmediatelyOption
  current?: boolean
}>()
const currentDir = process.cwd()
const command = options.command

let immediately = true
try {
  immediately = parseImmediately(options.immediately)
} catch (error) {
  colorLog((error as Error).message, 'red')
  process.exit(1)
}

// 查看当前目录历史命令
if (options.history !== undefined) {
  try {
    const limit = parseHistoryLimit(options.history)
    const history = store.getHistory(currentDir, limit)
    if (history.length === 0) {
      colorLog('No command history found for current directory.', 'yellow')
      process.exit(0)
    }

    history.forEach((item, index) => {
      const formattedTime = formatTimestamp(item)
      const color = index === 0 ? 'green' : 'yellow'
      colorLog(`${index + 1}. [${formattedTime}] ${item.command}`, color)
    })
    process.exit(0)
  } catch (error) {
    colorLog((error as Error).message, 'red')
    process.exit(1)
  }
} else if (options.pick) {
  const history = store.getHistory(currentDir, 30)
  if (history.length === 0) {
    colorLog('No command history found for current directory.', 'yellow')
    process.exit(0)
  }

  const prompt = resolvePrompt()
  const questions = [
    {
      type: 'list',
      name: 'pickedCommand',
      message: 'Pick a command from history:',
      choices: history.map((item) => ({
        name: `[${formatTimestamp(item)}] ${item.command}`,
        value: item.command
      }))
    }
  ]

  prompt(questions)
    .then((answers) => {
      const pickedCommand = answers.pickedCommand
      if (typeof pickedCommand !== 'string' || !pickedCommand) {
        colorLog('No command selected.', 'yellow')
        process.exit(0)
      }

      store.setItem(currentDir, pickedCommand)
      colorLog(`Picked command "${pickedCommand}" for directory: ${currentDir}`, 'green')
      if (immediately) {
        colorLog('Executing...', 'green')
        exitCommand(pickedCommand)
      }
      process.exit(0)
    })
    .catch((error) => {
      console.error('执行失败:', error)
      process.exit(1)
    })
} else if (options.alias) {
  const aliasName = options.alias.trim()
  if (!aliasName) {
    colorLog('Alias name must not be empty.', 'red')
    process.exit(1)
  }

  if (!command) {
    colorLog('Alias requires --command. Example: --alias dev --command "npm run dev"', 'red')
    process.exit(1)
  }

  store.setAlias(currentDir, aliasName, command)
  store.setItem(currentDir, command)
  colorLog(`Saved alias "${aliasName}" => "${command}"`, 'green')

  if (immediately) {
    colorLog('Executing...', 'green')
    exitCommand(command)
  }

  process.exit(0)
} else if (options.aliases) {
  const aliases = store.listAliases(currentDir)
  if (aliases.length === 0) {
    colorLog('No aliases found for current directory.', 'yellow')
    process.exit(0)
  }

  aliases.forEach((alias, index) => {
    const color = index === 0 ? 'green' : 'yellow'
    colorLog(`${index + 1}. ${alias.name} => ${alias.command}`, color)
  })
  process.exit(0)
} else if (options.run) {
  const aliasName = options.run.trim()
  if (!aliasName) {
    colorLog('Alias name must not be empty.', 'red')
    process.exit(1)
  }

  const aliasedCommand = store.getAlias(currentDir, aliasName)
  if (!aliasedCommand) {
    colorLog(`Alias "${aliasName}" not found in current directory.`, 'red')
    const aliases = store.listAliases(currentDir)
    if (aliases.length > 0) {
      colorLog('Available aliases:', 'yellow')
      aliases.forEach((alias) => {
        colorLog(`- ${alias.name} => ${alias.command}`, 'yellow')
      })
    }
    process.exit(1)
  }

  store.setItem(currentDir, aliasedCommand)
  colorLog(`Running alias "${aliasName}" => "${aliasedCommand}"`, 'green')
  if (immediately) {
    exitCommand(aliasedCommand)
  }
  process.exit(0)
} else if (options.current) {
  const currentCommand = store.getItem(currentDir)
  if (!currentCommand) {
    colorLog('No command recorded for current directory.', 'yellow')
    process.exit(0)
  }
  colorLog(currentCommand, 'green')
  process.exit(0)
} else if (options.list) {
  const dirs = store.listItems()
  if (dirs.length === 0) {
    colorLog('No recorded commands yet.', 'yellow')
    process.exit(0)
  }

  dirs.forEach(({ key, value }, index) => {
    if (key === currentDir) {
      colorLog(`${index + 1}、✅ ${key} : ${value}`, 'green')
    } else {
      colorLog(`${index + 1}、${key} : ${value}`, 'yellow')
    }
  })
  process.exit(0)
} else if (options.remove !== undefined) {
  const dir = normalizeRemoveTarget(options.remove, currentDir)
  if (!dir) {
    colorLog('Directory must be specified. Example: --remove current or --remove /path/to/dir', 'red')
    process.exit(1)
  }

  if (!store.getItem(dir)) {
    colorLog('No recorded command found for directory: ' + dir, 'yellow')
    process.exit(0)
  }

  store.removeItem(dir)
  colorLog('Removed command for directory: ' + dir, 'green')
  process.exit(0)
} else if (command) {
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
    let packageJson: { scripts?: Record<string, string> } = {}
    try {
      const packageJsonPath = path.join(currentDir, 'package.json')
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
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
    const questions: { type: 'list'; name: 'selectedCommand'; message: string; choices: { name: string; value: string }[] }[] = [
      {
        type: 'list',
        name: 'selectedCommand',
        message: '请选择一个命令:',
        choices: scriptNames.map((i) => {
          return { name: `${i} ==> ${scripts[i]}`, value: i }
        })
      }
    ]
    const prompt = resolvePrompt()
    prompt(questions)
      .then((answers) => {
        const selectedScript = answers.selectedCommand
        if (typeof selectedScript !== 'string' || !scripts[selectedScript]) {
          colorLog('No command selected.', 'yellow')
          process.exit(0)
        }

        const selectedCommand = scripts[selectedScript]
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
      PATH: `${binPath}${path.delimiter}${process.env.PATH}` // 将 node_modules/.bin 添加到 PATH
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
