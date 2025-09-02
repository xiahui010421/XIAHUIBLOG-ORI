
---
title: Hexo 网站自动部署到 GitHub Pages
date: 2025-08-18T09:22:00.000Z
tags: [blog]
categories: blog
---

# Hexo 网站自动部署到 GitHub Pages


## 1. 前提条件

- 已经有 Hexo 网站源码 **XIAHUI_BLOG**
- 已经在 GitHub 上创建好仓库 **xiahui010421.github.io**
- 本地已安装 **Git、Hexo 环境**

---

## 2. 脚本说明

该脚本可以实现以下功能：

- 自动生成静态文件  
- 自动初始化 Git 仓库（如果是第一次部署）  
- 自动提交修改  
- 强制推送到远程 **main 分支**

---

## 3. 脚本内容示例

在 Hexo 根目录下创建 `deploy.sh`：

```bash
#!/bin/bash

# 进入 Hexo 项目目录
cd "$(dirname "$0")"

# 清理并生成静态文件
hexo clean
hexo generate

# 进入生成的 public 文件夹
cd public

# 初始化 git（第一次使用 public 文件夹时）
git init

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
````

---

## 4. 使用方法

1. 给脚本添加执行权限：

   ```bash
   chmod +x deploy.sh
   ```

2. 每次修改网站后，直接运行：

   ```bash
   ./deploy.sh
   ```

3. 打开浏览器访问：

   ```
   https://xiahui010421.github.io/
   ```

   即可看到最新内容。

---

## 5. 注意事项

* 使用 `--force` 会覆盖远程仓库内容，如果远程有重要历史提交，请谨慎。
* 如果远程仓库比本地更新，第一次部署可先 `git pull` 再部署。
* 该脚本适合 **Hexo、VuePress 或普通静态网站**。
* 以后只需修改文章或主题，然后运行 `./deploy.sh` 即可自动部署。

---


# 部署流程图

![部署流程图](/images/deploy-flow.png)
