import { isConfigured } from './config.js?v=20260917-2115';
import { authApi, portalApi, supabase } from './api.js?v=20260917-2115';
import { icon } from './icons.js';
import {
  adminView, announcementsView, authView, dashboardView, errorView, libraryView,
  loadingView, mySpaceView, profileView, shell, systemsView, trainingsView,
} from './views.js';
import {
  debounce, errorMessage, escapeHtml as e, formObject, isSafeWebUrl, qs, qsa, slugify,
} from './utils.js';

const root = qs('#portal-root');
const dialog = qs('#portal-dialog');
const dialogContent = qs('#portal-dialog-content');
const toasts = qs('#portal-toasts');

const state = {
  session: null,
  profile: null,
  route: 'dashboard',
  isAdmin: false,
  recovery: false,
  adminTab: 'usuarios',
  data: null,
  request: 0,
  touchedUserId: null,
};

function setBusy(element, busy, label = 'Aguarde...') {
  if (!element) return;
  if (busy) {
    element.dataset.originalLabel = element.innerHTML;
    element.disabled = true;
    element.innerHTML = `<span class="portal-spinner portal-spinner-small"></span>${label}`;
  } else {
    element.disabled = false;
    if (element.dataset.originalLabel) element.innerHTML = element.dataset.originalLabel;
  }
}

function toast(message, type = 'success') {
  const item = document.createElement('div');
  item.className = `portal-toast portal-toast-${type}`;
  item.setAttribute('role', type === 'error' ? 'alert' : 'status');
  item.innerHTML = `${icon(type === 'error' ? 'alert' : 'check')}<span>${e(message)}</span><button aria-label="Fechar mensagem">${icon('close')}</button>`;
  item.querySelector('button').addEventListener('click', () => item.remove());
  toasts.append(item);
  setTimeout(() => item.remove(), 5500);
}

function showAuth(mode = 'login', options = {}) {
  state.profile = null;
  root.innerHTML = authView(mode, { configured: isConfigured(), ...options });
  document.body.classList.remove('menu-open');
  requestAnimationFrame(() => qs('input', root)?.focus());
}

