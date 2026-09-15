/* ==========================================================================
   ARCA Tecnologia — Interações leves
   Menu mobile, dropdown, reveal on scroll, contadores, FAQ, WhatsApp
   Sem dependências. Vanilla JS.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var header = document.querySelector(".site-header");
  var mobileNav = document.querySelector(".mobile-nav");
  var menuToggle = document.querySelector(".menu-toggle");
  var body = document.body;

  /* ---------- Header: sombra ao rolar ---------- */
  if (header) {
    var setHeaderShadow = function () {
      header.style.boxShadow = window.scrollY > 8 ? "0 6px 24px rgba(16,26,44,0.08)" : "none";
    };
    setHeaderShadow();
    window.addEventListener("scroll", setHeaderShadow, { passive: true });
  }

  /* ---------- Menu mobile ---------- */
  if (menuToggle && mobileNav) {
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-controls", "mobile-nav");

    function setMenu(open) {
      mobileNav.classList.toggle("open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    }

    menuToggle.addEventListener("click", function () {
      setMenu(!mobileNav.classList.contains("open"));
    });

    mobileNav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ---------- Dropdown do header ---------- */
  var dropdowns = Array.prototype.slice.call(document.querySelectorAll(".dropdown"));
  dropdowns.forEach(function (dd) {
    var btn = dd.querySelector(":scope > button");
    if (!btn) return;

    function setOpen(open) {
      dd.setAttribute("data-open", open ? "true" : "false");
      if (btn) btn.setAttribute("aria-expanded", String(open));
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      setOpen(dd.getAttribute("data-open") !== "true");
    });

    btn.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" && dd.getAttribute("data-open") !== "true") {
        e.preventDefault();
        setOpen(true);
      }
    });

    dd.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        setOpen(false);
        if (mobileNav) mobileNav.classList.remove("open");
      });
    });
  });

  document.addEventListener("click", function () {
    dropdowns.forEach(function (dd) {
      dd.setAttribute("data-open", "false");
      var b = dd.querySelector(":scope > button");
      if (b) b.setAttribute("aria-expanded", "false");
    });
  });

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Contadores animados ---------- */
  var counters = document.querySelectorAll("[data-count]");
  function animateCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    var dur = reduceMotion ? 0 : Math.min(1600, 900 + target * 2);
    var start = null;

    function format(n) {
      return n.toLocaleString("pt-BR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      });
    }

    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var val = Math.round(target * eased * Math.pow(10, decimals)) / Math.pow(10, decimals);
      el.textContent = prefix + format(val) + suffix;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = prefix + format(target) + suffix;
    }

    if (reduceMotion) {
      el.textContent = prefix + format(target) + suffix;
      return;
    }
    requestAnimationFrame(tick);
  }

  if (counters.length && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          cio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(function (el) {
      el.textContent =
        (el.getAttribute("data-prefix") || "") +
        parseFloat(el.getAttribute("data-count")).toLocaleString("pt-BR") +
        (el.getAttribute("data-suffix") || "");
    });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var q = item.querySelector(".faq-q");
    var a = item.querySelector(".faq-a");
    if (!q || !a) return;

    function setOpen(open) {
      item.setAttribute("data-open", open ? "true" : "false");
      a.style.maxHeight = open ? a.scrollHeight + "px" : "0px";
      q.setAttribute("aria-expanded", String(open));
    }

    q.addEventListener("click", function () {
      setOpen(item.getAttribute("data-open") !== "true");
    });
  });

  /* ---------- Footer: ano dinâmico ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- WhatsApp: mensagem padrão ---------- */
  var wa = document.querySelector(".wa-float");
  if (wa) {
    var phone = wa.getAttribute("data-phone");
    var msg = encodeURIComponent(
      wa.getAttribute("data-message") ||
        "Olá, quero conhecer melhor as soluções da ARCA para gestão de frotas."
    );
    if (phone) wa.setAttribute("href", "https://wa.me/" + phone + "?text=" + msg);
    wa.setAttribute("target", "_blank");
    wa.setAttribute("rel", "noopener");
  }

  /* ---------- Formulário de contato: envio via WhatsApp ---------- */
  var contactForm = document.getElementById("contact-form");
  if (contactForm) {
    var phone = (wa && wa.getAttribute("data-phone")) || "";
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = new FormData(contactForm);
      var lines = [];
      var labels = {
        name: "Nome",
        company: "Empresa",
        email: "E-mail",
        phone: "Telefone",
        vehicles: "Nº de veículos",
        segment: "Segmento",
        interest: "Deseja",
        message: "Mensagem"
      };
      data.forEach(function (value, key) {
        if (!value) return;
        var label = labels[key] || key;
        lines.push(label + ": " + value);
      });
      var text = encodeURIComponent("Olá, quero falar com um especialista ARCA.\n\n" + lines.join("\n"));
      if (phone) window.location.href = "https://wa.me/" + phone + "?text=" + text;
    });
  }
})();