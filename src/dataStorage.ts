import fs from 'fs'
import path from 'path'
import getAppDataPath from 'appdata-path'

export type HistoryItem = {
  command: string
  createdAt?: string
}

type DirectoryRecord = {
  current: string | null
  history: HistoryItem[]
  aliases: Record<string, string>
}

type StoreValue = string | Partial<DirectoryRecord>
type StoreData = Record<string, StoreValue>

class DataStorage {
  private dataDir: string
  private dataFilePath: string
  private maxHistorySize = 100

  constructor(appName: string) {
    this.dataDir = getAppDataPath(appName)

    // 确保目录存在
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true })
    }

    // 数据文件路径
    this.dataFilePath = path.join(this.dataDir, 'data.json')

    // 兼容旧版本：旧版本将数据写在 AppData 根目录的 data.json
    const legacyDataFilePath = path.join(getAppDataPath(), 'data.json')
    if (!fs.existsSync(this.dataFilePath) && fs.existsSync(legacyDataFilePath)) {
      fs.copyFileSync(legacyDataFilePath, this.dataFilePath)
    }
  }

  private normalizeRecord(value: StoreValue | undefined): DirectoryRecord {
    if (typeof value === 'string') {
      return {
        current: value,
        history: [{ command: value }],
        aliases: {}
      }
    }

    if (!value || typeof value !== 'object') {
      return {
        current: null,
        history: [],
        aliases: {}
      }
    }

    const history = Array.isArray(value.history)
      ? value.history
          .filter((item) => item && typeof item === 'object' && typeof item.command === 'string')
          .map((item) => ({
            command: item.command,
            createdAt: typeof item.createdAt === 'string' ? item.createdAt : undefined
          }))
      : []

    const aliases = value.aliases && typeof value.aliases === 'object' ? value.aliases : {}
    const normalizedAliases: Record<string, string> = {}
    Object.keys(aliases).forEach((key) => {
      if (typeof aliases[key] === 'string') {
        normalizedAliases[key] = aliases[key]
      }
    })

    let current: string | null = null
    if (typeof value.current === 'string') {
      current = value.current
    } else if (history.length > 0) {
      current = history[history.length - 1].command
    }

    return {
      current,
      history,
      aliases: normalizedAliases
    }
  }

  private getRecord(data: StoreData, dir: string): DirectoryRecord {
    const record = this.normalizeRecord(data[dir])
    data[dir] = record
    return record
  }

  // 写入数据
  writeData(data: StoreData): void {
    fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2))
  }

  // 读取数据
  readData(): StoreData {
    if (!fs.existsSync(this.dataFilePath)) {
      return {}
    }

    try {
      const data = fs.readFileSync(this.dataFilePath, 'utf8')
      const parsedData = JSON.parse(data)
      return typeof parsedData === 'object' && parsedData ? parsedData : {}
    } catch (error) {
      const brokenFilePath = `${this.dataFilePath}.broken-${Date.now()}`
      fs.renameSync(this.dataFilePath, brokenFilePath)
      console.error(`Data file is broken and has been backed up to: ${brokenFilePath}`)
      return {}
    }
  }

  // 获取特定目录的命令
  getItem(dir: string): string | null {
    const data = this.readData()
    const record = this.getRecord(data, dir)
    return record.current
  }

  // 设置特定目录的命令
  setItem(dir: string, command: string): void {
    const data = this.readData()
    const record = this.getRecord(data, dir)
    record.current = command
    record.history.push({
      command,
      createdAt: new Date().toISOString()
    })
    if (record.history.length > this.maxHistorySize) {
      record.history = record.history.slice(-this.maxHistorySize)
    }
    this.writeData(data)
  }

  // 获取目录历史命令（最近在前）
  getHistory(dir: string, limit = 10): HistoryItem[] {
    const data = this.readData()
    const record = this.getRecord(data, dir)
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10
    return record.history.slice(-safeLimit).reverse()
  }

  // 保存目录别名
  setAlias(dir: string, aliasName: string, command: string): void {
    const data = this.readData()
    const record = this.getRecord(data, dir)
    record.aliases[aliasName] = command
    this.writeData(data)
  }

  // 获取目录别名命令
  getAlias(dir: string, aliasName: string): string | null {
    const data = this.readData()
    const record = this.getRecord(data, dir)
    return record.aliases[aliasName] || null
  }

  // 列出目录别名
  listAliases(dir: string): { name: string; command: string }[] {
    const data = this.readData()
    const record = this.getRecord(data, dir)
    return Object.keys(record.aliases).map((name) => ({
      name,
      command: record.aliases[name]
    }))
  }

  // 删除特定目录的命令
  removeItem(dir: string): void {
    const data = this.readData()
    if (data[dir]) {
      delete data[dir]
      this.writeData(data)
    }
  }

  // 列出所有记录的目录
  listItems(): { key: string; value: string }[] {
    const data = this.readData()
    return Object.keys(data)
      .map((key) => {
        const record = this.normalizeRecord(data[key])
        return {
          key,
          value: record.current
        }
      })
      .filter((item): item is { key: string; value: string } => Boolean(item.value))
  }
}

export default DataStorage
