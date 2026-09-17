import { icon } from './icons.js';
import { escapeHtml as e, formatBytes, formatDate, formatDateTime, firstName, initials, isSafeWebUrl } from './utils.js';

export const routes = [
  ['dashboard', 'Inicio', 'home'],
  ['sistemas', 'Sistemas', 'grid'],
  ['biblioteca', 'Biblioteca', 'book'],
  ['meu-espaco', 'Meu Espaco', 'folder'],
  ['comunicados', 'Comunicados', 'bell'],
  ['treinamentos', 'Treinamentos', 'play'],
  ['perfil', 'Perfil', 'user'],
];

function brand(dark = false) {
  return `<a class="portal-brand" href="#/dashboard" aria-label="Portal ARCA - Inicio">
    <img src="../assets/img/${dark ? 'arca-logo-azul.png' : 'arca-logo-negativa.png'}" alt="ARCA Tecnologia" width="136" height="42">
    <span>PORTAL</span>
  </a>`;
}

export function authView(mode = 'login', options = {}) {
  const configured = options.configured !== false;
  const copy = {
    login: ['Bem-vindo de volta', 'Acesse informacoes, sistemas e conteudos da ARCA.'],
    forgot: ['Recuperar acesso', 'Enviaremos um link seguro para o seu e-mail.'],
    recovery: ['Definir nova senha', 'Escolha uma senha forte para concluir a recuperacao.'],
    inactive: ['Acesso desativado', 'Seu perfil esta inativo. Procure um administrador do Portal ARCA.'],
  }[mode] || [];

  let form = '';
  if (!configured) {
    form = `<div class="portal-config-warning" role="alert">${icon('alert')}<div><strong>Portal ainda nao configurado</strong><p>Preencha <code>SUPABASE_URL</code> e a chave publica em <code>assets/js/portal/config.js</code>. Nunca use a service role.</p></div></div>`;
  } else if (mode === 'forgot') {
    form = `<form class="portal-auth-form" data-form="forgot">
      <label>E-mail corporativo<input name="email" type="email" autocomplete="email" required placeholder="voce@arca.net.br"></label>
      <button class="portal-btn portal-btn-primary portal-btn-block" type="submit">Enviar link de recuperacao</button>
      <button class="portal-text-btn" type="button" data-auth-view="login">Voltar ao login</button>
    </form>`;
  } else if (mode === 'recovery') {
    form = `<form class="portal-auth-form" data-form="recovery">
      <label>Nova senha<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
      <label>Confirme a nova senha<input name="confirm_password" type="password" autocomplete="new-password" minlength="8" required></label>
      <button class="portal-btn portal-btn-primary portal-btn-block" type="submit">Atualizar senha</button>
    </form>`;
  } else if (mode === 'inactive') {
    form = '<button class="portal-btn portal-btn-outline portal-btn-block" type="button" data-action="logout">Sair</button>';
  } else {
    form = `<form class="portal-auth-form" data-form="login">
      <label>E-mail<input name="email" type="email" autocomplete="username" required placeholder="voce@arca.net.br"></label>
      <label>Senha<input name="password" type="password" autocomplete="current-password" required></label>
      <div class="portal-auth-row"><label class="portal-check"><input type="checkbox" name="remember" checked> Manter conectado</label><button class="portal-text-btn" type="button" data-auth-view="forgot">Esqueci minha senha</button></div>
      <button class="portal-btn portal-btn-primary portal-btn-block" type="submit">Entrar no portal</button>
    </form>`;
  }

  return `<main id="portal-main" class="portal-auth">
    <section class="portal-auth-panel" aria-labelledby="auth-title">
      <div class="portal-auth-brand">${brand(true)}</div>
      <div class="portal-auth-copy"><span class="portal-eyebrow">Ambiente interno</span><h1 id="auth-title">${copy[0]}</h1><p>${copy[1]}</p></div>
      ${options.message ? `<div class="portal-inline-message" role="status">${e(options.message)}</div>` : ''}
      ${form}
      <p class="portal-auth-help">Problemas para acessar? Fale com o administrador.</p>
    </section>
    <aside class="portal-auth-visual" aria-hidden="true"><div class="portal-orbit portal-orbit-one"></div><div class="portal-orbit portal-orbit-two"></div><div class="portal-visual-copy"><span>ARCA CONECTA</span><strong>Informacao certa.<br>Time alinhado.</strong></div></aside>
  </main>`;
}

