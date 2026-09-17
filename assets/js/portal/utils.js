export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

export function nl2br(value = '') {
  return escapeHtml(value).replace(/\r?\n/g, '<br>');
}

export function formatDate(value, options = {}) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', ...options,
  }).format(date);
}

export function formatDateTime(value) {
  return formatDate(value, { hour: '2-digit', minute: '2-digit' });
}

export function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 1) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / (1024 ** index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

export function safeFileName(name) {
  const pieces = String(name || 'arquivo').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-{2,}/g, '-');
  return pieces.replace(/^[-.]+|[-.]+$/g, '').slice(0, 120) || 'arquivo';
}

export function isSafeWebUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol);
  } catch {
    return false;
  }
}

export function firstName(profile) {
  return (profile?.full_name || profile?.email || 'Pessoa').trim().split(/\s+/)[0];
}

export function initials(profile) {
  return (profile?.full_name || profile?.email || 'AR').trim().split(/\s+/)
    .slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function slugify(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function debounce(callback, wait = 250) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => callback(...args), wait);
  };
}

export function errorMessage(error, fallback = 'Nao foi possivel concluir a operacao.') {
  if (!error) return fallback;
  if (error.status === 403 || error.code === '42501') return 'Voce nao tem permissao para esta operacao.';
  if (error.status === 409 || error.code === '23505') return 'Ja existe um registro com estes dados.';
  return error.message || fallback;
}

export function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
