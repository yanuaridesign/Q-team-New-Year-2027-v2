(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) document.documentElement.classList.add('anim');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- scale every 1920 px stage to the viewport ---------- */
  const secs = [...document.querySelectorAll('.sec')];
  function fit() {
    const K = document.documentElement.clientWidth / 1920;
    secs.forEach(s => { s.style.setProperty('--k', K); s.style.height = (+s.dataset.h * K) + 'px'; });
  }
  fit();
  addEventListener('resize', fit);

  /* ---------- HERO: polaroid tree ---------- */
  const hero = document.getElementById('hero');
  const tree = document.getElementById('tree');
  // previous-site layout, mapped onto the tree box of the new Figma frame (469,173 · 955×798)
  const T = window.TREE || [];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  T.forEach(([cx, cy, w, h]) => { x0 = Math.min(x0, cx - w / 2); x1 = Math.max(x1, cx + w / 2); y0 = Math.min(y0, cy - h / 2); y1 = Math.max(y1, cy + h / 2); });
  const BX = 469, BY = 173, BW = 955, BH = 798;
  const s = Math.min(BW / (x1 - x0), BH / (y1 - y0));
  const ox = BX + (BW - (x1 - x0) * s) / 2, oy = BY + (BH - (y1 - y0) * s) / 2;
  const photos = T.map(([cx, cy, w, h, r, pi]) => {
    const W = w * s, H = h * s, CX = ox + (cx - x0) * s, CY = oy + (cy - y0) * s, X = CX - W / 2, Y = CY - H / 2;
    const im = new Image();
    im.src = 'assets/tree/' + pi + '.jpg'; im.alt = ''; im.decoding = 'async'; im.fetchPriority = 'high';
    im.className = 'pl' + (reduce ? '' : ' wait');
    im.style.width = W + 'px'; im.style.height = H + 'px';
    im.style.setProperty('--x', X + 'px'); im.style.setProperty('--y', Y + 'px'); im.style.setProperty('--a', (-r) + 'deg');
    tree.appendChild(im);
    return { im, X, Y, W, H, CX, CY, a: -r };
  });

  // hover: a crisp copy of the photo flies out above everything and grows
  const ZOOM = 4.2;
  let cur = null, zm = null, introDone = reduce;
  function zoomOn(p) {
    if (!zm) { zm = new Image(); zm.className = 'zm'; zm.alt = ''; tree.appendChild(zm); }
    zm.src = p.im.src;
    zm.style.width = p.W + 'px'; zm.style.height = p.H + 'px';
    zm.style.transition = 'none'; zm.style.opacity = 1;
    zm.style.transform = `translate(${p.X}px,${p.Y}px) rotate(${p.a}deg)`;
    void zm.offsetWidth;
    const ZW = p.W * ZOOM, ZH = p.H * ZOOM;
    const cx = clamp(p.X + p.W / 2, ZW / 2 + 20, 1920 - ZW / 2 - 20), cy = clamp(p.Y + p.H / 2, ZH / 2 + 20, 1030 - ZH / 2 - 20);
    zm.style.transition = '';
    zm.style.transform = `translate(${cx - p.W / 2}px,${cy - p.H / 2}px) scale(${ZOOM})`;
  }
  function zoomOff(p) {
    if (!zm) return;
    zm.style.transform = `translate(${p.X}px,${p.Y}px) rotate(${p.a}deg)`;
    const z = zm; setTimeout(() => { if (!cur) z.style.opacity = 0; }, 420);
  }
  photos.forEach(p => {
    p.im.addEventListener('mouseenter', () => { if (!introDone || matchMedia('(hover: none)').matches) return; if (cur && cur !== p) zoomOff(cur); cur = p; zoomOn(p); });
    p.im.addEventListener('mouseleave', () => { if (cur === p) { cur = null; zoomOff(p); } });
  });

  /* ---------- PRELOADER: wait for the hero images + fonts (max 3.5 s), like the previous version ---------- */
  const decode = im => (im.complete && im.naturalWidth ? Promise.resolve() : new Promise(r => { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); }))
    .then(() => im.decode ? im.decode().catch(() => {}) : null);
  const heroReady = Promise.all([...photos.map(p => decode(p.im)), ...[...hero.querySelectorAll('img')].map(decode)])
    .then(() => document.fonts && document.fonts.ready);
  const preloader = document.getElementById('preloader');

  let started = false;
  async function start() {
    if (started) return; started = true;
    preloader.classList.add('out');
    // decode everything below the fold right away, so later blocks appear instantly
    document.querySelectorAll('#stamps img, #pain img').forEach(decode);
    const on = el => el && el.classList.add('on');
    if (reduce) {
      hero.querySelectorAll('.star,.title,.hero-sub,.cta,.medal,.arr,.lab').forEach(on);
      return;
    }
    // photos fall in from above (bottom rows first), exactly like the previous version
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const ys = photos.map(p => p.CY), maxY = Math.max(...ys), minY = Math.min(...ys);
    photos.forEach(p => {
      const dx = (rnd() * 2 - 1) * 640 + (960 - p.CX) * .3, dy = -(p.CY + 300 + rnd() * 700), da = (rnd() * 2 - 1) * 2.1 * 180 / Math.PI;
      const del = 120 + (maxY - p.CY) / (maxY - minY) * 1500 + rnd() * 260, dur = 950 + rnd() * 350;
      p.im.classList.remove('wait');
      p.im.animate([
        { transform: `translate(${p.X + dx}px,${p.Y + dy}px) rotate(${p.a + da}deg) scale(1.35)` },
        { transform: `translate(${p.X}px,${p.Y}px) rotate(${p.a}deg)` }
      ], { duration: dur, delay: del, easing: 'cubic-bezier(.165,.84,.44,1)', fill: 'backwards' });
    });
    await wait(2500); on(hero.querySelector('.star'));
    await wait(450); on(hero.querySelector('.t1'));
    await wait(150); on(hero.querySelector('.t2'));
    await wait(220); on(hero.querySelector('.hero-sub'));
    await wait(220); on(hero.querySelector('.cta'));
    await wait(250); introDone = true;
    hero.querySelectorAll('.arr,.lab').forEach(on);
    setTimeout(() => on(hero.querySelector('.medal')), 700);
  }
  heroReady.then(start);
  setTimeout(start, 3500);

  /* ---------- STAMPS: straight at first, three photo stamps peel off while scrolling ---------- */
  const stampsSec = document.getElementById('stamps');
  const mat = str => str.split(',').map(Number); // a,b,c,d,e,f (Figma absoluteTransform, frame-relative)
  const tears = [...document.querySelectorAll('#stamps .tear')].map(el => {
    const [sa, sb, sc, sd, se, sf] = mat(el.dataset.s), [ta, tb, tc, td, te, tf] = mat(el.dataset.t);
    const det = sa * sd - sb * sc, ia = sd / det, ib = -sb / det, ic = -sc / det, id = sa / det; // S⁻¹
    const ma = ta * ia + tc * ib, mb = tb * ia + td * ib;                                    // M = T·S⁻¹ (a pure rotation)
    const mc = ta * ic + tc * id, md = tb * ic + td * id;
    const ux = parseFloat(el.style.left), uy = parseFloat(el.style.top);
    const vx = ux - se, vy = uy - sf;
    const dx = ma * vx + mc * vy + te - ux, dy = mb * vx + md * vy + tf - uy;
    return { el, ang: Math.atan2(mb, ma), dx, dy };
  });
  let tp = 0, cp = 0, raf = 0;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function paint() {
    cp += (tp - cp) * .14;
    if (Math.abs(tp - cp) < .001) cp = tp;
    const e = ease(cp);
    tears.forEach(t => { t.el.style.transform = `translate(${t.dx * e}px,${t.dy * e}px) rotate(${t.ang * e}rad)`; });
    raf = cp !== tp ? requestAnimationFrame(paint) : 0;
  }
  function onScroll() {
    if (reduce) return;
    const r = stampsSec.getBoundingClientRect(), vh = innerHeight;
    tp = clamp((vh * .35 - r.top) / (vh * .45), 0, 1);
    if (!raf) raf = requestAnimationFrame(paint);
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- PAIN: the ball sways, falls and breaks, then the pink arrow appears ---------- */
  const pain = document.getElementById('pain');
  const ball = document.getElementById('ball');
  const broken = document.getElementById('ballBroken');
  const shadow = document.getElementById('ballShadow');
  const shards = document.getElementById('shards');
  const parr = pain.querySelector('.parr');
  let dropped = false;
  function breakNow() {
    ball.classList.add('gone');
    broken.classList.add('on'); shadow.classList.add('on');
    pain.classList.add('hit');
    setTimeout(() => parr.classList.add('on'), 450);
    const cols = ['#C8213F', '#F3D9C4', '#E8B04B', '#EC187E', '#9E1630'];
    for (let i = 0; i < 16; i++) {
      const b = document.createElement('i');
      b.style.background = cols[i % cols.length];
      shards.appendChild(b);
      const ang = Math.PI * (1.05 + Math.random() * .9), d = 60 + Math.random() * 140;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        b.style.transform = `translate(${Math.cos(ang) * d}px,${Math.sin(ang) * d * .55 + 30}px) rotate(${Math.random() * 540}deg)`;
        b.style.opacity = 0;
      }));
    }
  }
  function drop() {
    if (dropped) return; dropped = true;
    if (reduce) { breakNow(); return; }
    ball.classList.add('sway');
    ball.addEventListener('animationend', () => {
      ball.classList.remove('sway');
      ball.style.transform = 'rotate(3deg)';
      void ball.offsetWidth;
      ball.classList.add('fall');
      ball.style.transform = 'translate(-26px,648px) rotate(24deg)';
      setTimeout(breakNow, 600);
    }, { once: true });
  }
  function check() {
    if (dropped) return;
    const r = pain.getBoundingClientRect();
    const titleAtTop = r.top <= 60 && r.bottom > innerHeight * .4;
    const fullyVisible = r.top >= 0 && r.bottom <= innerHeight + 2;
    const bottomReached = r.top < innerHeight * .5 && r.bottom <= innerHeight + 2; // e.g. last block on a short screen
    if (titleAtTop || fullyVisible || bottomReached) drop();
  }
  addEventListener('scroll', check, { passive: true });
  addEventListener('resize', check);
  setTimeout(check, 400);
})();
