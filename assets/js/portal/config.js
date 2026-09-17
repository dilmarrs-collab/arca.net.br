/**
 * Configuracao publica do Portal ARCA.
 * Nunca use a service_role key no navegador. Informe somente a chave anon/publishable.
 */
export const SUPABASE_URL = 'https://xdusaipzgzzmvpupblzz.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdXNhaXB6Z3p6bXZwdXBibHp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMjgyMTEsImV4cCI6MjEwMzYwNDIxMX0.sE8bMoJArywj0ns9lmfuv_JcVL53INajk-CED2BdFBM';

export const PORTAL_CONFIG = Object.freeze({
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON_KEY,
  storageBucket: 'portal-files',
  siteUrl: new URL('../../../portal/', import.meta.url).href,
});

export function isConfigured() {
  let serverCredential = /^sb_secret_/i.test(SUPABASE_ANON_KEY);
  if (SUPABASE_ANON_KEY.split('.').length === 3) {
    try {
      const encoded = SUPABASE_ANON_KEY.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
      serverCredential ||= payload.role === 'service_role';
    } catch {
      // Invalid credentials are rejected by the remaining checks or by Supabase.
    }
  }
  return !serverCredential
    && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL)
    && SUPABASE_ANON_KEY.length > 30
    && !/SEU-|SUA-|PLACEHOLDER/i.test(`${SUPABASE_URL}${SUPABASE_ANON_KEY}`);
}
