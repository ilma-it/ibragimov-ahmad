/**
 * Умная Теплица - Portfolio Application Logic
 */

// Initialize theme immediately
(function() {
  const saved = localStorage.getItem('theme') || 'dark';
  if (saved === 'light') {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTelemetrySimulator();
  initGalleryFilter();
  initLightbox();
  initNavigationHighlight();
  initCustomVideoPlayer();
});

/* -------------------------------------------------------------
 * 0. Переключение темы (Светлая / Тёмная) с плавной анимацией
 * ----------------------------------------------------------- */
let themeTransitionTimeout = null;

function initTheme() {
  const isLight = document.documentElement.classList.contains('light');
  updateThemeIcons(isLight ? 'light' : 'dark');

  // Горячая клавиша: T / Е для быстрого переключения темы
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 't' || e.key === 'T' || e.key === 'е' || e.key === 'Е') {
      toggleTheme();
    }
  });
}

function enableThemeTransitionFallback() {
  document.documentElement.classList.add('theme-transitioning');
  if (themeTransitionTimeout) clearTimeout(themeTransitionTimeout);
  themeTransitionTimeout = setTimeout(() => {
    document.documentElement.classList.remove('theme-transitioning');
    themeTransitionTimeout = null;
  }, 600);
}

function toggleTheme(event) {
  const isLight = document.documentElement.classList.contains('light');
  const newTheme = isLight ? 'dark' : 'light';

  // Запуск вращения иконки на всех кнопках переключения темы
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.classList.add('theme-spinning');
    setTimeout(() => btn.classList.remove('theme-spinning'), 550);
  });

  // Определение точки происхождения анимации (координаты клика или центра кнопки)
  let x = window.innerWidth / 2;
  let y = 0;
  if (event && (event.clientX || event.clientY)) {
    x = event.clientX;
    y = event.clientY;
  } else if (event && event.currentTarget) {
    const rect = event.currentTarget.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  } else {
    const activeBtn = document.querySelector('.theme-toggle-btn:hover') || document.querySelector('.theme-toggle-btn');
    if (activeBtn) {
      const rect = activeBtn.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }
  }

  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  // Проверка поддержки View Transitions API и отсутствия prefers-reduced-motion
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (document.startViewTransition && !prefersReduced) {
    const transition = document.startViewTransition(() => {
      applyTheme(newTheme);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
          ]
        },
        {
          duration: 550,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)'
        }
      );
    });
    return;
  }

  // Фоллбэк: плавная CSS-интерполяция свойств
  enableThemeTransitionFallback();
  applyTheme(newTheme);
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  }
  try {
    localStorage.setItem('theme', theme);
  } catch (e) {}
  updateThemeIcons(theme);

  // Обновление 3D вьюера (плавный переход тумана и фона)
  if (window.greenhouseViewer && typeof window.greenhouseViewer.updateTheme === 'function') {
    window.greenhouseViewer.updateTheme(theme);
  }
}

function updateThemeIcons(theme) {
  const isLight = theme === 'light';
  const icons = document.querySelectorAll('.theme-icon');
  icons.forEach(icon => {
    icon.textContent = isLight ? 'dark_mode' : 'light_mode';
  });

  const buttons = document.querySelectorAll('.theme-toggle-btn');
  buttons.forEach(btn => {
    btn.setAttribute('title', isLight ? 'Включить тёмную тему' : 'Включить светлую тему');
  });
}

window.toggleTheme = toggleTheme;
window.applyTheme = applyTheme;

/* -------------------------------------------------------------
 * 1. Живая симуляция телеметрии датчиков
 * ----------------------------------------------------------- */
function initTelemetrySimulator() {
  const tempEl = document.getElementById('telemetry-temp');
  const humEl = document.getElementById('telemetry-hum');
  const lightEl = document.getElementById('telemetry-light');

  if (!tempEl && !humEl && !lightEl) return;

  setInterval(() => {
    if (tempEl) {
      const baseTemp = 24.5;
      const variation = (Math.random() * 0.4 - 0.2).toFixed(1);
      tempEl.textContent = (baseTemp + parseFloat(variation)).toFixed(1) + '°C';
    }
    if (humEl) {
      const baseHum = 68;
      const variation = Math.floor(Math.random() * 3 - 1);
      humEl.textContent = (baseHum + variation) + '%';
    }
    if (lightEl) {
      const baseLight = 85;
      const variation = Math.floor(Math.random() * 3 - 1);
      lightEl.textContent = (baseLight + variation) + '%';
    }
  }, 4000);
}

