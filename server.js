// server.js - 添加文章编辑功能的版本
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
  methods: ['POST', 'GET', 'PUT', 'DELETE'], // 添加PUT方法
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

// 解析Markdown Front Matter的简单函数
function parseFrontMatter(content) {
  const lines = content.split('\n');
  if (lines[0] !== '---') {
    return { data: {}, content: content };
  }
  
  let frontMatterEnd = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      frontMatterEnd = i;
      break;
    }
  }
  
  if (frontMatterEnd === -1) {
    return { data: {}, content: content };
  }
  
  const frontMatterLines = lines.slice(1, frontMatterEnd);
  const bodyLines = lines.slice(frontMatterEnd + 1);
  
  const data = {};
  frontMatterLines.forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      
      // 处理数组格式 [tag1, tag2]
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(v => v.trim()).filter(v => v);
      }
      
      data[key] = value;
    }
  });
  
  return {
    data: data,
    content: bodyLines.join('\n').trim()
  };
}

// 生成Front Matter字符串
function stringifyFrontMatter(data, content) {
  let frontMatter = '---\n';
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (Array.isArray(value)) {
      frontMatter += `${key}: [${value.join(', ')}]\n`;
    } else {
      frontMatter += `${key}: ${value}\n`;
    }
  });
  
  frontMatter += '---\n\n';
  frontMatter += content;
  
  return frontMatter;
}

// 获取指定文章的原始数据
app.get('/api/posts/:slug', authenticate, (req, res) => {
  try {
    const { slug } = req.params;
    const postsDir = path.join(__dirname, 'source', '_posts');
    
    if (!fs.existsSync(postsDir)) {
      return res.status(404).json({ error: '文章目录不存在' });
    }
    
    // 查找匹配的文件
    const files = fs.readdirSync(postsDir);
    let targetFile = null;
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        // 检查文件名是否包含slug
        const fileNameWithoutExt = path.basename(file, '.md');
        if (fileNameWithoutExt.includes(slug) || fileNameWithoutExt.endsWith(`-${slug}`)) {
          targetFile = file;
          break;
        }
      }
    }
    
    if (!targetFile) {
      return res.status(404).json({ error: '未找到指定文章' });
    }
    
    // 读取文件内容
    const filePath = path.join(postsDir, targetFile);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = parseFrontMatter(fileContent);
    
    // 处理日期格式
    let formattedDate = '';
    if (parsed.data.date) {
      try {
        const date = new Date(parsed.data.date);
        formattedDate = date.toISOString().split('T')[0];
      } catch (e) {
        console.error('日期解析失败:', parsed.data.date);
      }
    }
    
    // 处理标签
    let tagsString = '';
    if (parsed.data.tags) {
      if (Array.isArray(parsed.data.tags)) {
        tagsString = parsed.data.tags.join(', ');
      } else {
        tagsString = parsed.data.tags;
      }
    }
    
    const responseData = {
      title: parsed.data.title || '',
      date: formattedDate,
      tags: tagsString,
      categories: parsed.data.categories || '',
      body: parsed.content || '',
      slug: slug,
      filename: targetFile
    };
    
    console.log('获取文章数据成功:', {
      slug,
      filename: targetFile,
      title: responseData.title
    });
    
    res.json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    console.error('获取文章失败:', error);
    res.status(500).json({ error: '获取文章失败: ' + error.message });
  }
});

// 更新指定文章
app.put('/api/posts/:slug', authenticate, (req, res) => {
  try {
    const { slug } = req.params;
    const { title, date, tags, categories, body } = req.body;
    
    // 验证必需字段
    if (!title || !body) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }
    
    const postsDir = path.join(__dirname, 'source', '_posts');
    
    if (!fs.existsSync(postsDir)) {
      return res.status(404).json({ error: '文章目录不存在' });
    }
    
    // 查找要更新的文件
    const files = fs.readdirSync(postsDir);
    let existingFile = null;
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const fileNameWithoutExt = path.basename(file, '.md');
        if (fileNameWithoutExt.includes(slug) || fileNameWithoutExt.endsWith(`-${slug}`)) {
          existingFile = file;
          break;
        }
      }
    }
    
    if (!existingFile) {
      return res.status(404).json({ error: '未找到要更新的文章' });
    }
    
    // 生成新的文件名（基于新标题）
    const safeTitle = title.trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '')
      .substring(0, 50);
    
    const newFileName = `${date.slice(0, 10)}-${safeTitle}.md`;
    const oldFilePath = path.join(postsDir, existingFile);
    const newFilePath = path.join(postsDir, newFileName);
    
    // 清理标签和分类
    const cleanTags = tags 
      ? tags.split(',').map(tag => tag.trim()).filter(tag => tag && tag !== 'undefined')
      : [];
    
    const cleanCategories = (categories && categories !== 'undefined') ? categories : '';
    
    // 构造Front Matter数据
    const frontMatterData = {
      title: title,
      date: date,
      tags: cleanTags,
      categories: cleanCategories
    };
    
    // 生成完整的Markdown内容
    const fullContent = stringifyFrontMatter(frontMatterData, body);
    
    // 如果文件名改变了，需要重命名文件
    if (existingFile !== newFileName) {
      // 删除旧文件
      fs.unlinkSync(oldFilePath);
      console.log('删除旧文件:', existingFile);
      
      // 写入新文件
      fs.writeFileSync(newFilePath, fullContent, 'utf8');
      console.log('创建新文件:', newFileName);
    } else {
      // 文件名没变，直接覆盖
      fs.writeFileSync(newFilePath, fullContent, 'utf8');
      console.log('更新文件:', newFileName);
    }
    
    // 异步重新生成静态文件
    console.log('🔄 开始重新生成静态文件...');
    exec('hexo clean && hexo generate', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Hexo 重新生成失败:', error.message);
      } else {
        console.log('✅ Hexo 重新生成成功');
      }
    });
    
    // 构造文章访问路径
    const articlePath = `${date.slice(0, 4)}/${date.slice(5, 7)}/${date.slice(8, 10)}/${safeTitle}/`;
    
    console.log('✅ 文章更新成功:', {
      oldFile: existingFile,
      newFile: newFileName,
      title: title,
      path: articlePath
    });
    
    res.json({
      success: true,
      message: '文章更新成功',
      slug: safeTitle,
      path: articlePath,
      filename: newFileName,
      url: `http://localhost:4000/${articlePath}`
    });
    
  } catch (error) {
    console.error('❌ 更新文章失败:', error);
    res.status(500).json({ error: '更新文章失败: ' + error.message });
  }
});

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

