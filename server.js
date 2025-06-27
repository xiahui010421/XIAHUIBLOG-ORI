// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

// 👇 本地访问，跨域设置成前端端口（如果你用 hexo server，默认是 4000）
app.use(cors({
  origin: 'http://localhost:4000',
  methods: ['POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ 本地测试的 token，自己设一个
const TOKEN = 'your-secret-token';

// 鉴权
app.use((req, res, next) => {
  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${TOKEN}`) {
    return res.status(401).send('Unauthorized');
  }
  next();
});

// ✍️ 接收博客文章 POST 请求
app.post('/api/posts', (req, res) => {
  const { title, date, tags, categories, body } = req.body;
  console.log('收到数据:', req.body);

  // ...原有校验...

  const safeTitle = title.trim().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '');
  const fileName = `${date.slice(0, 10)}-${safeTitle}.md`;
  const postsDir = path.join(__dirname, 'source/_posts');
  const filePath = path.join(postsDir, fileName);

  const content = `---
title: ${title}
date: ${date}
tags: [${Array.isArray(tags) ? tags.join(', ') : ''}]
categories: ${categories || ''}
---

${body}
`;

  fs.mkdir(postsDir, { recursive: true }, (err) => {
    if (err) {
      console.error('创建目录失败', err);
      return res.status(500).send('创建目录失败');
    }

    fs.writeFile(filePath, content, (err) => {
      if (err) {
        console.error('写入文件失败', err);
        return res.status(500).send('写入文件失败');
      }

      // 检查文件是否真的存在
      if (fs.existsSync(filePath)) {
        console.log('✅ 文件确实写入成功：', filePath);
      } else {
        console.error('❌ 文件写入失败（未找到文件）：', filePath);
      }

      exec('hexo clean && hexo generate', { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
          console.error('Hexo 生成失败:', error);
          return res.status(500).send('Hexo 生成失败');
        }
        console.log('Hexo 生成成功');
        res.send('文章提交成功，博客已更新');
      });
    });
  });
});
// 本地监听端口
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ 博客编辑接口服务已启动：http://localhost:${PORT}`);
});
