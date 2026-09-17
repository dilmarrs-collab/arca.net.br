// ============================================================
// Gerador das páginas internas da ARCA (site estático)
// Uso: node build/pages.js
// Mantém header/rodapé/head consistentes em todas as páginas.
// ============================================================
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BASE = "https://arca.net.br";

function iconsSvg(slug) {
  const set = {
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 13l2-6a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 6"/><path d="M3 13h18v4a1 1 0 0 1-1 1h-1v-1h-16v1H4a1 1 0 0 1-1-1v-4Z"/><circle cx="6.5" cy="17.5" r="1.5"/><circle cx="17.5" cy="17.5" r="1.5"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    gauge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v4M12 14v7M5 7l2 2M19 7l-2 2M5 11h1M18 11h1"/><path d="M12 8a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="11" height="12" rx="2"/><path d="M14 10l5-2v8l-5-2"/></svg>',
    fuel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 21V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16"/><path d="M3 21h12"/><path d="M14 8h3a2 2 0 0 1 2 2v7a2 2 0 0 0 4 0v-6l-3-3"/></svg>',
    wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a5 5 0 0 0-6.9 6.9L4 17l3 3 3.8-3.8a5 5 0 0 0 6.9-6.9l-2.6 2.6-2.1-2.1 2.6-2.6Z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l8 4v5c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V7l8-4Z"/><path d="M9 12l2 2 4-4"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M16 13h6v-3h-6a2 2 0 0 0 0 4Z"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l9 5-9 5-9-5 9-5Zm-9 5v8l9 5 9-5V7"/></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8Z"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 21V4M5 4h12l-2 3 2 3H5"/></svg>',
    cells: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="13" height="16" rx="2"/><path d="M20 9v6M18 9h4M18 15h4"/></svg>',
    headset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 13a8 8 0 0 1 16 0"/><path d="M4 13l-1.5 2A1.5 1.5 0 0 0 3.8 17H20a1.5 1.5 0 0 0 1.3-2L20 13"/><path d="M8 21h3M13 21h3"/><path d="M12 17v-3"/></svg>'
  };
  return set[slug] || set.check;
}