// 文章提交接口（新建文章）
app.post('/api/posts', authenticate, (req, res) => {
  const { title, date, tags, categories, body } = req.body;
  
  if (!title || !body) {
    return res.status(400).json({ error: '标题和内容不能为空' });
  }

  console.log('📝 收到新文章:', { title, date });

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

// 获取所有文章列表
app.get('/api/posts', authenticate, (req, res) => {
  try {
    const postsDir = path.join(__dirname, 'source', '_posts');
    
    if (!fs.existsSync(postsDir)) {
      return res.json({ posts: [], message: '文章目录不存在' });
    }
    
    const files = fs.readdirSync(postsDir);
    const posts = [];
    
    files.forEach(file => {
      if (file.endsWith('.md')) {
        try {
          const filePath = path.join(postsDir, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const parsed = parseFrontMatter(content);
          const stats = fs.statSync(filePath);
          
          posts.push({
            filename: file,
            slug: path.basename(file, '.md'),
            title: parsed.data.title || '无标题',
            date: parsed.data.date || '',
            tags: parsed.data.tags || [],
            categories: parsed.data.categories || '',
            created: stats.birthtime,
            modified: stats.mtime,
            size: stats.size
          });
        } catch (error) {
          console.error(`解析文章 ${file} 失败:`, error);
        }
      }
    });
    
    // 按日期排序，最新的在前
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({ 
      posts, 
      count: posts.length 
    });
    
  } catch (error) {
    console.error('获取文章列表失败:', error);
    res.status(500).json({ error: '获取文章列表失败' });
  }
});

// 删除文章接口
app.delete('/api/posts/:slug', authenticate, (req, res) => {
  try {
    const { slug } = req.params;
    const postsDir = path.join(__dirname, 'source', '_posts');
    
    // 查找要删除的文件
    const files = fs.readdirSync(postsDir);
    let targetFile = null;
    
    for (const file of files) {
      if (file.endsWith('.md')) {
        const fileNameWithoutExt = path.basename(file, '.md');
        if (fileNameWithoutExt.includes(slug) || fileNameWithoutExt.endsWith(`-${slug}`)) {
          targetFile = file;
          break;
        }
      }
    }
    
    if (!targetFile) {
      return res.status(404).json({ error: '未找到要删除的文章' });
    }
    
    const filePath = path.join(postsDir, targetFile);
    fs.unlinkSync(filePath);
    
    console.log('🗑️ 删除文章:', targetFile);
    
    // 异步重新生成静态文件
    exec('hexo clean && hexo generate', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Hexo 重新生成失败:', error.message);
      } else {
        console.log('✅ Hexo 重新生成成功');
      }
    });
    
    res.json({ success: true, message: '文章删除成功' });
    
  } catch (error) {
    console.error('删除文章失败:', error);
    res.status(500).json({ error: '删除文章失败' });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  const sourceImagesDir = path.join(__dirname, 'source', 'images');
  const publicImagesDir = path.join(__dirname, 'public', 'images');
  const postsDir = path.join(__dirname, 'source', '_posts');
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    paths: {
      sourceImages: sourceImagesDir,
      publicImages: publicImagesDir,
      posts: postsDir,
      sourceExists: fs.existsSync(sourceImagesDir),
      publicExists: fs.existsSync(publicImagesDir),
      postsExists: fs.existsSync(postsDir)
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

// 删除图片接口
app.delete('/api/images/:filename', authenticate, (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'source', 'images', filename);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('🗑️ 删除图片:', filename);
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
  console.log(`🖼️ 图片存储: ${path.join(__dirname, 'source', 'images')}`);
  console.log(`🔗 图片访问: http://localhost:${PORT}/images/`);
  console.log(`📚 文章管理: http://localhost:${PORT}/api/posts`);
  console.log(`💚 健康检查: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('📌 请确保 Hexo 服务也在运行: hexo server');
  console.log('🌐 博客访问地址: http://localhost:4000');
  console.log('');
  console.log('🆕 新增功能:');
  console.log('   - GET /api/posts/:slug - 获取文章数据');
  console.log('   - PUT /api/posts/:slug - 更新文章');
  console.log('   - GET /api/posts - 获取所有文章列表');
  console.log('   - DELETE /api/posts/:slug - 删除文章');
});