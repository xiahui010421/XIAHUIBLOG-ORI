const token = 'your-secret-token'; // 替换为你的token

document.getElementById('postForm').onsubmit = async function(e) {
  e.preventDefault();
  const form = e.target;

  const data = {
    title: form.title.value.trim(),
    date: new Date(form.date.value).toISOString(),
    tags: form.tags.value ? form.tags.value.split(',').map(t => t.trim()) : [],
    categories: form.categories.value.trim(),
    body: form.body.value.trim()
  };

  try {
    const res = await fetch('http://localhost:3000/api/posts', {  // 本地测试
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    const text = await res.text();
    if (res.ok) {
      // 用 localStorage 传递新文章标题
      localStorage.setItem('newPostTitle', data.title);
      // 跳转到主页
      window.location.href = '/';
    } else {
      alert(text);
    }
  } catch(err) {
    alert('提交失败：' + err.message);
  }
};

    // 实时预览功能
    document.addEventListener('DOMContentLoaded', function() {
      const editor = document.getElementById('markdownEditor');
      const preview = document.getElementById('previewContent');
      
      // 初始化预览
      updatePreview();
      
      // 监听编辑器内容变化
      editor.addEventListener('input', updatePreview);
      
      // 转换 Markdown 为 HTML 并更新预览
      function updatePreview() {
        const markdown = editor.value;
        // 使用 marked.js 将 Markdown 转换为 HTML
        const html = marked.parse(markdown);
        preview.innerHTML = html;
      }
    });