/* -------------------------------------------------------------
 * 2. Фильтрация галереи (Все / Рендеры / Чертежи и 3D)
 * ----------------------------------------------------------- */
function initGalleryFilter() {
  const filterBtns = document.querySelectorAll('[data-filter-btn]');
  const galleryItems = document.querySelectorAll('[data-gallery-category]');

  if (!filterBtns.length || !galleryItems.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const filter = btn.getAttribute('data-filter-btn');

      // Update button styles cleanly via active class (no class text collisions)
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Filter gallery items
      galleryItems.forEach(item => {
        const category = item.getAttribute('data-gallery-category');
        if (filter === 'all' || category === filter) {
          item.style.display = '';
          setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'scale(1)';
          }, 50);
        } else {
          item.style.opacity = '0';
          item.style.transform = 'scale(0.95)';
          setTimeout(() => {
            item.style.display = 'none';
          }, 300);
        }
      });
    });
  });
}

/* -------------------------------------------------------------
 * 3. Полноэкранный Lightbox для просмотра фото
 * ----------------------------------------------------------- */
let currentLightboxIndex = 0;
let lightboxItems = [];

function initLightbox() {
  const modal = document.getElementById('lightbox-modal');
  if (!modal) return;

  const imgEl = modal.querySelector('#lightbox-img');
  const titleEl = modal.querySelector('#lightbox-title');
  const catEl = modal.querySelector('#lightbox-cat');
  const closeBtn = modal.querySelector('#lightbox-close');
  const prevBtn = modal.querySelector('#lightbox-prev');
  const nextBtn = modal.querySelector('#lightbox-next');

  // Collect all clickable photo items
  const clickableItems = Array.from(document.querySelectorAll('[data-lightbox-src]'));
  lightboxItems = clickableItems.map(el => ({
    src: el.getAttribute('data-lightbox-src'),
    title: el.getAttribute('data-lightbox-title') || '',
    cat: el.getAttribute('data-lightbox-cat') || ''
  }));

  function showImage(index) {
    if (!lightboxItems.length) return;
    currentLightboxIndex = (index + lightboxItems.length) % lightboxItems.length;
    const item = lightboxItems[currentLightboxIndex];

    if (imgEl) {
      imgEl.style.opacity = '0';
      imgEl.src = item.src;
      imgEl.onload = () => { imgEl.style.opacity = '1'; };
    }
    if (titleEl) titleEl.textContent = item.title;
    if (catEl) catEl.textContent = item.cat;
  }

  function openLightbox(index) {
    showImage(index);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  clickableItems.forEach((el, index) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      openLightbox(index);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', () => showImage(currentLightboxIndex - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => showImage(currentLightboxIndex + 1));

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeLightbox();
  });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showImage(currentLightboxIndex - 1);
    if (e.key === 'ArrowRight') showImage(currentLightboxIndex + 1);
  });
}

/* -------------------------------------------------------------
 * 4. Интерактивная навигация: мгновенная подсветка вкладок и ScrollSpy
 * ----------------------------------------------------------- */
