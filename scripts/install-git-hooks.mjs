/**
 * 把仓库里的提交钩子复制到 .git/hooks，不修改 git config。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const gitDir = path.join(root, '.git')
if (!fs.existsSync(gitDir)) {
  console.log('当前目录不是 git 工作区，跳过钩子安装')
  process.exit(0)
}

const hooksDir = path.join(gitDir, 'hooks')
fs.mkdirSync(hooksDir, { recursive: true })
const source = path.join(root, 'scripts', 'git-hooks', 'pre-commit')
const target = path.join(hooksDir, 'pre-commit')
fs.copyFileSync(source, target)
fs.chmodSync(target, 0o755)
console.log('已安装 pre-commit 钩子：提交时会先更新 README 下载链接')
