# Command Recorder

`command-recorder` 是一个按目录记录命令的 CLI 工具。  
在某个目录记录一次命令后，下次进入该目录只需输入 `fuck` 就能直接执行上次命令。

## 安装

推荐全局安装（可在任意目录直接使用 `fuck`）：

```bash
npm install -g command-recorder
```

如果你只想在当前项目里使用：

```bash
npm install --save-dev command-recorder
npx fuck -v
```

## 常见用法

```bash
# 查看版本
fuck -v

# 记录命令（默认会立即执行）
fuck -c "npm run dev"

# 仅记录，不立即执行
fuck -c "npm run dev" -i false

# 执行当前目录上次记录的命令
fuck

# 查看当前目录记录的命令
fuck --current

# 查看所有目录记录
fuck --list

# 查看当前目录最近 10 条历史命令
fuck --history

# 查看当前目录最近 20 条历史命令
fuck --history 20

# 从历史里交互选择并执行
fuck --pick

# 给当前目录命令设置别名
fuck --alias dev -c "npm run dev"

# 查看当前目录所有别名
fuck --aliases

# 通过别名运行命令（支持 -r 快捷方式）
fuck dev
fuck -r dev
fuck --run dev

# 删除当前目录记录
fuck --remove current

# 删除指定目录记录
fuck --remove "/path/to/project"
```

## 参数说明

- `-v, --version`：输出版本号
- `<name>`：直接按别名运行（等价于 `-r <name>`）
- `-c, --command <value>`：记录命令
- `--alias <name>`：为当前目录命令设置别名（配合 `--command` 使用）
- `--aliases`：列出当前目录所有别名
- `-r, --run <name>`：运行当前目录下指定别名的命令
- `-l, --list`：列出所有记录
- `--history [value]`：查看当前目录历史命令，默认显示最近 10 条
- `--pick`：交互式选择当前目录历史命令并执行
- `--current`：显示当前目录记录的命令
- `--remove [value]`：删除记录，支持 `current` 或指定目录路径
- `-i, --immediately [value]`：是否立即执行，支持 `true/false`，默认 `true`

## 注意事项

- 请确保你对目标目录和用户配置目录有读写权限。
- 该工具会执行你记录的原始命令，请只记录可信命令。
