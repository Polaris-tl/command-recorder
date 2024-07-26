# Command Recorder

Command Recorder 是一个命令行工具，用于记录在特定目录下执行的命令。下次进入该目录时，只需输入一个简单的命令即可执行上次记录的命令。

## 描述

Command Recorder 允许你记录在特定目录下执行的命令。下次进入该目录时，你可以简单地输入 fuck 来执行上次记录的命令

## 安装

确保你已经安装了 Node.js 和 npm。然后在项目目录下运行以下命令来安装依赖：
`npm install command-recorder`

## 使用方法

### 版本

`fuck -v`

### 记录命令

记录在指定目录下执行的命令：
`fuck -c "<your-command>"`
示例
`fuck -c "ls -la"`

### 删除特定目录的命令

`fuck -r "<path/to/your/dir>"`

### 删除当前目录的命令记录

`fuck --remove "current"`

### 立即执行命令

你可以选择在记录命令时立即执行它。默认情况下，该选项是启用的：
`fuck -c "<your-command>" -i "true"`
如果你不希望立即执行命令，可以将 --immediately 选项设置为 false：
`fuck -c "<your-command>" -i "false"`

## 选项

- -V, --version ：输出版本号。
- -c, --command \<value>：你想要记录的命令。
- -d, --dir \<value>：你想要记录命令的目录，默认为当前目录。
- -l, --list：列出所有你已经记录过命令的目录。
- -r, --remove \<value>：删除特定目录的命令记录，current 将删除当前目录的命令记录。
- -i, --immediately \<value>：立即执行命令，默认为 true。

## 注意事项

确保你在使用该工具时具有相应目录的读写权限。
