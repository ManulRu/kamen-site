(function () {
  "use strict";
  var S = window.SITE;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var SW = [["marble-3-5", "Мрамор", "3-5"], ["marble-5-10", "Мрамор", "5-10"], ["jasper-sealing-3-5", "Яшма сургучная", "3-5"], ["jasper-sealing-5-10", "Яшма сургучная", "5-10"], ["jasper-landscape-3-5", "Яшма пейзажная", "3-5"], ["serpentine-3-5", "Змеевик", "3-5"], ["serpentine-5-10", "Змеевик", "5-10"], ["felsite-striped-3-5", "Фельзит полосатик", "3-5"], ["felsite-yellow-5-10", "Фельзит жёлтый", "5-10"], ["granite-pink-5-10", "Гранит розовый", "5-10"], ["zlatolit-black-3-5", "Златолит чёрный", "3-5"], ["zlatolit-black-5-10", "Златолит чёрный", "5-10"], ["pebble-river-9-12", "Галька речная", "9-12"], ["mix-color-3-5", "Микс разноцветный", "3-5"], ["mix-color-5-10", "Микс разноцветный", "5-10"], ["mix-zlat-marble-3-5", "Микс: златолит и мрамор", "3-5"], ["mix-zlat-marble-5-10", "Микс: златолит и мрамор", "5-10"], ["mix-jasper-marble-5-10", "Микс: яшма и мрамор", "5-10"]];

  // меню: бургер открывает большое меню (как у эталона); на узких экранах — и основное
  var burger = $(".js-burger"), mega = $(".js-mega"), nav = $(".js-nav");
  burger.addEventListener("click", function () {
    var open = burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", String(open));
    mega.classList.toggle("is-open", open); nav.classList.toggle("is-open", open && innerWidth <= 1180);
  });
  // выпадающие списки на телефоне — по нажатию на стрелку
  $$(".has-drop > .nav__link").forEach(function (a) {
    a.addEventListener("click", function (ev) {
      if (innerWidth > 1180) return;
      var it = a.parentElement; if (!it.classList.contains("is-open")) { ev.preventDefault(); it.classList.add("is-open"); }
    });
  });

  // образцы: сетка + крупный просмотр
  $$(".js-thumbs").forEach(function (ul) {
    var box = ul.closest(".finishes__panel");
    ul.addEventListener("click", function (ev) {
      var b = ev.target.closest(".thumb"); if (!b) return;
      var s = SW[+b.dataset.i];
      $(".js-prev-img", box).src = "images/swatch/" + s[0] + ".webp"; $(".js-prev-img", box).alt = s[1] + " " + s[2] + " мм";
      $(".js-prev-name", box).textContent = s[1]; $(".js-prev-frac", box).textContent = s[2] + " мм";
      $$(".thumb", ul).forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
    });
  });

  // карусель применения
  $$(".apps").forEach(function (sec) {
    var tr = $(".js-track", sec), bar = $(".js-bar", sec), pv = $(".js-prev", sec), nx = $(".js-next", sec);
    var step = function () { var c = tr.querySelector(".app-card"); return c ? c.getBoundingClientRect().width + 40 : 346; };
    pv.addEventListener("click", function () { tr.scrollBy({ left: -step(), behavior: "smooth" }); });
    nx.addEventListener("click", function () { tr.scrollBy({ left: step(), behavior: "smooth" }); });
    var upd = function () { var max = tr.scrollWidth - tr.clientWidth, w = Math.max(8, tr.clientWidth / tr.scrollWidth * 100);
      bar.style.width = w + "%"; bar.style.left = (max > 0 ? tr.scrollLeft / max * (100 - w) : 0) + "%"; pv.disabled = tr.scrollLeft <= 2; nx.disabled = tr.scrollLeft >= max - 2; };
    tr.addEventListener("scroll", upd, { passive: true }); addEventListener("resize", upd); upd();
  });

  // карусель тёмных блоков
  $$(".js-fwc").forEach(function (sec) {
    var sl = $$(".fwc__slide", sec), i = 0;
    var go = function (d) { sl[i].classList.remove("is-on"); i = (i + d + sl.length) % sl.length; sl[i].classList.add("is-on"); };
    $(".js-fwc-prev", sec).addEventListener("click", function () { go(-1); });
    $(".js-fwc-next", sec).addEventListener("click", function () { go(1); });
  });

  // слои покрытия: вкладка подсвечивает слой
  $$(".buildup__panel").forEach(function (p) {
    var pills = $$(".pill", p), layers = $$(".js-stack span", p);
    var sel = function (k) { pills.forEach(function (x, j) { x.classList.toggle("is-on", j === k); }); layers.forEach(function (x, j) { x.classList.toggle("is-on", j === k); }); };
    pills.forEach(function (x, k) { x.addEventListener("click", function () { sel(k); }); }); sel(0);
  });

  // форма: собирает письмо в почтовом приложении (сайт ничего не отправляет сам)
  $$(".js-form").forEach(function (f) {
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!f.reportValidity()) return;
      var lines = [], fd = new FormData(f), picked = $$(".js-swl input:checked").map(function (x) { return x.value; });
      fd.forEach(function (v, k) { if (v && k !== "Согласие") lines.push(k + ": " + v); });
      if (picked.length) lines.push("Образцы: " + picked.join("; "));
      location.href = "mailto:" + S.contacts.emails[0] + "?subject=" + encodeURIComponent("Заявка с сайта") + "&body=" + encodeURIComponent(lines.join("\n"));
    });
  });

  // контакты
  var c = S.contacts;
  $$(".js-foot-contacts").forEach(function (el) {
    el.innerHTML = c.phones.map(function (p) { return '<a href="tel:' + p.replace(/[^\d+]/g, "") + '">' + esc(p) + "</a>"; }).join("<br>") +
      c.emails.map(function (m) { return '<br><a href="mailto:' + m + '">' + esc(m) + "</a>"; }).join("") + "<br>" + esc(c.address);
  });
  $$(".js-contacts").forEach(function (el) {
    el.innerHTML = c.phones.map(function (p) { return '<a href="tel:' + p.replace(/[^\d+]/g, "") + '">' + esc(p) + "<small>Позвонить</small></a>"; }).join("") +
      c.emails.map(function (m) { return '<a href="mailto:' + m + '">' + esc(m) + "<small>Написать</small></a>"; }).join("") +
      '<a href="' + c.mapUrl + '" target="_blank" rel="noopener">' + esc(c.address) + "<small>Открыть на карте</small></a>";
  });

  // плавное появление
  var els = $$("[data-aos]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add("is-in"); io.unobserve(x.target); } }); }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(function (el) { el.classList.add("is-in"); });
})();
