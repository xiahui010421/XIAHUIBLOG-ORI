#!/bin/bash

# 进入 Hexo 项目目录
# cd "$(dirname "$0")"

# 生成静态文件
# hexo clean
# hexo generate

# 进入生成的 public 文件夹
# cd public

# 初始化 git（如果第一次使用 public 文件夹）
# git init

# 设置远程仓库
git remote add origin git@github.com:xiahui010421/xiahui010421.github.io.git 2> /dev/null

# 添加所有文件
git add .

# 提交更新
git commit -m "自动部署: $(date '+%Y-%m-%d %H:%M:%S')"

# 强制推送到 main 分支
git push origin main --force

# 返回根目录
cd ..

echo "部署完成! 访问 https://xiahui010421.github.io/ 查看网站"