export function shell(profile, route, content, isAdmin) {
  const navigation = [...routes, ...(isAdmin ? [['admin', 'Administracao', 'shield']] : [])];
  return `<div class="portal-shell">
    <div class="portal-mobile-backdrop" data-action="close-menu"></div>
    <aside class="portal-sidebar" aria-label="Navegacao principal">
      <div class="portal-sidebar-head">${brand()}<button class="portal-icon-btn portal-close-menu" data-action="close-menu" aria-label="Fechar menu">${icon('close')}</button></div>
      <nav class="portal-nav">${navigation.map(([key, label, glyph]) => `<a href="#/${key}" data-route="${key}" class="${route === key ? 'active' : ''}" ${route === key ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span></a>`).join('')}</nav>
      <div class="portal-sidebar-foot"><div class="portal-mini-user"><span class="portal-avatar">${e(initials(profile))}</span><span><strong>${e(profile.full_name || 'Usuario')}</strong><small>${e(profile.role?.name || profile.job_title || '')}</small></span></div><button class="portal-icon-btn" data-action="logout" aria-label="Sair do portal" title="Sair">${icon('logout')}</button></div>
    </aside>
    <div class="portal-workspace">
      <header class="portal-topbar"><button class="portal-icon-btn portal-menu-btn" data-action="open-menu" aria-label="Abrir menu" aria-expanded="false">${icon('menu')}</button><div class="portal-topbar-brand">Portal ARCA</div><div class="portal-topbar-user"><span>Ola, <strong>${e(firstName(profile))}</strong></span><a href="#/perfil" class="portal-avatar" aria-label="Abrir perfil">${e(initials(profile))}</a></div></header>
      <main id="portal-main" class="portal-main" tabindex="-1">${content}</main>
    </div>
  </div>`;
}

export function loadingView(label = 'Carregando conteudo...') {
  return `<div class="portal-state" role="status"><span class="portal-spinner"></span><p>${e(label)}</p></div>`;
}

export function errorView(message) {
  return `<div class="portal-state portal-state-error" role="alert">${icon('alert')}<h2>Nao foi possivel carregar</h2><p>${e(message)}</p><button class="portal-btn portal-btn-outline" data-action="reload-view">Tentar novamente</button></div>`;
}

function emptyView(title, text, action = '') {
  return `<div class="portal-empty">${icon('folder')}<strong>${e(title)}</strong><p>${e(text)}</p>${action}</div>`;
}

function pageHead(kicker, title, description, action = '') {
  return `<header class="portal-page-head"><div><span class="portal-eyebrow">${e(kicker)}</span><h1>${e(title)}</h1><p>${e(description)}</p></div>${action}</header>`;
}

function shortcutCard(item) {
  const url = isSafeWebUrl(item.url) ? item.url : '#';
  return `<a class="portal-shortcut" href="${e(url)}" ${item.open_new_tab ? 'target="_blank" rel="noopener noreferrer"' : ''}>
    <span class="portal-shortcut-icon">${icon(item.icon || 'grid')}</span><span><strong>${e(item.title)}</strong><small>${e(item.description || item.category?.name || 'Acessar sistema')}</small></span>${icon(item.open_new_tab ? 'external' : 'chevron')}
  </a>`;
}

function contentCard(item, actions = false) {
  return `<article class="portal-content-card" data-search-text="${e(`${item.title} ${item.description || ''} ${item.category?.name || ''}`.toLowerCase())}" data-category="${e(item.category_id || '')}">
    <div class="portal-file-icon portal-file-${e((item.kind || 'FILE').toLowerCase())}">${icon(['LINK', 'VIDEO'].includes(item.kind) ? 'link' : 'file')}</div>
    <div class="portal-card-body"><div class="portal-card-topline"><span class="portal-badge">${e(item.category?.name || kindLabel(item.kind))}</span>${item.visibility ? `<span class="portal-muted-label">${e(visibilityLabel(item.visibility))}</span>` : ''}</div><h3>${e(item.title)}</h3><p>${e(item.description || 'Sem descricao.')}</p><small>${formatDate(item.published_at || item.created_at)}${item.file_size ? ` &middot; ${formatBytes(item.file_size)}` : ''}</small></div>
    <div class="portal-card-actions"><button class="portal-btn portal-btn-small portal-btn-outline" data-action="open-content" data-id="${e(item.id)}">${['LINK', 'VIDEO'].includes(item.kind) ? 'Abrir' : 'Baixar'}</button>${actions ? `<button class="portal-icon-btn" data-action="edit-content" data-id="${e(item.id)}" aria-label="Editar ${e(item.title)}">${icon('edit')}</button><button class="portal-icon-btn portal-danger" data-action="delete-content" data-id="${e(item.id)}" aria-label="Excluir ${e(item.title)}">${icon('trash')}</button>` : ''}</div>
  </article>`;
}

function announcementCard(item, compact = false) {
  const date = new Date(item.published_at || item.created_at);
  const validDate = !Number.isNaN(date.getTime());
  const day = validDate ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(date) : '--';
  const month = validDate ? new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '') : '';
  return `<article class="portal-announcement ${compact ? 'compact' : ''}"><div class="portal-announcement-date"><strong>${day}</strong><span>${month}</span></div><div><span class="portal-badge">${item.pinned ? 'Fixado' : 'Comunicado'}</span><h3>${e(item.title)}</h3><div class="portal-richtext">${e(item.body || '').replace(/\r?\n/g, '<br>')}</div><small>Publicado ${formatDateTime(item.published_at || item.created_at)}</small></div></article>`;
}

