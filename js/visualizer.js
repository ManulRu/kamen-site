/*
 * «Примерь на своём дворе»: фото → контур участка → камень (или свой микс).
 * Всё считается в браузере, фото никуда не отправляется.
 */
(function () {
  "use strict";
  var SW = window.SWATCHES || [], ST = window.Stones;
  var $ = function (s) { return document.querySelector(s); };

  var canvas = $("#vizCanvas"), ctx = canvas.getContext("2d");
  var hint = $("#vizHint"), split = $("#vizSplit"), scaleIn = $("#vizScale");
  var saveBtn = $("#vizSave"), shareBtn = $("#vizShare"), sendBtn = $("#vizSend");

  var MAX_SIDE = 1600;
  var DEMO = {
    src: "images/process-03-1600.webp",
    // углы бетонной дорожки на демо-кадре, в долях ширины/высоты
    pts: [[0.478, 0.103], [0.593, 0.103], [1, 0.655], [1, 1], [0.093, 1]],
  };
  var first = SW.filter(function (s) { return s.slug === "mix-zlat-marble-5-10"; })[0] || SW[0];
  var state = { img: null, pts: [], closed: false, parts: [{ slug: first.slug, w: 1 }], label: first.label, key: first.slug };

  // ---------- Фото ----------
  function useImage(src, pts) {
    var im = new Image();
    im.onload = function () {
      var k = Math.min(1, MAX_SIDE / Math.max(im.width, im.height));
      canvas.width = Math.round(im.width * k);
      canvas.height = Math.round(im.height * k);
      state.img = im;
      state.pts = (pts || []).map(function (p) { return [p[0] * canvas.width, p[1] * canvas.height]; });
      state.closed = state.pts.length >= 3;
      mark(); ui(); draw();
    };
    im.src = src;
  }
  var lastUrl = null;
  $("#vizFile").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0];
    e.target.value = ""; // чтобы тот же файл можно было выбрать ещё раз
    if (!f) return;
    if (!/^image\//.test(f.type)) { alert("Нужен файл с фото."); return; }
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = URL.createObjectURL(f);
    useImage(lastUrl, []);
  });
  $("#vizDemo").addEventListener("click", function () { useImage(DEMO.src, DEMO.pts); });

  // ---------- Контур ----------
  function toCanvas(e) {
    var r = canvas.getBoundingClientRect();
    return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height];
  }
  canvas.addEventListener("pointerdown", function (e) {
    if (!state.img || state.closed) return;
    var p = toCanvas(e), near = canvas.width / canvas.getBoundingClientRect().width * 22;
    if (state.pts.length >= 3 && Math.hypot(p[0] - state.pts[0][0], p[1] - state.pts[0][1]) < near) state.closed = true;
    else state.pts.push(p);
    ui(); draw();
  });
  $("#vizUndo").addEventListener("click", function () { if (state.closed) state.closed = false; else state.pts.pop(); ui(); draw(); });
  $("#vizReset").addEventListener("click", function () { state.pts = []; state.closed = false; ui(); draw(); });
  $("#vizDone").addEventListener("click", function () {
    if (state.pts.length < 3) { alert("Отметьте хотя бы 3 угла участка."); return; }
    state.closed = true; ui(); draw();
  });

  // ---------- Камни ----------
  var list = $("#vizStones");
  list.innerHTML = SW.map(function (s) {
    return '<li><button type="button" data-s="' + s.slug + '" aria-pressed="false" title="' + s.label + '" aria-label="' + s.label + '"><img src="' + s.thumb + '" alt="" loading="lazy" width="48" height="48"></button></li>';
  }).join("");
  list.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var s = ST.bySlug(b.dataset.s);
    use([{ slug: s.slug, w: 1 }], s.label);
  });
  function mark() {
    Array.prototype.forEach.call(list.querySelectorAll("button"), function (b) {
      b.setAttribute("aria-pressed", String(state.parts.length === 1 && b.dataset.s === state.parts[0].slug));
    });
  }
  function use(parts, label) {
    state.parts = parts; state.label = label;
    mark();
    if (!state.img) { useImage(DEMO.src, DEMO.pts); return; }
    ui(); draw();
  }
  // из палитры: detail = slug; из микса: detail = {parts, label}
  document.addEventListener("viz:stone", function (e) {
    var d = e.detail;
    if (typeof d === "string") { var s = ST.bySlug(d); use([{ slug: s.slug, w: 1 }], s.label); }
    else use(d.parts, d.label);
  });
  scaleIn.addEventListener("input", draw);
  split.addEventListener("input", function () { ui(); draw(); });

  // ---------- Рисование ----------
  function polyPath(g) {
    g.beginPath();
    state.pts.forEach(function (p, i) { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); });
    g.closePath();
  }

  function fillStone(tile) {
    var ys = state.pts.map(function (p) { return p[1]; });
    var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    var W = canvas.width, base = Number(scaleIn.value) / 100 * (W / 1100);
    var scaleAt = function (y) { return base * (0.38 + 0.62 * (y - y0) / Math.max(1, y1 - y0)); };
    var splitX = W * (1 - Number(split.value) / 100);

    // Глубина без полос: большое полотно камня «натягивается» строками по 2 px —
    // вдали (вверху) зерно мельче, ближе (внизу) крупнее.
    var step = 2, vTotal = 0, y;
    for (y = y0; y < y1; y += step) vTotal += step / scaleAt(y);
    // полотно не больше 4096 px: если нужно больше — рисуем его в уменьшенном масштабе q
    var needW = W / scaleAt(y0) + 4, needH = vTotal + 4, q = Math.min(1, 4096 / needW, 4096 / needH);
    var tex = document.createElement("canvas");
    tex.width = Math.ceil(needW * q); tex.height = Math.ceil(needH * q);
    var tg = tex.getContext("2d");
    tg.scale(q, q);
    tg.fillStyle = tg.createPattern(tile, "repeat");
    tg.fillRect(0, 0, needW, needH);

    ctx.save();
    polyPath(ctx); ctx.clip();
    ctx.beginPath(); ctx.rect(splitX, 0, W - splitX, canvas.height); ctx.clip();
    var v = 0, cx = needW / 2;
    for (y = y0; y < y1; y += step) {
      var s = scaleAt(y), sw = W / s;
      ctx.drawImage(tex, (cx - sw / 2) * q, v * q, sw * q, step / s * q, 0, y, W, step + 0.6);
      v += step / s;
    }
    // возвращаем свет и тени исходного фото
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.45;
    ctx.drawImage(state.img, 0, 0, W, canvas.height);
    ctx.restore();

    ctx.save();
    polyPath(ctx);
    ctx.lineWidth = Math.max(2, W / 500);
    ctx.strokeStyle = "rgba(20,16,14,.45)";
    ctx.stroke();
    ctx.restore();

    if (Number(split.value) < 100) { ctx.fillStyle = "#fff"; ctx.fillRect(splitX - 1.5, 0, 3, canvas.height); }
  }

  var drawId = 0;
  function draw(done) {
    done = typeof done === "function" ? done : null;
    if (!state.img) { drawEmpty(); if (done) done(); return; }
    var id = ++drawId;
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    ctx.drawImage(state.img, 0, 0, canvas.width, canvas.height);
    if (state.closed) {
      ST.mix(state.parts, function (tile) {
        if (id !== drawId) return; // пришёл более свежий кадр
        ctx.drawImage(state.img, 0, 0, canvas.width, canvas.height);
        fillStone(tile);
        if (done) done();
      });
      return;
    }
    var r = Math.max(6, canvas.width / 140);
    ctx.save();
    ctx.lineWidth = Math.max(2, canvas.width / 400);
    ctx.strokeStyle = "#ffffff";
    ctx.setLineDash([r * 1.6, r]);
    ctx.beginPath();
    state.pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    ctx.stroke();
    ctx.setLineDash([]);
    state.pts.forEach(function (p, i) {
      ctx.beginPath(); ctx.arc(p[0], p[1], i ? r : r * 1.35, 0, Math.PI * 2);
      ctx.fillStyle = i ? "#fff" : "#2b2a63"; ctx.fill();
      ctx.strokeStyle = "#1f1e4a"; ctx.lineWidth = 2; ctx.stroke();
    });
    ctx.restore();
  }

  function drawEmpty() {
    canvas.width = 1200; canvas.height = 760;
    var g = ctx.createLinearGradient(0, 0, 1200, 760);
    g.addColorStop(0, "#1f1e4a"); g.addColorStop(1, "#2b2a63");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1200, 760);
    ctx.fillStyle = "rgba(255,255,255,.82)"; ctx.textAlign = "center";
    ctx.font = "700 40px Montserrat, system-ui, sans-serif";
    ctx.fillText("Загрузите фото двора", 600, 360);
    ctx.font = "400 26px Montserrat, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.55)";
    ctx.fillText("или нажмите «взять пример»", 600, 410);
  }

  function ui() {
    var has = !!state.img, done = has && state.closed;
    if (!has) hint.textContent = "Загрузите фото дорожки или площадки.";
    else if (!state.closed) hint.textContent = state.pts.length < 3
      ? "Нажимайте по углам участка: отмечено " + state.pts.length + " из минимум 3."
      : "Нажмите на первую точку или «Готово», чтобы замкнуть контур.";
    else hint.textContent = "Камень: " + state.label + ". Ползунок сверху: слева «до», справа «после».";
    hint.hidden = done && Number(split.value) < 100;
    split.hidden = !done;
    saveBtn.disabled = shareBtn.disabled = !done;
    if (window.bindWa) window.bindWa(sendBtn, "Здравствуйте! Примерил на сайте камень «" + state.label + "». Хочу обсудить заказ, могу прислать фото участка.");
  }

  // ---------- Картинка для пересылки: фото + подпись производителя ----------
  function exportCanvas() {
    var W = canvas.width, H = canvas.height, band = Math.round(Math.max(90, W * 0.11));
    var out = document.createElement("canvas"); out.width = W; out.height = H + band;
    var g = out.getContext("2d");
    var keep = split.value; split.value = 100; // в картинку — целиком «после»
    return new Promise(function (res) {
      draw(function () { // ждём, пока камень реально дорисован
        g.drawImage(canvas, 0, 0);
        split.value = keep; draw();
        g.fillStyle = "#2b2a63"; g.fillRect(0, H, W, band);
        g.fillStyle = "#ffffff"; g.fillRect(0, H, W, Math.max(3, band * 0.03));
        g.fillStyle = "#fff"; g.textBaseline = "middle";
        g.font = "700 " + Math.round(band * 0.26) + "px Montserrat, system-ui, sans-serif";
        g.fillText(state.label, band * 0.3, H + band * 0.4);
        g.fillStyle = "rgba(255,255,255,.7)";
        g.font = "400 " + Math.round(band * 0.19) + "px Montserrat, system-ui, sans-serif";
        g.fillText("Примерено на сайте ОренбургБиоСтрой56 · " + location.host, band * 0.3, H + band * 0.73);
        res(out);
      }, 120);
    });
  }
  saveBtn.addEventListener("click", function () {
    exportCanvas().then(function (out) {
      var a = document.createElement("a");
      a.download = "moy-kamenny-kovyor.jpg";
      a.href = out.toDataURL("image/jpeg", 0.9);
      a.click();
    });
  });
  shareBtn.addEventListener("click", function () {
    exportCanvas().then(function (out) {
      out.toBlob(function (blob) {
        var file = new File([blob], "moy-kamenny-kovyor.jpg", { type: "image/jpeg" });
        var data = { files: [file], title: "Мой каменный ковёр", text: "Смотри, как будет выглядеть наш двор: " + state.label + ". Примерь свой: " + location.href.split("#")[0] + "#try" };
        if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share(data).catch(function () {});
        else saveBtn.click();
      }, "image/jpeg", 0.9);
    });
  });

  drawEmpty();
  ui();
})();
