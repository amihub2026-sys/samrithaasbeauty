(() => {
  const WHATSAPP_NUMBER = ""; // Add business number with country code, e.g. 919876543210

  const cinema = document.querySelector('.cinema');
  const film = document.getElementById('film');
  const layers = [...document.querySelectorAll('.scene-layer')];
  const fill = document.getElementById('timelineFill');
  const sceneNumber = document.getElementById('sceneNumber');
  const nav = document.getElementById('nav');

  let duration = 70;
  let targetTime = 0;
  let activeScene = -1;
  let filmReady = false;
  let animationFrame = 0;
  let lastReverseSeek = 0;

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  film.muted = true;
  film.playsInline = true;
  film.setAttribute('playsinline', '');
  film.setAttribute('webkit-playsinline', '');

  function setScene(index) {
    if (index === activeScene) return;
    activeScene = index;
    layers.forEach((layer, i) => layer.classList.toggle('active', i === index));
    if (sceneNumber) sceneNumber.textContent = String(index + 1).padStart(2, '0');
  }

  function getProgress() {
    if (!cinema) return 0;
    const rect = cinema.getBoundingClientRect();
    const scrollable = Math.max(1, cinema.offsetHeight - innerHeight);
    return clamp(-rect.top / scrollable, 0, 1);
  }

  function syncInterface() {
    const progress = getProgress();
    targetTime = progress * Math.max(0.01, duration - 0.08);

    if (fill) fill.style.width = `${progress * 100}%`;
    setScene(Math.min(layers.length - 1, Math.floor(progress * layers.length)));
    nav?.classList.toggle('scrolled', scrollY > 45);

    if (!animationFrame) animationFrame = requestAnimationFrame(animateFilm);
  }

  function animateFilm(now) {
    animationFrame = 0;
    if (!filmReady) return;

    const actual = film.currentTime || 0;
    const diff = targetTime - actual;

    // FORWARD SCROLL: use real playback instead of frame-by-frame seeking.
    // This lets the browser decode consecutive frames naturally and removes the sticky feeling.
    if (diff > 0.10) {
      const rate = clamp(0.8 + diff * 0.34, 0.8, 3.25);
      if (Math.abs(film.playbackRate - rate) > 0.08) film.playbackRate = rate;

      if (film.paused) {
        const playPromise = film.play();
        if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(() => {});
      }

      animationFrame = requestAnimationFrame(animateFilm);
      return;
    }

    // When the movie catches the scroll position, stop cleanly instead of overshooting.
    if (diff >= -0.08) {
      if (!film.paused) film.pause();
      if (Math.abs(diff) > 0.025) {
        try { film.currentTime = targetTime; } catch (_) {}
      }
      return;
    }

    // REVERSE SCROLL: browsers do not provide dependable reverse playback,
    // so ease backwards with throttled seeks. Throttling avoids decoder overload.
    if (!film.paused) film.pause();
    if (!lastReverseSeek || now - lastReverseSeek >= 45) {
      lastReverseSeek = now;
      const eased = actual + diff * 0.28;
      try { film.currentTime = clamp(eased, 0, duration - 0.05); } catch (_) {}
    }

    if (Math.abs(diff) > 0.035) animationFrame = requestAnimationFrame(animateFilm);
  }

  function ready() {
    duration = Number.isFinite(film.duration) && film.duration > 0 ? film.duration : 70;
    filmReady = true;
    targetTime = getProgress() * (duration - 0.08);
    try { film.currentTime = targetTime; } catch (_) {}
    film.pause();
    syncInterface();
  }

  film.addEventListener('loadedmetadata', ready, { once: true });
  film.addEventListener('canplay', () => { if (!filmReady) ready(); }, { once: true });
  if (film.readyState >= 1) ready();

  addEventListener('scroll', syncInterface, { passive: true });
  addEventListener('resize', syncInterface, { passive: true });
  addEventListener('touchmove', syncInterface, { passive: true });

  // Keep playback constrained to the cinematic scroll section.
  film.addEventListener('timeupdate', () => {
    if (!filmReady || film.paused) return;
    if (film.currentTime > targetTime + 0.10) {
      film.pause();
      try { film.currentTime = targetTime; } catch (_) {}
    }
  });

  syncInterface();

  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  function closeMenu() {
    menuBtn?.classList.remove('open');
    mobileMenu?.classList.remove('open');
    menuBtn?.setAttribute('aria-expanded', 'false');
  }
  menuBtn?.addEventListener('click', () => {
    const open = !mobileMenu.classList.contains('open');
    mobileMenu.classList.toggle('open', open);
    menuBtn.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  const modal = document.getElementById('enquiryModal');
  const form = document.getElementById('enquiryForm');
  const serviceSelect = document.getElementById('serviceSelect');

  function openModal(service = 'General Appointment') {
    film.pause();
    if (serviceSelect) {
      const options = [...serviceSelect.options].map(o => o.value);
      if (!options.includes(service)) {
        const op = document.createElement('option');
        op.value = service;
        op.textContent = service;
        serviceSelect.appendChild(op);
      }
      serviceSelect.value = service;
    }
    modal?.classList.add('open');
    modal?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    closeMenu();
  }

  function closeModal() {
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  document.querySelectorAll('[data-enquiry]').forEach(btn =>
    btn.addEventListener('click', () => openModal(btn.dataset.enquiry || 'General Appointment'))
  );
  document.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeModal));
  addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  form?.addEventListener('submit', e => {
    e.preventDefault();
    const data = new FormData(form);
    const name = data.get('name') || '';
    const phone = data.get('phone') || '';
    const service = data.get('service') || 'General Appointment';
    const date = data.get('date') || 'Not specified';
    const message = data.get('message') || '';
    const text = `Hello Samrithaa's Beauty Parlour,%0A%0AI would like to enquire about: ${encodeURIComponent(service)}%0AName: ${encodeURIComponent(name)}%0APhone: ${encodeURIComponent(phone)}%0APreferred date: ${encodeURIComponent(date)}%0A${message ? `Message: ${encodeURIComponent(message)}%0A` : ''}%0APlease share availability and details.`;
    const url = WHATSAPP_NUMBER
      ? `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank', 'noopener');
  });
})();
