if (window.__pulseNewsInitialized) {
  console.warn('PulseNews App is already initialized. Skipping redundant initialization.');
} else {
  window.__pulseNewsInitialized = true;

  document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    // 글로벌 상태 공유를 통해 스크립트 재실행 시에도 동일한 기사 목록을 공유하도록 보장
    if (!window.pulseNewsList) {
      window.pulseNewsList = [...INITIAL_NEWS];
    }
    let newsList = window.pulseNewsList;
    let currentCategory = 'all';
    let searchQuery = '';
    let bookmarkedIds = JSON.parse(localStorage.getItem('pulse_news_bookmarks')) || [];
    
    // Simulated news pool index tracker to avoid exact duplicates if possible
    let simulatedIndex = 0;

    // --- DOM Elements ---
    const newsGrid = document.getElementById('news-grid');
    const featuredPlaceholder = document.getElementById('featured-placeholder');
    const featuredSection = document.getElementById('featured-section');
    const feedCountBadge = document.getElementById('feed-count');
    const noResultsEl = document.getElementById('no-results');
    
    const inputSearch = document.getElementById('input-search');
    const categoryButtons = document.querySelectorAll('.category-btn');
    const btnResetFilters = document.getElementById('btn-reset-filters');
    
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    const btnSimulateNews = document.getElementById('btn-simulate-news');
    
    const btnBookmarksToggle = document.getElementById('btn-bookmarks-toggle');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const bookmarkDrawer = document.getElementById('bookmark-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const bookmarkListEl = document.getElementById('bookmark-list');
    const bookmarkBadge = document.getElementById('bookmark-badge');
    
    const articleModal = document.getElementById('article-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const modalContent = document.getElementById('modal-article-content');
    const toastContainer = document.getElementById('toast-container');

    // --- Init functions ---
    initTheme();
    renderApp();

    // --- Theme Controller ---
    function initTheme() {
      const savedTheme = localStorage.getItem('pulse_news_theme') || 'dark';
      if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
      }
    }

    btnThemeToggle.addEventListener('click', () => {
      if (document.body.classList.contains('dark-theme')) {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        localStorage.setItem('pulse_news_theme', 'light');
        showToast('라이트 모드로 전환되었습니다.', 'info');
      } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        localStorage.setItem('pulse_news_theme', 'dark');
        showToast('다크 모드로 전환되었습니다.', 'info');
      }
    });

    // --- Toast Notification Engine ---
    function showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      
      // Add appropriate icon based on type
      let icon = '';
      if (type === 'success') {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      } else {
        icon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
      }

      toast.innerHTML = `${icon}<span>${message}</span>`;
      toastContainer.appendChild(toast);

      // Auto fade out
      setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
          toast.remove();
        });
      }, 3000);
    }

    // --- Search and Category Filters ---
    categoryButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        categoryButtons.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentCategory = e.currentTarget.dataset.category;
        renderApp();
      });
    });

    inputSearch.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderApp();
    });

    btnResetFilters.addEventListener('click', () => {
      inputSearch.value = '';
      searchQuery = '';
      currentCategory = 'all';
      categoryButtons.forEach(b => b.classList.remove('active'));
      document.getElementById('cat-all').classList.add('active');
      renderApp();
    });

    // --- Real-time News Simulation ---
    btnSimulateNews.addEventListener('click', () => {
      if (btnSimulateNews.disabled) return;

      // 광클 방지 쓰로틀링: 버튼 즉시 비활성화 및 투명도 변경
      btnSimulateNews.disabled = true;
      btnSimulateNews.style.opacity = '0.6';
      btnSimulateNews.style.cursor = 'not-allowed';

      // 800ms 후 버튼 재활성화 헬퍼 함수
      const reEnableButton = () => {
        setTimeout(() => {
          btnSimulateNews.disabled = false;
          btnSimulateNews.style.opacity = '';
          btnSimulateNews.style.cursor = '';
        }, 800);
      };

      if (SIMULATED_POOL.length === 0) {
        reEnableButton();
        return;
      }
      
      // 중복 방지: 이미 피드(newsList)에 있는 제목의 기사는 제외하고 아직 로드되지 않은 속보만 필터링합니다. (trim 공백 처리 추가)
      const unusedNews = SIMULATED_POOL.filter(poolItem => 
        !newsList.some(activeItem => activeItem.title.trim() === poolItem.title.trim())
      );

      if (unusedNews.length === 0) {
        showToast('📢 모든 스마트팜 최신 속보가 피드에 이미 반영되었습니다!', 'info');
        reEnableButton();
        return;
      }

      // 미사용한 첫 번째 속보 기사 선택
      const baseNews = unusedNews[0];

      // 밀리초와 무작위 난수를 결합하여 완벽하게 고유한 ID 생성 보장
      const uniqueId = `simulated-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const newArticle = {
        ...baseNews,
        id: uniqueId,
        date: '방금 전',
        isFeatured: false,
        // Add a visual flag for animation trigger
        isNew: true
      };

      // Prepend to list
      newsList.unshift(newArticle);
      
      showToast('⚡ 속보: 새로운 스마트팜 최신 기사가 업데이트되었습니다!', 'success');
      renderApp();
      reEnableButton();
    });

  // --- Main Render Engine ---
  function renderApp() {
    // 1. Filter articles based on state
    let filtered = newsList.filter(news => {
      const matchCategory = currentCategory === 'all' || news.category === currentCategory;
      const matchSearch = news.title.toLowerCase().includes(searchQuery) || 
                          news.summary.toLowerCase().includes(searchQuery);
      return matchCategory && matchSearch;
    });

    // Update count badge
    feedCountBadge.textContent = `기사 ${filtered.length}개`;
    bookmarkBadge.textContent = bookmarkedIds.length;

    // Toggle Empty State
    if (filtered.length === 0) {
      noResultsEl.classList.remove('hidden');
      featuredSection.style.display = 'none';
      newsGrid.innerHTML = '';
      return;
    } else {
      noResultsEl.classList.add('hidden');
    }

    // 2. Identify Featured Article
    // If we have search/filter, the featured spot might change to promote the top result
    let featuredArticle = null;
    let gridArticles = [];

    if (currentCategory === 'all' && !searchQuery) {
      // Standard: find the article flagged as featured
      featuredArticle = filtered.find(n => n.isFeatured) || filtered[0];
      gridArticles = filtered.filter(n => n.id !== featuredArticle.id);
      featuredSection.style.display = 'block';
    } else {
      // In search or filter mode, we still show the top match in the featured slot
      // to keep the visual hierarchy premium and high-end!
      featuredArticle = filtered[0];
      gridArticles = filtered.slice(1);
      featuredSection.style.display = 'block';
    }

    // Render Featured Slot
    renderFeatured(featuredArticle);

    // Render Remaining Card Grid
    renderGrid(gridArticles);

    // Render Bookmarks inside Sidebar
    renderBookmarks();
  }

  // --- Render Sub-functions ---
  function renderFeatured(article) {
    if (!article) {
      featuredSection.style.display = 'none';
      return;
    }

    const isBookmarked = bookmarkedIds.includes(article.id);
    
    featuredPlaceholder.innerHTML = `
      <div class="featured-card" data-id="${article.id}">
        <div class="featured-img-container">
          <img src="${article.imageUrl}" alt="${article.title}">
          <span class="card-badge">${article.badge}</span>
        </div>
        <div class="featured-content">
          <div class="card-meta">
            <span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              ${article.author}
            </span>
            <span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              ${article.date} (${article.readTime} 소요)
            </span>
            ${article.originalUrl ? `
            <span>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              <a href="${article.originalUrl}" target="_blank" style="color: var(--accent-light); text-decoration: underline; font-weight: 600;" onclick="event.stopPropagation();">원문 보기 ↗</a>
            </span>
            ` : ''}
          </div>
          <h3>${article.title}</h3>
          <p>${article.summary}</p>
          <div class="card-footer">
            <span class="btn-readmore">
              기사 전체 읽기
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </span>
            <button class="btn-bookmark ${isBookmarked ? 'bookmarked' : ''}" data-id="${article.id}" aria-label="북마크 토글" title="나중에 읽기">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    // Click handler for featured card
    const cardEl = featuredPlaceholder.querySelector('.featured-card');
    cardEl.addEventListener('click', (e) => {
      // Prevent modal opening when clicking bookmark button
      if (e.target.closest('.btn-bookmark')) return;
      openArticleModal(article.id);
    });

    // Bookmark button handler
    const bkmkBtn = featuredPlaceholder.querySelector('.btn-bookmark');
    bkmkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBookmark(article.id);
    });
  }

  function renderGrid(articles) {
    if (articles.length === 0) {
      newsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-muted); font-size: 0.95rem;">
          이 카테고리의 추가 뉴스가 준비 중입니다. 오늘의 주요 뉴스를 확인해 보세요!
        </div>
      `;
      return;
    }

    newsGrid.innerHTML = '';
    articles.forEach(article => {
      const isBookmarked = bookmarkedIds.includes(article.id);
      
      const card = document.createElement('article');
      // Apply sliding animation class if it's newly simulated
      card.className = `news-card ${article.isNew ? 'animate-slide-up' : ''}`;
      card.dataset.id = article.id;
      
      card.innerHTML = `
        <div class="card-img-container">
          <img src="${article.imageUrl}" alt="${article.title}" loading="lazy">
          <span class="card-badge" style="background-color: var(--accent-light);">${article.badge}</span>
        </div>
        <div class="news-card-content">
          <div class="card-meta">
            <span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              ${article.author.split(' ')[0]}
            </span>
            <span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              ${article.date}
            </span>
            ${article.originalUrl ? `
            <span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              <a href="${article.originalUrl}" target="_blank" style="color: var(--accent-light); text-decoration: underline; font-weight: 600;" onclick="event.stopPropagation();">원문 ↗</a>
            </span>
            ` : ''}
          </div>
          <h3>${article.title}</h3>
          <p>${article.summary}</p>
          <div class="card-footer" style="margin-top: auto;">
            <span class="btn-readmore" style="font-size: 0.88rem;">
              더 읽기
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </span>
            <button class="btn-bookmark ${isBookmarked ? 'bookmarked' : ''}" data-id="${article.id}" aria-label="북마크 토글" title="나중에 읽기">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            </button>
          </div>
        </div>
      `;

      // Event listener for opening detail modal
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-bookmark')) return;
        openArticleModal(article.id);
      });

      // Bookmark button
      const bkmkBtn = card.querySelector('.btn-bookmark');
      bkmkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBookmark(article.id);
      });

      newsGrid.appendChild(card);
      
      // Clean up the transition flag after rendering
      if (article.isNew) {
        setTimeout(() => {
          delete article.isNew;
        }, 1000);
      }
    });
  }

  // --- Bookmark Logic ---
  function toggleBookmark(id) {
    const index = bookmarkedIds.indexOf(id);
    const article = newsList.find(n => n.id === id);
    
    if (!article) return;

    if (index === -1) {
      bookmarkedIds.push(id);
      showToast(`📌 '${article.title.substring(0, 15)}...'이 북마크에 추가되었습니다.`, 'success');
    } else {
      bookmarkedIds.splice(index, 1);
      showToast('❌ 북마크가 해제되었습니다.', 'info');
    }

    localStorage.setItem('pulse_news_bookmarks', JSON.stringify(bookmarkedIds));
    renderApp();
  }

  function renderBookmarks() {
    bookmarkListEl.innerHTML = '';
    
    const bookmarkedArticles = newsList.filter(n => bookmarkedIds.includes(n.id));
    
    if (bookmarkedArticles.length === 0) {
      bookmarkListEl.innerHTML = `
        <div class="bookmark-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          <p>북마크한 뉴스가 없습니다.</p>
          <span style="font-size: 0.8rem; color: var(--text-muted);">뉴스 카드의 북마크 아이콘을 클릭하여 나중에 읽을 뉴스를 보관하세요!</span>
        </div>
      `;
      return;
    }

    bookmarkedArticles.forEach(article => {
      const item = document.createElement('div');
      item.className = 'bookmark-item';
      item.innerHTML = `
        <div class="bookmark-item-img">
          <img src="${article.imageUrl}" alt="${article.title}">
        </div>
        <div class="bookmark-item-info">
          <h4>${article.title}</h4>
          <div class="bookmark-item-meta">
            <span>${article.date}</span>
            <button class="btn-remove-bookmark" data-id="${article.id}" title="북마크 해제">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.btn-remove-bookmark')) return;
        closeBookmarksDrawer();
        openArticleModal(article.id);
      });

      const removeBtn = item.querySelector('.btn-remove-bookmark');
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleBookmark(article.id);
      });

      bookmarkListEl.appendChild(item);
    });
  }

  // Drawer Toggle Handlers
  btnBookmarksToggle.addEventListener('click', () => {
    bookmarkDrawer.classList.add('open');
    drawerOverlay.classList.add('active');
  });

  btnCloseDrawer.addEventListener('click', closeBookmarksDrawer);
  drawerOverlay.addEventListener('click', closeBookmarksDrawer);

  function closeBookmarksDrawer() {
    bookmarkDrawer.classList.remove('open');
    drawerOverlay.classList.remove('active');
  }

  // --- Article Detail Modal Logic ---
  function openArticleModal(id) {
    const article = newsList.find(n => n.id === id);
    if (!article) return;

    modalContent.innerHTML = `
      <div class="modal-hero-img">
        <img src="${article.imageUrl}" alt="${article.title}">
      </div>
      <div class="modal-body">
        <span class="modal-category">${article.badge}</span>
        <h2 class="modal-title">${article.title}</h2>
        <div class="card-meta" style="margin-bottom: 2rem;">
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            ${article.author}
          </span>
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ${article.date} (${article.readTime} 소요)
          </span>
          ${article.originalUrl ? `
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            <a href="${article.originalUrl}" target="_blank" style="color: var(--accent-light); text-decoration: underline; font-weight: 600;" onclick="event.stopPropagation();">정부 공식 사업공고 및 기사 원문 링크 ↗</a>
          </span>
          ` : ''}
        </div>
        <div class="modal-text">
          ${article.content}
        </div>
      </div>
    `;

    articleModal.classList.add('open');
    articleModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // prevent background scrolling
  }

  function closeArticleModal() {
    articleModal.classList.remove('open');
    articleModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // restore scrolling
  }

  btnCloseModal.addEventListener('click', closeArticleModal);
  articleModal.addEventListener('click', (e) => {
    if (e.target === articleModal) {
      closeArticleModal();
    }
  });

  // Handle ESC key to close modal or drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeArticleModal();
      closeBookmarksDrawer();
    }
  });
});
}