function currentRoute() {
  const route = location.hash.match(/^#\/([a-z-]+)/)?.[1] || 'dashboard';
  const valid = ['dashboard', 'sistemas', 'biblioteca', 'meu-espaco', 'comunicados', 'treinamentos', 'perfil', 'admin'];
  return valid.includes(route) ? route : 'dashboard';
}

async function establishSession(session) {
  state.session = session;
  if (!session) {
    state.touchedUserId = null;
    if (!state.recovery) showAuth('login');
    return;
  }
  if (state.recovery) {
    showAuth('recovery');
    return;
  }

  root.innerHTML = loadingView('Validando seu acesso...');
  try {
    const profile = await portalApi.profile(session.user.id);
    if (profile.active === false) {
      state.profile = profile;
      showAuth('inactive');
      return;
    }
    state.profile = { ...profile, email: profile.email || session.user.email };
    state.isAdmin = profile.role?.code === 'ADMIN';
    if (state.touchedUserId !== session.user.id) {
      await portalApi.touchLastAccess();
      state.touchedUserId = session.user.id;
    }
    await renderRoute();
  } catch (error) {
    showAuth('login', { message: errorMessage(error, 'Seu perfil nao esta disponivel. Fale com o administrador.') });
  }
}

async function loadRoute(route) {
  switch (route) {
    case 'dashboard': {
      const data = await portalApi.dashboard();
      return dashboardView(state.profile, data);
    }
    case 'sistemas': {
      const items = await portalApi.shortcuts();
      return systemsView(items);
    }
    case 'biblioteca': {
      const [items, categories] = await Promise.all([portalApi.content(), portalApi.categories()]);
      state.data = { items, categories };
      return libraryView(items, categories);
    }
    case 'meu-espaco': {
      const items = await portalApi.content(true, 'PERSONAL', state.session.user.id);
      state.data = { items };
      return mySpaceView(items);
    }
    case 'comunicados': return announcementsView(await portalApi.announcements());
    case 'treinamentos': return trainingsView(await portalApi.trainings());
    case 'perfil': return profileView(state.profile);
    case 'admin': {
      if (!state.isAdmin) throw Object.assign(new Error('Area exclusiva para administradores.'), { status: 403 });
      const data = await portalApi.adminData();
      state.data = data;
      return adminView(data, state.adminTab);
    }
    default: return dashboardView(state.profile, await portalApi.dashboard());
  }
}

async function renderRoute({ focus = true } = {}) {
  if (!state.profile) return;
  const route = currentRoute();
  if (route === 'admin' && !state.isAdmin) {
    location.hash = '#/dashboard';
    return;
  }
  state.route = route;
  state.data = null;
  const request = ++state.request;
  root.innerHTML = shell(state.profile, route, loadingView(), state.isAdmin);
  closeMenu();
  try {
    const content = await loadRoute(route);
    if (request !== state.request) return;
    qs('#portal-main').innerHTML = content;
    bindViewEnhancements();
    if (focus) qs('#portal-main')?.focus({ preventScroll: true });
  } catch (error) {
    if (request !== state.request) return;
    qs('#portal-main').innerHTML = errorView(errorMessage(error));
  }
}

function bindViewEnhancements() {
  const search = qs('[data-filter="cards"]');
  if (search) search.addEventListener('input', debounce(() => {
    const query = search.value.trim().toLowerCase();
    const cards = qsa('.portal-shortcut', qs('[data-filter-list]'));
    cards.forEach((card) => card.classList.toggle('hidden', !card.textContent.toLowerCase().includes(query)));
    qs('.portal-no-results')?.classList.toggle('hidden', cards.some((card) => !card.classList.contains('hidden')));
  }, 120));

  const contentSearch = qs('[data-filter="content"]');
  const category = qs('[data-category-filter]');
  if (contentSearch && category) {
    const filter = debounce(() => {
      const query = contentSearch.value.trim().toLowerCase();
      const cards = qsa('.portal-content-card', qs('[data-filter-list]'));
      cards.forEach((card) => {
        const matchesText = card.dataset.searchText.includes(query);
        const matchesCategory = !category.value || card.dataset.category === category.value;
        card.classList.toggle('hidden', !(matchesText && matchesCategory));
      });
      qs('.portal-no-results')?.classList.toggle('hidden', cards.some((card) => !card.classList.contains('hidden')));
    }, 120);
    contentSearch.addEventListener('input', filter);
    category.addEventListener('change', filter);
  }
}

function openDialog(markup) {
  dialogContent.innerHTML = markup;
  dialog.classList.toggle('portal-dialog-large', Boolean(qs('.portal-dialog-wide', dialogContent)));
  dialog.showModal();
  requestAnimationFrame(() => qs('input:not([type="hidden"]), select, textarea, button', dialogContent)?.focus());
}

function closeDialog() {
  if (dialog.open) dialog.close();
  dialogContent.innerHTML = '';
  dialog.classList.remove('portal-dialog-large');
}

function dialogFrame(title, description, body, wide = false) {
  return `<div class="portal-dialog-frame ${wide ? 'portal-dialog-wide' : ''}"><header><div><h2 id="dialog-title">${e(title)}</h2>${description ? `<p>${e(description)}</p>` : ''}</div><button class="portal-icon-btn" type="button" data-action="close-dialog" aria-label="Fechar">${icon('close')}</button></header>${body}</div>`;
}

function confirmAction({ title, message, confirmLabel = 'Excluir', onConfirm }) {
  openDialog(dialogFrame(title, message, `<div class="portal-dialog-actions"><button class="portal-btn portal-btn-outline" data-action="close-dialog">Cancelar</button><button class="portal-btn portal-btn-danger" id="confirm-action">${e(confirmLabel)}</button></div>`));
  qs('#confirm-action').addEventListener('click', async (event) => {
    setBusy(event.currentTarget, true);
    try {
      await onConfirm();
      closeDialog();
    } catch (error) {
      toast(errorMessage(error), 'error');
      setBusy(event.currentTarget, false);
    }
  });
}

function optionList(items, selected, placeholder = 'Selecione') {
  return `<option value="">${e(placeholder)}</option>${items.map((item) => `<option value="${e(item.id)}" ${item.id === selected ? 'selected' : ''}>${e(item.name || item.full_name || item.email)}</option>`).join('')}`;
}

function grantFields(roles, profiles, grants = { roleIds: [], userIds: [] }, visibility = 'ALL') {
  const roleIds = new Set(grants.roleIds || []);
  const userIds = new Set(grants.userIds || []);
  return `<fieldset class="portal-grants" data-grants><legend>Destinatarios</legend><p>A RLS valida cada acesso. Selecione ao menos um destinatario para audiencias restritas.</p><div class="${visibility !== 'ROLE' ? 'hidden' : ''}" data-audience-panel="ROLE"><strong>Funcoes</strong><div class="portal-check-list">${roles.map((role) => `<label class="portal-check"><input type="checkbox" name="grant_role" value="${e(role.id)}" ${roleIds.has(role.id) ? 'checked' : ''}> ${e(role.name)}</label>`).join('') || '<small>Nenhuma funcao disponivel.</small>'}</div></div><div class="${visibility !== 'USERS' ? 'hidden' : ''}" data-audience-panel="USERS"><strong>Pessoas</strong><div class="portal-check-list">${profiles.map((profile) => `<label class="portal-check"><input type="checkbox" name="grant_user" value="${e(profile.id)}" ${userIds.has(profile.id) ? 'checked' : ''}> ${e(profile.full_name)}</label>`).join('') || '<small>Nenhuma pessoa disponivel.</small>'}</div></div></fieldset>`;
}

async function openContentDialog(item = null) {
  try {
    const [categories, roles, directory, grants] = await Promise.all([
      portalApi.categories(), portalApi.roles(), portalApi.sharingDirectory(),
      item ? portalApi.grants('content_role_grants', 'content_user_grants', 'content_item_id', item.id) : Promise.resolve({ roleIds: [], userIds: [] }),
    ]);
    const kind = item?.kind || 'FILE';
    const visibility = item?.visibility || 'PRIVATE';
    const scope = item?.scope || (state.route === 'admin' ? 'LIBRARY' : 'PERSONAL');
    const fileKind = ['FILE', 'PHOTO'].includes(kind);
    openDialog(dialogFrame(item ? 'Editar conteudo' : 'Novo conteudo', 'Publique um arquivo privado ou um link externo.', `<form class="portal-form" data-form="content" data-id="${e(item?.id || '')}" data-storage-path="${e(item?.storage_path || '')}">
      <div class="portal-form-grid"><label class="portal-span-2">Titulo<input name="title" value="${e(item?.title || '')}" required maxlength="200"></label><label class="portal-span-2">Descricao<textarea name="description" rows="3">${e(item?.description || '')}</textarea></label><label>Categoria<select name="category_id">${optionList(categories, item?.category_id, 'Sem categoria')}</select></label><label>Visibilidade<select name="visibility" data-visibility><option value="PRIVATE" ${visibility === 'PRIVATE' ? 'selected' : ''}>Somente eu</option><option value="ALL" ${visibility === 'ALL' ? 'selected' : ''}>Todos</option><option value="ROLE" ${visibility === 'ROLE' ? 'selected' : ''}>Por funcao</option><option value="USERS" ${visibility === 'USERS' ? 'selected' : ''}>Por pessoas</option></select></label>${state.isAdmin ? `<label>Area<select name="scope"><option value="LIBRARY" ${scope === 'LIBRARY' ? 'selected' : ''}>Biblioteca</option><option value="PERSONAL" ${scope === 'PERSONAL' ? 'selected' : ''}>Pessoal</option></select></label><label>Publicar em<input name="published_at" type="datetime-local" value="${toLocalInput(item?.published_at)}"></label>` : `<input type="hidden" name="scope" value="PERSONAL">`}</div>
      <fieldset class="portal-choice portal-choice-four"><legend>Tipo de conteudo</legend><label><input type="radio" name="kind" value="FILE" ${kind === 'FILE' ? 'checked' : ''}> ${icon('upload')} Arquivo</label><label><input type="radio" name="kind" value="PHOTO" ${kind === 'PHOTO' ? 'checked' : ''}> ${icon('file')} Foto</label><label><input type="radio" name="kind" value="LINK" ${kind === 'LINK' ? 'checked' : ''}> ${icon('link')} Link</label><label><input type="radio" name="kind" value="VIDEO" ${kind === 'VIDEO' ? 'checked' : ''}> ${icon('play')} Video</label></fieldset>
      <div data-kind-panel="storage" class="${!fileKind ? 'hidden' : ''}"><label>Arquivo${item?.storage_path ? ' (deixe vazio para manter o atual)' : ''}<input name="file" type="file" ${!item && fileKind ? 'required' : ''} ${kind === 'PHOTO' ? 'accept="image/*"' : ''}></label></div>
      <div data-kind-panel="external" class="${fileKind ? 'hidden' : ''}"><label>URL externa<input name="external_url" type="url" inputmode="url" value="${e(item?.external_url || '')}" placeholder="https://" ${!fileKind ? 'required' : ''}></label><label>URL da miniatura (opcional)<input name="thumbnail_url" type="url" inputmode="url" value="${e(item?.thumbnail_url || '')}" placeholder="https://"></label></div>
      ${grantFields(roles, directory.filter((profile) => profile.id !== state.session.user.id), grants, visibility)}
      <div class="portal-dialog-actions"><button class="portal-btn portal-btn-outline" type="button" data-action="close-dialog">Cancelar</button><button class="portal-btn portal-btn-primary" type="submit">Salvar conteudo</button></div>
    </form>`, true));
  } catch (error) {
    toast(errorMessage(error, 'Nao foi possivel abrir o formulario.'), 'error');
  }
}

async function submitContent(form, submitter) {
  const values = formObject(form);
  const file = form.elements.file.files[0];
  const externalKind = ['LINK', 'VIDEO'].includes(values.kind);
  if (externalKind && !isSafeWebUrl(values.external_url)) {
    toast('Informe uma URL externa HTTP ou HTTPS valida.', 'error');
    return;
  }
  if (values.thumbnail_url && !isSafeWebUrl(values.thumbnail_url)) {
    toast('Informe uma URL de miniatura HTTP ou HTTPS valida.', 'error');
    return;
  }
  if (!externalKind && !file && !form.dataset.storagePath) {
    toast('Selecione um arquivo.', 'error');
    return;
  }
  const roleIds = values.visibility === 'ROLE' ? qsa('[name="grant_role"]:checked', form).map((input) => input.value) : [];
  const userIds = values.visibility === 'USERS' ? qsa('[name="grant_user"]:checked', form).map((input) => input.value) : [];
  if (values.visibility === 'ROLE' && !roleIds.length) return toast('Selecione ao menos uma funcao.', 'error');
  if (values.visibility === 'USERS' && !userIds.length) return toast('Selecione ao menos uma pessoa.', 'error');
  const payload = {
    title: values.title.trim(),
    description: values.description.trim() || null,
    category_id: values.category_id || null,
    visibility: values.visibility,
    kind: values.kind,
    scope: state.isAdmin ? values.scope : 'PERSONAL',
    thumbnail_url: values.thumbnail_url || null,
    active: true,
  };
  if (state.isAdmin) payload.published_at = values.published_at ? new Date(values.published_at).toISOString() : null;
  if (!form.dataset.id) payload.owner_id = state.session.user.id;
  if (externalKind) Object.assign(payload, { external_url: values.external_url, storage_path: null, mime_type: null, file_size: null });
  setBusy(submitter, true, 'Salvando...');
  try {
    await portalApi.saveContent({ values: payload, file, roleIds, userIds, contentId: form.dataset.id || null, oldStoragePath: form.dataset.storagePath || null });
    closeDialog();
    toast('Conteudo salvo com sucesso.');
    await renderRoute({ focus: false });
  } catch (error) {
    toast(errorMessage(error), 'error');
    setBusy(submitter, false);
  }
}

function adminRecord(type, id) {
  const sources = {
    user: state.data?.profiles,
    shortcut: state.data?.shortcuts,
    category: state.data?.categories,
    announcement: state.data?.announcements,
    training: state.data?.trainings,
    'admin-content': state.data?.content,
  };
  return sources[type]?.find((item) => item.id === id);
}

function permissionOverrideFields(user) {
  const overrides = new Map(state.data.permissionOverrides.filter((item) => item.user_id === user.id).map((item) => [item.permission_id, item.allowed]));
  const inherited = new Set(state.data.rolePermissions.filter((item) => item.role_id === user.role_id).map((item) => item.permission_id));
  return `<fieldset class="portal-permissions"><legend>Substituicoes de permissao</legend><p>Herdar usa a permissao da funcao. Permitir ou negar substitui apenas para este usuario.</p><div class="portal-permission-list">${state.data.permissions.map((permission) => {
    const mode = overrides.has(permission.id) ? (overrides.get(permission.id) ? 'allow' : 'deny') : 'inherit';
    return `<label><span><strong>${e(permission.name)}</strong><small>${e(permission.code)} - funcao: ${inherited.has(permission.id) ? 'permitido' : 'negado'}</small></span><select name="permission_${e(permission.id)}" aria-label="${e(permission.name)}"><option value="inherit" ${mode === 'inherit' ? 'selected' : ''}>Herdar</option><option value="allow" ${mode === 'allow' ? 'selected' : ''}>Permitir</option><option value="deny" ${mode === 'deny' ? 'selected' : ''}>Negar</option></select></label>`;
  }).join('')}</div></fieldset>`;
}

async function openAdminDialog(type, item = null) {
  if (type === 'admin-content' || type === 'conteudos') {
    await openContentDialog(item);
    return;
  }
  try {
    if (type === 'user' || type === 'usuarios') {
      const roles = state.data.roles;
      const roleOptions = `<option value="">Selecione uma funcao</option>${roles.map((role) => `<option value="${e(role.code)}" ${role.code === item?.role?.code ? 'selected' : ''}>${e(role.name)}</option>`).join('')}`;
      openDialog(dialogFrame(item ? 'Editar usuario' : 'Convidar usuario', item ? 'Atualize o perfil, a funcao e as permissoes desta pessoa.' : 'Um convite seguro sera enviado por e-mail.', `<form class="portal-form" data-form="admin-user" data-id="${e(item?.id || '')}"><div class="portal-form-grid"><label class="portal-span-2">Nome completo<input name="full_name" value="${e(item?.full_name || '')}" required maxlength="150"></label><label class="portal-span-2">E-mail<input name="email" type="email" value="${e(item?.email || '')}" ${item ? 'readonly' : 'required'}></label><label>Empresa<input name="company" value="${e(item?.company || '')}" maxlength="150"></label><label>Telefone<input name="phone" value="${e(item?.phone || '')}" maxlength="30"></label><label>Cargo<input name="job_title" value="${e(item?.job_title || '')}" maxlength="120"></label><label>Funcao<select name="role_code" required>${roleOptions}</select></label></div>${item ? permissionOverrideFields(item) : ''}<div class="portal-dialog-actions">${item ? '<button class="portal-btn portal-btn-outline" type="button" data-action="resend-reset" data-email="' + e(item.email) + '">Reenviar redefinicao</button>' : ''}<button class="portal-btn portal-btn-outline" type="button" data-action="close-dialog">Cancelar</button><button class="portal-btn portal-btn-primary" type="submit">${item ? 'Salvar usuario' : 'Enviar convite'}</button></div></form>`, true));
      return;
    }

    const config = {
      shortcut: { table: 'shortcuts', roleTable: 'shortcut_role_grants', userTable: 'shortcut_user_grants', foreignKey: 'shortcut_id', title: 'atalho' },
      atalhos: { table: 'shortcuts', roleTable: 'shortcut_role_grants', userTable: 'shortcut_user_grants', foreignKey: 'shortcut_id', title: 'atalho' },
      announcement: { table: 'announcements', roleTable: 'announcement_role_grants', userTable: 'announcement_user_grants', foreignKey: 'announcement_id', title: 'comunicado' },
      comunicados: { table: 'announcements', roleTable: 'announcement_role_grants', userTable: 'announcement_user_grants', foreignKey: 'announcement_id', title: 'comunicado' },
      training: { table: 'trainings', roleTable: 'training_role_grants', userTable: 'training_user_grants', foreignKey: 'training_id', title: 'treinamento' },
      treinamentos: { table: 'trainings', roleTable: 'training_role_grants', userTable: 'training_user_grants', foreignKey: 'training_id', title: 'treinamento' },
    }[type];

    if (type === 'category' || type === 'categorias') {
      openDialog(dialogFrame(item ? 'Editar categoria' : 'Nova categoria', 'Organize os conteudos da biblioteca.', `<form class="portal-form" data-form="admin-generic" data-table="categories" data-id="${e(item?.id || '')}"><label>Nome<input name="name" value="${e(item?.name || '')}" required></label><label>Descricao<textarea name="description" rows="3">${e(item?.description || '')}</textarea></label><div class="portal-form-grid"><label>Ordem<input name="sort_order" type="number" min="0" value="${e(item?.sort_order ?? 0)}"></label><label class="portal-toggle"><input name="active" type="checkbox" ${item?.active !== false ? 'checked' : ''}><span></span> Ativa</label></div><div class="portal-dialog-actions"><button class="portal-btn portal-btn-outline" type="button" data-action="close-dialog">Cancelar</button><button class="portal-btn portal-btn-primary" type="submit">Salvar categoria</button></div></form>`));
      return;
    }

    const grants = item ? await portalApi.grants(config.roleTable, config.userTable, config.foreignKey, item.id) : { roleIds: [], userIds: [] };
    const common = `data-table="${config.table}" data-role-table="${config.roleTable}" data-user-table="${config.userTable}" data-foreign-key="${config.foreignKey}" data-id="${e(item?.id || '')}"`;
    let fields = '';
    let visibility = item?.visibility || 'ALL';
    if (config.table === 'shortcuts') {
      visibility = item?.visible_to_all ? 'ALL' : grants.roleIds.length ? 'ROLE' : 'USERS';
      fields = `<div class="portal-form-grid"><label>Titulo<input name="title" value="${e(item?.title || '')}" required></label><label>Icone<select name="icon"><option value="grid">Grade</option><option value="link" ${item?.icon === 'link' ? 'selected' : ''}>Link</option><option value="book" ${item?.icon === 'book' ? 'selected' : ''}>Livro</option><option value="users" ${item?.icon === 'users' ? 'selected' : ''}>Pessoas</option></select></label><label class="portal-span-2">Descricao<input name="description" value="${e(item?.description || '')}"></label><label class="portal-span-2">URL<input name="url" type="url" value="${e(item?.url || '')}" placeholder="https://" required></label><label>Audiencia<select name="visibility" data-visibility><option value="ALL" ${visibility === 'ALL' ? 'selected' : ''}>Todos</option><option value="ROLE" ${visibility === 'ROLE' ? 'selected' : ''}>Por funcao</option><option value="USERS" ${visibility === 'USERS' ? 'selected' : ''}>Por pessoas</option></select></label><label>Ordem<input name="sort_order" type="number" min="0" value="${e(item?.sort_order ?? 0)}"></label></div><div class="portal-toggle-row"><label class="portal-toggle"><input name="open_new_tab" type="checkbox" ${item?.open_new_tab !== false ? 'checked' : ''}><span></span> Abrir em nova aba</label><label class="portal-toggle"><input name="active" type="checkbox" ${item?.active !== false ? 'checked' : ''}><span></span> Ativo</label></div>`;
    } else if (config.table === 'announcements') {
      fields = `<label>Titulo<input name="title" value="${e(item?.title || '')}" required></label><label>Mensagem<textarea name="body" rows="7" required>${e(item?.body || '')}</textarea></label><div class="portal-form-grid"><label>Visibilidade<select name="visibility" data-visibility><option value="ALL" ${visibility === 'ALL' ? 'selected' : ''}>Todos</option><option value="PRIVATE" ${visibility === 'PRIVATE' ? 'selected' : ''}>Privado</option><option value="ROLE" ${visibility === 'ROLE' ? 'selected' : ''}>Por funcao</option><option value="USERS" ${visibility === 'USERS' ? 'selected' : ''}>Por pessoas</option></select></label><label>Publicar em<input name="published_at" type="datetime-local" value="${toLocalInput(item?.published_at || new Date())}" required></label><label>Expira em<input name="expires_at" type="datetime-local" value="${toLocalInput(item?.expires_at)}"></label><div class="portal-toggle-row"><label class="portal-toggle"><input name="pinned" type="checkbox" ${item?.pinned ? 'checked' : ''}><span></span> Fixado</label><label class="portal-toggle"><input name="active" type="checkbox" ${item?.active !== false ? 'checked' : ''}><span></span> Ativo</label></div></div>`;
    } else {
      fields = `<label>Titulo<input name="title" value="${e(item?.title || '')}" required></label><label>Descricao<textarea name="description" rows="5">${e(item?.description || '')}</textarea></label><div class="portal-form-grid"><label class="portal-span-2">URL do conteudo<input name="content_url" type="url" value="${e(item?.content_url || '')}" placeholder="https://" required></label><label class="portal-span-2">URL da miniatura<input name="thumbnail_url" type="url" value="${e(item?.thumbnail_url || '')}" placeholder="https://"></label><label>Categoria<select name="category_id">${optionList(state.data.categories, item?.category_id, 'Sem categoria')}</select></label><label>Visibilidade<select name="visibility" data-visibility><option value="ALL" ${visibility === 'ALL' ? 'selected' : ''}>Todos</option><option value="PRIVATE" ${visibility === 'PRIVATE' ? 'selected' : ''}>Privado</option><option value="ROLE" ${visibility === 'ROLE' ? 'selected' : ''}>Por funcao</option><option value="USERS" ${visibility === 'USERS' ? 'selected' : ''}>Por pessoas</option></select></label><label>Publicar em<input name="published_at" type="datetime-local" value="${toLocalInput(item?.published_at)}"></label><label>Duracao (minutos)<input name="duration_minutes" type="number" min="1" value="${e(item?.duration_minutes || '')}"></label><label class="portal-toggle"><input name="active" type="checkbox" ${item?.active !== false ? 'checked' : ''}><span></span> Ativo</label></div>`;
    }
    fields += grantFields(state.data.roles, state.data.profiles, grants, visibility);
    openDialog(dialogFrame(`${item ? 'Editar' : 'Novo'} ${config.title}`, 'Sem destinatarios selecionados, a politica RLS define a disponibilidade.', `<form class="portal-form" data-form="admin-generic" ${common}>${fields}<div class="portal-dialog-actions"><button class="portal-btn portal-btn-outline" type="button" data-action="close-dialog">Cancelar</button><button class="portal-btn portal-btn-primary" type="submit">Salvar ${config.title}</button></div></form>`, true));
  } catch (error) {
    toast(errorMessage(error, 'Nao foi possivel abrir o formulario.'), 'error');
  }
}

function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

async function submitAdminUser(form, submitter) {
  const values = formObject(form);
  const payload = form.dataset.id
    ? { action: 'update', targetUserId: form.dataset.id, fullName: values.full_name.trim(), company: values.company.trim() || undefined, phone: values.phone.trim() || undefined, jobTitle: values.job_title.trim() || undefined, roleCode: values.role_code }
    : { action: 'invite', email: values.email.trim(), fullName: values.full_name.trim(), company: values.company.trim() || undefined, phone: values.phone.trim() || undefined, jobTitle: values.job_title.trim() || undefined, roleCode: values.role_code, redirectTo: location.origin + location.pathname };
  setBusy(submitter, true, form.dataset.id ? 'Salvando...' : 'Enviando...');
  try {
    await portalApi.manageUser(payload);
    if (form.dataset.id) {
      const selections = Object.fromEntries(Object.entries(values).filter(([key]) => key.startsWith('permission_')).map(([key, mode]) => [key.replace('permission_', ''), mode]));
      const current = state.data.permissionOverrides.filter((item) => item.user_id === form.dataset.id);
      await portalApi.savePermissionOverrides(form.dataset.id, selections, current);
    }
    closeDialog();
    toast(form.dataset.id ? 'Usuario atualizado.' : 'Convite enviado.');
    await renderRoute({ focus: false });
  } catch (error) {
    toast(errorMessage(error), 'error');
    setBusy(submitter, false);
  }
}

async function submitAdminGeneric(form, submitter) {
  const raw = formObject(form);
  const table = form.dataset.table;
  let values;
  if (table === 'categories') {
    values = { name: raw.name.trim(), description: raw.description.trim() || null, slug: slugify(raw.name), sort_order: Number(raw.sort_order) || 0, active: form.elements.active.checked };
  } else if (table === 'shortcuts') {
    if (!isSafeWebUrl(raw.url)) return toast('Informe uma URL HTTP ou HTTPS valida.', 'error');
    values = { title: raw.title.trim(), description: raw.description.trim() || null, url: raw.url, icon: raw.icon, visible_to_all: raw.visibility === 'ALL', sort_order: Number(raw.sort_order) || 0, open_new_tab: form.elements.open_new_tab.checked, active: form.elements.active.checked };
    if (!form.dataset.id) values.created_by = state.session.user.id;
  } else if (table === 'announcements') {
    const publishedAt = new Date(raw.published_at);
    const expiresAt = raw.expires_at ? new Date(raw.expires_at) : null;
    if (expiresAt && expiresAt <= publishedAt) return toast('A expiracao deve ser posterior a publicacao.', 'error');
    values = { title: raw.title.trim(), body: raw.body.trim(), visibility: raw.visibility, pinned: form.elements.pinned.checked, published_at: publishedAt.toISOString(), expires_at: expiresAt?.toISOString() || null, active: form.elements.active.checked };
    if (!form.dataset.id) values.author_id = state.session.user.id;
  } else {
    if (!isSafeWebUrl(raw.content_url)) return toast('Informe uma URL de conteudo HTTP ou HTTPS valida.', 'error');
    if (raw.thumbnail_url && !isSafeWebUrl(raw.thumbnail_url)) return toast('Informe uma URL de miniatura HTTP ou HTTPS valida.', 'error');
    values = { title: raw.title.trim(), description: raw.description.trim() || null, content_url: raw.content_url, thumbnail_url: raw.thumbnail_url || null, category_id: raw.category_id || null, visibility: raw.visibility, published_at: raw.published_at ? new Date(raw.published_at).toISOString() : null, duration_minutes: raw.duration_minutes ? Number(raw.duration_minutes) : null, active: form.elements.active.checked };
    if (!form.dataset.id) values.created_by = state.session.user.id;
  }
  const visibility = raw.visibility || 'ALL';
  const roleIds = visibility === 'ROLE' ? qsa('[name="grant_role"]:checked', form).map((input) => input.value) : [];
  const userIds = visibility === 'USERS' ? qsa('[name="grant_user"]:checked', form).map((input) => input.value) : [];
  if (visibility === 'ROLE' && !roleIds.length) return toast('Selecione ao menos uma funcao para esta audiencia.', 'error');
  if (visibility === 'USERS' && !userIds.length) return toast('Selecione ao menos uma pessoa para esta audiencia.', 'error');
  setBusy(submitter, true, 'Salvando...');
  try {
    const item = form.dataset.id ? await portalApi.update(table, form.dataset.id, values) : await portalApi.create(table, values);
    if (form.dataset.roleTable) {
      await portalApi.syncGrants(form.dataset.roleTable, form.dataset.userTable, form.dataset.foreignKey, item.id, roleIds, userIds);
    }
    closeDialog();
    toast('Registro salvo com sucesso.');
    await renderRoute({ focus: false });
  } catch (error) {
    toast(errorMessage(error), 'error');
    setBusy(submitter, false);
  }
}

function openPasswordDialog() {
  openDialog(dialogFrame('Alterar senha', 'Use ao menos 8 caracteres.', `<form class="portal-form" data-form="password"><label>Nova senha<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><label>Confirme a senha<input name="confirm_password" type="password" minlength="8" autocomplete="new-password" required></label><div class="portal-dialog-actions"><button class="portal-btn portal-btn-outline" type="button" data-action="close-dialog">Cancelar</button><button class="portal-btn portal-btn-primary" type="submit">Atualizar senha</button></div></form>`));
}

function closeMenu() {
  document.body.classList.remove('menu-open');
  qs('.portal-menu-btn')?.setAttribute('aria-expanded', 'false');
}

root.addEventListener('click', async (event) => {
  const trigger = event.target.closest('[data-action], [data-auth-view], [data-admin-tab]');
  if (!trigger) return;
  if (trigger.dataset.authView) return showAuth(trigger.dataset.authView);
  if (trigger.dataset.adminTab) {
    state.adminTab = trigger.dataset.adminTab;
    qs('#portal-main').innerHTML = adminView(state.data, state.adminTab);
    return;
  }
  const action = trigger.dataset.action;
  if (action === 'open-menu') {
    document.body.classList.add('menu-open');
    trigger.setAttribute('aria-expanded', 'true');
  } else if (action === 'close-menu') closeMenu();
  else if (action === 'reload-view') renderRoute({ focus: false });
  else if (action === 'logout') {
    try { await authApi.signOut(); } catch (error) { toast(errorMessage(error), 'error'); }
  } else if (action === 'new-content') openContentDialog();
  else if (action === 'edit-content') openContentDialog(state.data?.items?.find((item) => item.id === trigger.dataset.id));
  else if (action === 'delete-content') {
    const item = state.data?.items?.find((entry) => entry.id === trigger.dataset.id);
    if (item) confirmAction({ title: 'Excluir conteudo?', message: 'O registro e o arquivo armazenado serao removidos. Esta acao nao pode ser desfeita.', onConfirm: async () => { await portalApi.deleteContent(item); toast('Conteudo excluido.'); await renderRoute({ focus: false }); } });
  } else if (action === 'open-content') {
    trigger.disabled = true;
    const target = window.open('about:blank', '_blank');
    if (target) target.opener = null;
    try {
      let item = state.data?.items?.find((entry) => entry.id === trigger.dataset.id) || state.data?.content?.find((entry) => entry.id === trigger.dataset.id);
      if (!item) item = (await portalApi.content()).find((entry) => entry.id === trigger.dataset.id);
      const url = await portalApi.contentUrl(item);
      if (!isSafeWebUrl(url)) throw new Error('Endereco de conteudo invalido.');
      if (target) target.location.replace(url);
      else location.assign(url);
    } catch (error) {
      target?.close();
      toast(errorMessage(error, 'Nao foi possivel abrir o conteudo.'), 'error');
    }
    finally { trigger.disabled = false; }
  } else if (action === 'open-password') openPasswordDialog();
  else if (action === 'new-admin') openAdminDialog(trigger.dataset.type);
  else if (action === 'edit-admin') openAdminDialog(trigger.dataset.type, adminRecord(trigger.dataset.type, trigger.dataset.id));
  else if (action === 'delete-admin') {
    const item = adminRecord(trigger.dataset.type, trigger.dataset.id);
    if (!item) return;
    confirmAction({ title: 'Confirmar exclusao?', message: 'Esta acao nao pode ser desfeita.', onConfirm: async () => {
      if (trigger.dataset.type === 'user') throw new Error('Usuarios de autenticacao nao podem ser excluidos pelo portal.');
      if (trigger.dataset.type === 'admin-content') await portalApi.deleteContent(item);
      else await portalApi.remove({ shortcut: 'shortcuts', category: 'categories', announcement: 'announcements', training: 'trainings' }[trigger.dataset.type], item.id);
      toast('Registro excluido.');
      await renderRoute({ focus: false });
    } });
  } else if (action === 'toggle-user-status') {
    const user = state.data?.profiles?.find((item) => item.id === trigger.dataset.id);
    if (!user) return;
    const activating = user.active === false;
    confirmAction({
      title: activating ? 'Reativar usuario?' : 'Desativar usuario?',
      message: activating
        ? `${user.full_name} voltara a acessar o Portal ARCA.`
        : `${user.full_name} perdera imediatamente o acesso. A conta nao sera excluida e podera ser reativada.`,
      confirmLabel: activating ? 'Reativar' : 'Desativar',
      onConfirm: async () => {
        await portalApi.manageUser({ action: activating ? 'reactivate' : 'deactivate', targetUserId: user.id });
        toast(activating ? 'Usuario reativado.' : 'Usuario desativado.');
        await renderRoute({ focus: false });
      },
    });
  }
});

root.addEventListener('submit', async (event) => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const submitter = event.submitter || qs('[type="submit"]', form);
  const values = formObject(form);
  if (form.dataset.form === 'login') {
    setBusy(submitter, true, 'Entrando...');
    try { await authApi.signIn(values.email.trim(), values.password); }
    catch (error) { toast(errorMessage(error, 'E-mail ou senha invalidos.'), 'error'); setBusy(submitter, false); }
  } else if (form.dataset.form === 'forgot') {
    setBusy(submitter, true, 'Enviando...');
    try { await authApi.resetPassword(values.email.trim()); showAuth('login', { message: 'Se o e-mail estiver cadastrado, voce recebera o link de recuperacao.' }); }
    catch (error) { toast(errorMessage(error), 'error'); setBusy(submitter, false); }
  } else if (form.dataset.form === 'recovery' || form.dataset.form === 'password') {
    if (values.password !== values.confirm_password) return toast('As senhas nao coincidem.', 'error');
    setBusy(submitter, true, 'Atualizando...');
    try {
      await authApi.updatePassword(values.password);
      state.recovery = false;
      closeDialog();
      toast('Senha atualizada com sucesso.');
      await establishSession((await authApi.session()).session);
      if (location.hash === '#recuperar-senha') history.replaceState(null, '', `${location.pathname}#/dashboard`);
    } catch (error) { toast(errorMessage(error), 'error'); setBusy(submitter, false); }
  } else if (form.dataset.form === 'profile') {
    setBusy(submitter, true, 'Salvando...');
    try {
      const updated = await portalApi.updateMyProfile({ full_name: values.full_name.trim(), company: values.company.trim(), job_title: values.job_title.trim(), phone: values.phone.trim() });
      state.profile = { ...state.profile, ...updated, role: state.profile.role, email: updated.email || state.session.user.email };
      toast('Perfil atualizado.');
      await renderRoute({ focus: false });
    } catch (error) { toast(errorMessage(error), 'error'); setBusy(submitter, false); }
  }
});

