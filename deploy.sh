# !/bin/bash

# 进入 Hexo 项目目录
cd "$(dirname "$0")" || exit

# 生成静态文件
hexo clean
hexo generate

# 进入生成的 public 文件夹
cd public || exit

# 初始化 git（如果第一次使用 public 文件夹）
# 检查是否已经是git仓库，如果不是才初始化
if [ ! -d .git ]; then
  git init
  git remote add origin git@github.com:xiahui010421/xiahui010421.github.io.git
else
  # 确保远程仓库配置正确
  git remote set-url origin git@github.com:xiahui010421/xiahui010421.github.io.git
fi

# 拉取远程最新更改，避免强制推送覆盖
git pull origin main --rebase

# 添加所有文件
git add .

# 提交更新
git commit -m "自动部署: $(date '+%Y-%m-%d %H:%M:%S')"

# 强制推送到 main 分支
git push origin main 

# 返回根目录
cd ..

echo "部署完成! 访问 https://xiahui010421.github.io/ 查看网站"
