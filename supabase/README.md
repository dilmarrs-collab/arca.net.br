# Portal ARCA Supabase backend

This directory contains the complete backend for the single-organization Portal ARCA. It is independent from Control IA and has no customer/fleet tenancy model.

## Components

- `migrations/20260917000000_portal_arca_initial.sql`: schema, seeds, helper functions, triggers, RLS, private Storage bucket and policies.
- `functions/manage-user/index.ts`: ADMIN-only identity operations using the service role only inside the Edge runtime.
- `tests/portal_arca_rls.test.sql`: pgTAP coverage for anonymous denial, ownership, grants, admin, inactive users and Storage authorization.
- `config.toml`: local Supabase configuration with public signup and anonymous sign-in disabled.

## Local setup

Install the Supabase CLI and Docker, then run from the repository root:

```sh
supabase start
supabase db reset
supabase test db
```

Serve the function with strict browser origins:

```sh
supabase secrets set ALLOWED_ORIGINS="http://localhost:3000,https://portal.example.com"
supabase functions serve manage-user --no-verify-jwt
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase in hosted Edge Functions. Never place the service-role key in browser code. `verify_jwt` is disabled at the gateway for this function because it validates the bearer token with `auth.getUser()` and then checks the caller's active ADMIN profile server-side.

## Hosted deployment

1. Link the project: `supabase link --project-ref <project-ref>`.
2. Apply the migration: `supabase db push`.
3. Set `ALLOWED_ORIGINS` to an exact comma-separated allowlist. Wildcards are intentionally unsupported.
4. Deploy: `supabase functions deploy manage-user --no-verify-jwt`.
5. In Auth URL Configuration, set the production site URL and exact permitted redirect URLs.
6. Keep public signup disabled in the hosted Auth settings. `config.toml` controls local development; hosted settings must also be verified in the dashboard.

## Bootstrap the first administrator

Create or invite the first account from the protected Supabase dashboard, then assign its role once using the SQL editor and its Auth user UUID:

```sql
update public.profiles
set role_id = (select id from public.roles where code = 'ADMIN')
where id = '<auth-user-uuid>';
```

All later invitations, profile administration and account status changes should go through `manage-user`. Property names are case-sensitive, unknown properties are rejected, and roles are always selected by `roleCode` rather than by a client-supplied role UUID. Supported JSON actions are:

```json
{ "action": "invite", "email": "user@example.com", "fullName": "Name", "roleCode": "EQUIPE", "redirectTo": "https://portal.example.com/auth/callback" }
{ "action": "update", "targetUserId": "<uuid>", "fullName": "Name", "company": "ARCA", "phone": null, "jobTitle": "Analista", "roleCode": "EQUIPE", "active": true }
{ "action": "deactivate", "targetUserId": "<uuid>" }
{ "action": "reactivate", "targetUserId": "<uuid>" }
{ "action": "resend_reset", "email": "user@example.com", "redirectTo": "https://portal.example.com/reset-password" }
```

All `update` fields except `targetUserId` are optional, but at least one editable field must be supplied. `null` or an empty string clears company, phone or job title. An ADMIN may update their own descriptive fields, but cannot deactivate themselves or change their own role away from `ADMIN`. Auth ban status and `profiles.active` are synchronized when `active` is supplied.

Identity responses are deliberately generic to avoid account enumeration. Detailed provider errors are only written to function logs.

## Frontend data contract

- Roles expose `id`, `code`, generated lowercase `slug`, and `name`. Authorization decisions always use the immutable system `code`.
- Shortcuts expose `category_id`, `open_new_tab` (default `true`), `visible_to_all`, and their role/user grant relations.
- Initial categories are `Documentos`, `Links`, `Videos`, `Fotos`, `Treinamentos`, `Materiais Comerciais`, `Clientes`, and `Outros`.
- Database enum values are case-sensitive: content kinds are `FILE`, `LINK`, `VIDEO`, `PHOTO`; scopes are `LIBRARY`, `PERSONAL`; visibility values are `PRIVATE`, `ALL`, `ROLE`, `USERS`.
- Grant tables are intentionally separated by target type: `shortcut_role_grants`/`shortcut_user_grants`, `content_role_grants`/`content_user_grants`, `announcement_role_grants`/`announcement_user_grants`, and `training_role_grants`/`training_user_grants`.
- Content link URLs use `external_url`; private object keys use `storage_path`. Training URLs use `content_url` and scheduling/publication uses `published_at`.
- Authenticated active users may call `sharing_directory()` to receive only active users' `id` and `full_name`. Use this RPC instead of querying all profiles when building user-sharing selectors.
- A user may update their own `full_name`, `company`, `phone`, and `job_title` directly or through `update_my_profile(...)`; trigger enforcement prevents changing their email, role or active status.

## Authorization notes

- Seeded roles are `ADMIN`, `EQUIPE`, `PARCEIRO`, `COMERCIAL`, and `TECNICO`; additional roles can be created by authorized administrators.
- A user permission override takes precedence over role permissions. ADMIN is always allowed while active.
- Users update their safe profile fields through `update_my_profile(...)`; role, email and active state cannot be changed through that RPC.
- `sharing_directory()` is the only non-admin directory endpoint and intentionally omits email, role, company, phone and job title.
- Call `touch_last_access()` after a successful portal session to maintain `last_access_at`.
- Personal items can be managed by their owner. Library items require `content.manage`.
- Files are stored in the private `portal-files` bucket as `<owner-uuid>/<path>`. Reads require an authorized `content_items` row, ownership of the UUID path, or ADMIN access.
- Create uploads under the signed-in user's UUID first, then insert the matching content item. Until linked, only the path owner and ADMIN can read the object.

Before production, configure SMTP, email templates, redirect URLs, password/MFA policy, log retention, backups and a scheduled cleanup for uploaded objects that were never linked to a content item.
