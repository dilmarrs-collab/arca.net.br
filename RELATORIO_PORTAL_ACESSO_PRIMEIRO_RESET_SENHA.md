# Relatório — Portal ARCA: Primeiro acesso + Esqueci senha + Link expirado + senha mínima 6

Repositório: `dilmarrs-collab/arca.net.br` · Portal: https://arca.net.br/portal/
Commits: `e830f1f` (feature) e `b23b034` (fix de MIME/cache)

Escopo: **somente autenticação/acesso do Portal ARCA**. Layout, dashboard, sistemas, biblioteca,
administração, RLS, roles e permissões preservados. Nada alterado no Control IA nem no Portal do Parceiro.

## 1. Causa do `otp_expired` atual
Ao abrir um link expirado, o Supabase redireciona para
`/portal/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid...`.
O `boot()` do `app.js` só verificava `location.hash === '#recuperar-senha'`, então o hash de erro caía no
login **sem orientação** (e o usuário via a tela de login). Não havia tratamento do hash de erro nem
limpeza da URL.

## 2. Regra de senha — antes × depois
- **Antes (inconsistente):** UI `minlength="8"` + “Use ao menos 8 caracteres.”; `supabase/config.toml` =
  `10`; **hospedado = 8**.
- **Depois:** **mínimo 6** (sem exigir maiúscula/minúscula/símbolo/número), alinhado em todas as telas e
  no servidor.

## 3. Configuração Supabase
- **Local (`supabase/config.toml`):** `minimum_password_length = 6`. Também alinhados `site_url` e
  `additional_redirect_urls` aos valores reais de produção (para que o `config push` não alterasse
  produção além da senha).
- **Hospedada (`hfmqwtvglqzpdvndjxkq` / portal-arca-net-br):** **CONFIRMADA SIM**.
  Era **8**; apliquei **apenas** `auth.minimum_password_length = 6` via
  `supabase config push --project-ref hfmqwtvglqzpdvndjxkq --yes` (diff confirmou 1 única mudança).
  O `config push` é por serviço; por isso alinhei `site_url`/`redirect_urls` antes — sem isso, o push
  trocaria o `site_url` de produção e removeria URLs de redirect (`www.arca.net.br/portal/**`).
  `db.major_version` (15→17) não é aplicável por push (nota do CLI: usar o dashboard) e **não** foi mexido.

## 4. Fluxos implementados
- **Login normal:** preservado (e-mail, senha, “Manter conectado”, “Entrar no portal”, `signInWithPassword`).
  Abaixo, agora há **“Esqueci minha senha”** e **“Primeiro acesso”**.
- **Esqueci minha senha:** título “Recuperar senha”, texto e botão “Enviar link de redefinição”,
  link “Voltar ao login”. Resposta **genérica** (sem revelar se o e-mail existe).
- **Primeiro acesso:** título “Primeiro acesso”, campo **somente e-mail**, botão “Receber link de acesso”.
  Reutiliza o mecanismo seguro de recovery do Supabase (não cria usuário; signup público continua
  desativado). Resposta **sempre genérica**.
- **Link expirado:** título “Link expirado”, texto “Este link não é mais válido…”, campo e-mail,
  botão “Enviar novo link”, link “Voltar ao login”. A URL é **limpa** (`error`, `error_code`,
  `error_description`, `sb`, `code`) e **nenhuma mensagem técnica** do Supabase é exibida.
- **Recuperação bem-sucedida:** título “Definir nova senha”, campos nova/confirmar, opção **Mostrar senha**,
  botão **“Salvar senha e entrar”**; após sucesso limpa tokens/hash, atualiza a senha e entra no Portal.
- **Alteração de senha no perfil:** mesmo mínimo de 6 e mesmo texto.

## 5. Arquivos alterados
- `assets/js/portal/auth-helpers.js` (**novo**, ESM puro): `parseAuthParams`, `classifyAuthUrl`,
  `cleanAuthUrl`, `validatePassword`, `MIN_PASSWORD_LENGTH`, mensagens genéricas.
- `assets/js/portal/package.json` (**novo**, `{"type":"module"}`): permite ESM no Node para os testes.
- `assets/js/portal/views.js`: modos `first`/`expired`, textos, recovery com `minlength=6`, toggle, links.
- `assets/js/portal/app.js`: `boot()` trata erro/recovery/`code` e limpa a URL; submissões `first`/`expired`;
  validação via `validatePassword`; diálogo de senha em 6; handler do “Mostrar senha”.
- `assets/css/portal.css`: `.portal-auth-links`, `.portal-field-hint`.
- `portal/index.html`: cache-busting `?v=20261007-2` (script e CSS).
- `supabase/config.toml`: mínimo 6 + alinhamento de `site_url`/`additional_redirect_urls`.
- `package.json`: script `test`.
- `tests/portal-auth.test.mjs` (**novo**): 23 testes.

## 6. Testes (`npm test` → `node --test tests`) — **23/23**
Cobrem: senha 6 aceita / 5 rejeitada / confirmação divergente; `otp_expired` → “Link expirado”;
URL de erro limpa; nenhuma mensagem técnica exposta; resposta genérica; login intacto;
“Esqueci minha senha” e “Primeiro acesso” presentes; primeiro acesso só com e-mail; recovery `minlength=6`
+ toggle + “Mínimo de 6 caracteres.”; perfil usa a mesma regra; usuário inativo sem acesso; signup
desativado; sem `signUp` no navegador; resend administrativo intacto; sessão existente intacta.

## 7. Publicação
- Commits `e830f1f` e `b23b034` → push `main`.
- **Deploy automático (Hostinger / Hostinger Git, host `hcdn`)** confirmado no ar:
  `app.js?v=20261007-2`, `portal.css?v=20261007-2` e `auth-helpers.js` com **`content-type:
  application/x-javascript`** (200) — mesmo tipo do `app.js`.
- **Correção importante:** o helper foi criado inicialmente como `.mjs`, mas o Hostinger serve `.mjs`
  como `text/plain`, o que faria o browser recusar o módulo e quebrar o Portal. Renomeado para `.js`
  (MIME aceito) e cache-busting elevado — verificado no ar.

## 8. Testes reais em produção — **PENDENTE (validação do usuário)**
Não foi possível executar cliques/logins reais nesta sessão (sem navegador conectado e sem acesso à
caixa de e-mail de teste). Passos:
- **TESTE A (Primeiro acesso):** abrir https://arca.net.br/portal/ → “Primeiro acesso” → informar e-mail
  de um usuário já cadastrado sem acesso → receber link → abrir → definir senha de **6 caracteres** →
  confirmar entrada.
- **TESTE B (Esqueci senha):** “Esqueci minha senha” → solicitar → abrir → definir nova senha de 6 →
  entrar.
- **TESTE C (Link expirado):** abrir um link vencido (ou simulado) e confirmar a tela **“Link expirado”**
  com “Enviar novo link”, **sem** exibir `otp_expired`/`access_denied`/erro técnico, e com a URL limpa.

## 9. Pendências / observações
1. Testes A/B/C acima (validação online).
2. `db.major_version` (local 15 × hospedado 17) permanece como está — ajuste apenas via dashboard, se
   desejado (fora do escopo de acesso).
3. `site_url`/`additional_redirect_urls` no `config.toml` foram alinhados à produção (não alteram nada
   online; evitam que um futuro `config push` mude produção sem intenção).
