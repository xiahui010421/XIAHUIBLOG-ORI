// archive.js - 归档页面功能脚本

document.addEventListener('DOMContentLoaded', function() {
  const posts = Array.from(document.querySelectorAll('.post-card'));
  const currentFilter = document.getElementById('current-filter');
  const showAllItem = document.getElementById('show-all');
  
  // 随机图片数组
  const randomImages = [
    '/images/1.gif', 
    '/images/2.gif',
    '/images/3.gif',
    '/images/4.gif',
    '/images/5.gif',
    '/images/6.gif',
    '/images/7.gif',
    '/images/8.gif',
    '/images/9.gif',
   ];
  
  // 智能处理文章图片显示
  function handlePostImages() {
    posts.forEach(post => {
      // 查找文章中的所有图片（排除随机图片）
      const existingImages = post.querySelectorAll('img:not(.random-image)');
      
      // 检查是否有有效的文章图片
      const hasValidImage = Array.from(existingImages).some(img => {
        return img.src && 
               img.src !== '' && 
               !img.src.includes('placeholder') &&
               img.src !== window.location.origin + '/' &&
               img.complete &&
               img.naturalWidth > 0;
      });
      
      // 查找随机图片元素
      const randomImg = post.querySelector('.random-image');
      
      if (hasValidImage) {
        // 有文章图片，隐藏随机图片
        if (randomImg) {
          randomImg.style.display = 'none';
        }
      } else {
        // 没有文章图片，显示随机图片
        if (randomImg) {
          randomImg.style.display = '';
          
          // 为随机图片分配图片
          const randomIndex = Math.floor(Math.random() * randomImages.length);
          randomImg.src = randomImages[randomIndex];
          
          // 图片加载失败时使用第一张作为兜底
          randomImg.onerror = function() {
            this.src = randomImages[0];
          };
        }
      }
    });
  }
  
  // 执行智能图片处理
  handlePostImages();
  
  // 原有的随机图片处理逻辑（作为兜底）
  document.querySelectorAll('.random-image').forEach(img => {
    // 只处理显示状态的随机图片
    if (img.style.display !== 'none') {
      const randomIndex = Math.floor(Math.random() * randomImages.length);
      img.src = randomImages[randomIndex];
      
      // 图片加载失败时使用第一张作为兜底
      img.onerror = function() {
        this.src = randomImages[0];
      };
    }
  });
  
  // 提取分类和标签并统计数量
  const categoryCount = new Map();
  const tagCount = new Map();
  
  posts.forEach(post => {
    if (post.dataset.category) {
      post.dataset.category.split(',').forEach(cat => {
        if (cat.trim()) {
          categoryCount.set(cat.trim(), (categoryCount.get(cat.trim()) || 0) + 1);
        }
      });
    }
    if (post.dataset.tag) {
      post.dataset.tag.split(',').forEach(tag => {
        if (tag.trim()) {
          tagCount.set(tag.trim(), (tagCount.get(tag.trim()) || 0) + 1);
        }
      });
    }
  });

  // 填充分类和标签菜单
  function fillMenu(menuId, items, type) {
    const menu = document.getElementById(menuId);
    if (!menu) return;
    
    menu.innerHTML = '';
    // 按名称排序
    const sortedItems = Array.from(items).sort();
    
    sortedItems.forEach(item => {
      const count = type === 'category' ? categoryCount.get(item) : tagCount.get(item);
      const itemEl = document.createElement('div');
      itemEl.className = 'archive-submenu-item';
      itemEl.innerHTML = `
        <span title="${item}">${item}</span>
        <span class="archive-submenu-count">${count || 0}</span>
      `;
      itemEl.dataset.value = item;
      itemEl.dataset.type = type;
      itemEl.onclick = function() {
        // 清除所有活跃状态
        document.querySelectorAll('.archive-submenu-item, .show-all-item').forEach(el => {
          el.classList.remove('active');
        });
        this.classList.add('active');
        filterPosts(type, item);
        showCurrentFilter(type, item);
      };
      menu.appendChild(itemEl);
    });
  }
  
  fillMenu('category-submenu', Array.from(categoryCount.keys()).filter(Boolean), 'category');
  fillMenu('tag-submenu', Array.from(tagCount.keys()).filter(Boolean), 'tag');

  // 显示全部文章功能
  showAllItem.onclick = function() {
    document.querySelectorAll('.archive-submenu-item').forEach(el => {
      el.classList.remove('active');
    });
    this.classList.add('active');
    showAllPosts();
    hideCurrentFilter();
  };

  // 二级菜单折叠/展开功能
  document.querySelectorAll('.archive-group-title').forEach(title => {
    title.onclick = function() {
      const group = this.parentElement;
      group.classList.toggle('open');
    };
  });

  // 筛选功能
  function filterPosts(type, value) {
    let visibleCount = 0;
    posts.forEach(post => {
      let shouldShow = false;
      if (type === 'category') {
        shouldShow = post.dataset.category.split(',').map(c => c.trim()).includes(value);
      } else if (type === 'tag') {
        shouldShow = post.dataset.tag.split(',').map(t => t.trim()).includes(value);
      }
      post.style.display = shouldShow ? 'flex' : 'none';
      if (window.innerWidth <= 900 && shouldShow) {
        post.style.display = 'block';
      }
      if (shouldShow) visibleCount++;
    });
    
    // 如果没有匹配的文章，显示空状态
    if (visibleCount === 0) {
      showEmptyState();
    } else {
      hideEmptyState();
    }
  }

  // 显示全部文章
  function showAllPosts() {
    posts.forEach(post => {
      post.style.display = 'flex';
      if (window.innerWidth <= 900) {
        post.style.display = 'block';
      }
    });
    hideEmptyState();
  }

  // 显示当前筛选状态
  function showCurrentFilter(type, value) {
    const typeText = type === 'category' ? '分类' : '标签';
    currentFilter.textContent = `当前筛选：${typeText} - ${value}`;
    currentFilter.style.display = 'block';
  }

  // 隐藏筛选状态提示
  function hideCurrentFilter() {
    currentFilter.style.display = 'none';
  }

  // 显示空状态
  function showEmptyState() {
    const archiveList = document.getElementById('archive-list');
    let emptyEl = document.querySelector('.archive-empty');
    if (!emptyEl) {
      emptyEl = document.createElement('div');
      emptyEl.className = 'archive-empty';
      emptyEl.textContent = '没有找到匹配的文章';
      archiveList.appendChild(emptyEl);
    }
    emptyEl.style.display = 'block';
  }

  // 隐藏空状态
  function hideEmptyState() {
    const emptyEl = document.querySelector('.archive-empty');
    if (emptyEl) {
      emptyEl.style.display = 'none';
    }
  }

  // 响应式处理
  function handleResize() {
    const isMobile = window.innerWidth <= 900;
    posts.forEach(post => {
      if (post.style.display !== 'none') {
        post.style.display = isMobile ? 'block' : 'flex';
      }
    });
  }

  window.addEventListener('resize', handleResize);
});