function trainingCard(item) {
  const thumbnail = item.thumbnail_url && isSafeWebUrl(item.thumbnail_url) ? `<img src="${e(item.thumbnail_url)}" alt="" loading="lazy">` : '';
  return `<article class="portal-training"><div class="portal-training-art">${thumbnail}${icon('play')}<span>ARCA ACADEMY</span></div><div class="portal-card-body"><span class="portal-badge">${item.category?.name ? e(item.category.name) : item.published_at ? `Desde ${formatDate(item.published_at)}` : 'Sob demanda'}</span><h3>${e(item.title)}</h3><p>${e(item.description || '')}</p><div class="portal-training-meta">${item.duration_minutes ? `${icon('clock')} ${e(item.duration_minutes)} min` : ''}</div></div>${item.content_url && isSafeWebUrl(item.content_url) ? `<a class="portal-btn portal-btn-small portal-btn-outline" href="${e(item.content_url)}" target="_blank" rel="noopener noreferrer">Acessar ${icon('external')}</a>` : ''}</article>`;
}

export function dashboardView(profile, data) {
  return `${pageHead('Visao geral', `Bom dia, ${firstName(profile)}.`, 'Tudo o que voce precisa para comecar o dia.')}
    <section class="portal-hero-card"><div><span class="portal-eyebrow portal-eyebrow-light">Portal ARCA</span><h2>Conectando pessoas, conhecimento e resultados.</h2><p>Acesse rapidamente os sistemas e acompanhe as novidades do time.</p></div><div class="portal-hero-mark">A</div></section>
    <section class="portal-section"><div class="portal-section-head"><div><h2>Acesso rapido</h2><p>Sistemas liberados para o seu perfil</p></div><a href="#/sistemas">Ver todos ${icon('chevron')}</a></div>${data.shortcuts.length ? `<div class="portal-shortcut-grid">${data.shortcuts.slice(0, 6).map(shortcutCard).join('')}</div>` : emptyView('Nenhum sistema disponivel', 'Os acessos autorizados aparecerao aqui.')}</section>
    <div class="portal-dashboard-grid"><section class="portal-section"><div class="portal-section-head"><div><h2>Comunicados recentes</h2></div><a href="#/comunicados">Ver todos</a></div>${data.announcements.length ? data.announcements.slice(0, 3).map((item) => announcementCard(item, true)).join('') : emptyView('Sem comunicados', 'Novidades da ARCA aparecerao aqui.')}</section>
    <section class="portal-section"><div class="portal-section-head"><div><h2>Conteudos recentes</h2></div><a href="#/biblioteca">Abrir biblioteca</a></div><div class="portal-mini-list">${data.content.length ? data.content.slice(0, 4).map((item) => `<button data-action="open-content" data-id="${e(item.id)}"><span class="portal-file-icon">${icon(['LINK', 'VIDEO'].includes(item.kind) ? 'link' : 'file')}</span><span><strong>${e(item.title)}</strong><small>${e(item.category?.name || kindLabel(item.kind))} &middot; ${formatDate(item.published_at || item.created_at)}</small></span>${icon('chevron')}</button>`).join('') : emptyView('Biblioteca vazia', 'Conteudos compartilhados aparecerao aqui.')}</div></section></div>
    ${data.trainings.length ? `<section class="portal-section"><div class="portal-section-head"><div><h2>Treinamentos em destaque</h2></div><a href="#/treinamentos">Ver agenda</a></div><div class="portal-training-grid">${data.trainings.slice(0, 3).map(trainingCard).join('')}</div></section>` : ''}`;
}

