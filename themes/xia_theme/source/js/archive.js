// archive.js - 修复版归档页面功能脚本

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
 
  // 处理文章图片显示 - 修复版
  function handlePostImages() {
    posts.forEach((post, index) => {
      const thumbnailDiv = post.querySelector('.post-thumbnail');
      const img = thumbnailDiv?.querySelector('img');
      
      if (!img) return;
      
      const hasThumbnail = img.dataset.hasThumbnail === 'true';
      const originalSrc = img.dataset.originalSrc;
      const postTitle = post.querySelector('.post-title')?.textContent.trim() || `文章${index + 1}`;
      
      console.log(`处理文章: ${postTitle}`, {
        hasThumbnail,
        originalSrc,
        currentSrc: img.src
      });
      
      if (hasThumbnail && originalSrc) {
        // 有原始图片的情况
        img.onload = function() {
          console.log(`✅ 文章 "${postTitle}" 的原始图片加载成功: ${this.src}`);
        };
        
        img.onerror = function() {
          console.log(`❌ 文章 "${postTitle}" 的原始图片加载失败: ${this.src}，切换到随机图片`);
          setRandomImage(this, index, postTitle);
        };
        
        // 确保src设置正确
        if (img.src !== originalSrc) {
          img.src = originalSrc;
        }
        
        // 检查图片是否已经加载失败
        setTimeout(() => {
          if (!img.complete || img.naturalWidth === 0) {
            console.log(`⚠️ 文章 "${postTitle}" 的图片未能正确加载，使用随机图片`);
            setRandomImage(img, index, postTitle);
          }
        }, 3000);
        
      } else {
        // 没有原始图片，使用随机图片
        console.log(`📝 文章 "${postTitle}" 没有原始图片，使用随机图片`);
        setRandomImage(img, index, postTitle);
      }
    });
  }
  
  // 设置随机图片 - 修复版
  function setRandomImage(imgElement, postIndex, postTitle = '') {
    // 确保每个 post 使用不同的图片，且图片分布均匀
    const imageIndex = postIndex % randomImages.length;
    const imageUrl = randomImages[imageIndex];
    
    imgElement.src = imageUrl;
    imgElement.classList.add('random-image');
    imgElement.dataset.hasThumbnail = 'false';
    
    console.log(`🎲 为文章 "${postTitle}" 设置随机图片: ${imageUrl}`);
    
    // 随机图片加载成功的处理
    imgElement.onload = function() {
      console.log(`✅ 随机图片加载成功: ${imageUrl}`);
    };
    
    // 随机图片加载失败时的处理
    imgElement.onerror = function() {
      console.warn(`❌ 随机图片加载失败: ${imageUrl}`);
      
      // 尝试使用下一张图片
      const nextIndex = (imageIndex + 1) % randomImages.length;
      const nextImageUrl = randomImages[nextIndex];
      
      if (this.src !== nextImageUrl) {
        console.log(`🔄 尝试下一张随机图片: ${nextImageUrl}`);
        this.src = nextImageUrl;
      } else {
        // 如果还是失败，使用 SVG 占位图
        console.log(`🆘 使用SVG占位图`);
        this.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
          <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
            <rect width="300" height="200" fill="#f0f0f0"/>
            <text x="150" y="100" text-anchor="middle" dominant-baseline="middle" 
                  font-family="Arial" font-size="16" fill="#999">
              图片加载中...
            </text>
          </svg>
        `);
        this.onload = null;
        this.onerror = null; // 防止无限循环
      }
    };
  }
  
  // 执行图片处理
  console.log('开始处理图片...');
  handlePostImages();
  
  // 延迟重新检查图片
  setTimeout(() => {
    console.log('延迟检查图片状态...');
    posts.forEach((post, index) => {
      const img = post.querySelector('.post-thumbnail img');
      const postTitle = post.querySelector('.post-title')?.textContent.trim() || `文章${index + 1}`;
      
      if (img) {
        // 检查原始图片是否加载成功
        if (img.dataset.hasThumbnail === 'true' && (!img.complete || img.naturalHeight === 0)) {
          console.log(`🔄 延迟检查: 文章 "${postTitle}" 的原始图片未加载成功，切换到随机图片`);
          setRandomImage(img, index, postTitle);
        }
        // 检查随机图片是否加载成功
        else if (img.classList.contains('random-image') && (!img.complete || img.naturalHeight === 0)) {
          console.log(`🔄 延迟检查: 重新设置随机图片 for "${postTitle}"`);
          setRandomImage(img, index, postTitle);
        }
      }
    });
  }, 5000);
  
  // 提取分类和标签并统计数量
  const categoryCount = new Map();
  const tagCount = new Map();
  
  posts.forEach(post => {
    if (post.dataset.category) {
      post.dataset.category.split(',').forEach(cat => {
        const cleanCat = cat.trim();
        if (cleanCat) {
          categoryCount.set(cleanCat, (categoryCount.get(cleanCat) || 0) + 1);
        }
      });
    }
    if (post.dataset.tag) {
      post.dataset.tag.split(',').forEach(tag => {
        const cleanTag = tag.trim();
        if (cleanTag) {
          tagCount.set(cleanTag, (tagCount.get(cleanTag) || 0) + 1);
        }
      });
    }
  });

  // 填充分类和标签菜单
  function fillMenu(menuId, items, type) {
    const menu = document.getElementById(menuId);
    if (!menu) return;
    
    menu.innerHTML = '';
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
  if (showAllItem) {
    showAllItem.onclick = function() {
      document.querySelectorAll('.archive-submenu-item').forEach(el => {
        el.classList.remove('active');
      });
      this.classList.add('active');
      showAllPosts();
      hideCurrentFilter();
    };
  }

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
      if (type === 'category' && post.dataset.category) {
        shouldShow = post.dataset.category.split(',').map(c => c.trim()).includes(value);
      } else if (type === 'tag' && post.dataset.tag) {
        shouldShow = post.dataset.tag.split(',').map(t => t.trim()).includes(value);
      }
      
      post.style.display = shouldShow ? 'flex' : 'none';
      if (window.innerWidth <= 900 && shouldShow) {
        post.style.display = 'block';
      }
      if (shouldShow) visibleCount++;
    });
    
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
    if (currentFilter) {
      const typeText = type === 'category' ? '分类' : '标签';
      currentFilter.textContent = `当前筛选：${typeText} - ${value}`;
      currentFilter.style.display = 'block';
    }
  }

  // 隐藏筛选状态提示
  function hideCurrentFilter() {
    if (currentFilter) {
      currentFilter.style.display = 'none';
    }
  }

  // 显示空状态
  function showEmptyState() {
    const archiveList = document.getElementById('archive-list');
    if (!archiveList) return;
    
    let emptyEl = document.querySelector('.archive-empty');
    if (!emptyEl) {
      emptyEl = document.createElement('div');
      emptyEl.className = 'archive-empty';
      emptyEl.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #666;">
          <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
          <h3 style="margin: 0 0 8px 0; color: #333;">没有找到匹配的文章</h3>
          <p style="margin: 0; font-size: 14px;">试试其他筛选条件吧</p>
        </div>
      `;
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
  
  // 调试信息
  const postsWithThumbnails = posts.filter(p => p.querySelector('img[data-has-thumbnail="true"]')).length;
  const postsWithRandomImages = posts.filter(p => p.querySelector('img[data-has-thumbnail="false"]')).length;
  
  console.log('Archive page loaded:', {
    postsCount: posts.length,
    categoriesCount: categoryCount.size,
    tagsCount: tagCount.size,
    randomImagesCount: randomImages.length,
    postsWithThumbnails,
    postsWithRandomImages
  });
  
  // 输出所有文章的图片信息用于调试
  posts.forEach((post, index) => {
    const img = post.querySelector('.post-thumbnail img');
    const title = post.querySelector('.post-title')?.textContent.trim();
    if (img) {
      console.log(`文章 ${index + 1}: "${title}"`, {
        hasThumbnail: img.dataset.hasThumbnail,
        originalSrc: img.dataset.originalSrc,
        currentSrc: img.src,
        isRandomImage: img.classList.contains('random-image')
      });
    }
  });
});