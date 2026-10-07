/**
 * Helpers puros de autenticação do Portal ARCA (sem DOM).
 * Usados por app.js/views.js e testáveis via `node --test`.
 */

export const MIN_PASSWORD_LENGTH = 6;

/** Códigos de erro de link (hash) que representam link expirado/inválido. */
const EXPIRED_LINK_CODES = new Set([
  'otp_expired', 'access_denied', 'otp_disabled', 'email_not_confirmed',
  'verification_failed', 'invalid_request', 'token_expired', 'link_expired', 'expired',
]);

/** Extrai parâmetros de autenticação da URL (query OU hash). */
export function parseAuthParams(rawUrl) {
  const url = new URL(String(rawUrl || ''), 'https://portal.local.invalid');
  const hashRaw = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hashRaw);
  const get = (key) => url.searchParams.get(key) ?? hashParams.get(key);
  return {
    error: get('error'),
    errorCode: get('error_code'),
    errorDescription: get('error_description'),
    code: url.searchParams.get('code') ?? hashParams.get('code'),
    hash: hashRaw,
  };
}

export function hasAuthError(params) {
  return Boolean(params && (params.error || params.errorCode));
}

/** true quando o erro é de link expirado/ inválido (deve virar "Link expirado"). */
export function isExpiredLink(params) {
  if (!params) return false;
  const code = String(params.errorCode || '').toLowerCase();
  const err = String(params.error || '').toLowerCase();
  if (!code && !err) return false;
  if (EXPIRED_LINK_CODES.has(code) || EXPIRED_LINK_CODES.has(err)) return true;
  return /expired|invalid|denied|expirad|inval/.test(`${code} ${err}`);
}

/** Intenção do carregamento do Portal a partir da URL. */
export function classifyAuthUrl(rawUrl) {
  const params = parseAuthParams(rawUrl);
  if (isExpiredLink(params)) return { kind: 'expired', params };
  if (hasAuthError(params)) return { kind: 'error', params };
  const marcador = params.hash === 'recuperar-senha' || /(^|&)recuperar-senha(&|$)/.test(params.hash);
  if (marcador || /type=recovery/.test(params.hash)) return { kind: 'recovery', params };
  return { kind: 'none', params };
}

/** Remove parâmetros de auth da URL, preservando path/rota. Não expõe erro técnico. */
export function cleanAuthUrl(rawUrl) {
  const url = new URL(String(rawUrl || ''), 'https://portal.local.invalid');
  for (const key of ['error', 'error_code', 'error_description', 'sb', 'code', 'state']) {
    url.searchParams.delete(key);
  }
  const hashRaw = url.hash.startsWith('#') ? url.hash.slice(1) : '';
  if (hashRaw.includes('=')) {
    const hashParams = new URLSearchParams(hashRaw);
    for (const key of ['error', 'error_code', 'error_description', 'sb', 'code']) {
      hashParams.delete(key);
    }
    const rest = hashParams.toString();
    url.hash = rest ? `#${rest}` : '';
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Regra de senha do Portal ARCA: mínimo 6, sem exigir complexidade. */
export function validatePassword(password, confirm) {
  const value = String(password ?? '');
  if (value.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (confirm !== undefined && value !== String(confirm ?? '')) {
    return { ok: false, message: 'As senhas não coincidem.' };
  }
  return { ok: true, message: '' };
}

export const GENERIC_RESET_MESSAGE = 'Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.';
export const GENERIC_FIRST_ACCESS_MESSAGE = 'Se este e-mail estiver cadastrado, você receberá as instruções para criar sua senha.';
