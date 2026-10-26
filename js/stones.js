/*
 * Генератор камня: цвета берутся из настоящих образцов каталога,
 * камешки рисуются чёткими многоугольниками с бликом смолы.
 * Общий для примерки, камнепада, микса и текстур на странице.
 */
(function () {
  "use strict";
  var SW = window.SWATCHES || [];
  var palettes = {}, waiting = {}, tiles = {};

  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function bySlug(slug) { return SW.filter(function (x) { return x.slug === slug; })[0]; }

  // Цвета образца: центр фото (без фона), самые тёмные пиксели — щели между камнями
  function palette(slug, cb) {
    if (palettes[slug]) return cb(palettes[slug]);
    if (waiting[slug]) { waiting[slug].push(cb); return; }
    var s = bySlug(slug); if (!s) return;
    waiting[slug] = [cb];
    var im = new Image();
    im.onload = function () {
      var N = 120, c = document.createElement("canvas"); c.width = c.height = N;
      var side = Math.min(im.width, im.height), inner = side * 0.5, off = (side - inner) / 2;
      var g = c.getContext("2d");
      g.drawImage(im, (im.width - side) / 2 + off, (im.height - side) / 2 + off, inner, inner, 0, 0, N, N);
      var d = g.getImageData(0, 0, N, N).data, px = [];
      for (var i = 0; i < d.length; i += 4 * 7) px.push([d[i], d[i + 1], d[i + 2]]);
      px.sort(function (a, b) { return (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]); });
      var cut = Math.floor(px.length * 0.12);
      var gap = px.slice(0, cut).reduce(function (a, p) { return [a[0] + p[0], a[1] + p[1], a[2] + p[2]]; }, [0, 0, 0])
        .map(function (v) { return Math.round(v / Math.max(1, cut) * 0.7); });
      var rest = px.slice(cut), sum = function (p) { return p[0] + p[1] + p[2]; };
      var med = sum(rest[Math.floor(rest.length / 2)]);
      // блики фото — пиксели намного светлее основного тона; у мрамора их почти нет
      var stones = rest.filter(function (p) { return sum(p) < med + 190; });
      var mid = stones[Math.floor(stones.length / 2)];
      palettes[slug] = { gap: gap, stones: stones, mid: mid, grain: grainPx(s.frac) };
      waiting[slug].forEach(function (f) { f(palettes[slug]); });
      delete waiting[slug];
    };
    im.src = s.file;
  }
  function grainPx(frac) { var a = parseInt(frac, 10) || 3; return a >= 9 ? 34 : a >= 5 ? 24 : 15; }

  // Один камешек
  function chip(g, cx, cy, r, col, rand) {
    var v = 5 + Math.floor(rand() * 3), rot = rand() * 6.283;
    g.beginPath();
    for (var j = 0; j < v; j++) {
      var a = rot + j / v * 6.283 + (rand() - 0.5) * 0.7, rr = r * (0.7 + rand() * 0.45);
      var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * (0.75 + rand() * 0.3);
      j ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
    var lg = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    lg.addColorStop(0, "rgb(" + col.map(function (c) { return Math.min(255, c + 34); }).join(",") + ")");
    lg.addColorStop(1, "rgb(" + col.map(function (c) { return Math.max(0, c - 26); }).join(",") + ")");
    g.fillStyle = lg; g.fill();
    g.lineWidth = 1; g.strokeStyle = "rgba(0,0,0,.28)"; g.stroke();
    g.beginPath(); g.ellipse(cx - r * 0.25, cy - r * 0.3, r * 0.28, r * 0.13, -0.6, 0, 6.283);
    g.fillStyle = "rgba(255,255,255,.22)"; g.fill();
  }

  // Бесшовная плитка из смеси: parts = [{slug, w}]
  function tileFrom(pals, weights, seed, T) {
    T = T || 512;
    var rand = rng(seed), t = document.createElement("canvas"); t.width = t.height = T;
    var g = t.getContext("2d"), total = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
    var gap = [0, 0, 0];
    pals.forEach(function (p, i) { for (var k = 0; k < 3; k++) gap[k] += p.gap[k] * weights[i] / total; });
    g.fillStyle = "rgb(" + gap.map(Math.round).join(",") + ")"; g.fillRect(0, 0, T, T);
    var grain = pals.reduce(function (a, p, i) { return a + p.grain * weights[i] / total; }, 0);
    var r0 = grain / 2, n = Math.round(T * T / (r0 * r0 * 1.15));
    for (var k = 0; k < n; k++) {
      var pick = rand() * total, idx = 0;
      while (idx < weights.length - 1 && pick > weights[idx]) { pick -= weights[idx]; idx++; }
      var p = pals[idx], col = p.stones[Math.floor(rand() * p.stones.length)];
      var x = rand() * T, y = rand() * T, r = (p.grain / 2) * (0.65 + rand() * 0.6);
      var shape = hash(k + ":" + seed); // одна форма для всех копий у краёв плитки
      for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
        var cx = x + dx * T, cy = y + dy * T;
        if (cx < -r * 2 || cx > T + r * 2 || cy < -r * 2 || cy > T + r * 2) continue;
        chip(g, cx, cy, r, col, rng(shape));
      }
    }
    return t;
  }

  function mix(parts, cb) {
    parts = parts.filter(function (p) { return p.w > 0 && bySlug(p.slug); });
    if (!parts.length) return;
    var key = parts.map(function (p) { return p.slug + "*" + p.w; }).join("|");
    if (tiles[key]) return cb(tiles[key]);
    var got = [], left = parts.length;
    parts.forEach(function (p, i) {
      palette(p.slug, function (pal) {
        got[i] = pal;
        if (--left === 0) {
          tiles[key] = tileFrom(got, parts.map(function (x) { return x.w; }), hash(key));
          cb(tiles[key]);
        }
      });
    });
  }

  window.Stones = {
    tile: function (slug, cb) { mix([{ slug: slug, w: 1 }], cb); },
    mix: mix,
    palette: palette,
    chip: chip,
    rng: rng,
    bySlug: bySlug,
  };

  // Текстуры на странице: <... data-stone="slug"> получает фон из камня
  function paint() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-stone]"), function (el) {
      window.Stones.tile(el.dataset.stone, function (t) {
        el.style.backgroundImage = "url(" + t.toDataURL("image/webp", 0.85) + ")";
        el.style.backgroundSize = (el.dataset.stoneSize || "220") + "px";
      });
    });
  }
  if (document.readyState !== "loading") paint(); else document.addEventListener("DOMContentLoaded", paint);
})();
