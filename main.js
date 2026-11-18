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

  /* ---------- PRELOADER = the tree itself: wait for the hero images + fonts (max 3.5 s), then the photos fall in ---------- */
  const decode = im => (im.complete && im.naturalWidth ? Promise.resolve() : new Promise(r => { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); }))
    .then(() => im.decode ? im.decode().catch(() => {}) : null);
  const heroReady = Promise.all([...photos.map(p => decode(p.im)), ...[...hero.querySelectorAll('img')].map(decode)])
    .then(() => document.fonts && document.fonts.ready);
  let started = false;
  async function start() {
    if (started) return; started = true;
    // decode everything below the fold right away, so later blocks appear instantly
    document.querySelectorAll('#stamps img, #pain img, #zayavka img, #scen img').forEach(decode);
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

  /* ---------- STAMPS: straight at first; each photo stamp peels off once, when it crosses the middle of the screen ---------- */
  const mat = str => str.split(',').map(Number); // a,b,c,d,e,f (Figma absoluteTransform, frame-relative)
  const tears = [...document.querySelectorAll('#stamps .tear')].map(el => {
    const [sa, sb, sc, sd, se, sf] = mat(el.dataset.s), [ta, tb, tc, td, te, tf] = mat(el.dataset.t);
    const det = sa * sd - sb * sc, ia = sd / det, ib = -sb / det, ic = -sc / det, id = sa / det; // S⁻¹
    const ma = ta * ia + tc * ib, mb = tb * ia + td * ib;                                    // M = T·S⁻¹ (a pure rotation)
    const mc = ta * ic + tc * id, md = tb * ic + td * id;
    const ux = parseFloat(el.style.left), uy = parseFloat(el.style.top);
    const vx = ux - se, vy = uy - sf;
    const dx = ma * vx + mc * vy + te - ux, dy = mb * vx + md * vy + tf - uy;
    const tfm = `translate(${dx}px,${dy}px) rotate(${Math.atan2(mb, ma)}rad)`;
    // .pre stamps are already tilted in the layout (Figma 578:108); only the others peel off on scroll
    if (el.classList.contains('pre')) { el.style.transition = 'none'; el.style.transform = tfm; }
    return { el, done: el.classList.contains('pre'), tf: tfm };
  });
  let nextAt = 0;
  function tearCheck() {
    const mid = innerHeight / 2, now = performance.now();
    tears.forEach(t => {
      if (t.done) return;
      const r = t.el.getBoundingClientRect();
      if (r.top + r.height / 2 > mid) return;      // its centre has not crossed the middle of the screen yet
      t.done = true;                               // once only: scrolling back does not straighten it
      const delay = Math.max(0, nextAt - now);     // stamps crossing together go one after another
      nextAt = now + delay + 220;
      setTimeout(() => { t.el.style.transform = t.tf; }, delay);
    });
  }
  addEventListener('scroll', tearCheck, { passive: true });
  addEventListener('resize', tearCheck);
  tearCheck();

  /* ---------- PAIN: the ball sways, falls and breaks (arrow and garland are static) ---------- */
  const pain = document.getElementById('pain');
  const ball = document.getElementById('ball');
  const broken = document.getElementById('ballBroken');
  const shadow = document.getElementById('ballShadow');
  const shards = document.getElementById('shards');
  const reveals = [...pain.querySelectorAll('.reveal')];
  let dropped = false;
  function breakNow() {
    ball.classList.add('gone');
    broken.classList.add('on'); shadow.classList.add('on');
    pain.classList.add('hit');
    setTimeout(() => reveals.forEach(r => r.classList.add('on')), 450);
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
      ball.style.transform = 'translate(-26px,588px) rotate(24deg)';
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

  /* ---------- QUIZ: 3 questions + form (Figma 594:990, 619:*) ---------- */
  const quiz = document.getElementById('quiz');
  // same behaviour as the previous site: the bar fills smoothly after every answer, the 3-minute timer starts
  // with the first answer, the question and answers fade in one by one, an answer card lifts on hover
  const Q = [
    { t: 'Яка нагода свята?', opts: [[243.8, 'Новорічний корпоратив'], [636.9, 'Тімбілдінг'], [1030, 'Річниця компанії'], [1423.1, 'Інше']] },
    { t: 'Де проводимо?', opts: [[439.5, 'На нашій локації'], [832.5, 'Виїзний'], [1225.5, 'Онлайн']] },
    { t: 'Скільки буде учасників?', opts: [[243.8, '4–25 людей'], [636.9, '26–50 людей'], [1030, '51–100 людей'], [1423.1, '100+ людей']] },
  ];
  const answers = [];
  const form = document.getElementById('qform');
  const qbody = document.getElementById('qbody'), qprog = document.getElementById('qprog'), qfill = document.getElementById('qfill'), qtimer = document.getElementById('qtimer');
  const chips = [...form.querySelectorAll('.chip')];
  const fillChips = () => chips.forEach((c, i) => { c.textContent = answers[i] || ''; });
  const TRACK = 1305.9;
  const setFill = n => { qfill.style.width = (TRACK * n / 3) + 'px'; qfill.style.opacity = n ? 1 : 0; };
  let left = 180, tid = null;
  const showTime = () => { qtimer.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); };
  const startTimer = () => { if (tid) return; tid = setInterval(() => { left = Math.max(0, left - 1); showTime(); if (!left) stopTimer(); }, 1000); };
  const stopTimer = () => { clearInterval(tid); };
  let step = 0;
  function render() {
    qbody.innerHTML = '';
    const done = step >= 3;
    quiz.classList.toggle('form', done);
    form.classList.toggle('on', done);
    if (done) { fillChips(); return; }
    qprog.textContent = `Питання ${step + 1} / 3`;
    setFill(step);
    const q = Q[step];
    const t = document.createElement('p'); t.className = 'qtitle fade'; t.textContent = q.t; qbody.appendChild(t);
    q.opts.forEach(([x, label], j) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'qo fade';
      b.style.cssText = `left:${x - 7.45}px;top:424.75px;animation-delay:${60 + j * 70}ms`;
      b.innerHTML = `<img src="assets/quiz/c${step}-${j}.jpg" alt=""><span class="opt">${label}</span>`;
      if (answers[step] === label) b.classList.add('sel');
      b.addEventListener('click', () => {
        answers[step] = label; startTimer(); setFill(step + 1);
        qbody.querySelectorAll('.qo').forEach(o => o.classList.toggle('sel', o === b));
        setTimeout(() => { step++; render(); }, 380);
      });
      qbody.appendChild(b);
    });
    if (step > 0) {
      const p = document.createElement('button'); p.type = 'button'; p.className = 'qback fade'; p.textContent = 'Попереднє питання';
      p.addEventListener('click', () => { step--; render(); }); qbody.appendChild(p);
    }
  }
  render();
  form.querySelector('.prev').addEventListener('click', () => { step = 2; render(); });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = form.elements.name, phone = form.elements.phone;
    let ok = true;
    [name, phone].forEach(f => { const bad = !f.value.trim() || (f === phone && f.value.replace(/\D/g, '').length < 9); f.classList.toggle('err', bad); if (bad) ok = false; });
    if (!ok) { (name.classList.contains('err') ? name : phone).focus(); return; }
    const data = { occasion: answers[0], place: answers[1], people: answers[2], name: name.value.trim(), phone: phone.value.trim(), company: form.elements.company.value.trim() };
    // the Vercel site has no form backend yet: set window.QTEAM_FORM_ENDPOINT to POST the lead somewhere
    if (window.QTEAM_FORM_ENDPOINT) { try { await fetch(window.QTEAM_FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); } catch (_) { /* keep the thank-you */ } }
    form.classList.add('done'); form.querySelector('.thanks').hidden = false; stopTimer();
  });

  /* ---------- SCENARIOS: pinned table, the camera walks through 5 open plates ---------- */
  const scen = document.getElementById('scen'), pin = scen.querySelector('.pin'), sStage = document.getElementById('scenStage');
  const tbl = document.getElementById('tbl'), ovs = document.getElementById('ovs');
  const SH = 1157, KEYS = ['det', 'fort', 'caps', 'quiz', 'mon'];
  // positions relative to the tablecloth origin of Figma table 605:2
  const STATES = [[145.02, 681.28], [-254.98, 681.28], [-914.98, 681.28], [-1663.42, 685.11], [-2328.29, 692.57], [-2998.75, 680.92]];
  const LID = { // render box of the closed lid, node width, lifted pose (a, b, e, f of the matrix + width)
    fort: { rb: [1484.4, -202.76, 789.48], w: 789.48, up: [0.99, -0.14, 1587.14, -436, 598.08] },
    quiz: { rb: [2926.74, -206.76, 750.42], w: 746.9, up: [0.99, -0.14, 2883.69, -455.72, 811.18] },
    det:  { rb: [824.8, -126.41, 790.1], w: 790.1, up: [0.98, -0.22, 801.65, -309.84, 760.7] },
    caps: { rb: [2192.02, -123.55, 872], w: 872, up: [0.99, 0.11, 2312.54, -439.64, 711.72] },
    mon:  { rb: [3568.8, -93.85, 789.13], w: 789.13, up: [1, -0.08, 3529.82, -403.13, 857.77] },
  };
  const PH = { det: [916.6, -127.01, 621.44], fort: [1573.4, -240.81, 635.67], caps: [2333.78, -112.91, 593.9], quiz: [3048.3, -212, 548.95], mon: [3622.34, -145.56, 664.11] };
  const addImg = (src, x, y, w, cls) => { const im = new Image(); im.src = 'assets/scen/' + src; im.alt = ''; im.decoding = 'async'; if (cls) im.className = cls; im.style.cssText = `left:${x}px;top:${y}px;width:${w}px`; tbl.appendChild(im); return im; };
  // z-order follows Figma: base, then lids interleaved with the decor slices
  addImg('base.jpg', 0, -517, 6070);
  const lidEl = {}, phEl = {};
  const lidAndPhoto = k => { const p = PH[k]; phEl[k] = addImg('ph-' + k + '.png', p[0] - 1, p[1] - 1, Math.ceil(p[2]) + 2, 'ph'); const l = LID[k]; lidEl[k] = addImg('lid-' + k + '.png', l.rb[0], l.rb[1], l.rb[2], 'lid'); };
  lidAndPhoto('fort'); addImg('s1.png', 887.46, -138.17, 4901.58);
  lidAndPhoto('quiz'); lidAndPhoto('det'); addImg('s3.png', 1852.08, 43.79, 302.04);
  lidAndPhoto('caps'); addImg('s4.png', 3344.35, -260.37, 1692.85);
  lidAndPhoto('mon'); addImg('s5.png', 838.86, 24, 4496.24);
  const ovEls = ['ov-0', 'ov-det', 'ov-fort', 'ov-caps', 'ov-quiz', 'ov-mon'].map(n => { const im = new Image(); im.src = 'assets/scen/' + n + '.png'; im.alt = ''; ovs.appendChild(im); return im; });

  /* the motion is the previous site's table 1:1: the camera moves evenly with the scroll (smoothed so the pinned
     scene never shakes), a plate opens while it is near the centre, its text fades in, and when scrolling stops
     between two plates the page glides to the nearest one */
  const sm = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const X0 = STATES[0][0], KX = STATES.slice(1).map(s => s[0]), XE = KX[4];
  const DIST = 3000; // scroll length of the scene in stage px, as before
  const tyAt = x => { for (let i = 0; i < 5; i++) { const [xa, ya] = STATES[i], [xb, yb] = STATES[i + 1]; if (x <= xa && x >= xb) return ya + (yb - ya) * (xa - x) / (xa - xb); } return x > X0 ? STATES[0][1] : STATES[5][1]; };
  const openAmt = (i, x) => (i === 4 && x < KX[4]) ? 1 : 1 - sm(110, 290, Math.abs(x - KX[i]));
  const descAmt = (i, x) => (i === 4 && x < KX[4]) ? 1 : 1 - sm(60, 210, Math.abs(x - KX[i]));
  let K = 1;
  function scenFit() {
    K = document.documentElement.clientWidth / 1920; const h = SH * K;
    sStage.style.setProperty('--k', K);
    pin.style.height = h + 'px';
    pin.style.top = Math.min(0, innerHeight - h) + 'px';
    scen.style.height = (h + DIST * K) + 'px';
    tDirty = true;
  }
  const progT = () => { const p = -scen.getBoundingClientRect().top / (DIST * K); return Number.isFinite(p) ? clamp(p, 0, 1) : 0; };
  function drawTable(p) {
    const q = Math.min(1, p / 0.9), x = X0 + (XE - X0) * q;
    tbl.style.transform = `translate(${x}px,${tyAt(x)}px)`;
    KEYS.forEach((key, n) => {
      const o = reduce ? (Math.abs(x - KX[n]) < 1 ? 1 : 0) : openAmt(n, x);
      const L = LID[key], [ca, cb, ex, ey, wl] = L.up;
      const sc = 1 + o * (wl / L.w - 1), ang = Math.atan2(cb, ca) * o;
      lidEl[key].style.transform = `translate(${(ex - L.rb[0]) * o}px,${(ey - L.rb[1]) * o}px) rotate(${ang}rad) scale(${sc})`;
      lidEl[key].style.zIndex = o > 0.01 ? 20 : '';
      phEl[key].style.zIndex = o > 0.01 ? 19 : '';
      phEl[key].style.opacity = Math.min(1, o * 1.6);
      phEl[key].style.transform = `translateY(${(1 - o) * 110}px) scale(${0.55 + 0.45 * o})`;
    });
    // intro heading slides away to the left, the plate texts fade in near their plate
    const hp = 1 - sm(KX[0] + 40, X0 - 5, x);
    ovEls[0].style.opacity = (1 - hp).toFixed(3);
    ovEls[0].style.transform = `translateX(${(-1050 * hp).toFixed(1)}px)`;
    for (let i = 0; i < 5; i++) {
      const da = descAmt(i, x), im = ovEls[i + 1];
      im.style.opacity = da.toFixed(3);
      im.style.transform = `translateY(${((1 - da) * 14).toFixed(2)}px)`;
    }
  }
  let tpC = 0, tDirty = true, lastT = performance.now();
  function frame(now) {
    const dt = Math.min(.064, (now - lastT) / 1000); lastT = now; const a = 1 - Math.exp(-dt * 10);
    const tpT = progT();
    if (Math.abs(tpT - tpC) > 1e-5) { tpC += (tpT - tpC) * a; if (Math.abs(tpT - tpC) < 1e-5) tpC = tpT; tDirty = true; }
    const r = scen.getBoundingClientRect();
    if (tDirty && r.bottom > -50 && r.top < innerHeight + 50) { drawTable(tpC); tDirty = false; }
    requestAnimationFrame(frame);
  }
  // when scrolling stops between two plates, glide gently to the nearest one
  {
    let st = null, touching = false, snapping = false;
    const stops = [0, ...KX.map(v => .9 * (X0 - v) / (X0 - XE))];
    const stop = () => { snapping = false; removeEventListener('touchstart', stop); removeEventListener('wheel', stop); removeEventListener('keydown', stop); };
    function glide(dy) {
      if (Math.abs(dy) < 1) return;
      if (reduce) { scrollTo(0, scrollY + dy); return; }
      snapping = true; const y0 = scrollY, dur = Math.min(1200, Math.max(650, Math.abs(dy) * .9)), t0 = performance.now();
      const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      addEventListener('touchstart', stop, { passive: true }); addEventListener('wheel', stop, { passive: true }); addEventListener('keydown', stop);
      const step = now => { if (!snapping) return; const t = Math.min(1, (now - t0) / dur); scrollTo(0, y0 + dy * ease(t)); if (t < 1) requestAnimationFrame(step); else setTimeout(stop, 80); };
      requestAnimationFrame(step);
    }
    const snap = () => {
      if (touching || snapping) return;
      const p = -scen.getBoundingClientRect().top / (DIST * K), last = stops[stops.length - 1];
      if (!(p > 0.004 && p < last - 0.004)) return;
      let n = stops[0]; for (const v of stops) if (Math.abs(v - p) < Math.abs(n - p)) n = v;
      if (Math.abs(n - p) * DIST < 25) return;
      glide((n - p) * DIST * K);
    };
    addEventListener('touchstart', () => { touching = true; clearTimeout(st); }, { passive: true });
    addEventListener('touchend', () => { touching = false; clearTimeout(st); st = setTimeout(snap, 350); }, { passive: true });
    addEventListener('scroll', () => { if (snapping) return; clearTimeout(st); st = setTimeout(snap, 450); }, { passive: true });
  }
  addEventListener('resize', scenFit);
  scenFit();
  drawTable(tpC = progT());
  requestAnimationFrame(frame);
})();
