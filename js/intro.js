/*
 * Вступление «Обвал»: лавина настоящих камней (фото продукции, фон вырезан)
 * срывается по диагонали, камни кувыркаются, бьются с пылью и дрожью экрана,
 * заваливают весь экран сплошной стеной; на стене проступает надпись;
 * затем стена рушится и из-под завала открывается сайт.
 * Пропуск — клик/клавиша/колесо; ?intro=0 — без вступления; «уменьшить движение» — без него.
 */
(function () {
  "use strict";
  var root = document.getElementById("intro");
  if (!root) return;
  var q = location.search, force = /[?&]intro=1/.test(q), off = /[?&]intro=0/.test(q);
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (off || (reduce && !force)) { root.remove(); return; }
  document.documentElement.classList.add("intro-on");

  var cv = document.getElementById("introCanvas"), g = cv.getContext("2d");
  var W = window.innerWidth, H = window.innerHeight, dpr = Math.min(1.5, window.devicePixelRatio || 1);
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px";

  var KINDS = ["marble", "jasper", "serpentine", "felsite", "zlatolit", "granite", "river"], PER = 7;
  var small = W < 700;
  var seed = 23;
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

  // ---------- Спрайты: фото камня + запечённая тень ----------
  function bake(img, size) {
    var k = size / Math.max(img.width, img.height), w = img.width * k, h = img.height * k, pad = size * 0.2;
    var c = document.createElement("canvas");
    c.width = Math.ceil((w + pad * 2) * dpr); c.height = Math.ceil((h + pad * 2) * dpr);
    var x = c.getContext("2d"); x.scale(dpr, dpr);
    x.shadowColor = "rgba(0,0,0,.6)"; x.shadowBlur = size * 0.12; x.shadowOffsetY = size * 0.07;
    x.drawImage(img, pad, pad, w, h);
    return { c: c, w: w + pad * 2, h: h + pad * 2, r: Math.min(w, h) * 0.47, size: size };
  }
  // размеры: много средних, немного мелких и несколько глыб
  function pickSize() {
    var u = rnd(), base = small ? 0.6 : 1;
    if (u < 0.12) return (150 + rnd() * 90) * base;   // глыбы
    if (u < 0.55) return (80 + rnd() * 60) * base;    // крупные
    return (42 + rnd() * 40) * base;                   // средние
  }
  var imgs = [], left = KINDS.length * PER, sprites = [];
  KINDS.forEach(function (kind) {
    for (var n = 1; n <= PER; n++) {
      var im = new Image();
      im.onload = im.onerror = function () { if (this.naturalWidth) imgs.push(this); if (--left === 0) start(); };
      im.src = "images/pebbles/" + kind + "-" + n + ".webp";
    }
  });

  // ---------- Сцена ----------
  var stones = [], dust = [], floorOn = true, t0 = 0, raf = 0, done = false, shake = 0;
  var TARGET = 0; // сколько камней нужно, чтобы завалить экран
  function start() {
    if (!imgs.length) return finish();
    for (var k = 0; k < 90; k++) sprites.push(bake(imgs[Math.floor(rnd() * imgs.length)], pickSize()));
    var avg = sprites.reduce(function (a, s) { return a + Math.PI * s.r * s.r; }, 0) / sprites.length;
    TARGET = Math.min(small ? 300 : 320, Math.ceil(W * H * (small ? 1.7 : 1.25) / avg));
    t0 = performance.now();
    root.classList.add("is-running");
    raf = requestAnimationFrame(tick);
  }
  var spawned = 0;
  function spawn(t) {
    // лавина: поток нарастает и за 2 с заваливает экран
    var want = Math.min(TARGET, Math.floor(Math.pow(Math.min(1, t / 2000), 0.8) * TARGET));
    while (spawned < want) {
      var sp = sprites[Math.floor(rnd() * sprites.length)];
      var fromLeft = rnd() < 0.7;  // срываются с верхнего левого склона
      stones.push({
        x: fromLeft ? -sp.r - rnd() * W * 0.3 : rnd() * W, y: fromLeft ? rnd() * H * 0.35 - H * 0.4 : -sp.r - rnd() * 200,
        vx: fromLeft ? 9 + rnd() * 10 : (rnd() - 0.5) * 4, vy: 2 + rnd() * 6,
        a: rnd() * 6.28, va: (rnd() - 0.3) * 0.35, r: sp.r, m: sp.r * sp.r, sp: sp, landed: false
      });
      spawned++;
    }
  }
  function puff(x, y, power) {
    var n = Math.min(6, 1 + power * 0.04);
    for (var i = 0; i < n; i++) dust.push({ x: x + (rnd() - 0.5) * 40, y: y - rnd() * 10, vx: (rnd() - 0.5) * 2.4, vy: -0.3 - rnd() * 1.1,
      r: 26 + rnd() * 40 + power * 0.3, life: 1, fade: 0.01 + rnd() * 0.01 });
  }
  function physics() {
    var G = 0.75, i, j, s, o;
    for (i = 0; i < stones.length; i++) {
      s = stones[i];
      s.vy += G; s.vx *= 0.992; s.va *= 0.99;
      s.x += s.vx; s.y += s.vy; s.a += s.va;
      if (s.x > W - s.r && s.vx > 0) { s.x = W - s.r; s.vx = -s.vx * 0.3; }
      if (floorOn && s.y > H - s.r) {
        if (!s.landed && s.vy > 8) { puff(s.x, H - 4, s.r); if (s.r > 60) shake = Math.max(shake, s.r * 0.09); }
        s.landed = true;
        s.y = H - s.r; s.vy = -Math.abs(s.vy) * 0.2; s.vx *= 0.7; s.va = s.vx / s.r * 0.5;
      }
    }
    for (var it = 0; it < 3; it++) {
      for (i = 0; i < stones.length; i++) {
        s = stones[i];
        for (j = i + 1; j < stones.length; j++) {
          o = stones[j];
          var dx = o.x - s.x, dy = o.y - s.y, rr = s.r + o.r;
          if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
          var d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr || d2 === 0) continue;
          var d = Math.sqrt(d2), nx = dx / d, ny = dy / d, over = rr - d;
          var ms = o.m / (s.m + o.m), mo = s.m / (s.m + o.m);          // тяжёлая глыба толкает лёгкие камни
          s.x -= nx * over * ms; s.y -= ny * over * ms; o.x += nx * over * mo; o.y += ny * over * mo;
          var rv = (o.vx - s.vx) * nx + (o.vy - s.vy) * ny;
          if (rv < 0) {
            var imp = -1.15 * rv;
            s.vx -= imp * nx * ms; s.vy -= imp * ny * ms; o.vx += imp * nx * mo; o.vy += imp * ny * mo;
            var tng = (o.vx - s.vx) * -ny + (o.vy - s.vy) * nx;
            s.va += tng * 0.004 * ms; o.va -= tng * 0.004 * mo;
          }
        }
      }
    }
    for (i = dust.length - 1; i >= 0; i--) {
      var p = dust[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.98; p.r += 0.6; p.life -= p.fade;
      if (p.life <= 0) dust.splice(i, 1);
    }
    if (dust.length > 260) dust.splice(0, dust.length - 260);
  }
  function draw() {
    var sx = shake ? (rnd() - 0.5) * shake : 0, sy = shake ? (rnd() - 0.5) * shake : 0;
    shake *= 0.86; if (shake < 0.3) shake = 0;
    g.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);
    g.clearRect(-50, -50, W + 100, H + 100);
    for (var i = 0; i < stones.length; i++) {
      var s = stones[i], sp = s.sp;
      if (s.y - sp.h > H + 40) continue;
      g.save(); g.translate(s.x, s.y); g.rotate(s.a);
      g.drawImage(sp.c, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
      g.restore();
    }
    // каменная пыль
    for (var k = 0; k < dust.length; k++) {
      var p = dust[k], gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      gr.addColorStop(0, "rgba(168,156,138," + (0.16 * p.life) + ")"); gr.addColorStop(0.6, "rgba(150,140,124," + (0.07 * p.life) + ")"); gr.addColorStop(1, "rgba(150,140,124,0)");
      g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
    }
  }
  function tick(now) {
    var t = now - t0;
    spawn(t);
    if (t > 1900) root.classList.add("show-title");            // экран завален — проступает надпись
    if (t > 3300 && floorOn) {                                   // стена рушится — открывается сайт
      floorOn = false; root.classList.add("is-opening"); shake = 14;
      stones.forEach(function (s) { s.vy += 2 + rnd() * 6; s.vx += (rnd() - 0.5) * 6; s.va += (rnd() - 0.5) * 0.25; });
      for (var i = 0; i < 14; i++) puff(rnd() * W, H * (0.75 + rnd() * 0.25), 140);
    }
    physics(); draw();
    if (t > 5200 || (!floorOn && stones.every(function (s) { return s.y - s.sp.h > H; }) && dust.length < 30)) return finish();
    raf = requestAnimationFrame(tick);
  }
  function finish() {
    if (done) return; done = true;
    cancelAnimationFrame(raf);
    root.classList.add("is-done");
    document.documentElement.classList.remove("intro-on");
    setTimeout(function () { root.remove(); }, 700);
  }
  root.addEventListener("click", finish);
  window.addEventListener("keydown", function (e) { if (!done && (e.key === "Escape" || e.key === " " || e.key === "Enter")) finish(); });
  window.addEventListener("wheel", function () { if (!done) finish(); }, { passive: true, once: true });
  setTimeout(finish, 8000); // страховка
})();
