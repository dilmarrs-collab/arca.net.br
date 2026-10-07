import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  MIN_PASSWORD_LENGTH,
  parseAuthParams,
  classifyAuthUrl,
  cleanAuthUrl,
  validatePassword,
  hasAuthError,
  isExpiredLink,
  GENERIC_RESET_MESSAGE,
  GENERIC_FIRST_ACCESS_MESSAGE,
} from '../assets/js/portal/auth-helpers.js';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const views = read('../assets/js/portal/views.js');
const app = read('../assets/js/portal/app.js');
const api = read('../assets/js/portal/api.js');
const configToml = read('../supabase/config.toml');

describe('regra de senha (mínimo 6, sem complexidade)', () => {
  test('11. aceita senha com exatamente 6 caracteres (só números, letras ou ambos)', () => {
    assert.equal(validatePassword('123456').ok, true);
    assert.equal(validatePassword('arca01').ok, true);
    assert.equal(validatePassword('teste1').ok, true);
    assert.equal(MIN_PASSWORD_LENGTH, 6);
  });

  test('12. rejeita senha com 5 caracteres', () => {
    const r = validatePassword('12345');
    assert.equal(r.ok, false);
    assert.match(r.message, /6 caracteres/);
  });

  test('13. rejeita confirmação diferente', () => {
    const r = validatePassword('123456', '123457');
    assert.equal(r.ok, false);
    assert.match(r.message, /não coincidem/);
  });

  test('config.toml usa minimum_password_length = 6', () => {
    assert.match(configToml, /minimum_password_length\s*=\s*6/);
  });
});

describe('tratamento de link / URL', () => {
  test('8. otp_expired é reconhecido como link expirado', () => {
    const url = 'https://arca.net.br/portal/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
    const intent = classifyAuthUrl(url);
    assert.equal(intent.kind, 'expired');
    assert.equal(isExpiredLink(parseAuthParams(url)), true);
    assert.equal(hasAuthError(parseAuthParams(url)), true);
  });

  test('7. link válido com #recuperar-senha entra em modo recovery', () => {
    assert.equal(classifyAuthUrl('https://arca.net.br/portal/#recuperar-senha').kind, 'recovery');
    assert.equal(classifyAuthUrl('https://arca.net.br/portal/?code=abc123#recuperar-senha').kind, 'recovery');
  });

  test('10. cleanAuthUrl remove error/error_code/error_description/sb/code', () => {
    const limpa = cleanAuthUrl('https://arca.net.br/portal/?code=xyz#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid');
    assert.equal(limpa, '/portal/');
    assert.doesNotMatch(limpa, /otp_expired|error|code=/);
  });

  test('9. nenhuma mensagem técnica do Supabase é exposta ao usuário', () => {
    assert.doesNotMatch(views, /otp_expired|access_denied|Email link is invalid|error_description/);
    assert.match(app, /Não foi possível validar o link\. Solicite um novo acesso\./);
  });

  test('resposta genérica (sem enumeração de usuários)', () => {
    assert.equal(GENERIC_RESET_MESSAGE, 'Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.');
    assert.equal(GENERIC_FIRST_ACCESS_MESSAGE, 'Se este e-mail estiver cadastrado, você receberá as instruções para criar sua senha.');
  });
});

describe('telas de autenticação (views)', () => {
  test('1. login normal continua funcionando', () => {
    assert.match(views, /data-form="login"/);
    assert.match(views, /name="email"/);
    assert.match(views, /name="password"/);
    assert.match(views, /Entrar no portal/);
    assert.match(views, /Manter conectado/);
  });

  test('2. "Esqueci minha senha" aparece', () => {
    assert.match(views, /data-auth-view="forgot">Esqueci minha senha/);
  });

  test('3. "Primeiro acesso" aparece na tela de login', () => {
    assert.match(views, /data-auth-view="first">Primeiro acesso/);
  });

  test('4. primeiro acesso pede somente e-mail', () => {
    const bloco = views.slice(views.indexOf('data-form="first"'), views.indexOf('data-form="expired"'));
    assert.match(bloco, /name="email"/);
    assert.doesNotMatch(bloco, /name="password"/);
    assert.match(bloco, /Receber link de acesso/);
    assert.match(bloco, /Voltar ao login/);
  });

  test('tela "Link expirado" com botão "Enviar novo link"', () => {
    assert.match(views, /Link expirado/);
    assert.match(views, /Enviar novo link/);
  });

  test('recovery minlength=6, toggle de senha e texto "Mínimo de 6 caracteres."', () => {
    const bloco = views.slice(views.indexOf('data-form="recovery"'), views.indexOf('mode === \'inactive\''));
    assert.match(bloco, /minlength="6"/);
    assert.match(bloco, /data-toggle-password/);
    assert.match(bloco, /Mínimo de 6 caracteres\./);
    assert.match(bloco, /Salvar senha e entrar/);
  });
});

describe('integração (app/api/config)', () => {
  test('5/6. primeiro acesso usa o mecanismo de recovery e mensagem genérica', () => {
    assert.match(app, /form\.dataset\.form === 'first'/);
    assert.match(app, /authApi\.resetPassword\(values\.email\.trim\(\)\);\s*showAuth\('login', \{ message: GENERIC_FIRST_ACCESS_MESSAGE \}\)/);
  });

  test('14. recovery valida (min 6) antes de atualizar a senha', () => {
    assert.match(app, /validatePassword\(values\.password, values\.confirm_password\)/);
    assert.match(app, /await authApi\.updatePassword\(values\.password\)/);
  });

  test('15. alteração de senha no perfil usa a mesma regra de 6', () => {
    assert.match(app, /Alterar senha', 'Mínimo de 6 caracteres\.'/);
    assert.match(app, /form\.dataset\.form === 'password'/);
    assert.doesNotMatch(app, /Use ao menos 8 caracteres/);
    assert.doesNotMatch(app, /minlength="8"/);
  });

  test('16. usuário inativo continua sem acesso', () => {
    assert.match(app, /profile\.active === false/);
    assert.match(app, /showAuth\('inactive'\)/);
  });

  test('17. signup público desativado', () => {
    assert.match(configToml, /enable_signup\s*=\s*false/);
  });

  test('18. não há criação de usuário pelo navegador (sem signUp)', () => {
    assert.doesNotMatch(api, /signUp/);
    assert.doesNotMatch(app, /signUp/);
  });

  test('19. convite/resend administrativo existente continua', () => {
    assert.match(api, /manageUser\(payload\)/);
    assert.match(app, /action: 'resend_reset'/);
  });

  test('20. sessão existente continua (establishSession)', () => {
    assert.match(app, /async function establishSession\(session\)/);
    assert.match(app, /portalApi\.profile\(session\.user\.id\)/);
  });
});
