document.addEventListener('DOMContentLoaded', function() {
  // 获取目录链接和内容标题元素
  const tocLinks = document.querySelectorAll('.toc a');
  const headers = document.querySelectorAll('.content h1[id], .content h2[id]');
  
  // 点击跳转功能
  tocLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      
      if (!targetId.startsWith('#') || targetId === '#') {
        return;
      }
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        
        // 平滑滚动到目标位置
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        
        // 高亮当前选中的目录项
        tocLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');
      }
    });
  });

  // 使用Intersection Observer来检测标题元素的可见性
  const observerOptions = {
    root: null, // 使用视口作为根元素
    rootMargin: '0px 0px -80% 0px', // 当元素进入视口上部20%时触发
    threshold: 0.1 // 当元素至少有10%可见时触发
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const currentId = entry.target.getAttribute('id');
        
        // 移除所有高亮
        tocLinks.forEach(link => link.classList.remove('active'));
        
        // 为当前标题对应的目录项添加高亮
        const activeLink = document.querySelector(`.toc a[href="#${currentId}"]`);
        if (activeLink) {
          activeLink.classList.add('active');
          
          // 确保高亮的目录项在视口中可见
          activeLink.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }
    });
  }, observerOptions);

  // 观察所有标题元素
  headers.forEach(header => {
    observer.observe(header);
  });
  
  // 初始化高亮第一个目录项
  if (tocLinks.length > 0 && headers.length > 0) {
    tocLinks[0].classList.add('active');
  }
});