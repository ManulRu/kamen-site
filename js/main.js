(function () {
  "use strict";
  var S = window.SITE;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  // Образцы каменного ковра — каталог, стр. 7–8
  var SWATCHES = [
    ["marble-3-5", "Мрамор", "3-5"], ["marble-5-10", "Мрамор", "5-10"],
    ["jasper-sealing-3-5", "Яшма сургучная", "3-5"], ["jasper-sealing-5-10", "Яшма сургучная", "5-10"],
    ["jasper-landscape-3-5", "Яшма пейзажная", "3-5"], ["serpentine-3-5", "Змеевик", "3-5"],
    ["serpentine-5-10", "Змеевик", "5-10"], ["felsite-striped-3-5", "Фельзит полосатик", "3-5"],
    ["felsite-yellow-5-10", "Фельзит жёлтый", "5-10"], ["granite-pink-5-10", "Гранит розовый", "5-10"],
    ["zlatolit-black-3-5", "Златолит чёрный", "3-5"], ["zlatolit-black-5-10", "Златолит чёрный", "5-10"],
    ["pebble-river-9-12", "Галька речная", "9-12"], ["mix-color-3-5", "Микс разноцветный", "3-5"],
    ["mix-color-5-10", "Микс разноцветный", "5-10"], ["mix-zlat-marble-3-5", "Микс: златолит и мрамор", "3-5"],
    ["mix-zlat-marble-5-10", "Микс: златолит и мрамор", "5-10"], ["mix-jasper-marble-5-10", "Микс: яшма и мрамор", "5-10"],
  ];

  // ---------- Меню ----------
  var burger = $("#burger"), nav = $("#nav");
  burger.addEventListener("click", function () {
    var open = burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  });
  $$(".has-drop > .nav__link").forEach(function (b) {
    b.addEventListener("click", function () {
      var item = b.parentElement, open = !item.classList.contains("is-open");
      $$(".has-drop").forEach(function (x) { x.classList.remove("is-open"); x.firstElementChild.setAttribute("aria-expanded", "false"); });
      item.classList.toggle("is-open", open); b.setAttribute("aria-expanded", String(open));
    });
  });
  $$("#nav a").forEach(function (a) {
    a.addEventListener("click", function () {
      burger.setAttribute("aria-expanded", "false"); nav.classList.remove("is-open");
      $$(".has-drop").forEach(function (x) { x.classList.remove("is-open"); });
    });
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".has-drop")) $$(".has-drop").forEach(function (x) { x.classList.remove("is-open"); });
  });

  // ---------- Образцы: сетка + крупный просмотр ----------
  var thumbs = $("#thumbs");
  thumbs.innerHTML = SWATCHES.map(function (s, i) {
    return '<li><button class="thumb" type="button" data-i="' + i + '" aria-selected="' + (i === 1) + '" aria-label="' + esc(s[1] + " " + s[2] + " мм") + '" title="' + esc(s[1] + " " + s[2] + " мм") + '">' +
      '<img src="images/swatch/sm/' + s[0] + '.webp" alt="" width="69" height="69" loading="lazy"></button></li>';
  }).join("");
  thumbs.addEventListener("click", function (e) {
    var b = e.target.closest(".thumb"); if (!b) return;
    var s = SWATCHES[+b.dataset.i];
    $("#previewImg").src = "images/swatch/" + s[0] + ".webp"; $("#previewImg").alt = s[1] + " " + s[2] + " мм";
    $("#previewName").textContent = s[1]; $("#previewFrac").textContent = s[2] + " мм";
    $$(".thumb", thumbs).forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
  });

  // ---------- Карусель ----------
  var track = $("#appsTrack"), bar = $("#appsBar"), prev = $("#appsPrev"), next = $("#appsNext");
  function step() { var c = track.querySelector(".app-card"); return c ? c.getBoundingClientRect().width + 40 : 346; }
  prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: "smooth" }); });
  next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: "smooth" }); });
  function progress() {
    var max = track.scrollWidth - track.clientWidth, w = Math.max(8, track.clientWidth / track.scrollWidth * 100);
    bar.style.width = w + "%";
    bar.style.left = (max > 0 ? track.scrollLeft / max * (100 - w) : 0) + "%";
    prev.disabled = track.scrollLeft <= 2; next.disabled = track.scrollLeft >= max - 2;
  }
  track.addEventListener("scroll", progress, { passive: true });
  window.addEventListener("resize", progress);
  progress();

  // ---------- Подвал: контакты ----------
  var c = S.contacts;
  $("#footContacts").innerHTML = c.phones.map(function (p) { return '<a href="tel:' + p.replace(/[^\d+]/g, "") + '">' + esc(p) + "</a>"; }).join("<br>") +
    (c.emails || []).map(function (m) { return '<br><a href="mailto:' + esc(m) + '">' + esc(m) + "</a>"; }).join("");
  $("#footAddress").innerHTML = '<a href="' + c.mapUrl + '" target="_blank" rel="noopener">' + esc(c.address) + "</a>";
  $("#year").textContent = new Date().getFullYear();

  // ---------- Плавное появление при прокрутке ----------
  var els = $$("[data-aos]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("is-in"); io.unobserve(x.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(function (el) { el.classList.add("is-in"); });
})();
