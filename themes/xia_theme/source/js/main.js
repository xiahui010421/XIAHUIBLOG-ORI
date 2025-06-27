document.addEventListener('DOMContentLoaded', function() {
  const title = localStorage.getItem('newPostTitle');
  if (title) {
    // 创建动画提示元素
    const tip = document.createElement('div');
    tip.textContent = `🎉 新文章已发布：《${title}》`;
    tip.style.position = 'fixed';
    tip.style.top = '80px';
    tip.style.left = '50%';
    tip.style.transform = 'translateX(-50%)';
    tip.style.background = 'linear-gradient(90deg,#cf8dff,#4affb4)';
    tip.style.color = '#fff';
    tip.style.padding = '16px 32px';
    tip.style.borderRadius = '30px';
    tip.style.fontSize = '20px';
    tip.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
    tip.style.zIndex = '9999';
    tip.style.opacity = '0';
    tip.style.transition = 'opacity 0.5s, top 0.5s';

    document.body.appendChild(tip);

    // 动画出现
    setTimeout(() => {
      tip.style.opacity = '1';
      tip.style.top = '120px';
    }, 100);

    // 3秒后消失
    setTimeout(() => {
      tip.style.opacity = '0';
      tip.style.top = '80px';
      setTimeout(() => tip.remove(), 500);
    }, 3000);

    // 清除 localStorage
    localStorage.removeItem('newPostTitle');
  }
});