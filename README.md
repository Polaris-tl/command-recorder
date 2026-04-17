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
npx fuck -V
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

# 删除当前目录记录
fuck --remove current

# 删除指定目录记录
fuck --remove "/path/to/project"
```

## 参数说明

- `-v, --version`：输出版本号
- `-c, --command <value>`：记录命令
- `-l, --list`：列出所有记录
- `--current`：显示当前目录记录的命令
- `-r, --remove [value]`：删除记录，支持 `current` 或指定目录路径
- `-i, --immediately [value]`：是否立即执行，支持 `true/false`，默认 `true`

## 注意事项

- 请确保你对目标目录和用户配置目录有读写权限。
- 该工具会执行你记录的原始命令，请只记录可信命令。
