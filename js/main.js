(function () {
  "use strict";
  var S = window.SITE;
  var C = window.CATALOG || null;

  // Образцы каменного ковра — каталог, стр. 7–8 (подписи под фото)
  var SWATCHES = [
    { slug: "marble-3-5", name: "Мрамор", frac: "3-5" },
    { slug: "marble-5-10", name: "Мрамор", frac: "5-10" },
    { slug: "jasper-sealing-3-5", name: "Яшма сургучная", frac: "3-5" },
    { slug: "jasper-sealing-5-10", name: "Яшма сургучная", frac: "5-10" },
    { slug: "jasper-landscape-3-5", name: "Яшма пейзажная", frac: "3-5" },
    { slug: "serpentine-3-5", name: "Змеевик", frac: "3-5" },
    { slug: "serpentine-5-10", name: "Змеевик", frac: "5-10" },
    { slug: "felsite-striped-3-5", name: "Фельзит полосатик", frac: "3-5" },
    { slug: "felsite-yellow-5-10", name: "Фельзит жёлтый", frac: "5-10" },
    { slug: "granite-pink-5-10", name: "Гранит розовый", frac: "5-10" },
    { slug: "zlatolit-black-3-5", name: "Златолит чёрный", frac: "3-5" },
    { slug: "zlatolit-black-5-10", name: "Златолит чёрный", frac: "5-10" },
    { slug: "pebble-river-9-12", name: "Галька речная", frac: "9-12" },
    { slug: "mix-color-3-5", name: "Микс разноцветный", frac: "3-5" },
    { slug: "mix-color-5-10", name: "Микс разноцветный", frac: "5-10" },
    { slug: "mix-zlat-marble-3-5", name: "Микс: златолит и мрамор", frac: "3-5" },
    { slug: "mix-zlat-marble-5-10", name: "Микс: златолит и мрамор", frac: "5-10" },
    { slug: "mix-jasper-marble-5-10", name: "Микс: яшма и мрамор", frac: "5-10" },
  ];
  SWATCHES.forEach(function (s) {
    s.file = "images/swatch/" + s.slug + ".webp";
    s.thumb = "images/swatch/sm/" + s.slug + ".webp";
    s.label = s.name + " " + s.frac + " мм";
  });
  window.SWATCHES = SWATCHES;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var fmt = function (n) { return Number(n).toLocaleString("ru-RU"); };
  var bySlug = function (slug) { return SWATCHES.filter(function (s) { return s.slug === slug; })[0]; };

  // ---------- WhatsApp: ссылка с готовым текстом ----------
  function bindWa(el, text) {
    if (!el || !S.contacts.whatsapp) return;
    if (text) el.dataset.wa = text;
    el.href = "https://wa.me/" + S.contacts.whatsapp + "?text=" + encodeURIComponent(el.dataset.wa || "Здравствуйте!");
    el.target = "_blank";
    el.rel = "noopener";
  }
  window.bindWa = bindWa;
  $$(".js-wa").forEach(function (el) { bindWa(el); });

  if (!S.contacts.confirmed || !S.prices.confirmed) {
    var what = !S.contacts.confirmed && !S.prices.confirmed ? "контакты и цены" : !S.prices.confirmed ? "цены" : "контакты";
    $("#previewRibbon").textContent = "Предпросмотр: " + what + " — из каталога 2023 года, ждут подтверждения.";
    $("#previewRibbon").hidden = false;
  }

  // ---------- Меню ----------
  var burger = $("#burger"), nav = $("#nav");
  burger.addEventListener("click", function () {
    var open = burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  });
  $$("#nav a").forEach(function (a) {
    a.addEventListener("click", function () { burger.setAttribute("aria-expanded", "false"); nav.classList.remove("is-open"); });
  });

  // ---------- Образцы: сетка + крупный просмотр ----------
  var thumbs = $("#thumbs"), current = SWATCHES[1];
  thumbs.innerHTML = SWATCHES.map(function (s, i) {
    return '<li><button class="thumb" type="button" role="option" style="--i:' + i + '" data-s="' + s.slug + '" aria-selected="' + (s === current) + '" aria-label="' + esc(s.label) + '" title="' + esc(s.label) + '">' +
      '<img src="' + s.thumb + '" alt="" width="96" height="96" loading="lazy"></button></li>';
  }).join("");
  function show(s) {
    current = s;
    var stone = $("#previewStone"), img = $("#previewImg");
    img.src = s.file; img.alt = s.label;
    stone.classList.remove("lift"); void stone.offsetWidth; stone.classList.add("lift"); // «камень поднимается»
    $("#previewName").textContent = s.name;
    $("#previewFrac").textContent = s.frac + " мм";
    $$(".thumb", thumbs).forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.s === s.slug)); });
    syncPick();
  }
  thumbs.addEventListener("click", function (e) { var b = e.target.closest(".thumb"); if (b) show(bySlug(b.dataset.s)); });
  $("#previewTry").addEventListener("click", function () {
    document.dispatchEvent(new CustomEvent("viz:stone", { detail: current.slug }));
    $("#try").scrollIntoView({ behavior: "smooth" });
  });

  // ---------- Набор образцов (до 4) ----------
  var picked = [], MAX_PICK = 4;
  function syncPick() {
    var on = picked.indexOf(current.slug) > -1, b = $("#previewPick");
    b.setAttribute("aria-pressed", String(on));
    b.textContent = on ? "В наборе ✓" : "В набор образцов";
  }
  $("#previewPick").addEventListener("click", function () {
    var i = picked.indexOf(current.slug);
    if (i > -1) picked.splice(i, 1);
    else if (picked.length < MAX_PICK) picked.push(current.slug);
    else { alert("В набор помещается до " + MAX_PICK + " образцов."); return; }
    syncPick(); renderTray();
  });
  function renderTray() {
    $("#tray").hidden = picked.length === 0;
    $("#trayList").innerHTML = picked.map(function (slug) {
      var s = bySlug(slug);
      return '<img src="' + s.thumb + '" alt="' + esc(s.label) + '" title="' + esc(s.label) + '" width="34" height="34">';
    }).join("");
    bindWa($("#traySend"), "Здравствуйте! Можно посмотреть образцы: " + picked.map(function (slug) { return bySlug(slug).label; }).join("; ") + ".");
  }

  // ---------- Карусель применения ----------
  var track = $("#appsTrack"), bar = $("#appsBar");
  function step() { var c = track.querySelector(".app-card"); return c ? c.getBoundingClientRect().width + 20 : 300; }
  $("#appsPrev").addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: "smooth" }); });
  $("#appsNext").addEventListener("click", function () { track.scrollBy({ left: step(), behavior: "smooth" }); });
  function progress() {
    var max = track.scrollWidth - track.clientWidth, w = Math.max(12, track.clientWidth / track.scrollWidth * 100);
    bar.style.width = w + "%";
    bar.style.left = (max > 0 ? track.scrollLeft / max * (100 - w) : 0) + "%";
  }
  track.addEventListener("scroll", progress, { passive: true });
  window.addEventListener("resize", progress);
  progress();

  // «Примерить у себя» из примера объекта — сразу демо
  $$(".js-try-demo").forEach(function (a) {
    a.addEventListener("click", function () { var d = $("#vizDemo"); if (d) setTimeout(function () { d.click(); }, 400); });
  });

  // ---------- Калькулятор ----------
  var area = $("#calcArea"), thick = $("#calcThick"), thickOut = $("#calcThickOut"), out = $("#calcResult");
  thick.min = S.thicknessMm.min; thick.max = S.thicknessMm.max; thick.step = S.thicknessMm.step; thick.value = S.thicknessMm.default;
  var AREA_MAX = Number(area.dataset.max) || 10000;
  function calc() {
    var raw = String(area.value).trim().replace(",", ".");
    var a = /^\d+(\.\d+)?$/.test(raw) ? parseFloat(raw) : NaN; // только обычное число: без «-3», «1e9»
    var t = Number(thick.value);
    var frac = ($("input[name=frac]:checked") || {}).value || "3-5";
    thickOut.textContent = t;
    var send = $("#calcSend");
    if (!(a > 0)) {
      out.innerHTML = "<b>Введите площадь</b>Например, 20 или 12,5 м².";
      bindWa(send, "Здравствуйте! Помогите посчитать, сколько нужно крошки для каменного ковра.");
      return;
    }
    if (a > AREA_MAX) {
      out.innerHTML = "<b>Больше " + fmt(AREA_MAX) + " м²</b>Для такого объёма расчёт сделает менеджер.";
      bindWa(send, "Здравствуйте! Нужен расчёт крошки на площадь больше " + fmt(AREA_MAX) + " м², фракция " + frac + " мм.");
      return;
    }
    var A = fmt(a), k = S.consumptionKgPerM2PerMm[frac], html, msg;
    if (k) {
      var kg = Math.ceil(a * t * k);
      html = "<b>≈ " + fmt(kg) + " кг камня</b>" + Math.ceil(kg / 20) + " мешков по 20 кг, или " + Math.ceil(kg / 10) + " по 10 кг, или " + fmt(Math.round(kg / 100) / 10) + " т в биг-бэгах.";
      msg = "Расчёт с сайта: " + A + " м², фракция " + frac + " мм, слой " + t + " мм, около " + fmt(kg) + " кг. Подскажите цену и доставку.";
    } else {
      html = "<b>" + fmt(Math.round(a * t)) + " л покрытия</b>" + A + " м² × " + t + " мм. Сколько это килограммов и мешков, менеджер скажет по норме расхода для фракции " + frac + " мм.";
      msg = "Расчёт с сайта: площадь " + A + " м², фракция " + frac + " мм, слой " + t + " мм. Сколько нужно камня и сколько это стоит?";
    }
    out.innerHTML = html;
    bindWa(send, msg);
  }
  [area, thick].forEach(function (el) { el.addEventListener("input", calc); });
  $$("input[name=frac]").forEach(function (el) { el.addEventListener("change", calc); });
  calc();

  // ---------- Цены ----------
  var PACKS = [
    { key: "10kg", label: "Мешок 10 кг", unit: "₽ за мешок 10 кг" },
    { key: "20kg", label: "Мешок 20 кг", unit: "₽ за мешок 20 кг" },
    { key: "1t", label: "Биг-бэг 1 т", unit: "₽ за 1 т в мягком контейнере" },
    { key: "panel", label: "Панели", unit: "₽ за панель 1200 × 600 мм" },
  ];
  var tabs = $("#priceTabs"), table = $("#priceTable");
  function nice(n) { var s = String(n).toLowerCase().replace(/ё/g, "е").replace("черный", "чёрный").replace("желтый", "жёлтый").replace("зеленый", "зелёный"); return s.charAt(0).toUpperCase() + s.slice(1); }
  function cell(v) {
    if (v == null) return "—";
    if (typeof v === "number") return fmt(v);
    var main = v.vat != null ? fmt(v.vat) : "—";
    var sub = v.noVat != null ? "<small>без НДС " + fmt(v.noVat) + "</small>" : "";
    // с НДС должно быть ≈ без НДС × 1,2; если в каталоге не так — помечаем
    var odd = v.vat != null && v.noVat != null && Math.abs(v.vat - v.noVat * 1.2) > 2;
    return main + (odd ? ' <span class="flag" title="В каталоге цена с НДС не равна цене без НДС × 1,2 — уточняется">?</span>' : "") + sub;
  }
  function renderPrices(key) {
    if (!C || !C.stones) { table.innerHTML = "<tbody><tr><td>Прайс уточняйте у менеджера.</td></tr></tbody>"; return; }
    var pack = PACKS.filter(function (p) { return p.key === key; })[0];
    if (key === "panel") {
      table.innerHTML = "<thead><tr><th>Камень</th><th>Цена, ₽/шт</th></tr></thead><tbody>" +
        C.stones.map(function (s) { return "<tr><td>" + esc(nice(s.name)) + "</td><td>" + cell(s.panel) + "</td></tr>"; }).join("") + "</tbody>";
    } else {
      var fr = C.fractions.slice().sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); });
      table.innerHTML = "<thead><tr><th>Камень</th>" + fr.map(function (f) { return "<th>" + f + " мм</th>"; }).join("") + "</tr></thead><tbody>" +
        C.stones.map(function (s) {
          var p = (s.prices && s.prices[key]) || {};
          return "<tr><td>" + esc(nice(s.name)) + "</td>" + fr.map(function (f) { return "<td>" + cell(p[f]) + "</td>"; }).join("") + "</tr>";
        }).join("") + "</tbody>";
    }
    var flag = S.prices.confirmed ? "" : ' <span class="flag">цены каталога 2023 · ждут подтверждения</span>';
    $("#pricesNote").innerHTML = esc(pack.unit) + (key === "panel" ? "." : ". Крупным — с НДС.") + flag;
  }
  tabs.innerHTML = PACKS.map(function (p, i) {
    return '<button class="tab' + (i ? "" : " is-on") + '" role="tab" aria-selected="' + !i + '" data-k="' + p.key + '">' + p.label + "</button>";
  }).join("");
  tabs.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    $$("button", tabs).forEach(function (x) { x.classList.remove("is-on"); x.setAttribute("aria-selected", "false"); });
    b.classList.add("is-on"); b.setAttribute("aria-selected", "true");
    renderPrices(b.dataset.k);
  });
  renderPrices("10kg");

  // ---------- Контакты и подвал ----------
  var c = S.contacts, ch = [];
  if (c.whatsapp) ch.push('<a class="channel channel--wa js-wa" data-wa="Здравствуйте! Интересует крошка для каменного ковра." href="#"><div><b>WhatsApp</b><span>Напишите — подберём камень</span></div></a>');
  if (c.telegram) ch.push('<a class="channel" href="https://t.me/' + esc(c.telegram) + '" target="_blank" rel="noopener"><div><b>Telegram</b><span>@' + esc(c.telegram) + "</span></div></a>");
  c.phones.forEach(function (p) { ch.push('<a class="channel" href="tel:' + p.replace(/[^\d+]/g, "") + '"><div><b>' + esc(p) + "</b><span>Позвонить</span></div></a>"); });
  (c.emails || []).forEach(function (m) { ch.push('<a class="channel" href="mailto:' + esc(m) + '"><div><b>Почта</b><span>' + esc(m) + "</span></div></a>"); });
  ch.push('<a class="channel" href="' + c.mapUrl + '" target="_blank" rel="noopener"><div><b>Адрес</b><span>' + esc(c.address) + "</span></div></a>");
  $("#channels").innerHTML = ch.join("");
  $$("#channels .js-wa").forEach(function (el) { bindWa(el); });
  if (!c.confirmed) $("#contactsFlag").innerHTML = '<span class="flag">контакты из каталога 2023 · ждут подтверждения</span>';
  $("#footContacts").innerHTML = esc(c.address) + "<br>" + c.phones.map(function (p) { return '<a href="tel:' + p.replace(/[^\d+]/g, "") + '">' + esc(p) + "</a>"; }).join("<br>") + (c.emails || []).map(function (m) { return '<br><a href="mailto:' + esc(m) + '">' + esc(m) + "</a>"; }).join("");
  $("#year").textContent = new Date().getFullYear();

  // ---------- Появление и «поднимание» при прокрутке ----------
  var targets = $$("[data-reveal], [data-rise], .finishes__panel");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -10% 0px" });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(function (el) { el.classList.add("is-in"); });
  }
})();
