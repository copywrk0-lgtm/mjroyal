
export async function startScrollMotion() {
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  if (motionPreference.matches || !('IntersectionObserver' in window)) return;
  const root = document.documentElement;
  const desktop = matchMedia('(min-width: 701px) and (pointer: fine)');
  let lenis = null;
  let scrollVersion = 0;
  let frame = 0;
  let started = false;
  let stopped = false;

  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);

  const reveals = [];
  function revealGroup(selector, step = 90) {
    document.querySelectorAll(selector).forEach((element, index) => {
      element.classList.add('scroll-reveal');
      element.style.setProperty('--reveal-delay', `${Math.min(index * step, 220)}ms`);
      reveals.push(element);
    });
  }
  revealGroup('.hero-copy > *', 110);
  revealGroup('.hero-booking');
  revealGroup('.manifesto .eyebrow, .manifesto .bodycopy', 80);
  revealGroup('.section-head');
  revealGroup('.story-card', 55);
  revealGroup('.film-title > *', 100);
  revealGroup('.about-copy > *', 100);
  revealGroup('.about-image');
  revealGroup('.archive > div', 100);
  revealGroup('.proof > *', 100);
  revealGroup('.contact > *', 100);

  const heading = document.querySelector('.manifesto h2');
  const words = [];
  if (heading) {
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      (node.textContent.match(/\S+|\s+/g) || []).forEach(text => {
        if (/\S/.test(text)) {
          const span = document.createElement('span');
          span.className = 'scroll-word';
          span.textContent = text;
          fragment.append(span);
          words.push(span);
        } else fragment.append(document.createTextNode(text));
      });
      node.replaceWith(fragment);
    });
  }

  const media = [...document.querySelectorAll('.story-media, .about-image')];
  const activeMedia = new Set();
  const mediaObserver = new IntersectionObserver(entries => {
    entries.forEach(({target, isIntersecting}) => {
      if (isIntersecting) activeMedia.add(target);
      else activeMedia.delete(target);
    });
    schedule();
  }, {rootMargin: '200px 0px'});
  media.forEach(element => mediaObserver.observe(element));

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(({target, isIntersecting}) => {
      if (!isIntersecting) return;
      target.classList.add('is-visible');
      revealObserver.unobserve(target);
    });
  }, {rootMargin: '0px 0px -7% 0px', threshold: .08});

  const hero = document.querySelector('.hero');
  const heroImage = hero?.querySelector(':scope > img');
  const filmFrame = document.querySelector('.film-frame');
  const clamp = value => Math.max(0, Math.min(1, value));
  function update() {
    frame = 0;
    if (stopped || document.body.classList.contains('loading')) return;
    const height = innerHeight;
    const scroll = window.scrollY;
    // Read layout together before updating transforms.
    const measurements = [...activeMedia].map(element => ({element, rect:element.getBoundingClientRect()}));
    const headingRect = heading?.getBoundingClientRect();
    const filmRect = filmFrame?.getBoundingClientRect();
    const pageHeight = root.scrollHeight - height;
    progress.style.transform = `scaleX(${pageHeight > 0 ? clamp(scroll / pageHeight) : 0})`;
    if (heroImage && scroll < height * 1.3) {
      heroImage.style.transform = `translate3d(0,${scroll * (desktop.matches ? .16 : .06)}px,0) scale(1.08)`;
    }
    measurements.forEach(({element, rect}) => {
      const position = (height / 2 - rect.top - rect.height / 2) / ((height + rect.height) / 2);
      const distance = Math.min(rect.height * .045, desktop.matches ? 34 : 14);
      element.style.setProperty('--image-drift', `${Math.max(-1, Math.min(1, position)) * distance}px`);
    });
    if (headingRect) {
      const amount = clamp((height * .84 - headingRect.top) / (height * .54 + headingRect.height * .15));
      words.forEach((word, index) => {
        const phase = clamp((amount - index / words.length * .72) / .28);
        const baseOpacity = desktop.matches ? .25 : .5;
        word.style.opacity = String(baseOpacity + phase * (1 - baseOpacity));
      });
    }
    if (filmRect) {
      const amount = clamp((height * .92 - filmRect.top) / (height * .6));
      const inset = (desktop.matches ? 5 : 2) * (1 - amount);
      filmFrame.style.clipPath = `inset(0 ${inset}% 0 ${inset}%)`;
    }
  }
  function schedule() {
    if (!frame && !stopped) frame = requestAnimationFrame(update);
  }
  function syncLock() {
    const locked = ['loading', 'menu-open', 'story-open'].some(name => document.body.classList.contains(name));
    if (lenis) locked ? lenis.stop() : lenis.start();
    if (!started && !document.body.classList.contains('loading')) {
      started = true;
      reveals.forEach(element => revealObserver.observe(element));
    }
    schedule();
  }
  async function configureScroll() {
    const version = ++scrollVersion;
    lenis?.destroy();
    lenis = null;
    syncLock();
    if (!desktop.matches || stopped) return;
    const {default:Lenis} = await import('./vendor/lenis.mjs');
    if (version !== scrollVersion || stopped || !desktop.matches) return;
    lenis = new Lenis({
      autoRaf:true,
      duration:.85,
      smoothWheel:true,
      syncTouch:false,
      anchors:{duration:.9},
      prevent:node => node.closest?.('#story-viewer, #menu-panel')
    });
    syncLock();
  }
  const bodyObserver = new MutationObserver(syncLock);
  bodyObserver.observe(document.body, {attributes:true, attributeFilter:['class']});
  function focusReveal(event) {
    event.target.closest?.('.scroll-reveal')?.classList.add('is-visible');
  }
  root.classList.add('scroll-motion');
  configureScroll().catch(() => {});
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule, {passive:true});
  document.addEventListener('focusin', focusReveal);
  desktop.addEventListener('change', configureScroll);
  document.fonts?.ready.then(schedule);

  function dispose() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    lenis?.destroy();
    bodyObserver.disconnect();
    mediaObserver.disconnect();
    revealObserver.disconnect();
    root.classList.remove('scroll-motion');
    progress.remove();
    reveals.forEach(element => {element.classList.remove('scroll-reveal', 'is-visible'); element.style.removeProperty('--reveal-delay');});
    words.forEach(word => word.style.removeProperty('opacity'));
    media.forEach(element => element.style.removeProperty('--image-drift'));
    heroImage?.style.removeProperty('transform');
    filmFrame?.style.removeProperty('clip-path');
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    document.removeEventListener('focusin', focusReveal);
    desktop.removeEventListener('change', configureScroll);
    motionPreference.removeEventListener('change', onPreference);
  }
  function onPreference(event) { if (event.matches) dispose(); }
  motionPreference.addEventListener('change', onPreference);
  return dispose;
}