export function systemsView(items) {
  return `${pageHead('Ferramentas', 'Sistemas', 'Atalhos autorizados para o seu perfil.')}
    <div class="portal-toolbar"><label class="portal-search">${icon('search')}<span class="sr-only">Buscar sistema</span><input type="search" data-filter="cards" placeholder="Buscar por nome ou descricao..."></label></div>
    <div class="portal-shortcut-grid portal-shortcut-grid-large" data-filter-list>${items.length ? items.map(shortcutCard).join('') : emptyView('Nenhum sistema disponivel', 'Procure um administrador caso esteja faltando algum acesso.')}</div><p class="portal-no-results hidden">Nenhum sistema encontrado.</p>`;
}

export function libraryView(items, categories) {
  return `${pageHead('Conhecimento', 'Biblioteca', 'Documentos, links e materiais compartilhados com voce.')}
    <div class="portal-toolbar"><label class="portal-search">${icon('search')}<span class="sr-only">Buscar conteudo</span><input type="search" data-filter="content" placeholder="Buscar na biblioteca..."></label><label class="portal-select-label"><span class="sr-only">Filtrar categoria</span><select data-category-filter><option value="">Todas as categorias</option>${categories.map((category) => `<option value="${e(category.id)}">${e(category.name)}</option>`).join('')}</select></label></div>
    <div class="portal-content-grid" data-filter-list>${items.length ? items.map((item) => contentCard(item)).join('') : emptyView('Nenhum conteudo encontrado', 'Os materiais autorizados para voce aparecerao aqui.')}</div><p class="portal-no-results hidden">Nenhum conteudo corresponde aos filtros.</p>`;
}

export function mySpaceView(items) {
  const action = `<button class="portal-btn portal-btn-primary" data-action="new-content">${icon('plus')} Novo conteudo</button>`;
  return `${pageHead('Seus arquivos', 'Meu Espaco', 'Publique arquivos ou links e controle com quem compartilhar.', action)}
    <div class="portal-info-strip">${icon('lock')}<span>Arquivos ficam no bucket privado. Links de download expiram automaticamente.</span></div>
    <div class="portal-content-grid">${items.length ? items.map((item) => contentCard(item, true)).join('') : emptyView('Seu espaco esta vazio', 'Adicione um arquivo ou link para comecar.', action)}</div>`;
}

export function announcementsView(items) {
  return `${pageHead('Fique por dentro', 'Comunicados', 'Noticias e informacoes importantes da ARCA.')}
    <div class="portal-announcement-list">${items.length ? items.map((item) => announcementCard(item)).join('') : emptyView('Nenhum comunicado', 'Nao ha comunicados disponiveis no momento.')}</div>`;
}

export function trainingsView(items) {
  return `${pageHead('Desenvolvimento', 'Treinamentos', 'Aprenda, evolua e compartilhe conhecimento.')}
    <div class="portal-training-grid">${items.length ? items.map(trainingCard).join('') : emptyView('Nenhum treinamento', 'Novos treinamentos aparecerao aqui.')}</div>`;
}

export function profileView(profile) {
  return `${pageHead('Sua conta', 'Perfil', 'Mantenha suas informacoes atualizadas.')}
    <div class="portal-profile-layout"><section class="portal-profile-card"><span class="portal-avatar portal-avatar-large">${e(initials(profile))}</span><h2>${e(profile.full_name || 'Usuario')}</h2><p>${e(profile.job_title || 'Colaborador')}</p><span class="portal-badge">${e(profile.role?.name || 'Sem funcao')}</span></section>
    <form class="portal-form portal-profile-form" data-form="profile"><div class="portal-form-head"><h2>Informacoes pessoais</h2><p>O e-mail e a funcao de acesso sao gerenciados pelo administrador.</p></div><div class="portal-form-grid"><label class="portal-span-2">Nome completo<input name="full_name" value="${e(profile.full_name || '')}" required></label><label>Empresa<input name="company" value="${e(profile.company || '')}"></label><label>Cargo<input name="job_title" value="${e(profile.job_title || '')}"></label><label>Telefone<input name="phone" value="${e(profile.phone || '')}" autocomplete="tel"></label><label>E-mail<input value="${e(profile.email || '')}" disabled></label></div><div class="portal-form-actions"><button class="portal-btn portal-btn-primary" type="submit">Salvar alteracoes</button><button class="portal-btn portal-btn-outline" type="button" data-action="open-password">Alterar senha</button></div></form></div>`;
}

