#!/usr/bin/env bash
# 把 index.html 推到 GitHub（比网页上传稳，支持断点重试）
# 用法：在存放 index.html 的目录执行  bash push-to-github.sh https://github.com/用户名/仓库.git
set -e

REPO="$1"
if [ -z "$REPO" ]; then
  echo "用法: bash push-to-github.sh <仓库地址>"
  echo "例:  bash push-to-github.sh https://github.com/adaSpanish/travel-magazine.git"
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "未安装 git。macOS: brew install git ｜ Ubuntu: sudo apt install git ｜ Windows: https://git-scm.com/download/win"
  exit 1
fi

cd "$(dirname "$0")"

if [ ! -f index.html ]; then
  echo "当前目录没有 index.html"
  exit 1
fi

SIZE=$(wc -c < index.html)
echo "文件大小: $SIZE 字节（GitHub 单文件上限 100 MB）"

if [ ! -d .git ]; then
  git init -q
  git branch -M main
  echo "已初始化本地仓库"
fi

# GitHub 大文件走 http.postBuffer 默认 1MB 会失败，调到 500MB
git config http.postBuffer 524288000
git config core.compression 9

git add index.html
git commit -m "Update index.html ($(date +%Y-%m-%d))" || echo "没有新改动，继续推送"

git remote remove origin 2>/dev/null || true
git remote add origin "$REPO"

echo "开始推送（首次会要求输入 GitHub 用户名 + Personal Access Token，不是登录密码）..."
git push -u origin main || {
  echo ""
  echo "推送失败，常见原因："
  echo "  1. 仓库默认分支叫 master 而不是 main → 执行: git push -u origin HEAD:master"
  echo "  2. 远端已有内容 → 执行: git pull --rebase origin main 后再 push"
  echo "  3. 认证失败 → 密码位置填 Personal Access Token（Settings > Developer settings > Tokens）"
  exit 1
}

echo "完成。打开 $REPO 查看。"
