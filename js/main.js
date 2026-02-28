(function () {
  'use strict';

  /* ========== LANGUAGE SWITCHING ========== */
  function switchLanguage(lang) {
    if (!I18N[lang]) return;
    const data = I18N[lang];
    document.documentElement.lang = data.htmlLang;
    document.documentElement.dir = data.dir;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (data[key] !== undefined) el.textContent = data[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (data[key] !== undefined) el.placeholder = data[key];
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria');
      if (data[key] !== undefined) el.setAttribute('aria-label', data[key]);
    });

    document.querySelectorAll('.nav__lang-btn').forEach(function (btn) {
      btn.classList.toggle('nav__lang-btn--active', btn.dataset.lang === lang);
    });

    try { localStorage.setItem('mango_lang', lang); } catch (e) { /* noop */ }
    showToast(data.langSwitched);
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: lang } }));
  }

  function initLanguage() {
    var params = new URLSearchParams(window.location.search);
    var lang = params.get('lang') || null;
    if (!lang) { try { lang = localStorage.getItem('mango_lang'); } catch (e) { /* noop */ } }
    if (lang && I18N[lang]) {
      switchLanguage(lang);
    }
  }

  document.querySelectorAll('.nav__lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { switchLanguage(btn.dataset.lang); });
  });

  /* ========== TOAST ========== */
  var toastTimer = null;
  function showToast(msg, type) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast' + (type ? ' toast--' + type : '');
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2500);
  }
  window.showToast = showToast;

  /* ========== NAVIGATION ========== */
  var nav = document.getElementById('nav');
  var hamburger = document.getElementById('nav-hamburger');
  var menu = document.getElementById('nav-menu');

  window.addEventListener('scroll', function () {
    nav.classList.toggle('nav--scrolled', window.scrollY > 50);
    var btt = document.getElementById('back-to-top');
    if (btt) btt.hidden = window.scrollY < 500;
  }, { passive: true });

  hamburger.addEventListener('click', function () {
    var open = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', !open);
    menu.classList.toggle('is-open', !open);
    document.body.style.overflow = !open ? 'hidden' : '';
  });

  menu.querySelectorAll('.nav__link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      hamburger.setAttribute('aria-expanded', 'false');
      menu.classList.remove('is-open');
      document.body.style.overflow = '';
      var target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ========== NAV ACTIVE STATE ========== */
  var sections = document.querySelectorAll('main > section[id]');
  var navLinks = document.querySelectorAll('.nav__link');

  var navObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        navLinks.forEach(function (link) {
          link.classList.toggle('nav__link--active',
            link.getAttribute('href') === '#' + entry.target.id);
        });
      }
    });
  }, { rootMargin: '-40% 0px -60% 0px' });

  sections.forEach(function (s) { navObserver.observe(s); });

  /* ========== SCROLL ANIMATIONS ========== */
  var animObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        animObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.anim-fade-up').forEach(function (el) {
    animObserver.observe(el);
  });

  /* ========== COUNTER ANIMATION ========== */
  var countersAnimated = false;
  var counterObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting && !countersAnimated) {
        countersAnimated = true;
        animateCounters();
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  var statsSection = document.querySelector('.about__stats');
  if (statsSection) counterObserver.observe(statsSection);

  function animateCounters() {
    document.querySelectorAll('[data-counter]').forEach(function (el) {
      var target = parseFloat(el.dataset.counter);
      var isDecimal = el.closest('[data-decimal]') !== null;
      var duration = 1500;
      var start = performance.now();

      function update(now) {
        var elapsed = now - start;
        var pct = Math.min(elapsed / duration, 1);
        var ease = 1 - Math.pow(1 - pct, 3);
        var val = target * ease;
        el.textContent = isDecimal ? val.toFixed(1) : Math.floor(val);
        if (pct < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    });
  }

  /* ========== HERO SCROLL BUTTON ========== */
  var heroScroll = document.querySelector('.hero__scroll');
  if (heroScroll) {
    heroScroll.addEventListener('click', function () {
      var about = document.getElementById('about');
      if (about) about.scrollIntoView({ behavior: 'smooth' });
    });
  }

  /* ========== BACK TO TOP ========== */
  var btt = document.getElementById('back-to-top');
  if (btt) {
    btt.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ========== GALLERY LIGHTBOX ========== */
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');
  var galleryItems = document.querySelectorAll('.gallery__item[data-index]');
  var currentLightboxIndex = 0;

  function openLightbox(idx) {
    currentLightboxIndex = idx;
    var item = galleryItems[idx];
    if (!item) return;
    var img = item.querySelector('img');
    lightboxImg.src = img.dataset.full || img.src;
    lightboxImg.alt = img.alt;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('lightbox-close').focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
    var item = galleryItems[currentLightboxIndex];
    if (item) item.focus();
  }

  function navigateLightbox(dir) {
    currentLightboxIndex = (currentLightboxIndex + dir + galleryItems.length) % galleryItems.length;
    var img = galleryItems[currentLightboxIndex].querySelector('img');
    lightboxImg.src = img.dataset.full || img.src;
    lightboxImg.alt = img.alt;
  }

  galleryItems.forEach(function (item) {
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.addEventListener('click', function () { openLightbox(parseInt(item.dataset.index)); });
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(parseInt(item.dataset.index)); }
    });
  });

  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox-prev').addEventListener('click', function () { navigateLightbox(-1); });
  document.getElementById('lightbox-next').addEventListener('click', function () { navigateLightbox(1); });

  lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', function (e) {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') navigateLightbox(-1);
    else if (e.key === 'ArrowRight') navigateLightbox(1);
  });

  /* ========== ATTRACTIONS SCROLL ========== */
  var attrTrack = document.getElementById('attractions-track');
  var attrPrev = document.getElementById('attr-prev');
  var attrNext = document.getElementById('attr-next');

  if (attrTrack && attrPrev && attrNext) {
    attrPrev.addEventListener('click', function () {
      attrTrack.scrollBy({ left: -320, behavior: 'smooth' });
    });
    attrNext.addEventListener('click', function () {
      attrTrack.scrollBy({ left: 320, behavior: 'smooth' });
    });
  }

  /* ========== ROOMS (Fallback + Dynamic) ========== */
  var FALLBACK_ROOMS = [
    { id: 1, slug: 'deluxe-ocean', name_zh: '豪华海景房', name_en: 'Deluxe Ocean View', name_ru: 'Делюкс с видом на море', desc_zh: '面朝南海，推窗即享270°无敌海景。宽敞明亮的客房配备高端寝具与智能设施。', desc_en: 'Facing the South China Sea with stunning 270° panoramic ocean views.', desc_ru: 'Лицом к Южно-Китайскому морю с потрясающей панорамой 270°.', price_cny: 688, price_usd: 98, size_sqm: 35, capacity: 2, bed_type_zh: '大床/双床', bed_type_en: 'King or Twin', bed_type_ru: 'Кинг/Твин', floor_range: '6-12F', image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80', amenities: ['ocean_view','balcony','wifi','minibar','safe','rain_shower','bathrobe','tv_55inch'] },
    { id: 2, slug: 'superior-suite', name_zh: '高级海景套房', name_en: 'Superior Ocean Suite', name_ru: 'Люкс с видом на море', desc_zh: '尊享55平米奢阔空间，独立客厅与卧室分区，270°环幕海景尽收眼底。', desc_en: 'Enjoy 55sqm of luxury with separate living room and bedroom.', desc_ru: 'Роскошные 55 м² с отдельной гостиной и спальней.', price_cny: 988, price_usd: 142, size_sqm: 55, capacity: 2, bed_type_zh: '特大床', bed_type_en: 'King', bed_type_ru: 'Кинг', floor_range: '10-16F', image_url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80', amenities: ['ocean_view','balcony','wifi','minibar','safe','rain_shower','bathrobe','tv_55inch','living_room','lounge'] },
    { id: 3, slug: 'family-ocean', name_zh: '家庭海景房', name_en: 'Family Ocean Room', name_ru: 'Семейный номер', desc_zh: '专为家庭设计的温馨港湾，45平米空间配备大床与双床。', desc_en: 'A warm family haven with 45sqm of space.', desc_ru: 'Уютная семейная гавань площадью 45 м².', price_cny: 888, price_usd: 128, size_sqm: 45, capacity: 4, bed_type_zh: '大床+双床', bed_type_en: 'King + Twin', bed_type_ru: 'Кинг + Твин', floor_range: '6-12F', image_url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80', amenities: ['ocean_view','balcony','wifi','minibar','safe','rain_shower','bathrobe','tv_55inch','kids_area'] },
    { id: 4, slug: 'presidential', name_zh: '总统海景套房', name_en: 'Presidential Suite', name_ru: 'Президентский люкс', desc_zh: '80平米至尊空间，独占顶层270°全海景。总统级奢华配置，私享管家服务。', desc_en: '80sqm of supreme space on the top floors with full 270° ocean panorama.', desc_ru: '80 м² высшего класса на верхних этажах.', price_cny: 1688, price_usd: 242, size_sqm: 80, capacity: 4, bed_type_zh: '特大床', bed_type_en: 'King', bed_type_ru: 'Кинг', floor_range: '16-18F', image_url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80', amenities: ['ocean_view','balcony','wifi','minibar','safe','rain_shower','bathrobe','tv_55inch','living_room','lounge','butler','jacuzzi'] }
  ];

  window.roomsData = null;

  function loadRooms() {
    var grid = document.getElementById('rooms-grid');
    var errorEl = document.getElementById('rooms-error');
    errorEl.hidden = true;

    fetch('/api/get-rooms')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
      .then(function (data) { window.roomsData = data; renderRooms(data); })
      .catch(function () {
        window.roomsData = FALLBACK_ROOMS;
        renderRooms(FALLBACK_ROOMS);
      });
  }

  function renderRooms(rooms) {
    var grid = document.getElementById('rooms-grid');
    var lang = getCurrentLang();
    var currency = document.getElementById('booking-currency');
    var cur = currency ? currency.value : 'CNY';

    grid.innerHTML = rooms.map(function (room) {
      var name = room['name_' + lang] || room.name_zh;
      var desc = room['desc_' + lang] || room.desc_zh;
      var bed = room['bed_type_' + lang] || room.bed_type_zh;
      var price = cur === 'USD' ? '$' + room.price_usd : '¥' + room.price_cny;
      var amenities = (room.amenities || []).slice(0, 5).map(function (a) {
        var key = 'amenity' + a.replace(/_./g, function (m) { return m[1].toUpperCase(); }).replace(/^./, function (m) { return m.toUpperCase(); });
        return '<span class="room-card__amenity">' + (t(key) || a) + '</span>';
      }).join('');

      return '<article class="room-card anim-fade-up is-visible" role="article">' +
        '<div class="room-card__image">' +
        '<img src="' + room.image_url + '" alt="' + name + '" loading="lazy" width="600" height="400">' +
        '<span class="room-card__price">' + price + t('roomPerNight') + '</span>' +
        '</div>' +
        '<div class="room-card__content">' +
        '<h3>' + name + '</h3>' +
        '<div class="room-card__meta">' + room.size_sqm + 'm² · ' + room.capacity + t('roomCapacityUnit') + ' · ' + bed + ' · ' + room.floor_range + '</div>' +
        '<p class="room-card__desc">' + desc + '</p>' +
        '<div class="room-card__amenities">' + amenities + '</div>' +
        '<button class="btn btn--primary" data-room="' + room.slug + '">' + t('roomBookBtn') + '</button>' +
        '</div></article>';
    }).join('');

    grid.querySelectorAll('[data-room]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.selectRoomAndScroll(btn.dataset.room);
      });
    });

    populateBookingRoomSelect(rooms);
  }

  function populateBookingRoomSelect(rooms) {
    var sel = document.getElementById('booking-room-type');
    if (!sel) return;
    var lang = getCurrentLang();
    var opts = '<option value="">' + t('bookingSelectRoom') + '</option>';
    rooms.forEach(function (r) {
      var name = r['name_' + lang] || r.name_zh;
      opts += '<option value="' + r.id + '" data-slug="' + r.slug + '">' + name + '</option>';
    });
    sel.innerHTML = opts;
  }

  window.selectRoomAndScroll = function (slug) {
    var sel = document.getElementById('booking-room-type');
    if (sel) {
      var opt = sel.querySelector('[data-slug="' + slug + '"]');
      if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change')); }
    }
    var booking = document.getElementById('booking');
    if (booking) booking.scrollIntoView({ behavior: 'smooth' });
  };

  document.getElementById('rooms-retry').addEventListener('click', loadRooms);

  document.addEventListener('langchange', function () {
    if (window.roomsData) renderRooms(window.roomsData);
  });

  /* ========== REVIEWS (Fallback) ========== */
  var FALLBACK_REVIEWS = [
    { guest_name: '张明辉', rating: 5, title: '海景绝美，服务一流', content: '从阳台望去就是无敌海景，管家服务非常贴心，早餐也很丰富。2019年翻新后设施都很新，推荐入住海景套房！', lang: 'zh', created_at: '2025-12-15' },
    { guest_name: '李雪梅', rating: 4, title: '位置便利，值得推荐', content: '离大东海走路就能到，酒店2019年翻新后很干净整洁。前台服务热情，帮忙预约了景点门票。性价比很高的海景酒店。', lang: 'zh', created_at: '2025-11-20' },
    { guest_name: 'James W.', rating: 5, title: 'Breathtaking Ocean Views', content: 'The balcony view is absolutely stunning. Staff were incredibly helpful and the rooms are spotless after the 2019 renovation. Highly recommend the Superior Suite!', lang: 'en', created_at: '2025-10-08' },
    { guest_name: 'Sarah K.', rating: 4, title: 'Great Location, Clean Rooms', content: 'Walking distance to Dadonghai Beach. Renovated in 2019, everything feels fresh and modern. The breakfast buffet has great variety. Will come back!', lang: 'en', created_at: '2025-09-14' },
    { guest_name: 'Алексей П.', rating: 5, title: 'Потрясающий вид на море', content: 'Вид с балкона просто невероятный. Персонал очень внимательный и всегда готов помочь. После ремонта 2019 года номера в отличном состоянии.', lang: 'ru', created_at: '2025-08-22' },
    { guest_name: 'Мария С.', rating: 4, title: 'Отличное расположение', content: 'Близко к пляжу Дадунхай, номера чистые после ремонта 2019 года. Завтрак разнообразный с тропическими фруктами. Рекомендую семьям!', lang: 'ru', created_at: '2025-07-18' }
  ];

  function loadReviews() {
    fetch('/api/get-reviews')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
      .then(function (data) { renderReviews(data.length ? data : FALLBACK_REVIEWS); })
      .catch(function () { renderReviews(FALLBACK_REVIEWS); });
  }

  function renderReviews(reviews) {
    var track = document.getElementById('reviews-track');
    if (!track) return;

    track.innerHTML = reviews.map(function (r) {
      var initial = r.guest_name.charAt(0).toUpperCase();
      var stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      var date = r.created_at ? new Date(r.created_at).toLocaleDateString() : '';
      return '<div class="review-card">' +
        '<div class="review-card__header">' +
        '<div class="review-card__avatar">' + initial + '</div>' +
        '<div><div class="review-card__name">' + escapeHtml(r.guest_name) + '</div>' +
        '<div class="review-card__date">' + date + '</div></div></div>' +
        '<div class="review-card__stars">' + stars + '</div>' +
        (r.title ? '<div class="review-card__title">' + escapeHtml(r.title) + '</div>' : '') +
        '<div class="review-card__content">' + escapeHtml(r.content) + '</div></div>';
    }).join('');
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  window.escapeHtml = escapeHtml;

  /* ========== OFFLINE DETECTION ========== */
  var offlineBar = document.getElementById('offline-bar');
  window.addEventListener('online', function () { offlineBar.hidden = true; });
  window.addEventListener('offline', function () { offlineBar.hidden = false; });

  /* ========== INIT ========== */
  initLanguage();
  loadRooms();
  loadReviews();
})();
