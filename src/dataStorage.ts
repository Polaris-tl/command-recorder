import fs from 'fs'
import path from 'path'
import getAppDataPath from 'appdata-path'

type CommandMap = Record<string, string>

class DataStorage {
  private dataDir: string
  private dataFilePath: string

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

  // 写入数据
  writeData(data: CommandMap): void {
    fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2))
  }

  // 读取数据
  readData(): CommandMap {
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
    return data[dir] || null
  }

  // 设置特定目录的命令
  setItem(dir: string, command: string): void {
    const data = this.readData()
    data[dir] = command
    this.writeData(data)
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
    return Object.keys(data).map((key) => ({
      key,
      value: data[key]
    }))
  }
}

export default DataStorage