dialog.addEventListener('click', (event) => {
  if (event.target === dialog) closeDialog();
  if (event.target.closest('[data-action="close-dialog"]')) closeDialog();
  const reset = event.target.closest('[data-action="resend-reset"]');
  if (reset) {
    setBusy(reset, true, 'Enviando...');
    portalApi.manageUser({ action: 'resend_reset', email: reset.dataset.email, redirectTo: location.origin + location.pathname })
      .then(() => toast('Link de redefinicao solicitado.'))
      .catch((error) => toast(errorMessage(error), 'error'))
      .finally(() => setBusy(reset, false));
  }
});

dialog.addEventListener('change', (event) => {
  if (event.target.name === 'kind') {
    const kind = event.target.value;
    const panelName = ['FILE', 'PHOTO'].includes(kind) ? 'storage' : 'external';
    qsa('[data-kind-panel]', dialog).forEach((panel) => panel.classList.toggle('hidden', panel.dataset.kindPanel !== panelName));
    const file = qs('[name="file"]', dialog);
    const url = qs('[name="external_url"]', dialog);
    if (file) {
      file.required = panelName === 'storage' && !event.target.form.dataset.storagePath;
      file.accept = kind === 'PHOTO' ? 'image/*' : '';
    }
    if (url) url.required = panelName === 'external';
  }
  if (event.target.matches('[data-visibility]')) {
    qsa('[data-audience-panel]', event.target.form).forEach((panel) => panel.classList.toggle('hidden', panel.dataset.audiencePanel !== event.target.value));
  }
});

dialog.addEventListener('submit', async (event) => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const submitter = event.submitter || qs('[type="submit"]', form);
  if (form.dataset.form === 'content') await submitContent(form, submitter);
  else if (form.dataset.form === 'admin-user') await submitAdminUser(form, submitter);
  else if (form.dataset.form === 'admin-generic') await submitAdminGeneric(form, submitter);
  else if (form.dataset.form === 'password') {
    const values = formObject(form);
    if (values.password !== values.confirm_password) return toast('As senhas nao coincidem.', 'error');
    setBusy(submitter, true, 'Atualizando...');
    try { await authApi.updatePassword(values.password); closeDialog(); toast('Senha atualizada.'); }
    catch (error) { toast(errorMessage(error), 'error'); setBusy(submitter, false); }
  }
});

window.addEventListener('hashchange', () => {
  if (state.profile) renderRoute();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.body.classList.contains('menu-open')) closeMenu();
});

async function boot() {
  if (!isConfigured()) {
    showAuth('login');
    return;
  }
  state.recovery = location.hash === '#recuperar-senha';
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') state.recovery = true;
    setTimeout(() => establishSession(session), 0);
  });
}

boot();
