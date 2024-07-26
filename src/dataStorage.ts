import fs from 'fs'
import path from 'path'
import os from 'os'
import getAppDataPath from 'appdata-path'

class DataStorage {
  private appName: string
  private dataDir: string
  private dataFilePath: string

  constructor(appName: string) {
    this.appName = appName
    this.dataDir = getAppDataPath()

    // 确保目录存在
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true })
    }

    // 数据文件路径
    this.dataFilePath = path.join(this.dataDir, 'data.json')
  }

  // 获取数据存储目录
  private getDataDir(): string {
    let dataDir: string
    const platform = os.platform()

    if (platform === 'win32') {
      dataDir = path.join(process.env.APPDATA as string, this.appName)
    } else if (platform === 'darwin') {
      dataDir = path.join(os.homedir(), 'Library', 'Application Support', this.appName)
    } else {
      dataDir = path.join(os.homedir(), '.config', this.appName)
    }

    return dataDir
  }

  // 写入数据
  writeData(data: object): void {
    fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2))
  }

  // 读取数据
  readData(): any {
    if (!fs.existsSync(this.dataFilePath)) {
      return null
    }
    const data = fs.readFileSync(this.dataFilePath, 'utf8')
    return JSON.parse(data)
  }

  // 获取特定目录的命令
  getItem(dir: string): string | null {
    const data = this.readData()
    return data ? data[dir] || null : null
  }

  // 设置特定目录的命令
  setItem(dir: string, command: string): void {
    const data = this.readData() || {}
    data[dir] = command
    this.writeData(data)
  }

  // 删除特定目录的命令
  removeItem(dir: string): void {
    const data = this.readData()
    if (data && data[dir]) {
      delete data[dir]
      this.writeData(data)
    }
  }

  // 列出所有记录的目录
  listItems(): string[] {
    const data = this.readData()
    const list = Object.keys(data || {})
    return data ? list.map((key) => `${key}: ${data[key]}`) : []
  }
}

export default DataStorage
