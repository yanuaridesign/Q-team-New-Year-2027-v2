(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) document.documentElement.classList.add('anim');

  /* ---------- scale every 1920 px stage to the viewport ---------- */
  const secs = [...document.querySelectorAll('.sec')];
  let K = 1;
  function fit() {
    K = document.documentElement.clientWidth / 1920;
    secs.forEach(s => {
      s.style.setProperty('--k', K);
      s.style.height = (+s.dataset.h * K) + 'px';
    });
  }
  fit();
  addEventListener('resize', fit);

  /* ---------- HERO: polaroid tree ---------- */
  const tree = document.getElementById('tree');
  // previous-site layout, mapped onto the tree box of the new Figma frame (469,173 · 955×798)
  const T = window.TREE || [];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  T.forEach(([cx, cy, w, h]) => { x0 = Math.min(x0, cx - w / 2); x1 = Math.max(x1, cx + w / 2); y0 = Math.min(y0, cy - h / 2); y1 = Math.max(y1, cy + h / 2); });
  const BX = 469, BY = 173, BW = 955, BH = 798;
  const s = Math.min(BW / (x1 - x0), BH / (y1 - y0));
  const ox = BX + (BW - (x1 - x0) * s) / 2, oy = BY + (BH - (y1 - y0) * s) / 2;
  const photos = T.map(([cx, cy, w, h, r, pi]) => {
    const W = w * s, H = h * s, X = ox + (cx - x0) * s - W / 2, Y = oy + (cy - y0) * s - H / 2;
    const im = new Image();
    im.src = 'assets/tree/' + pi + '.jpg'; im.alt = ''; im.decoding = 'async';
    im.className = 'pl' + (reduce ? '' : ' pre');
    im.style.width = W + 'px'; im.style.height = H + 'px';
    im.style.setProperty('--x', X + 'px'); im.style.setProperty('--y', Y + 'px'); im.style.setProperty('--a', (-r) + 'deg');
    tree.appendChild(im);
    return { im, X, Y, W, H, a: -r, cy };
  });

  // hover: a crisp copy of the photo flies out above everything and grows
  const ZOOM = 4.2;
  let cur = null, zm = null, introDone = reduce;
  function zoomOn(p) {
    if (!zm) { zm = new Image(); zm.className = 'zm'; zm.alt = ''; tree.appendChild(zm); }
    zm.src = p.im.src;
    zm.style.width = p.W + 'px'; zm.style.height = p.H + 'px';
    zm.style.transition = 'none';
    zm.style.opacity = 1; zm.classList.remove('on');
    zm.style.transform = `translate(${p.X}px,${p.Y}px) rotate(${p.a}deg)`;
    void zm.offsetWidth;
    // keep the enlarged copy inside the hero
    const ZW = p.W * ZOOM, ZH = p.H * ZOOM;
    let cx = p.X + p.W / 2, cy = p.Y + p.H / 2;
    cx = Math.max(ZW / 2 + 20, Math.min(1920 - ZW / 2 - 20, cx));
    cy = Math.max(ZH / 2 + 20, Math.min(1030 - ZH / 2 - 20, cy));
    zm.style.transition = '';
    zm.classList.add('on');
    zm.style.transform = `translate(${cx - p.W / 2}px,${cy - p.H / 2}px) scale(${ZOOM})`;
  }
  function zoomOff(p) {
    if (!zm) return;
    zm.classList.remove('on');
    zm.style.transform = `translate(${p.X}px,${p.Y}px) rotate(${p.a}deg)`;
    const z = zm; setTimeout(() => { if (!cur) z.style.opacity = 0; }, 420);
  }
  photos.forEach(p => {
    p.im.addEventListener('mouseenter', () => { if (!introDone || matchMedia('(hover: none)').matches) return; if (cur && cur !== p) zoomOff(cur); cur = p; zoomOn(p); });
    p.im.addEventListener('mouseleave', () => { if (cur === p) { cur = null; zoomOff(p); } });
  });

  // intro: photos build the tree from the bottom up, then star, arrows, labels
  const on = (el, t) => setTimeout(() => el && el.classList.add('on'), t);
  if (!reduce) {
    const hero = document.getElementById('hero');
    [...hero.querySelectorAll('.title,.hero-sub')].forEach((el, i) => on(el, 150 + i * 120));
    const order = photos.slice().sort((a, b) => b.cy - a.cy);
    order.forEach((p, i) => setTimeout(() => p.im.classList.remove('pre'), 300 + i * 14));
    const tEnd = 300 + order.length * 14 + 300;
    on(hero.querySelector('.star'), tEnd);
    [...hero.querySelectorAll('.arr')].forEach((el, i) => on(el, tEnd + 500 + i * 150));
    [...hero.querySelectorAll('.lab')].forEach((el, i) => on(el, tEnd + 650 + i * 150));
    on(hero.querySelector('.cta'), tEnd - 200);
    on(hero.querySelector('.medal'), tEnd + 100);
    setTimeout(() => { introDone = true; }, tEnd + 400);
  } else {
    document.querySelector('.star').classList.add('on');
  }

  /* ---------- STAMPS: each stamp is "pressed" onto the page ---------- */
  const stamps = [...document.querySelectorAll('#stamps .st')];
  stamps.forEach((st, i) => st.style.setProperty('--tw', (i % 2 ? -6 : 6) + 'deg'));
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        io.disconnect();
        stamps.slice().sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left) || parseFloat(a.style.top) - parseFloat(b.style.top))
          .forEach((st, i) => on(st, i * 110));
      });
    }, { threshold: .3 });
    io.observe(document.getElementById('stamps'));
  } else stamps.forEach(st => st.classList.add('on'));

  /* ---------- PAIN: the ball sways, falls and breaks ---------- */
  const pain = document.getElementById('pain');
  const ball = document.getElementById('ball');
  const broken = document.getElementById('ballBroken');
  const shadow = document.getElementById('ballShadow');
  const shards = document.getElementById('shards');
  let dropped = false;
  function breakNow() {
    ball.classList.add('gone');
    broken.classList.add('on'); shadow.classList.add('on');
    pain.classList.add('hit');
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
