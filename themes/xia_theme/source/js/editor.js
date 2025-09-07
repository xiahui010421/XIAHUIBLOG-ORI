// editor.js - 博客编辑器功能脚本

// 设置当前日期为默认值
document.addEventListener('DOMContentLoaded', function() {
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
});

// 表单提交处理
const token = 'your-secret-token'; // 替换为你的token

document.getElementById('postForm').onsubmit = async function(e) {
  e.preventDefault();
  
  const submitBtn = document.querySelector('.submit-btn');
  const originalText = submitBtn.textContent;
  
  // 显示提交状态
  submitBtn.textContent = '⏳ 发布中...';
  submitBtn.disabled = true;
  
  const form = e.target;
  const data = {
    title: form.title.value.trim(),
    date: new Date(form.date.value).toISOString(),
    tags: form.tags.value ? form.tags.value.split(',').map(t => t.trim()) : [],
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
    
    const text = await res.text();
    
    if (res.ok) {
      // 成功提示
      submitBtn.textContent = '✅ 发布成功！';
      submitBtn.style.background = '#48bb78';
      
      // 用 localStorage 传递新文章标题
      localStorage.setItem('newPostTitle', data.title);
      
      // 2秒后跳转到主页
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } else {
      throw new Error(text);
    }
  } catch(err) {
    // 错误处理
    submitBtn.textContent = '❌ 发布失败';
    submitBtn.style.background = '#f56565';
    alert('提交失败：' + err.message);
    
    // 恢复按钮状态
    setTimeout(() => {
      submitBtn.textContent = originalText;
      submitBtn.style.background = '';
      submitBtn.disabled = false;
    }, 3000);
  }
};