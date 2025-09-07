// editor.js - 博客编辑器功能脚本

document.addEventListener('DOMContentLoaded', function() {
  // 设置默认日期
  const dateInput = document.querySelector('input[name="date"]');
  const today = new Date();
  const formattedDate = today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');
  dateInput.value = formattedDate;

  // 实时预览功能
  const editor = document.getElementById('markdownEditor');
  const preview = document.getElementById('previewContent');
  
  // 监听编辑器内容变化
  editor.addEventListener('input', updatePreview);
  
  // 图片上传和粘贴功能
  setupImageHandling();
  
  // 转换 Markdown 为 HTML 并更新预览
  function updatePreview() {
    const markdown = editor.value.trim();
    if (markdown === '') {
      preview.innerHTML = '<div class="preview-empty">开始编写内容，这里将显示实时预览...</div>';
      return;
    }
    
    try {
      // 使用 marked.js 将 Markdown 转换为 HTML
      const html = marked.parse(markdown);
      preview.innerHTML = html;
    } catch (error) {
      preview.innerHTML = '<div class="preview-empty">Markdown 解析错误，请检查语法...</div>';
    }
  }

  // 设置图片处理功能
  function setupImageHandling() {
    createImageUploadButton();
    
    // 监听粘贴事件
    editor.addEventListener('paste', handlePaste);
    
    // 监听拖拽事件
    editor.addEventListener('dragover', handleDragOver);
    editor.addEventListener('drop', handleDrop);
  }

  // 创建图片上传按钮
  function createImageUploadButton() {
    const editorPanel = document.querySelector('.editor-panel .panel-header');
    
    // 创建上传按钮容器
    const uploadContainer = document.createElement('div');
    uploadContainer.style.cssText = 'display: flex; align-items: center; gap: 10px;';
    
    // 创建上传按钮
    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.innerHTML = '📷 上传图片';
    uploadBtn.style.cssText = `
      background: #5296d5;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s;
    `;
    
    uploadBtn.addEventListener('mouseenter', () => {
      uploadBtn.style.background = '#4285f4';
    });
    
    uploadBtn.addEventListener('mouseleave', () => {
      uploadBtn.style.background = '#5296d5';
    });
    
    // 创建隐藏的文件输入框
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', handleFileSelect);
    
    uploadBtn.addEventListener('click', () => {
      fileInput.click();
    });
    
    // 修改原有标题结构
    const originalTitle = editorPanel.textContent;
    editorPanel.innerHTML = '';
    editorPanel.style.cssText = 'background: #f8fafc; border-bottom: 1px solid #e1e8f0; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;';
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = originalTitle;
    titleSpan.style.cssText = 'color: #2d3748; font-weight: 600; font-size: 14px;';
    
    // 创建提示文本
    const hintSpan = document.createElement('span');
    hintSpan.textContent = '支持拖拽、粘贴或点击上传';
    hintSpan.style.cssText = 'color: #a0aec0; font-size: 12px; font-weight: normal;';
    
    uploadContainer.appendChild(hintSpan);
    uploadContainer.appendChild(uploadBtn);
    editorPanel.appendChild(titleSpan);
    editorPanel.appendChild(uploadContainer);
    
    document.body.appendChild(fileInput);
  }

  // 处理文件选择
  async function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        await uploadImage(file);
      }
    }
    e.target.value = ''; // 清空文件输入框
  }

  // 处理粘贴事件
  async function handlePaste(e) {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        await uploadImage(file);
        break;
      }
    }
  }

  // 处理拖拽悬停
  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    editor.style.background = '#f0f8ff';
    editor.style.borderColor = '#5296d5';
  }

  // 处理拖拽放置
  async function handleDrop(e) {
    e.preventDefault();
    editor.style.background = '';
    editor.style.borderColor = '';
    
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        await uploadImage(file);
      }
    }
  }

  // 上传图片函数
  async function uploadImage(file) {
    // 验证文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('图片文件太大，最大支持5MB', 'error');
      return;
    }
    
    // 显示上传状态
    const uploadingText = `![上传中...](uploading-${Date.now()})`;
    insertTextAtCursor(uploadingText);
    updatePreview();
    
    try {
      // 获取博客标题用于创建目录
      const titleInput = document.querySelector('input[name="title"]');
      const blogTitle = titleInput.value.trim() || 'untitled';
      
      // 创建FormData
      const formData = new FormData();
      formData.append('image', file);
      formData.append('blogTitle', blogTitle);
      
      const token = 'your-secret-token'; // 替换为你的token
      
      const response = await fetch('http://localhost:3000/api/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `上传失败: ${response.statusText}`);
      }
      
      // 替换上传中的文本为实际的图片链接
      // 使用简单的图片描述，避免中文乱码
      const imageDesc = result.originalName ? result.originalName.replace(/[^\w\u4e00-\u9fa5.-]/g, '_') : 'image';
      const imageMarkdown = `![${imageDesc}](${result.url})`;
      const editorContent = editor.value;
      editor.value = editorContent.replace(uploadingText, imageMarkdown);
      updatePreview();
      
      // 显示成功消息
      showMessage(`图片上传成功！文件大小: ${(result.size / 1024).toFixed(1)}KB`, 'success');
      
    } catch (error) {
      console.error('图片上传失败:', error);
      
      // 移除上传中的文本
      const editorContent = editor.value;
      editor.value = editorContent.replace(uploadingText, '');
      updatePreview();
      
      showMessage('图片上传失败: ' + error.message, 'error');
    }
  }

  // 在光标位置插入文本
  function insertTextAtCursor(text) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    
    // 确保在新行插入
    const beforeCursor = value.substring(0, start);
    const afterCursor = value.substring(end);
    const needNewLineBefore = beforeCursor && !beforeCursor.endsWith('\n');
    const needNewLineAfter = afterCursor && !afterCursor.startsWith('\n');
    
    const textToInsert = (needNewLineBefore ? '\n' : '') + text + (needNewLineAfter ? '\n' : '');
    
    editor.value = beforeCursor + textToInsert + afterCursor;
    editor.selectionStart = editor.selectionEnd = start + textToInsert.length;
    editor.focus();
  }

  // 显示消息提示
  function showMessage(message, type = 'info') {
    // 创建消息元素
    const messageEl = document.createElement('div');
    messageEl.textContent = message;
    messageEl.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 1000;
      transition: all 0.3s ease;
      max-width: 300px;
      word-wrap: break-word;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    `;
    
    // 根据类型设置颜色
    switch (type) {
      case 'success':
        messageEl.style.background = '#48bb78';
        break;
      case 'error':
        messageEl.style.background = '#f56565';
        break;
      default:
        messageEl.style.background = '#5296d5';
    }
    
    document.body.appendChild(messageEl);
    
    // 3秒后移除消息
    setTimeout(() => {
      messageEl.style.opacity = '0';
      messageEl.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(messageEl)) {
          document.body.removeChild(messageEl);
        }
      }, 300);
    }, 3000);
  }

  // 初始化时显示一次预览
  updatePreview();
});

// 表单提交处理
document.addEventListener('DOMContentLoaded', function() {
  const token = 'your-secret-token'; // 替换为你的token

  document.getElementById('postForm').onsubmit = async function(e) {
    e.preventDefault();
    
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    
    // 显示提交状态
    submitBtn.textContent = '⏳ 发布中...';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';
    
    const form = e.target;
    const data = {
      title: form.title.value.trim(),
      date: new Date(form.date.value).toISOString(),
      tags: form.tags.value ? form.tags.value.split(',').map(t => t.trim()).filter(t => t) : [],
      categories: form.categories.value.trim(),
      body: form.body.value.trim()
    };
    
    try {
      const res = await fetch('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      
      const result = await res.json();
      
      if (res.ok) {
        // 成功提示
        submitBtn.textContent = '✅ 发布成功！';
        submitBtn.style.background = '#48bb78';
        submitBtn.style.opacity = '1';
        
        // 用 localStorage 传递新文章标题
        localStorage.setItem('newPostTitle', data.title);
        
        // 显示成功消息
        const messageEl = document.createElement('div');
        messageEl.innerHTML = `
          <div style="text-align: center;">
            <div style="font-size: 18px; margin-bottom: 10px;">🎉 文章发布成功！</div>
            <div style="font-size: 14px; opacity: 0.9;">正在跳转到首页...</div>
          </div>
        `;
        messageEl.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #48bb78;
          color: white;
          padding: 24px 32px;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
          z-index: 2000;
          font-weight: 500;
        `;
        document.body.appendChild(messageEl);
        
        // 3秒后跳转到主页
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } else {
        throw new Error(result.error || '发布失败');
      }
    } catch(err) {
      console.error('提交失败:', err);
      
      // 错误处理
      submitBtn.textContent = '❌ 发布失败';
      submitBtn.style.background = '#f56565';
      submitBtn.style.opacity = '1';
      
      // 显示错误消息
      const messageEl = document.createElement('div');
      messageEl.textContent = '提交失败：' + err.message;
      messageEl.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: #f56565;
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        max-width: 300px;
        word-wrap: break-word;
      `;
      document.body.appendChild(messageEl);
      
      // 恢复按钮状态
      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.style.background = '';
        submitBtn.style.opacity = '1';
        submitBtn.disabled = false;
        
        // 移除错误消息
        if (document.body.contains(messageEl)) {
          document.body.removeChild(messageEl);
        }
      }, 3000);
    }
  };
});