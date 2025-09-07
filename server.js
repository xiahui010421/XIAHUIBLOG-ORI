// server.js - 最终修复版
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { exec } = require('child_process');

const app = express();

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:4000',
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 图片上传配置 - 直接存储到 source/images
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      // 直接存储到 source/images，不创建子目录
      const uploadDir = path.join(__dirname, 'source', 'images');
      
      // 确保目录存在
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('创建图片目录:', uploadDir);
      }
      
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      // 生成安全的文件名
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 6);
      const ext = path.extname(file.originalname).toLowerCase();
      
      // 简化原始文件名
      const originalBase = path.basename(file.originalname, ext);
      const cleanBase = originalBase
        .replace(/[^\w\u4e00-\u9fa5]/g, '_')  // 替换特殊字符
        .replace(/_+/g, '_')                   // 合并多个下划线
        .substring(0, 20);                     // 限制长度
      
      const finalName = `${timestamp}_${random}_${cleanBase || 'image'}${ext}`;
      
      console.log('生成文件名:', {
        original: file.originalname,
        cleaned: finalName
      });
      
      cb(null, finalName);
    }
  }),
  fileFilter: (req, file, cb) => {
    console.log('检查文件类型:', file.mimetype);
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只能上传图片文件'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

const TOKEN = 'your-secret-token';

const authenticate = (req, res, next) => {
  const auth = req.headers['authorization'];
  if (auth !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// 图片上传接口
app.post('/api/upload-image', authenticate, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    // 使用根路径的图片 URL
    const imageUrl = `/images/${req.file.filename}`;
    
    console.log('✅ 图片上传成功:', {
      originalName: req.file.originalname,
      savedAs: req.file.filename,
      size: req.file.size,
      url: imageUrl,
      savedPath: req.file.path
    });

    res.json({
      success: true,
      url: imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size
    });

  } catch (error) {
    console.error('❌ 图片上传失败:', error);
    res.status(500).json({ error: '图片上传失败: ' + error.message });
  }
});

// 静态文件服务
app.use('/images', express.static(path.join(__dirname, 'source/images')));

// 文章提交接口
app.post('/api/posts', authenticate, (req, res) => {
  const { title, date, tags, categories, body } = req.body;
  
  if (!title || !body) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }

  console.log('📝 收到文章:', { title, date });

  // 生成安全的文件名
  const safeTitle = title.trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '')
    .substring(0, 50);
  
  const fileName = `${date.slice(0, 10)}-${safeTitle}.md`;
  const postsDir = path.join(__dirname, 'source', '_posts');
  const filePath = path.join(postsDir, fileName);

  // 清理标签和分类
  const cleanTags = Array.isArray(tags) 
    ? tags.filter(tag => tag && tag.trim() && tag !== 'undefined').join(', ')
    : (tags && tags !== 'undefined' ? tags : '');
  
  const cleanCategories = (categories && categories !== 'undefined') ? categories : '';

  // 生成文章内容
  const content = `---
title: ${title}
date: ${date}
tags: [${cleanTags}]
categories: ${cleanCategories}
---

${body}
`;

  try {
    // 确保目录存在
    fs.mkdirSync(postsDir, { recursive: true });
    
    // 写入文件
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ 文章保存成功:', filePath);

    // 异步生成静态文件
    console.log('🔄 开始生成静态文件...');
    exec('hexo clean && hexo generate', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Hexo 生成失败:', error.message);
      } else {
        console.log('✅ Hexo 生成成功');
        console.log('📤 可以访问: http://localhost:4000');
      }
    });

    res.json({ 
      success: true, 
      message: '文章发布成功！',
      filePath: fileName,
      url: `http://localhost:4000/${date.slice(0, 4)}/${date.slice(5, 7)}/${date.slice(8, 10)}/${safeTitle}/`
    });

  } catch (error) {
    console.error('❌ 文章保存失败:', error);
    res.status(500).json({ error: '文章保存失败: ' + error.message });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  const sourceImagesDir = path.join(__dirname, 'source', 'images');
  const publicImagesDir = path.join(__dirname, 'public', 'images');
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    paths: {
      sourceImages: sourceImagesDir,
      publicImages: publicImagesDir,
      sourceExists: fs.existsSync(sourceImagesDir),
      publicExists: fs.existsSync(publicImagesDir)
    }
  });
});

// 获取图片列表
app.get('/api/images', authenticate, (req, res) => {
  const imagesDir = path.join(__dirname, 'source', 'images');
  
  try {
    if (!fs.existsSync(imagesDir)) {
      return res.json({ images: [], message: '图片目录不存在' });
    }
    
    const files = fs.readdirSync(imagesDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].includes(ext);
    });
    
    const images = imageFiles.map(file => {
      const filePath = path.join(imagesDir, file);
      const stats = fs.statSync(filePath);
      
      return {
        filename: file,
        url: `/images/${file}`,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    });
    
    // 按创建时间排序，最新的在前
    images.sort((a, b) => b.created - a.created);
    
    res.json({ 
      images, 
      count: images.length,
      directory: imagesDir
    });
    
  } catch (error) {
    console.error('读取图片列表失败:', error);
    res.status(500).json({ error: '读取图片列表失败' });
  }
});

// 删除图片接口（可选）
app.delete('/api/images/:filename', authenticate, (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'source', 'images', filename);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️  删除图片:', filename);
      res.json({ success: true, message: '图片删除成功' });
    } else {
      res.status(404).json({ error: '图片不存在' });
    }
  } catch (error) {
    console.error('删除图片失败:', error);
    res.status(500).json({ error: '删除图片失败' });
  }
});

// 错误处理
app.use((error, req, res, next) => {
  console.error('💥 服务器错误:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件太大，最大支持10MB' });
    }
  }
  
  res.status(500).json({ error: error.message || '服务器内部错误' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log('🚀 博客编辑服务启动成功!');
  console.log(`📝 编辑器接口: http://localhost:${PORT}`);
  console.log(`🖼️  图片存储: ${path.join(__dirname, 'source', 'images')}`);
  console.log(`🔗 图片访问: http://localhost:${PORT}/images/`);
  console.log(`💚 健康检查: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('📌 请确保 Hexo 服务也在运行: hexo server');
  console.log('🌐 博客访问地址: http://localhost:4000');
});