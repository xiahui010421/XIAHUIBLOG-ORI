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
