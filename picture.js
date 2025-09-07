// 图片上传API路由 - 添加到你的Express应用中

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const router = express.Router();

// 创建存储配置
const storage = multer.memoryStorage(); // 使用内存存储，便于后续处理

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片文件 (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// 身份验证中间件
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '缺少访问令牌' });
  }

  // 替换为你的实际token验证逻辑
  if (token !== 'your-secret-token') {
    return res.status(403).json({ error: '无效的访问令牌' });
  }

  next();
}

// 生成安全的文件名
function generateSafeFilename(originalName, blogTitle) {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  
  // 清理博客标题作为目录名
  const safeBlogTitle = blogTitle
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) || 'untitled';
  
  return {
    filename: `${timestamp}-${random}${ext}`,
    blogDir: safeBlogTitle
  };
}

// 确保目录存在
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// 图片上传路由
router.post('/upload-image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const blogTitle = req.body.blogTitle || 'untitled';
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // 生成安全的文件名和目录
    const { filename, blogDir } = generateSafeFilename(req.file.originalname, blogTitle);
    
    // 创建目录路径：/images/年/月/博客标题/
    const uploadDir = path.join(process.cwd(), 'public', 'images', String(year), month, blogDir);
    const filePath = path.join(uploadDir, filename);
    
    // 确保目录存在
    await ensureDirectoryExists(uploadDir);
    
    // 保存文件
    await fs.writeFile(filePath, req.file.buffer);
    
    // 生成访问URL
    const imageUrl = `/images/${year}/${month}/${blogDir}/${filename}`;
    
    // 返回成功响应
    res.json({
      success: true,
      url: imageUrl,
      filename: filename,
      originalName: req.file.originalname,
      size: req.file.size,
      path: `${year}/${month}/${blogDir}/${filename}`
    });

    console.log(`图片上传成功: ${imageUrl}`);
    
  } catch (error) {
    console.error('图片上传失败:', error);
    res.status(500).json({ 
      error: '上传失败', 
      message: error.message 
    });
  }
});

// 批量上传支持
router.post('/upload-images', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const blogTitle = req.body.blogTitle || 'untitled';
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const results = [];

    for (const file of req.files) {
      try {
        const { filename, blogDir } = generateSafeFilename(file.originalname, blogTitle);
        const uploadDir = path.join(process.cwd(), 'public', 'images', String(year), month, blogDir);
        const filePath = path.join(uploadDir, filename);
        
        await ensureDirectoryExists(uploadDir);
        await fs.writeFile(filePath, file.buffer);
        
        const imageUrl = `/images/${year}/${month}/${blogDir}/${filename}`;
        
        results.push({
          success: true,
          url: imageUrl,
          filename: filename,
          originalName: file.originalname,
          size: file.size
        });

      } catch (error) {
        results.push({
          success: false,
          originalName: file.originalname,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      results: results,
      uploaded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });

  } catch (error) {
    console.error('批量上传失败:', error);
    res.status(500).json({ 
      error: '批量上传失败', 
      message: error.message 
    });
  }
});

// 删除图片路由（可选）
router.delete('/delete-image', authenticateToken, async (req, res) => {
  try {
    const { imagePath } = req.body;
    
    if (!imagePath) {
      return res.status(400).json({ error: '缺少图片路径' });
    }

    // 安全检查：确保路径在images目录下
    const normalizedPath = path.normalize(imagePath);
    if (!normalizedPath.startsWith('images/')) {
      return res.status(400).json({ error: '无效的图片路径' });
    }

    const fullPath = path.join(process.cwd(), 'public', normalizedPath);
    
    try {
      await fs.access(fullPath);
      await fs.unlink(fullPath);
      res.json({ success: true, message: '图片删除成功' });
    } catch (error) {
      res.status(404).json({ error: '图片不存在' });
    }

  } catch (error) {
    console.error('删除图片失败:', error);
    res.status(500).json({ 
      error: '删除失败', 
      message: error.message 
    });
  }
});

// 获取图片列表路由（可选，用于管理）
router.get('/images/:year/:month/:blog', authenticateToken, async (req, res) => {
  try {
    const { year, month, blog } = req.params;
    const imagesDir = path.join(process.cwd(), 'public', 'images', year, month, blog);
    
    try {
      const files = await fs.readdir(imagesDir);
      const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      });

      const images = imageFiles.map(file => ({
        filename: file,
        url: `/images/${year}/${month}/${blog}/${file}`,
        path: `${year}/${month}/${blog}/${file}`
      }));

      res.json({
        success: true,
        images: images,
        count: images.length
      });

    } catch (error) {
      res.status(404).json({ error: '目录不存在' });
    }

  } catch (error) {
    console.error('获取图片列表失败:', error);
    res.status(500).json({ 
      error: '获取列表失败', 
      message: error.message 
    });
  }
});

module.exports = router;

// 使用方法：
// 在你的主应用文件中添加：
// const imageRoutes = require('./routes/image-upload'); // 根据实际路径调整
// app.use('/api', imageRoutes)