function head(o) {
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#0B1530">
<meta name="robots" content="index, follow">
<title>${o.title}</title>
<meta name="description" content="${o.desc}">
<link rel="canonical" href="${BASE}${o.url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ARCA Tecnologia">
<meta property="og:title" content="${o.title}">
<meta property="og:description" content="${o.desc}">
<meta property="og:url" content="${BASE}${o.url}">
<meta property="og:image" content="${BASE}/assets/img/logo-arca.png">
<meta name="twitter:card" content="summary">
<link rel="icon" type="image/x-icon" href="${o.pref}assets/img/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${o.pref}assets/css/arca.css">
<script type="application/ld+json">{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "ARCA Tecnologia",
  "legalName": "ARCA TECNOLOGIA E SERVIÇOS LTDA",
  "url": "${BASE}",
  "logo": "${BASE}/assets/img/arca-logo-transparente.png",
  "email": "contato@arca.net.br",
  "slogan": "Dados da sua frota transformados em decisões."
}</script>\n`;
}

function navActive(item, current) {
  return current === item ? ' class="active"' : "";
}

function header(pref, current) {
  return `<header class="site-header">
  <div class="container header-inner">
    <a href="${pref}index.html" class="brand" aria-label="ARCA Tecnologia — Início">
      <img src="${pref}assets/img/arca-logo-transparente.png" alt="ARCA Tecnologia" height="42">
    </a>
    <nav class="nav-main" aria-label="Menu principal">
      <ul>
        <li class="dropdown${navActive("solucoes", current) ? "" : ""}">
          <button type="button" aria-expanded="false" aria-haspopup="true"${navActive("solucoes", current)}>
            Soluções
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="dropdown-panel">
            <a href="${pref}gestao-de-frotas/"><span class="dp-icon">${iconsSvg("truck")}</span><span><strong>Gestão de Frotas</strong><span>Indicadores e controle da operação em um só lugar</span></span></a>
            <a href="${pref}rastreamento-veicular/"><span class="dp-icon">${iconsSvg("pin")}</span><span><strong>Rastreamento</strong><span>Localização, trajetos e utilização em tempo real</span></span></a>
            <a href="${pref}telemetria/"><span class="dp-icon">${iconsSvg("gauge")}</span><span><strong>Telemetria</strong><span>Comportamento de condução, desperdícios e produtividade</span></span></a>
            <a href="${pref}video-telemetria/"><span class="dp-icon">${iconsSvg("camera")}</span><span><strong>Vídeo Telemetria + IA</strong><span>Identificação de comportamentos de risco com inteligência artificial</span></span></a>
            <a href="${pref}gestao-de-combustivel/"><span class="dp-icon">${iconsSvg("fuel")}</span><span><strong>Gestão de Combustível</strong><span>Abastecimentos, consumo e divergências sob controle</span></span></a>
            <a href="${pref}gestao-de-manutencao/"><span class="dp-icon">${iconsSvg("wrench")}</span><span><strong>Gestão de Manutenção</strong><span>Manutenção preventiva e menos paradas inesperadas</span></span></a>
            <a href="${pref}gestao-de-motoristas/"><span class="dp-icon">${iconsSvg("user")}</span><span><strong>Gestão de Motoristas</strong><span>Comportamento, desempenho e indicadores de condução</span></span></a>
            <a href="${pref}gestao-de-frotas/"><span class="dp-icon">${iconsSvg("chart")}</span><span><strong>Relatórios e BI</strong><span>Dados da operação em informações claras para decisão</span></span></a>
          </div>
        </li>
        <li><a href="${pref}index.html#plataforma">Plataforma</a></li>
        <li><a href="${pref}segmentos/">Segmentos</a></li>
        <li><a href="${pref}index.html#porque-arca">Por que ARCA</a></li>
        <li><a href="${pref}contato/">Contato</a></li>
      </ul>
    </nav>
    <div class="header-actions">
      <a href="${pref}portal/" class="client-link client-link--portal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg> Portal ARCA
      </a>
      <a href="https://arca.seeflex.com.br/" class="client-link" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Área do Cliente
      </a>
      <a href="${pref}contato/" class="btn btn-primary">Falar com um especialista</a>
      <button class="menu-toggle" type="button" aria-label="Abrir menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h16" stroke-linecap="round"/></svg></button>
    </div>
  </div>
  <nav class="mobile-nav" id="mobile-nav" aria-label="Menu mobile">
    <ul>
      <li><a href="${pref}index.html#solucoes">Soluções</a></li>
      <li class="mnav-sub"><ul>
        <li><a href="${pref}gestao-de-frotas/">Gestão de Frotas</a></li>
        <li><a href="${pref}rastreamento-veicular/">Rastreamento</a></li>
        <li><a href="${pref}telemetria/">Telemetria</a></li>
        <li><a href="${pref}video-telemetria/">Vídeo Telemetria + IA</a></li>
        <li><a href="${pref}gestao-de-combustivel/">Gestão de Combustível</a></li>
        <li><a href="${pref}gestao-de-manutencao/">Gestão de Manutenção</a></li>
        <li><a href="${pref}gestao-de-motoristas/">Gestão de Motoristas</a></li>
      </ul></li>
      <li><a href="${pref}index.html#plataforma">Plataforma</a></li>
      <li><a href="${pref}index.html#segmentos">Segmentos</a></li>
      <li><a href="${pref}index.html#porque-arca">Por que ARCA</a></li>
      <li><a href="${pref}contato/">Contato</a></li>
      <li class="mnav-ctas"><a class="btn btn-primary" href="${pref}contato/">Falar com um especialista</a></li>
      <li class="mnav-extra">
        <a href="${pref}portal/">Portal ARCA</a>
        <a href="https://arca.seeflex.com.br/" target="_blank" rel="noopener">Área do Cliente</a>
      </li>
    </ul>
  </nav>
</header>`;
}

function crumbs(items) {
  return `<div class="breadcrumb-list"><a href="../index.html">Início</a>${items.map((it) => " <span>/</span> " + it).join("")}</div>`;
}

function breadcrumbJson(url, items) {
  const el = [{ "@type": "ListItem", "position": 1, "name": "Início", "item": BASE + "/" }];
  items.forEach((name, i) => el.push({ "@type": "ListItem", position: i + 2, name: name }));
  return `<script type="application/ld+json">{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":${JSON.stringify(el)}}</script>`;
}

function pageHero(o) {
  return `<section class="page-hero">
  <div class="container">
    ${crumbs([o.name])}
    <span class="hero-kicker">${o.kicker}</span>
    <h1>${o.h1}</h1>
    <p class="lead">${o.lead}</p>
    <div class="hero-ctas">${o.ctas || `<a class="btn btn-primary btn-lg" href="../contato/">Falar com um especialista</a>`}</div>
  </div>
</section>`;
}

function cards(items) {
  return `<div class="grid-3">${items.map((it, i) => `<article class="card reveal${i > 0 ? " d" + Math.min(i, 3) : ""}">
  <span class="icon">${iconsSvg(it.icon)}</span>
  <h3>${it.h}</h3>
  <p>${it.p}</p>
</article>`).join("")}</div>`;
}

function steps(items) {
  return `<div class="how-flow reveal"><span class="how-line" aria-hidden="true"></span>${items.map((it, i) => `<div class="how-step"><span class="node">${i + 1}</span><strong>${it.h}</strong><small>${it.p}</small></div>`).join("")}</div>`;
}

function faq(items) {
  return `<div class="container-sm">${items.map((it, i) => `<div class="faq-item"><button class="faq-q" type="button" aria-expanded="false">${it.q}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg></button><div class="faq-a"><p>${it.a}</p></div></div>`).join("")}</div>`;
}

function solLinks(pref, items) {
  return `<p class="mt-24">${items.map((s) => `<a class="btn btn-sm btn-outline" href="${pref}${s.u}/">${s.n}</a>`).join(" ")}</p>`;
}

function cta(pref) {
  return `<section class="section" style="padding-top:0">
  <div class="container">
    <div class="cta-band reveal">
      <div class="container-slot">
        <h2>Quer entender melhor o que acontece com sua frota?</h2>
        <p>Converse com a ARCA e descubra como transformar os dados da sua operação em controle, economia e decisões melhores.</p>
        <div class="cta-actions">
          <a class="btn btn-primary btn-lg" href="${pref}contato/">Falar com um especialista</a>
          <a class="btn btn-white btn-lg" href="${pref}contato/">Solicitar demonstração</a>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

function footer(pref) {
  return `<footer class="site-footer">
  <div class="container">
    <div class="footer-top">
      <div class="footer-brand">
        <a href="${pref}index.html" class="brand" aria-label="ARCA Tecnologia"><img src="${pref}assets/img/arca-logo-negativa.png" alt="ARCA Tecnologia" height="44"></a>
        <p>Tecnologia para gestão de frotas: dados da sua operação transformados em controle, segurança, economia e decisão.</p>
        <div class="footer-social">
          <a href="#" aria-label="LinkedIn da ARCA"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1-.02 5 2.5 2.5 0 0 1 .02-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.1c.5-.9 1.7-1.9 3.5-1.9 3.7 0 4.4 2.4 4.4 5.6V21h-4v-5.5c0-1.3 0-3-1.9-3-1.9 0-2.2 1.5-2.2 3V21h-4V9Z"/></svg></a>
          <a href="#" aria-label="Instagram da ARCA"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
          <a href="#" aria-label="YouTube da ARCA"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none"/></svg></a>
          <a href="#" aria-label="Facebook da ARCA"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9V7.5c0-.8.2-1.2 1.3-1.2H17V3h-2.6C10.9 3 9 5 9 7.6V9H7v3h2v9h5v-9h2.5l.5-3H14Z"/></svg></a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Soluções</h4>
        <ul>
          <li><a href="${pref}gestao-de-frotas/">Gestão de Frotas</a></li>
          <li><a href="${pref}telemetria/">Telemetria</a></li>
          <li><a href="${pref}video-telemetria/">Vídeo Telemetria</a></li>
          <li><a href="${pref}rastreamento-veicular/">Rastreamento</a></li>
          <li><a href="${pref}gestao-de-combustivel/">Gestão de Combustível</a></li>
          <li><a href="${pref}gestao-de-manutencao/">Gestão de Manutenção</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Empresa</h4>
        <ul>
          <li><a href="${pref}index.html#porque-arca">Sobre a ARCA</a></li>
          <li><a href="${pref}contato/">Contato</a></li>
          <li><a href="${pref}contato/">Suporte</a></li>
          <li><a href="${pref}portal/">Portal ARCA</a></li>
          <li><a href="https://arca.seeflex.com.br/" target="_blank" rel="noopener">Área do Cliente</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Segmentos</h4>
        <ul>
          <li><a href="${pref}segmentos/">Transportadoras</a></li>
          <li><a href="${pref}segmentos/">Frotas leves</a></li>
          <li><a href="${pref}segmentos/">Agronegócio</a></li>
          <li><a href="${pref}segmentos/">Turismo</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Contato</h4>
        <ul class="footer-contact">
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v2.1a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3 6.2 2 2 0 0 1 5 4h2.1a2 2 0 0 1 2 1.7c.1.8.3 1.6.5 2.3a2 2 0 0 1-.4 2L8 11a16 16 0 0 0 5 5l1-1.2a2 2 0 0 1 2-.4c.7.2 1.5.4 2.3.5a2 2 0 0 1 1.7 2Z"/></svg><span>(55) 99605-2505</span></li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg><span>contato@arca.net.br</span></li>
          <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span>Frederico Westphalen – RS</span></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© <span data-year>2026</span> ARCA TECNOLOGIA E SERVIÇOS LTDA · CNPJ 00.000.000/0000-00</span>
      <div class="footer-bottom-links">
        <a href="${pref}politica-de-privacidade/">Política de Privacidade</a>
        <a href="${pref}termos-de-uso/">Termos de Uso</a>
        <a href="${pref}politica-de-privacidade/">LGPD</a>
      </div>
    </div>
  </div>
</footer>`;
}

function wa(pref) {
  return `<a class="wa-float" href="${pref}contato/" data-phone="5555996052505" data-message="Olá, quero conhecer melhor as soluções da ARCA para gestão de frotas." aria-label="Falar com a ARCA pelo WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2.05 22l5.27-1.38a9.9 9.9 0 0 0 4.72 1.2h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.8 9.8 0 0 0 12.04 2Zm5.83 14.06c-.25.7-1.45 1.33-2 1.38-.51.05-1.16.24-3.93-.81-3.33-1.31-5.45-4.72-5.62-4.93-.16-.22-1.35-1.8-1.35-3.43 0-1.63.86-2.43 1.16-2.77.31-.33.67-.41.9-.41.22 0 .45 0 .64.01.2.01.48-.08.75.57.27.67.93 2.29 1.02 2.46.08.17.14.37.03.6-.11.22-.16.36-.32.56-.16.19-.34.44-.48.58-.16.16-.33.34-.14.66.19.33.85 1.4 1.82 2.27 1.25 1.11 2.3 1.46 2.63 1.62.32.16.5.14.7-.08.19-.22.8-.93 1.01-1.25.21-.32.43-.27.72-.16.3.11 1.9.9 2.22 1.06.33.16.55.24.63.38.07.14.07.83-.18 1.52Z"/></svg></a>`;
}

// ---- Páginas -------------------------------------------------------------

const solutionPages = [];

// Gestão de Frotas
solutionPages.push({
  slug: "gestao-de-frotas",
  name: "Gestão de Frotas",
  title: "Gestão de Frotas | Centralize a operação e acompanhe indicadores",
  desc: "Centralize informações da operação e acompanhe os principais indicadores da sua frota em um único ambiente com a plataforma ARCA.",
  kicker: "Solução ARCA",
  h1: "Gestão de Frotas",
  lead: "Centralize informações da operação e acompanhe os principais indicadores da sua frota em um único ambiente. Menos planilhas, mais visão.",
  current: "solucoes",
  intro: `<p class="lead">A gestão de uma frota envolve veículos, motoristas, combustível, manutenção, rotas e custos. No fim, tudo isso gera dados — mas dados só fazem diferença quando são organizados e transformados em decisão.</p>
<p style="margin-top:16px">A plataforma ARCA reúne as informações da sua operação em um único ambiente: localização, telemetria, abastecimentos, manutenções, alertas e relatórios. Você deixa de depender de telas desconectadas e passa a acompanhar o que importa para sua operação.</p>`,
  cards: [
    { icon: "eye", h: "Visão completa da operação", p: "Veículos, motoristas e custos em um só lugar, com indicadores atualizados e fáceis de acompanhar." },
    { icon: "wallet", h: "Redução de custos", p: "Identifique desperdícios de combustível, manutenções e rotas ineficientes antes que virem prejuízo." },
    { icon: "shield", h: "Mais segurança", p: "Alertas de comportamento de risco ajudam a prevenir acidentes e proteger motoristas e patrimônio." },
    { icon: "chart", h: "Decisões com dados", p: "Relatórios e BI transformam informações dispersas em prioridades claras para a gestão." }
  ],
  flowIntro: "Como a ARCA ajuda na prática",
  flow: [
    { h: "Diagnóstico", p: "Entendemos sua operação e objetivos" },
    { h: "Configuração", p: "Equipamentos e plataforma ajustados" },
    { h: "Acompanhamento", p: "Indicadores e alertas no dia a dia" },
    { h: "Decisão", p: "Ações orientadas por dados" },
    { h: "Resultado", p: "Economia, segurança e controle" },
    { h: "Evolução", p: "Ajustes e melhorias contínuas" }
  ],
  faq: [
    { q: "A plataforma funciona no celular?", a: "Sim. A plataforma ARCA pode ser acessada pelo navegador em computadores, tablets e celulares, e motoristas usam o app Conduflex." },
    { q: "A ARCA instala os equipamentos nos veículos?", a: "Sim. A implantação é acompanhada pela equipe ARCA, do diagnóstico à configuração da plataforma para a sua operação." },
    { q: "Preciso substituir o que já tenho hoje?", a: "Não necessariamente. Converse com a ARCA para entender a melhor forma de estruturar a solução para a sua realidade." },
    { q: "Os relatórios ajudam em auditorias e prestação de contas?", a: "Sim. Relatórios e indicadores organizados dão base para auditorias, análises internas e acompanhamento gerencial." }
  ],
  related: [ { u: "telemetria", n: "Telemetria" }, { u: "gestao-de-combustivel", n: "Combustível" }, { u: "gestao-de-manutencao", n: "Manutenção" }, { u: "gestao-de-motoristas", n: "Motoristas" } ]
});

// Rastreamento
solutionPages.push({
  slug: "rastreamento-veicular",
  name: "Rastreamento",
  title: "Rastreamento Veicular | Localização, trajetos e utilização em tempo real",
  desc: "Visualize localização, trajetos, paradas e utilização dos veículos em tempo real com o rastreamento veicular da ARCA — integrado à gestão de frota.",
  kicker: "Solução ARCA",
  h1: "Rastreamento Veicular",
  lead: "Visualize localização, trajetos, paradas e utilização dos veículos em tempo real — e use essa informação para proteger o patrimônio e melhorar rotas.",
  current: "solucoes",
  intro: `<p class="lead">Rastrear um veículo mostra onde ele está. Na ARCA, o rastreamento vai além: ele alimenta a gestão da sua frota com informação útil para o dia a dia.</p>
<p style="margin-top:16px">Localização em tempo real, histórico de trajetos, paradas, cercas e alertas de utilização fora do horário ajudam a proteger patrimônio, acompanhar equipes externas e encontrar oportunidades de melhoria nas rotas.</p>`,
  cards: [
    { icon: "pin", h: "Localização em tempo real", p: "Acompanhe veículos no mapa a qualquer momento, com histórico completo de trajetos e paradas." },
    { icon: "flag", h: "Cercas e alertas", p: "Configure limites e áreas de interesse e receba alertas de entrada, saída e permanência." },
    { icon: "shield", h: "Proteção do patrimônio", p: "Utilização fora do horário, estadia inesperada e movimentação anormal ficam visíveis para a gestão." },
    { icon: "clock", h: "Rotas mais eficientes", p: "Entenda paradas e trajetos para otimizar entregas, serviços e deslocamentos." }
  ],
  flowIntro: "Do monitoramento ao resultado",
  flow: [
    { h: "Veículo conectado", p: "Equipamento instalado na frota" },
    { h: "Posição em tempo real", p: "Sinal enviado à plataforma" },
    { h: "Alertas e cercas", p: "Regras configuradas pela gestão" },
    { h: "Histórico de trajetos", p: "Análise de rotas e paradas" },
    { h: "Decisão do gestor", p: "Ajustes em rotas e utilização" },
    { h: "Frota otimizada", p: "Menos custo e mais segurança" }
  ],
  faq: [
    { q: "O rastreamento funciona em tempo real?", a: "Sim. A posição dos veículos é atualizada na plataforma de forma contínua, com histórico para consulta posterior." },
    { q: "Consigo ver o histórico de um veículo?", a: "Sim. É possível consultar trajetos, paradas e eventos anteriores diretamente na plataforma." },
    { q: "Posso receber alertas?", a: "Sim. Alertas como entrada e saída de cercas, utilização fora do horário e excessos podem ser configurados pela gestão." },
    { q: "Isso protege contra roubo e mau uso?", a: "O rastreamento ajuda a identificar movimentações anormais e a agir rapidamente, reduzindo riscos de prejuízo." }
  ],
  related: [ { u: "telemetria", n: "Telemetria" }, { u: "gestao-de-frotas", n: "Gestão de Frotas" }, { u: "gestao-de-motoristas", n: "Motoristas" } ]
});

// Telemetria
solutionPages.push({
  slug: "telemetria",
  name: "Telemetria",
  title: "Telemetria para Frotas | Identifique desperdícios e custos de condução",
  desc: "Identifique excessos, desperdícios e comportamentos que aumentam o custo da sua frota com a telemetria da ARCA.",
  kicker: "Solução ARCA",
  h1: "Telemetria para Frotas",
  lead: "Identifique excessos, desperdícios e comportamentos que aumentam o custo da sua frota. Telemetria transforma o uso do veículo em informação de gestão.",
  current: "solucoes",
  intro: `<p class="lead">Velocidade, frenagem, aceleração, motor ocioso e consumo: a telemetria captura o que acontece dentro da operação e mostra onde há dinheiro sendo perdido.</p>
<p style="margin-top:16px">Com esses dados organizados, você consegue orientar motoristas por evidência, atacar desperdícios e reduzir desgaste da frota — tudo em vez de apostar em suposições.</p>`,
  cards: [
    { icon: "gauge", h: "Comportamento de condução", p: "Velocidade, frenagens bruscas e acelerações ficam visíveis por veículo e por motorista." },
    { icon: "clock", h: "Motor ocioso sob controle", p: "Identifique veículos parados com motor ligado e reduza esse desperdício direto no combustível." },
    { icon: "wallet", h: "Menos custo operacional", p: "Excessos e maus hábitos geram consumo maior e desgaste precoce. A telemetria expõe esses pontos." },
    { icon: "zap", h: "Orientação baseada em dados", p: "Use indicadores claros para treinar e reconhecer motoristas em vez de depender de percepções." }
  ],
  flowIntro: "Como a telemetria gera resultado",
  flow: [
    { h: "Sensores e dados", p: "Eventos capturados do veículo" },
    { h: "Análise", p: "Cruzamento de comportamento e consumo" },
    { h: "Indicadores", p: "Score e rankings por motorista" },
    { h: "Alertas", p: "Excessos sinalizados na hora" },
    { h: "Orientação", p: "Feedback direto ao motorista" },
    { h: "Economia", p: "Menos custo e menos desgaste" }
  ],
  faq: [
    { q: "Quais comportamentos a telemetria identifica?", a: "Excesso de velocidade, frenagens e acelerações bruscas, motor ocioso e outros eventos que impactam consumo e segurança." },
    { q: "O motorista fica sabendo dos dados?", a: "É possível configurar como a informação chega aos motoristas — muitos usam o feedback para melhorar o desempenho." },
    { q: "A telemetria diferencia veículos e motoristas?", a: "Sim. A plataforma organiza os indicadores por veículo e por motorista para facilitar a gestão." },
    { q: "Isso reduz o custo com combustível?", a: "Ao evidenciar excessos e desperdícios, a telemetria cria condições para uma redução real de consumo." }
  ],
  related: [ { u: "video-telemetria", n: "Vídeo Telemetria" }, { u: "gestao-de-combustivel", n: "Combustível" }, { u: "gestao-de-motoristas", n: "Motoristas" } ]
});

// Vídeo Telemetria
solutionPages.push({
  slug: "video-telemetria",
  name: "Vídeo Telemetria",
  title: "Vídeo Telemetria com IA | Identifique riscos antes de acidentes",
  desc: "Câmeras e inteligência artificial para identificar distração, uso de celular, fadiga e situações de risco antes que se transformem em acidentes.",
  kicker: "Solução ARCA",
  h1: "Vídeo Telemetria com IA",
  lead: "Identifique distração, uso de celular, fadiga e situações de risco antes que se transformem em acidentes. Vídeo e inteligência artificial a favor da sua operação.",
  current: "solucoes",
  intro: `<p class="lead">Acidentes quase sempre têm um sinal antes. A vídeo telemetria da ARCA combina câmeras e inteligência artificial para captar esses sinais e alertar a gestão na hora.</p>
<p style="margin-top:16px">Distração, uso de celular, fadiga, ausência de cinto e distância insegura se tornam eventos monitorados — com imagem para embasar a orientação do motorista e proteger sua operação.</p>`,
  cards: [
    { icon: "camera", h: "Detecção com inteligência artificial", p: "A IA analisa o vídeo da cabine e reconhece comportamentos de risco automaticamente." },
    { icon: "zap", h: "Alertas em tempo real", p: "A ocorrência chega à gestão na hora, permitindo uma ação rápida." },
    { icon: "shield", h: "Prevenção de acidentes", p: "Trate o risco antes do evento e proteja motoristas, veículos e a vida." },
    { icon: "flag", h: "Imagens para embasar decisões", p: "Com o vídeo, a orientação ao motorista fica objetiva e baseada em evidência." }
  ],
  flowIntro: "Como a vídeo telemetria protege sua frota",
  flow: [
    { h: "Câmera instalada", p: "Visão voltada para a cabine" },
    { h: "IA analisa", p: "Reconhecimento de comportamentos" },
    { h: "Evento detectado", p: "Ex.: uso de celular ou fadiga" },
    { h: "Alerta ao gestor", p: "Notificação com imagem" },
    { h: "Orientação", p: "Feedback imediato ao motorista" },
    { h: "Menos acidentes", p: "Risco tratado antes do dano" }
  ],
  faq: [
    { q: "O que a inteligência artificial detecta?", a: "Comportamentos como uso de celular, fadiga, distração, ausência de cinto e distância insegura." },
    { q: "O gestor recebe o alerta em tempo real?", a: "Sim. Os eventos significativos são sinalizados para a gestão acompanhar e agir." },
    { q: "Isso substitui o motorista?", a: "Não. A tecnologia apoia o gestor e o próprio motorista, reforçando uma cultura de segurança." },
    { q: "As imagens ficam disponíveis depois?", a: "Sim, para análises e evidências conforme as políticas de privacidade e uso da sua operação." }
  ],
  related: [ { u: "telemetria", n: "Telemetria" }, { u: "gestao-de-motoristas", n: "Motoristas" }, { u: "rastreamento-veicular", n: "Rastreamento" } ]
});

// gestao-de-combustivel
solutionPages.push({
  slug: "gestao-de-combustivel",
  name: "Gestão de Combustível",
  title: "Gestão de Combustível | Abastecimentos, consumo e divergências sob controle",
  desc: "Acompanhe abastecimentos, consumo e possíveis divergências para reduzir desperdícios com a gestão de combustível da ARCA.",
  kicker: "Solução ARCA",
  h1: "Gestão de Combustível",
  lead: "Acompanhe abastecimentos, consumo e possíveis divergências para reduzir desperdícios. Combustível é um dos maiores custos da frota — e um dos que mais esconde valor.",
  current: "solucoes",
  intro: `<p class="lead">Combustível costuma ser o maior custo variável de uma frota. Quando abastecimentos e consumo não são comparados, divergências passam despercebidas.</p>
<p style="margin-top:16px">A ARCA organiza abastecimentos (volume, valor, posto, horário, veículo) e cruza com a telemetria de consumo, ajudando a enxergar desvios, desperdícios e oportunidades de economia.</p>`,
  cards: [
    { icon: "fuel", h: "Abastecimentos organizados", p: "Volume, valor, posto e horário registrados e comparáveis por veículo." },
    { icon: "eye", h: "Divergências visíveis", p: "Consumo declarado versus telemetria: diferenças grandes viram alerta." },
    { icon: "wallet", h: "Menos desperdício", p: "Motor ocioso, maus hábitos e abastecimentos fora do padrão ficam expostos." },
    { icon: "chart", h: "Custo por veículo", p: "Indicadores claros para priorizar onde atuar primeiro." }
  ],
  flowIntro: "O caminho para reduzir custo com combustível",
  flow: [
    { h: "Abastecimentos", p: "Registros de cada abastecimento" },
    { h: "Telemetria", p: "Consumo real por veículo" },
    { h: "Cruzamento", p: "Abastecimento × consumo × rotas" },
    { h: "Alertas", p: "Divergências sinalizadas" },
    { h: "Ação", p: "Correção de hábitos e rotas" },
    { h: "Economia", p: "Custo sob controle" }
  ],
  faq: [
    { q: "Como a ARCA identifica divergências?", a: "Ao comparar o volume abastecido com o consumo medido pela telemetria, diferenças fora do padrão viram alertas." },
    { q: "Consigo comparar custo entre veículos?", a: "Sim. O consumo e o custo são organizados por veículo, motorista e período." },
    { q: "Isso reduz o custo de combustível?", a: "Ao expor desperdícios e abastecimentos fora do padrão, cria condição objetiva para redução." },
    { q: "Preciso de equipamento específico?", a: "A gestão de combustível usa os dados da plataforma ARCA; converse com a equipe sobre a configuração ideal." }
  ],
  related: [ { u: "telemetria", n: "Telemetria" }, { u: "gestao-de-frotas", n: "Gestão de Frotas" }, { u: "gestao-de-manutencao", n: "Manutenção" } ]
});

// gestao-de-manutencao
solutionPages.push({
  slug: "gestao-de-manutencao",
  name: "Gestão de Manutenção",
  title: "Gestão de Manutenção | Manutenção preventiva e menos paradas inesperadas",
  desc: "Organize manutenções preventivas e reduza paradas inesperadas com a gestão de manutenção da ARCA.",
  kicker: "Solução ARCA",
  h1: "Gestão de Manutenção",
  lead: "Organize manutenções preventivas e reduza paradas inesperadas. Um veículo parado é custo — e um motorista parado é perda de produtividade.",
  current: "solucoes",
  intro: `<p class="lead">Manutenção corretiva é cara e imprevisível. A gestão preventiva organiza o ciclo de vida do veículo e evita surpresas que travam a operação.</p>
<p style="margin-top:16px">A plataforma ARCA ajuda a registrar e acompanhar manutenções, prazos, vencimentos e custos — com visibilidade para programar paradas em vez de sofrer com elas.</p>`,
  cards: [
    { icon: "wrench", h: "Planejamento preventivo", p: "Registre e acompanhe manutenções, prazos e vencimentos de cada veículo." },
    { icon: "clock", h: "Menos paradas inesperadas", p: "Antecipe o problema antes de virar uma quebra na estrada." },
    { icon: "wallet", h: "Menos custo no longo prazo", p: "Veículo bem mantido consome menos e dura mais." },
    { icon: "chart", h: "Histórico do veículo", p: "Custos e intervenções registrados para decisões de renovação de frota." }
  ],
  flowIntro: "Da prevenção ao resultado",
  flow: [
    { h: "Cadastro", p: "Veículos e manutenções organizados" },
    { h: "Vencimentos", p: "Alertas de prazos e revisões" },
    { h: "Programação", p: "Paradas planejadas sem travar a operação" },
    { h: "Registro", p: "Custo e histórico por veículo" },
    { h: "Análise", p: "Padrões e falhas recorrentes visíveis" },
    { h: "Frota sólida", p: "Menos quebras e mais disponibilidade" }
  ],
  faq: [
    { q: "A ARCA define o cronograma de manutenção?", a: "A plataforma ajuda a organizar e acompanhar, e a equipe ARCA orienta a melhor configuração para a sua operação." },
    { q: "Recebo alertas de vencimentos?", a: "Sim. Prazos e revisões pendentes são sinalizados para a gestão programar com antecedência." },
    { q: "Consigo ver o histórico de um veículo?", a: "Sim, com custos e intervenções registrados ao longo do tempo." },
    { q: "Isso reduz paradas na estrada?", a: "Sim. A manutenção preventiva é a principal forma de reduzir quebras inesperadas." }
  ],
  related: [ { u: "gestao-de-frotas", n: "Gestão de Frotas" }, { u: "telemetria", n: "Telemetria" }, { u: "gestao-de-combustivel", n: "Combustível" } ]
});

// gestao-de-motoristas
solutionPages.push({
  slug: "gestao-de-motoristas",
  name: "Gestão de Motoristas",
  title: "Gestão de Motoristas | Comportamento, desempenho e indicadores de condução",
  desc: "Acompanhe comportamento, desempenho e indicadores de condução dos seus motoristas com a gestão de motoristas da ARCA.",
  kicker: "Solução ARCA",
  h1: "Gestão de Motoristas",
  lead: "Acompanhe comportamento, desempenho e indicadores de condução. Quem dirige melhor, opera melhor — e custa menos.",
  current: "solucoes",
  intro: `<p class="lead">O motorista é o fator humano da operação — e o que mais influencia consumo, segurança e desgaste da frota.</p>
<p style="margin-top:16px">A ARCA organiza indicadores de condução por motorista e oferece base para orientar a equipe por evidência, reconhecer bons resultados e criar uma cultura de direção segura e econômica.</p>`,
  cards: [
    { icon: "user", h: "Indicadores por motorista", p: "Desempenho de condução organizado por pessoa, com histórico e evolução." },
    { icon: "gauge", h: "Feedback baseado em dados", p: "Orientação objetiva, sem achismo — o comportamento fala por si." },
    { icon: "shield", h: "Mais segurança na estrada", p: "Concentre atenção em hábitos de risco antes que virem acidente." },
    { icon: "chart", h: "Ranking e reconhecimento", p: "Crie metas e destaque quem dirige melhor, elevando o padrão da equipe." }
  ],
  flowIntro: "Como a gestão de motoristas ajuda sua operação",
  flow: [
    { h: "Condução capturada", p: "Dados de telemetria por motorista" },
    { h: "Score de desempenho", p: "Indicador claro e comparável" },
    { h: "Alertas de risco", p: "Comportamentos sinalizados" },
    { h: "Feedback", p: "Orientação com evidência" },
    { h: "Metas", p: "Objetivos por motorista" },
    { h: "Equipe melhor", p: "Segurança e economia no dia a dia" }
  ],
  faq: [
    { q: "Como o motorista é identificado nos dados?", a: "A gestão vincula veículo, turno e identificação do condutor para que os indicadores sejam confiáveis." },
    { q: "Os motoristas veem os próprios resultados?", a: "É possível configurar feedbacks por meio da plataforma e do app do motorista." },
    { q: "Isso serve para treinamentos?", a: "Sim. Indicadores objetivos ajudam a direcionar o treinamento para os pontos que realmente impactam a operação." },
    { q: "Como evitar clima de fiscalização?", a: "A orientação é de usar os dados para reconhecer e apoiar a equipe, construindo metas com transparência." }
  ],
  related: [ { u: "telemetria", n: "Telemetria" }, { u: "video-telemetria", n: "Vídeo Telemetria" }, { u: "gestao-de-frotas", n: "Gestão de Frotas" } ]
});

function renderSolution(p) {
  const pref = "../";
  const url = "/" + p.slug + "/";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
${head({ title: p.title, desc: p.desc, url: url, pref: pref })}
${breadcrumbJson(url, [p.name])}<script type="application/ld+json">{"@context":"https://schema.org","@type":"Service","name":"${p.name}","provider":{"@type":"Organization","name":"ARCA TECNOLOGIA E SERVIÇOS LTDA","url":"https://arca.net.br"},"areaServed":"BR","description":"${p.desc}"}</script>
</head>
<body>
<a class="skip-link" href="#conteudo">Ir para o conteúdo</a>
${header(pref, p.current)}
<main id="conteudo">
<section class="page-hero">
  <div class="container">
    ${crumbs([p.name])}
    <span class="hero-kicker">${p.kicker}</span>
    <h1>${p.h1}</h1>
    <p class="lead">${p.lead}</p>
    <div class="hero-ctas">
      <a class="btn btn-primary btn-lg" href="../contato/">Falar com um especialista</a>
      <a class="btn btn-outline-light btn-lg" href="../index.html#plataforma">Conhecer a plataforma</a>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="container-sm">
      ${p.intro}
    </div>
  </div>
</section>

<section class="section tone-surface" style="padding-top:64px">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-kicker">Benefícios</span>
      <h2>O que a ${p.name} faz pela sua operação</h2>
    </div>
    ${cards(p.cards)}
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-kicker">Como funciona</span>
      <h2>${p.flowIntro}</h2>
    </div>
    ${steps(p.flow)}
    ${solLinks(pref, p.related)}
  </div>
</section>

<section class="section tone-surface" style="padding-top:64px">
  <div class="container">
    <div class="section-head center reveal">
      <span class="section-kicker">Dúvidas frequentes</span>
      <h2>Perguntas sobre ${p.name}</h2>
    </div>
    ${faq(p.faq)}
  </div>
</section>

${cta(pref)}
</main>
${footer(pref)}
${wa(pref)}
<script src="../assets/js/arca.js" defer></script>
</body>
</html>`;
}

// -------- Páginas não-solução --------------------------------------------

// Segmentos
function renderSegmentos() {
  const pref = "../";
  const segs = [
    { id: "frotas-leves", icon: "truck", h: "Frotas leves", p: "Veículos empresariais, vendas e equipes internas. Controle de utilização, custo e rotas sem complicação." },
    { id: "transportadoras", icon: "truck", h: "Transportadoras", p: "Cargas, prazos e rotas. Acompanhe frota, motoristas e ocorrências para proteger a operação e o cliente." },
    { id: "turismo", icon: "camera", h: "Turismo", p: "Pontualidade e viagens seguras importam. Monitore rotas, descanso e comportamento de condução." },
    { id: "transporte-escolar", icon: "shield", h: "Transporte escolar", p: "Segurança em primeiro lugar. Rotas previsíveis, alertas de desvio e acompanhamento da condução." },
    { id: "prestadores-de-servicos", icon: "flag", h: "Prestadores de serviços", p: "Agenda, deslocamento e prova de execução. Saiba onde cada equipe está e como os recursos são usados." },
    { id: "agronegocio", icon: "gear", h: "Agronegócio", p: "Máquinas, campo e distâncias. Monitore utilização de maquinário e logística rural." },
    { id: "distribuicao", icon: "zap", h: "Distribuição", p: "Entregas com frequência alta. Rotas eficientes e prazos cumpridos com menos custo por entrega." },
    { id: "equipes-externas", icon: "user", h: "Empresas com equipes externas", p: "Técnicos e vendedores na rua. Saiba onde estão, o que visitaram e o que foi percorrido." }
  ];
  const blocks = segs.map((s, i) => `<div class="diff-item reveal" id="${s.id}" style="scroll-margin-top:100px">
    <span class="icon">${iconsSvg(s.icon)}</span>
    <div><h4>${s.h}</h4><p>${s.p}</p></div>
  </div>`).join("");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
${head({ title: "Segmentos | Tecnologia adaptada à realidade da sua operação", desc: "Conheça os segmentos atendidos pela ARCA: frotas leves, transportadoras, turismo, transporte escolar, agronegócio e mais.", url: "/segmentos/", pref: pref })}
${breadcrumbJson("/segmentos/", ["Segmentos"])}
</head>
<body>
<a class="skip-link" href="#conteudo">Ir para o conteúdo</a>
${header(pref, "segmentos")}
<main id="conteudo">
<section class="page-hero">
  <div class="container">
    ${crumbs(["Segmentos"])}
    <span class="hero-kicker">Segmentos</span>
    <h1>Tecnologia adaptada à realidade da sua operação.</h1>
    <p class="lead">Cada frota tem o seu ritmo. A ARCA se adapta ao seu segmento — e não o contrário.</p>
    <div class="hero-ctas">
      <a class="btn btn-primary btn-lg" href="${pref}contato/">Falar com um especialista</a>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="container-sm" style="margin-bottom:48px">
      <p class="lead">Não importa qual seja a operação: o princípio da ARCA é o mesmo — transformar os dados da frota em controle, segurança, economia e decisão.</p>
    </div>
    <div class="diff-list">${blocks}</div>
  </div>
</section>

${cta(pref)}
</main>
${footer(pref)}
${wa(pref)}
<script src="../assets/js/arca.js" defer></script>
</body>
</html>`;
}

// Blog removido — seção de conteúdos descontinuada

// Contato
function renderContato() {
  const pref = "../";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
${head({ title: "Contato | Fale com um especialista ARCA", desc: "Fale com um especialista da ARCA e descubra como transformar os dados da sua frota em controle, economia e decisões melhores.", url: "/contato/", pref: pref })}
${breadcrumbJson("/contato/", ["Contato"])}
</head>
<body>
<a class="skip-link" href="#conteudo">Ir para o conteúdo</a>
${header(pref, "contato")}
<main id="conteudo">
<section class="page-hero">
  <div class="container">
    ${crumbs(["Contato"])}
    <span class="hero-kicker">Contato</span>
    <h1>Vamos conversar sobre sua frota.</h1>
    <p class="lead">Preencha o formulário e nosso time retorna com uma recomendação prática para a sua operação.</p>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="contact-grid">
      <div class="form-card reveal">
        <form id="contact-form" novalidate>
          <div class="form-group">
            <label for="cf-name">Nome</label>
            <input id="cf-name" name="name" type="text" placeholder="Seu nome" required>
          </div>
          <div class="form-group">
            <label for="cf-company">Empresa</label>
            <input id="cf-company" name="company" type="text" placeholder="Nome da empresa">
          </div>
          <div class="form-group">
            <label for="cf-email">E-mail</label>
            <input id="cf-email" name="email" type="email" placeholder="voce@empresa.com.br" required>
          </div>
          <div class="form-group">
            <label for="cf-phone">Telefone / WhatsApp</label>
            <input id="cf-phone" name="phone" type="tel" placeholder="(00) 00000-0000" required>
          </div>
          <div class="form-group">
            <label for="cf-vehicles">Quantidade de veículos</label>
            <select id="cf-vehicles" name="vehicles">
              <option value="">Selecione</option>
              <option>1 a 10</option>
              <option>11 a 50</option>
              <option>51 a 200</option>
              <option>Mais de 200</option>
            </select>
          </div>
          <div class="form-group">
            <label for="cf-segment">Segmento</label>
            <select id="cf-segment" name="segment">
              <option value="">Selecione</option>
              <option>Frotas leves</option>
              <option>Transportadoras</option>
              <option>Turismo</option>
              <option>Transporte escolar</option>
              <option>Prestadores de serviços</option>
              <option>Agronegócio</option>
              <option>Distribuição</option>
              <option>Empresas com equipes externas</option>
              <option>Outro</option>
            </select>
          </div>
          <div class="form-group">
            <label for="cf-interest">Deseja</label>
            <select id="cf-interest" name="interest">
              <option value="Falar com um especialista">Falar com um especialista</option>
              <option value="Solicitar uma demonstração">Solicitar uma demonstração</option>
              <option value="Tirar dúvidas">Tirar dúvidas</option>
            </select>
          </div>
          <div class="form-group">
            <label for="cf-message">Mensagem</label>
            <textarea id="cf-message" name="message" placeholder="Conte um pouco sobre a sua operação"></textarea>
          </div>
          <button class="btn btn-primary btn-lg" type="submit" style="width:100%">Falar com um especialista</button>
          <p class="form-note">Ao enviar, você será direcionado ao WhatsApp da ARCA. Seus dados são tratados conforme a LGPD.</p>
        </form>
      </div>
      <ul class="contact-info-card reveal d1">
        <li>
          <span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.9v2.1a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3 6.2 2 2 0 0 1 5 4h2.1a2 2 0 0 1 2 1.7c.1.8.3 1.6.5 2.3a2 2 0 0 1-.4 2L8 11a16 16 0 0 0 5 5l1-1.2a2 2 0 0 1 2-.4c.7.2 1.5.4 2.3.5a2 2 0 0 1 1.7 2Z"/></svg></span>
          <div><strong>WhatsApp</strong><span>(55) 99605-2505</span></div>
        </li>
        <li>
          <span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></span>
          <div><strong>E-mail</strong><span>contato@arca.net.br</span></div>
        </li>
        <li>
          <span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span>
          <div><strong>Endereço</strong><span>Frederico Westphalen – RS</span></div>
        </li>
        <li>
          <span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span>
          <div><strong>Atendimento</strong><span>Segunda a sexta, das 8h às 12h e das 13h30 às 18h</span></div>
        </li>
        <li>
          <span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M3 12h18"/><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" opacity=".5"/></svg></span>
          <div><strong>Área do Cliente</strong><span><a href="https://arca.seeflex.com.br/" target="_blank" rel="noopener">Acesse a plataforma e acompanhe sua frota</a></span></div>
        </li>
      </ul>
    </div>
  </div>
</section>

${cta(pref)}
</main>
${footer(pref)}
${wa(pref)}
<script src="../assets/js/arca.js" defer></script>
</body>
</html>`;
}

// Legais
function renderLegal(prefDir, name, title, updated, body) {
  const pref = prefDir;
  const file = name === "privacidade" ? "politica-de-privacidade" : "termos-de-uso";
  const url = "/" + file + "/";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
${head({ title: title, desc: "Documento oficial da ARCA TECNOLOGIA E SERVIÇOS LTDA.", url: url, pref: pref })}
${breadcrumbJson(url, [title])}
</head>
<body>
<a class="skip-link" href="#conteudo">Ir para o conteúdo</a>
${header(pref, "contato")}
<main id="conteudo">
<section class="page-hero">
  <div class="container">
    ${breadcrumbDirect(pref, title)}
    <span class="hero-kicker">Transparência</span>
    <h1>${title}</h1>
    <p class="lead">${updated}</p>
  </div>
</section>
<section class="section">
  <div class="container container-sm">
    ${body}
  </div>
</section>
${cta(pref)}
</main>
${footer(pref)}
${wa(pref)}
<script src="../assets/js/arca.js" defer></script>
</body>
</html>`;
}

function breadcrumbDirect(pref, name) {
  return `<div class="breadcrumb-list"><a href="${pref}index.html">Início</a> <span>/</span> ${name}</div>`;
}

function legalSection(h, ps) {
  return `<h2 style="margin-top:36px;font-size:1.35rem">${h}</h2>${ps.map((p) => `<p style="margin-top:14px;color:var(--arca-graphite)">${p}</p>`).join("")}`;
}

const privBody = [
  legalSection("1. Quem somos", [
    "A ARCA TECNOLOGIA E SERVIÇOS LTDA (\"ARCA\"), inscrita no CNPJ 00.000.000/0000-00, atua com tecnologia para gestão de frotas e trata os dados pessoais em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)."
  ]),
  legalSection("2. Dados que tratamos", [
    "Coletamos e tratamos dados necessários para prestar e melhorar nossos serviços, como nome, e-mail, telefone, empresa e dados de identificação de veículos e operações, sempre dentro da finalidade estrita de cada serviço.",
    "Dados de localização e telemetria de veículos são tratados para fins de gestão de frotas contratada pelo cliente, observadas as autorizações aplicáveis."
  ]),
  legalSection("3. Finalidades", [
    "Os dados são utilizados para: prestação dos serviços contratados; atendimento comercial e suporte; cumprimento de obrigações legais e regulatórias; e melhoria contínua de nossos produtos e serviços."
  ]),
  legalSection("4. Compartilhamento", [
    "Não vendemos dados pessoais. Podemos compartilhar informações com parceiros e fornecedores estritamente necessários à prestação dos serviços, sempre com obrigação de confidencialidade e em conformidade com a LGPD."
  ]),
  legalSection("5. Segurança", [
    "Adotamos medidas técnicas e organizacionais para proteger os dados contra acesso não autorizado, perda e alteração indevida."
  ]),
  legalSection("6. Seus direitos", [
    "Nos termos da LGPD, você pode solicitar a confirmação do tratamento, acesso, correção, anonimização, portabilidade e eliminação de dados, além de revogar consentimentos, entrando em contato pelo e-mail contato@arca.net.br."
  ]),
  legalSection("7. Cookies e tecnologia", [
    "Este site pode utilizar cookies e tecnologias semelhantes para garantir o funcionamento correto das páginas e melhorar a experiência de navegação. Você pode gerenciar as preferências no seu navegador."
  ]),
  legalSection("8. Contato do encarregado", [
    "Para qualquer questão sobre privacidade e proteção de dados, fale com nosso time pelo e-mail contato@arca.net.br."
  ])
].join("");

const termsBody = [
  legalSection("1. Objeto", [
    "Estes Termos de Uso regulam o acesso e a utilização do site arca.net.br e das soluções da ARCA TECNOLOGIA E SERVIÇOS LTDA (\"ARCA\")."
  ]),
  legalSection("2. Aceitação", [
    "Ao acessar o site ou contratar os serviços, o usuário declara estar de acordo com estes Termos e com a Política de Privacidade da ARCA."
  ]),
  legalSection("3. Uso do site", [
    "O conteúdo do site tem caráter institucional e informativo e pode ser alterado a qualquer momento. É vedado o uso das informações para fins ilícitos ou contrários aos interesses da ARCA."
  ]),
  legalSection("4. Serviços", [
    "As condições específicas de cada serviço de gestão de frotas, rastreamento, telemetria e vídeo telemetria são definidas em contrato próprio, que prevalece sobre estes Termos no que couber."
  ]),
  legalSection("5. Contas e acesso", [
    "Credenciais de acesso à plataforma são pessoais e intransferíveis. O cliente é responsável por manter a confidencialidade e por todas as atividades realizadas em sua conta."
  ]),
  legalSection("6. Propriedade intelectual", [
    "As marcas, logotipos, textos, imagens e demais conteúdos deste site pertencem à ARCA ou a seus licenciantes. É vedada a reprodução sem autorização expressa."
  ]),
  legalSection("7. Limitação de responsabilidade", [
    "A ARCA envidará esforços para manter o site disponível e as informações atualizadas, mas não se responsabiliza por indisponibilidades temporárias ou por decisões tomadas com base em dados sem a validação do cliente."
  ]),
  legalSection("8. Alterações", [
    "Estes Termos podem ser atualizados, e a versão vigente será sempre a publicada neste endereço."
  ]),
  legalSection("9. Contato", [
    "Dúvidas sobre estes Termos podem ser enviadas para contato@arca.net.br."
  ])
].join("");

// -------- Escrita dos arquivos ---------------------------------------------

function write(path, contents) {
  fs.mkdirSync(path, { recursive: true });
  fs.writeFileSync(path + "/index.html", contents, "utf8");
  console.log("Gerado: " + path + "/index.html");
}

for (const p of solutionPages) {
  write(path.join(ROOT, p.slug), renderSolution(p));
}

write(path.join(ROOT, "segmentos"), renderSegmentos());
write(path.join(ROOT, "contato"), renderContato());
write(path.join(ROOT, "politica-de-privacidade"), renderLegal("../", "privacidade", "Política de Privacidade", "Versão vigente em " + new Date().getFullYear(), privBody));
write(path.join(ROOT, "termos-de-uso"), renderLegal("../", "termos", "Termos de Uso", "Versão vigente em " + new Date().getFullYear(), termsBody));

console.log("Concluído — " + (solutionPages.length + 4) + " páginas geradas.");