(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const siteLoader = document.querySelector('#site-loader');
  if (siteLoader) {
    let hasSeenIntro = false;
    try { hasSeenIntro = sessionStorage.getItem('fifthavenue-intro-seen') === '1'; } catch (_) {}
    if (hasSeenIntro || reducedMotion) {
      siteLoader.remove();
    } else {
      try { sessionStorage.setItem('fifthavenue-intro-seen', '1'); } catch (_) {}
      const dismissLoader = () => {
        window.setTimeout(() => {
          siteLoader.classList.add('is-finished');
          window.setTimeout(() => siteLoader.remove(), 650);
        }, 1380);
      };
      if (document.readyState === 'complete') dismissLoader();
      else window.addEventListener('load', dismissLoader, { once: true });
    }
  }

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-nav');

  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!open));
      menuButton.setAttribute('aria-label', open ? 'Open navigation' : 'Close navigation');
      nav.classList.toggle('is-open', !open);
    });
    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open navigation');
      nav.classList.remove('is-open');
    }));
  }

  // Reversing the intersection state lets sections animate in and out while scrolling either way.
  const revealItems = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-inview'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-inview', entry.isIntersecting));
    }, { threshold: 0.13, rootMargin: '0px 0px -35px 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const scrubSections = [...document.querySelectorAll('[data-scrub]')];
  const parallaxItems = [...document.querySelectorAll('.parallax')];
  const stackCards = [...document.querySelectorAll('[data-stack-card]')];
  let rafPending = false;
  let blurTarget = 0;
  let blurCurrent = 0;
  let blurFrame = 0;
  let previousBlurScrollY = window.scrollY;
  let previousBlurSample = performance.now();
  let previousBlurFrame = previousBlurSample;

  const animateMotionBlur = (now) => {
    const elapsed = Math.min(50, Math.max(1, now - previousBlurFrame));
    previousBlurFrame = now;
    blurTarget *= Math.exp(-elapsed / 130);
    const timeConstant = blurTarget > blurCurrent ? 48 : 190;
    const easing = 1 - Math.exp(-elapsed / timeConstant);
    blurCurrent += (blurTarget - blurCurrent) * easing;

    if (blurCurrent > .012 || blurTarget > .012) {
      document.body.classList.add('is-scrolling');
      document.body.style.setProperty('--scroll-blur', `${blurCurrent.toFixed(3)}px`);
      blurFrame = window.requestAnimationFrame(animateMotionBlur);
      return;
    }

    blurCurrent = 0;
    blurTarget = 0;
    document.body.classList.remove('is-scrolling');
    document.body.style.setProperty('--scroll-blur', '0px');
    blurFrame = 0;
  };

  const sampleMotionBlur = () => {
    if (reducedMotion) return;
    const now = performance.now();
    const currentY = window.scrollY;
    const elapsed = Math.max(now - previousBlurSample, 16.67);
    const frameCount = elapsed / 16.67;
    const speedPerFrame = Math.abs(currentY - previousBlurScrollY) / frameCount;
    blurTarget = Math.min(1.35, speedPerFrame * .022);
    previousBlurScrollY = currentY;
    previousBlurSample = now;
    if (!blurFrame) {
      previousBlurFrame = now;
      blurFrame = window.requestAnimationFrame(animateMotionBlur);
    }
  };

  const updateScroll = () => {
    rafPending = false;
    const viewport = window.innerHeight || 1;
    scrubSections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const progress = clamp((viewport - rect.top) / (viewport + rect.height));
      section.style.setProperty('--scroll-progress', progress.toFixed(3));
      if (section.classList.contains('hero') && !reducedMotion) {
        section.style.setProperty('--hero-shift', `${(progress - .5) * -48}px`);
      }
    });
    if (!reducedMotion) {
      parallaxItems.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const distance = (rect.top + rect.height / 2 - viewport / 2) * -.075;
        item.style.setProperty('--parallax', `${Math.max(-38, Math.min(38, distance))}px`);
      });
      stackCards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const progress = clamp((viewport * .82 - rect.top) / (viewport * .86));
        card.style.setProperty('--card-progress', progress.toFixed(3));
      });
    }
  };
  const scheduleScrollUpdate = () => {
    sampleMotionBlur();
    if (!rafPending) {
      rafPending = true;
      window.requestAnimationFrame(updateScroll);
    }
  };
  window.addEventListener('scroll', scheduleScrollUpdate, { passive: true });
  window.addEventListener('resize', scheduleScrollUpdate);
  updateScroll();

  // Pointer-driven tilt and a moving silver highlight on the brand emblem.
  const tiltElements = [...document.querySelectorAll('[data-tilt]')];
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!reducedMotion && finePointer) {
    tiltElements.forEach((element) => {
      element.addEventListener('pointermove', (event) => {
        const rect = element.getBoundingClientRect();
        const x = clamp((event.clientX - rect.left) / rect.width);
        const y = clamp((event.clientY - rect.top) / rect.height);
        element.style.setProperty('--tilt-x', `${((x - .5) * 18).toFixed(2)}deg`);
        element.style.setProperty('--tilt-y', `${((.5 - y) * 18).toFixed(2)}deg`);
        element.style.setProperty('--shine-x', `${(x * 100).toFixed(1)}%`);
        element.style.setProperty('--shine-y', `${(y * 100).toFixed(1)}%`);
        element.classList.add('is-tilting');
      });
      element.addEventListener('pointerleave', () => {
        element.style.setProperty('--tilt-x', '0deg');
        element.style.setProperty('--tilt-y', '0deg');
        element.classList.remove('is-tilting');
      });
    });
  }

  // The deck is a looping stack: each move sends the front card to the back.
  document.querySelectorAll('[data-deck]').forEach((deck) => {
    const area = deck.closest('.motion-deck');
    const cards = [...deck.querySelectorAll('[data-deck-card]')];
    if (!area || cards.length < 2) return;
    const dots = [...area.querySelectorAll('[data-deck-go]')];
    const counter = area.querySelector('[data-deck-count]');
    const toggle = area.querySelector('[data-deck-toggle]');
    let activeIndex = 0;
    let manuallyPaused = reducedMotion;
    if (toggle) {
      toggle.disabled = reducedMotion;
      toggle.setAttribute('aria-pressed', String(manuallyPaused));
      toggle.setAttribute('aria-label', reducedMotion ? 'Automatic rotation is off because reduced motion is enabled' : 'Pause card rotation');
      toggle.textContent = manuallyPaused ? '▶' : 'Ⅱ';
    }
    let pointerInside = false;
    let focusInside = false;
    let deckVisible = !('IntersectionObserver' in window);
    let autoplayTimer;
    let dragStart = null;

    const paintDeck = () => {
      cards.forEach((card, index) => {
        const position = (index - activeIndex + cards.length) % cards.length;
        card.classList.toggle('is-active', position === 0);
        card.classList.toggle('is-next', position === 1);
        card.classList.toggle('is-back', position === 2);
        card.setAttribute('aria-hidden', String(position !== 0));
        card.setAttribute('aria-label', `${index + 1} of ${cards.length}`);
      });
      dots.forEach((dot, index) => {
        if (index === activeIndex) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      if (counter) counter.innerHTML = `${String(activeIndex + 1).padStart(2, '0')} <i>/</i> ${String(cards.length).padStart(2, '0')}`;
    };
    const move = (step) => {
      activeIndex = (activeIndex + step + cards.length) % cards.length;
      paintDeck();
    };
    const stopAutoplay = () => window.clearInterval(autoplayTimer);
    const startAutoplay = () => {
      stopAutoplay();
      if (manuallyPaused || pointerInside || focusInside || document.hidden || !deckVisible) return;
      autoplayTimer = window.setInterval(() => move(1), 5100);
    };

    if ('IntersectionObserver' in window) {
      const deckVisibility = new IntersectionObserver((entries) => {
        deckVisible = entries.some((entry) => entry.isIntersecting);
        if (deckVisible) startAutoplay();
        else stopAutoplay();
      }, { threshold: .15 });
      deckVisibility.observe(area);
    }

    area.querySelector('[data-deck-next]')?.addEventListener('click', () => move(1));
    area.querySelector('[data-deck-prev]')?.addEventListener('click', () => move(-1));
    dots.forEach((dot) => dot.addEventListener('click', () => {
      activeIndex = Number(dot.dataset.deckGo) % cards.length;
      paintDeck();
    }));
    toggle?.addEventListener('click', () => {
      if (reducedMotion) return;
      manuallyPaused = !manuallyPaused;
      toggle.setAttribute('aria-pressed', String(manuallyPaused));
      toggle.setAttribute('aria-label', manuallyPaused ? 'Resume card rotation' : 'Pause card rotation');
      toggle.textContent = manuallyPaused ? '▶' : 'Ⅱ';
      startAutoplay();
    });
    area.addEventListener('pointerenter', () => { pointerInside = true; stopAutoplay(); });
    area.addEventListener('pointerleave', () => { pointerInside = false; startAutoplay(); });
    area.addEventListener('focusin', () => { focusInside = true; stopAutoplay(); });
    area.addEventListener('focusout', (event) => {
      if (!area.contains(event.relatedTarget)) { focusInside = false; startAutoplay(); }
    });
    document.addEventListener('visibilitychange', startAutoplay);
    deck.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
    });
    deck.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      dragStart = event.clientX;
      deck.setPointerCapture(event.pointerId);
    });
    deck.addEventListener('pointerup', (event) => {
      if (dragStart === null) return;
      const delta = event.clientX - dragStart;
      dragStart = null;
      if (Math.abs(delta) > 42) move(delta < 0 ? 1 : -1);
    });
    deck.addEventListener('pointercancel', () => { dragStart = null; });
    paintDeck();
    startAutoplay();
  });

  // Static prototype contact form: compose an email; the visitor reviews and sends it themselves.
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = new FormData(contactForm);
      const name = String(values.get('name') || '').trim();
      const subject = `FifthAvenue enquiry — ${name || 'New conversation'}`;
      const body = [
        `Name: ${name}`,
        `Email: ${String(values.get('email') || '').trim()}`,
        `Company: ${String(values.get('company') || '').trim()}`,
        `Interested in: ${String(values.get('interest') || '').trim()}`,
        '',
        String(values.get('message') || '').trim()
      ].join('\n');
      window.location.href = `mailto:hello@fifthavenuemedia.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }
})();
