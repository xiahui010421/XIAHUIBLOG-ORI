// editor.js - 调试版本，支持编辑模式

document.addEventListener('DOMContentLoaded', function() {
  console.log('编辑器页面加载完成');
  
  // 检查是否是编辑模式
  const urlParams = new URLSearchParams(window.location.search);
  const isEditMode = urlParams.get('mode') === 'edit';
  const slug = urlParams.get('slug');
  
  console.log('页面参数:', { isEditMode, slug });
  
  // 设置页面标题
  if (isEditMode) {
    document.title = '编辑文章 - 博客编辑器';
    
    // 修改提交按钮文字
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
      submitBtn.innerHTML = '💾 更新文章';
    }
    
    // 修改页面标题显示
    const metaTitle = document.querySelector('.editor-meta h2');
    if (metaTitle) {
      metaTitle.textContent = '编辑文章信息';
    }
  }

  // 如果是编辑模式，从localStorage加载数据
  if (isEditMode) {
    loadPostDataForEdit();
  } else {
    // 新建模式：设置默认日期
    setDefaultDate();
  }

  // 实时预览功能
  const editor = document.getElementById('markdownEditor');
  const preview = document.getElementById('previewContent');
  
  // 获取当前图片服务器地址
  const getImageServerUrl = () => {
    return 'http://localhost:3000'; // 图片服务器地址
  };
  
  // 监听编辑器内容变化
  editor.addEventListener('input', updatePreview);
  
  // 图片上传和粘贴功能
  setupImageHandling();
  
  // 加载编辑数据（调试版本）
  function loadPostDataForEdit() {
    console.log('开始加载编辑数据');
    
    try {
      const postDataStr = localStorage.getItem('editPostData');
      console.log('从localStorage获取的原始数据:', postDataStr);
      
      if (!postDataStr) {
        console.error('localStorage中没有editPostData');
        showMessage('未找到文章数据，将创建新文章', 'warning');
        setDefaultDate();
        return;
      }

      console.log('开始解析JSON数据');
      const postData = JSON.parse(postDataStr);
      console.log('解析后的文章数据:', postData);
      
      // 验证数据完整性
      const requiredFields = ['title', 'date', 'tags', 'categories', 'body', 'slug'];
      const missingFields = requiredFields.filter(field => postData[field] === undefined);
      if (missingFields.length > 0) {
        console.warn('缺少字段:', missingFields);
      }
      
      // 填充表单数据
      console.log('开始填充表单数据');
      
      const titleInput = document.querySelector('input[name="title"]');
      const dateInput = document.querySelector('input[name="date"]');
      const tagsInput = document.querySelector('input[name="tags"]');
      const categoriesInput = document.querySelector('input[name="categories"]');
      const bodyTextarea = document.querySelector('#markdownEditor');
      
      if (titleInput) {
        titleInput.value = postData.title || '';
        console.log('标题已填充:', postData.title);
      } else {
        console.error('未找到标题输入框');
      }
      
      if (dateInput) {
        dateInput.value = postData.date || '';
        console.log('日期已填充:', postData.date);
      } else {
        console.error('未找到日期输入框');
      }
      
      if (tagsInput) {
        const tagsValue = Array.isArray(postData.tags) ? postData.tags.join(', ') : (postData.tags || '');
        tagsInput.value = tagsValue;
        console.log('标签已填充:', tagsValue);
      } else {
        console.error('未找到标签输入框');
      }
      
      if (categoriesInput) {
        categoriesInput.value = postData.categories || '';
        console.log('分类已填充:', postData.categories);
      } else {
        console.error('未找到分类输入框');
      }
      
      if (bodyTextarea) {
        bodyTextarea.value = postData.body || '';
        console.log('内容已填充，长度:', (postData.body || '').length);
      } else {
        console.error('未找到内容文本框');
      }
      
      // 更新预览
      console.log('更新预览');
      updatePreview();
      
      // 清除localStorage中的数据
      localStorage.removeItem('editPostData');
      console.log('已清除localStorage数据');
      
      showMessage('文章数据加载成功！', 'success');
      
    } catch (error) {
      console.error('加载文章数据失败:', error);
      console.error('错误详情:', error.message);
      console.error('错误堆栈:', error.stack);
      
      // 尝试查看localStorage的原始数据
      const rawData = localStorage.getItem('editPostData');
      console.log('出错时的原始数据:', rawData);
      
      showMessage('加载文章数据失败：' + error.message, 'error');
      setDefaultDate();
    }
  }

  // 设置默认日期
  function setDefaultDate() {
    console.log('设置默认日期');
    const dateInput = document.querySelector('input[name="date"]');
    if (dateInput) {
      const today = new Date();
      const formattedDate = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0');
      dateInput.value = formattedDate;
      console.log('默认日期已设置:', formattedDate);
    }
  }
  
  // 转换 Markdown 为 HTML 并更新预览
  function updatePreview() {
    const markdown = editor.value.trim();
    if (markdown === '') {
      preview.innerHTML = '<div class="preview-empty">开始编写内容，这里将显示实时预览...</div>';
      return;
    }
    
    try {
      // 使用 marked.js 将 Markdown 转换为 HTML
      let html = marked.parse(markdown);
      
      // 修复预览中的图片路径：将相对路径转换为完整URL
      html = html.replace(/src="\/images\//g, `src="${getImageServerUrl()}/images/`);
      
      // 为预览中的图片添加样式
      html = html.replace(/<img /g, '<img style="max-width: 100%; height: auto; border-radius: 6px; margin: 1em 0; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);" ');
      
      preview.innerHTML = html;
    } catch (error) {
      console.error('Markdown 解析错误:', error);
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
    
    // 创建工具栏容器
    const toolbarContainer = document.createElement('div');
    toolbarContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    
    // 创建上传按钮
    const uploadBtn = document.createElement('button');
    uploadBtn.type = 'button';
    uploadBtn.innerHTML = '📷 上传';
    uploadBtn.title = '上传图片文件';
    uploadBtn.style.cssText = `
      background: #5296d5;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    `;
    
    // 创建预览刷新按钮
    const refreshBtn = document.createElement('button');
    refreshBtn.type = 'button';
    refreshBtn.innerHTML = '🔄 刷新预览';
    refreshBtn.title = '刷新图片预览';
    refreshBtn.style.cssText = `
      background: #48bb78;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    `;
    
    // 创建插入图片语法按钮
    const insertBtn = document.createElement('button');
    insertBtn.type = 'button';
    insertBtn.innerHTML = '🖼️ 插入';
    insertBtn.title = '插入图片语法';
    insertBtn.style.cssText = `
      background: #ed8936;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    `;

    // 按钮悬停效果
    [uploadBtn, refreshBtn, insertBtn].forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.opacity = '0.8';
        btn.style.transform = 'translateY(-1px)';
      });
      
      btn.addEventListener('mouseleave', () => {
        btn.style.opacity = '1';
        btn.style.transform = 'translateY(0)';
      });
    });
    
    // 创建隐藏的文件输入框
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', handleFileSelect);
    
    // 上传按钮事件
    uploadBtn.addEventListener('click', () => {
      fileInput.click();
    });
    
    // 刷新预览按钮事件
    refreshBtn.addEventListener('click', () => {
      updatePreview();
      showMessage('预览已刷新', 'success');
    });
    
    // 插入图片语法按钮事件
    insertBtn.addEventListener('click', () => {
      showImageInsertDialog();
    });
    
    // 修改原有标题结构
    const originalTitle = editorPanel.textContent;
    editorPanel.innerHTML = '';
    editorPanel.style.cssText = 'background: #f8fafc; border-bottom: 1px solid #e1e8f0; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center;';
    
    const titleSpan = document.createElement('span');
    titleSpan.textContent = originalTitle;
    titleSpan.style.cssText = 'color: #2d3748; font-weight: 600; font-size: 14px;';
    
    toolbarContainer.appendChild(uploadBtn);
    toolbarContainer.appendChild(refreshBtn);
    toolbarContainer.appendChild(insertBtn);
    
    editorPanel.appendChild(titleSpan);
    editorPanel.appendChild(toolbarContainer);
    
    document.body.appendChild(fileInput);
  }

  // 显示图片插入对话框
  function showImageInsertDialog() {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    `;
    
    const dialogContent = document.createElement('div');
    dialogContent.style.cssText = `
      background: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 500px;
    `;
    
    dialogContent.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #2d3748;">插入图片</h3>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #4a5568;">图片描述：</label>
        <input type="text" id="imageAlt" placeholder="输入图片描述" style="width: 100%; padding: 8px 12px; border: 1px solid #e1e8f0; border-radius: 4px; box-sizing: border-box;">
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #4a5568;">图片路径：</label>
        <input type="text" id="imageSrc" placeholder="/images/文件名.jpg 或 https://..." style="width: 100%; padding: 8px 12px; border: 1px solid #e1e8f0; border-radius: 4px; box-sizing: border-box;">
        <div style="margin-top: 8px; font-size: 12px; color: #718096;">
          <div>📁 本地图片：/images/your-image.jpg</div>
          <div>🌐 外部图片：https://example.com/image.jpg</div>
        </div>
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button type="button" id="cancelBtn" style="padding: 8px 16px; border: 1px solid #e1e8f0; background: white; border-radius: 4px; cursor: pointer;">取消</button>
        <button type="button" id="insertBtn" style="padding: 8px 16px; background: #5296d5; color: white; border: none; border-radius: 4px; cursor: pointer;">插入</button>
      </div>
    `;
    
    dialog.appendChild(dialogContent);
    document.body.appendChild(dialog);
    
    // 聚焦到第一个输入框
    const altInput = document.getElementById('imageAlt');
    const srcInput = document.getElementById('imageSrc');
    altInput.focus();
    
    // 取消按钮
    document.getElementById('cancelBtn').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    // 插入按钮
    document.getElementById('insertBtn').addEventListener('click', () => {
      const alt = altInput.value.trim() || '图片';
      const src = srcInput.value.trim();
      
      if (!src) {
        alert('请输入图片路径');
        return;
      }
      
      const imageMarkdown = `![${alt}](${src})`;
      insertTextAtCursor(imageMarkdown);
      updatePreview();
      document.body.removeChild(dialog);
    });
    
    // 点击背景关闭
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        document.body.removeChild(dialog);
      }
    });
    
    // ESC 键关闭
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(dialog);
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
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
    // 验证文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showMessage('图片文件太大，最大支持10MB', 'error');
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
      
      const token = 'your-secret-token';
      
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
      const imageDesc = result.originalName ? 
        result.originalName.replace(/[^\w\u4e00-\u9fa5.-]/g, '_').substring(0, 20) : 
        'image';
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
    console.log('显示消息:', message, type);
    
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
      case 'warning':
        messageEl.style.background = '#ed8936';
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
  const token = 'your-secret-token';

  document.getElementById('postForm').onsubmit = async function(e) {
    e.preventDefault();
    console.log('表单提交开始');
    
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    
    // 检查是否是编辑模式
    const urlParams = new URLSearchParams(window.location.search);
    const isEditMode = urlParams.get('mode') === 'edit';
    const slug = urlParams.get('slug');
    
    console.log('提交参数:', { isEditMode, slug });
    
    // 显示提交状态
    submitBtn.textContent = isEditMode ? '⏳ 更新中...' : '⏳ 发布中...';
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
    
    console.log('提交数据:', data);
    
    try {
      let url = 'http://localhost:3000/api/posts';
      let method = 'POST';
      
      // 如果是编辑模式，使用PUT方法和包含slug的URL
      if (isEditMode && slug) {
        url = `http://localhost:3000/api/posts/${encodeURIComponent(slug)}`;
        method = 'PUT';
      }
      
      console.log('请求URL:', url);
      console.log('请求方法:', method);
      
      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      
      console.log('响应状态:', res.status);
      const result = await res.json();
      console.log('响应结果:', result);
      
      if (res.ok) {
        // 成功提示
        submitBtn.textContent = isEditMode ? '✅ 更新成功！' : '✅ 发布成功！';
        submitBtn.style.background = '#48bb78';
        submitBtn.style.opacity = '1';
        
        // 显示成功消息
        const messageEl = document.createElement('div');
        messageEl.innerHTML = `
          <div style="text-align: center;">
            <div style="font-size: 18px; margin-bottom: 10px;">${isEditMode ? '🎉 文章更新成功！' : '🎉 文章发布成功！'}</div>
            <div style="font-size: 14px; opacity: 0.9;">正在跳转...</div>
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
        
        // 3秒后跳转
        setTimeout(() => {
          if (isEditMode && result.path) {
            // 编辑模式：跳转到文章页面
            console.log('跳转到文章页面:', '/' + result.path);
            window.location.href = '/' + result.path;
          } else {
            // 新建模式：跳转到主页
            console.log('跳转到主页');
            window.location.href = '/';
          }
        }, 3000);
      } else {
        throw new Error(result.error || (isEditMode ? '更新失败' : '发布失败'));
      }
    } catch(err) {
      console.error('提交失败:', err);
      
      // 错误处理
      submitBtn.textContent = isEditMode ? '❌ 更新失败' : '❌ 发布失败';
      submitBtn.style.background = '#f56565';
      submitBtn.style.opacity = '1';
      
      // 显示错误消息
      showMessage(err.message, 'error');
      
      // 恢复按钮状态
      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.style.background = '';
        submitBtn.style.opacity = '1';
        submitBtn.disabled = false;
      }, 3000);
    }
  };
});