function initNavigationHighlight() {
  const sections = ['hero', 'gallery', 'model3d', 'about'];
  let isManualScrolling = false;
  let scrollTimeout = null;

  function setActiveTarget(targetId) {
    if (!targetId) return;

    // Desktop tabs
    document.querySelectorAll('#desktop-nav [data-nav-target]').forEach(link => {
      const isMatch = link.getAttribute('data-nav-target') === targetId;
      link.classList.toggle('active', isMatch);
    });

    // Mobile tabs
    document.querySelectorAll('#mobile-nav [data-nav-target]').forEach(link => {
      const isMatch = link.getAttribute('data-nav-target') === targetId;
      link.classList.toggle('active', isMatch);
      const icon = link.querySelector('.material-symbols-outlined');
      if (icon) {
        icon.style.fontVariationSettings = isMatch ? "'FILL' 1" : "'FILL' 0";
      }
    });

    // Standalone subpage links (e.g. gallery.html or model3d.html)
    const currentFile = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('header nav a[href$=".html"], #mobile-nav a[href$=".html"]').forEach(link => {
      const href = link.getAttribute('href');
      const isCurrent = (href === currentFile);
      link.classList.toggle('active', isCurrent);
      const icon = link.querySelector('.material-symbols-outlined');
      if (icon && link.closest('#mobile-nav')) {
        icon.style.fontVariationSettings = isCurrent ? "'FILL' 1" : "'FILL' 0";
      }
    });
  }

  function handleNavClick(targetId, e) {
    if (!targetId || !sections.includes(targetId)) return;
    
    // Immediately transfer active glow
    setActiveTarget(targetId);
    
    // Smooth scroll to target section
    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      if (e) e.preventDefault();
      targetEl.scrollIntoView({ behavior: 'smooth' });
      history.replaceState(null, null, `#${targetId}`);
    }

    // Lock ScrollSpy while smooth scrolling
    isManualScrolling = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isManualScrolling = false;
    }, 1000);
  }

  // Handle click on all navigation targets (desktop & mobile)
  document.querySelectorAll('[data-nav-target]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = link.getAttribute('data-nav-target');
      handleNavClick(target, e);
    });
  });

  // Also handle in-page CTA buttons (e.g. href="#gallery", href="#model3d")
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const hash = link.getAttribute('href').replace('#', '');
      if (sections.includes(hash)) {
        handleNavClick(hash, e);
      }
    });
  });

  // ScrollSpy with IntersectionObserver & ratio tracking
  if ('IntersectionObserver' in window) {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -50% 0px',
      threshold: [0.1, 0.3, 0.6]
    };

    const sectionElements = sections.map(id => document.getElementById(id)).filter(Boolean);

    if (sectionElements.length > 0) {
      const intersectionMap = new Map();

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          intersectionMap.set(entry.target.id, entry);
        });

        if (isManualScrolling) return;

        // Find intersecting section with highest visible ratio
        let bestTarget = null;
        let maxRatio = 0;

        intersectionMap.forEach((entry, id) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            bestTarget = id;
          }
        });

        if (bestTarget) {
          setActiveTarget(bestTarget);
        }
      }, observerOptions);

      sectionElements.forEach(el => observer.observe(el));
    }
  }

  // Edge detection for very top and very bottom of the page
  window.addEventListener('scroll', () => {
    if (isManualScrolling) return;
    
    if (window.scrollY < 80) {
      setActiveTarget('hero');
    } else if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 60) {
      setActiveTarget('about');
    }
  }, { passive: true });

  // Set initial active state based on URL hash or default to hero / current file
  const hash = window.location.hash.replace('#', '');
  if (hash && sections.includes(hash)) {
    setActiveTarget(hash);
  } else {
    setActiveTarget('hero');
  }
}

/* -------------------------------------------------------------
 * 5. Кастомный видеоплеер
 * ----------------------------------------------------------- */
function initCustomVideoPlayer() {
  const videoContainer = document.querySelector('[data-video-container]');
  if (!videoContainer) return;

  const video = videoContainer.querySelector('video');
  const playBtn = videoContainer.querySelector('[data-video-play]');
  const playOverlay = videoContainer.querySelector('[data-play-overlay]');
  const muteBtn = videoContainer.querySelector('[data-video-mute]');
  const fullscreenBtn = videoContainer.querySelector('[data-video-fullscreen]');

  if (!video) return;

  function togglePlay() {
    if (video.paused || video.ended) {
      video.play();
      if (playOverlay) playOverlay.style.opacity = '0';
      if (playBtn) playBtn.innerHTML = '<span class="material-symbols-outlined">pause</span>';
    } else {
      video.pause();
      if (playOverlay) playOverlay.style.opacity = '1';
      if (playBtn) playBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span>';
    }
  }

  if (playBtn) playBtn.addEventListener('click', togglePlay);
  if (playOverlay) playOverlay.addEventListener('click', togglePlay);
  video.addEventListener('click', togglePlay);

  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      video.muted = !video.muted;
      muteBtn.innerHTML = video.muted 
        ? '<span class="material-symbols-outlined">volume_off</span>' 
        : '<span class="material-symbols-outlined">volume_up</span>';
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        videoContainer.requestFullscreen().catch(err => {
          console.warn('Fullscreen error:', err);
        });
      } else {
        document.exitFullscreen();
      }
    });
  }
}