function adminItem(type, item, details) {
  const finalAction = type === 'user'
    ? `<button class="portal-icon-btn ${item.active === false ? '' : 'portal-danger'}" data-action="toggle-user-status" data-id="${e(item.id)}" aria-label="${item.active === false ? 'Reativar' : 'Desativar'} ${e(item.full_name || item.email)}" title="${item.active === false ? 'Reativar' : 'Desativar'}">${icon(item.active === false ? 'check' : 'lock')}</button>`
    : `<button class="portal-icon-btn portal-danger" data-action="delete-admin" data-type="${type}" data-id="${e(item.id)}" aria-label="Excluir">${icon('trash')}</button>`;
  return `<article class="portal-admin-item"><div><strong>${e(item.title || item.name || item.full_name || item.email || 'Sem titulo')}</strong><p>${e(details || '')}</p></div><div class="portal-admin-status"><span class="portal-status ${item.active === false ? 'inactive' : ''}">${item.active === false ? 'Inativo' : 'Ativo'}</span><button class="portal-icon-btn" data-action="edit-admin" data-type="${type}" data-id="${e(item.id)}" aria-label="Editar">${icon('edit')}</button>${finalAction}</div></article>`;
}

export function adminView(data, activeTab = 'usuarios') {
  const tabs = [['usuarios', 'Usuarios'], ['atalhos', 'Atalhos'], ['categorias', 'Categorias'], ['comunicados', 'Comunicados'], ['treinamentos', 'Treinamentos'], ['conteudos', 'Conteudos']];
  const maps = {
    usuarios: data.profiles.map((item) => adminItem('user', item, `${item.email || ''} - ${item.role?.name || 'Sem funcao'}`)),
    atalhos: data.shortcuts.map((item) => adminItem('shortcut', item, item.url)),
    categorias: data.categories.map((item) => adminItem('category', item, item.description || item.slug)),
    comunicados: data.announcements.map((item) => adminItem('announcement', item, formatDate(item.published_at || item.created_at))),
    treinamentos: data.trainings.map((item) => adminItem('training', item, item.published_at ? formatDateTime(item.published_at) : 'Nao publicado')),
    conteudos: data.content.map((item) => adminItem('admin-content', item, `${item.owner?.full_name || 'Sem autor'} - ${kindLabel(item.kind)} - ${item.scope}`)),
  };
  const singular = { usuarios: 'usuario', atalhos: 'atalho', categorias: 'categoria', comunicados: 'comunicado', treinamentos: 'treinamento', conteudos: 'conteudo' }[activeTab];
  return `${pageHead('Acesso restrito', 'Administracao', 'Gerencie pessoas e conteudos do Portal ARCA.', `<button class="portal-btn portal-btn-primary" data-action="new-admin" data-type="${activeTab}">${icon('plus')} Novo ${singular}</button>`)}
    <div class="portal-admin-tabs" role="tablist" aria-label="Areas administrativas">${tabs.map(([key, label]) => `<button role="tab" aria-selected="${key === activeTab}" class="${key === activeTab ? 'active' : ''}" data-admin-tab="${key}">${label}</button>`).join('')}</div>
    <section class="portal-admin-list" aria-live="polite">${maps[activeTab]?.length ? maps[activeTab].join('') : emptyView(`Nenhum ${singular}`, 'Crie o primeiro registro desta area.')}</section>`;
}

export function visibilityLabel(value) {
  return ({ ALL: 'Todos', ROLE: 'Por funcao', USERS: 'Por pessoas', PRIVATE: 'Privado' })[value] || value;
}

function kindLabel(value) {
  return ({ FILE: 'Arquivo', LINK: 'Link', VIDEO: 'Video', PHOTO: 'Foto' })[value] || 'Conteudo';
}
