begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(22);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.arca', '', now(), '{}', '{"full_name":"Admin"}', now(), now()),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@test.arca', '', now(), '{}', '{"full_name":"Owner"}', now(), now()),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@test.arca', '', now(), '{}', '{"full_name":"Other"}', now(), now()),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'commercial@test.arca', '', now(), '{}', '{"full_name":"Commercial"}', now(), now());

update public.profiles set role_id = (select id from public.roles where code = 'ADMIN')
where id = '10000000-0000-4000-8000-000000000001';
update public.profiles set role_id = (select id from public.roles where code = 'COMERCIAL')
where id = '10000000-0000-4000-8000-000000000004';

insert into public.content_items (id, owner_id, kind, scope, visibility, title, external_url) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'LINK', 'PERSONAL', 'PRIVATE', 'Private', 'https://example.com/private'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'LINK', 'LIBRARY', 'ROLE', 'Role', 'https://example.com/role'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'FILE', 'LIBRARY', 'USERS', 'User', null, '10000000-0000-4000-8000-000000000002/user.pdf');

insert into public.content_role_grants (content_item_id, role_id)
select '20000000-0000-4000-8000-000000000002', id from public.roles where code = 'COMERCIAL';
insert into public.content_user_grants (content_item_id, user_id)
values ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003');

set local role anon;
select throws_ok(
  'select count(*) from public.content_items',
  '42501',
  'permission denied for table content_items',
  'anonymous users have no table access'
);
select throws_ok(
  'select count(*) from public.sharing_directory()',
  '42501',
  'permission denied for function sharing_directory',
  'anonymous users cannot call the sharing directory'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select is((select count(*)::integer from public.content_items), 3, 'owner can read all own content');
select is((select count(*)::integer from public.sharing_directory()), 4, 'normal active user can list active sharing targets');
select lives_ok(
  $$update public.profiles set full_name = 'Owner Updated' where id = '10000000-0000-4000-8000-000000000002'$$,
  'normal user can update safe own-profile fields'
);
select throws_ok(
  $$update public.profiles set role_id = (select id from public.roles where code = 'ADMIN') where id = '10000000-0000-4000-8000-000000000002'$$,
  'P0001',
  'Profile role and active status require profile management permission',
  'normal user cannot promote their own profile'
);
select ok(public.can_access_storage_object('10000000-0000-4000-8000-000000000002/user.pdf'), 'owner can read own storage path');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is((select count(*)::integer from public.content_items where id = '20000000-0000-4000-8000-000000000001'), 0, 'cross-user private content is denied');
select is((select count(*)::integer from public.content_items), 1, 'explicit user grant is readable');
select ok(public.can_access_storage_object('10000000-0000-4000-8000-000000000002/user.pdf'), 'user content grant authorizes storage object');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select is((select count(*)::integer from public.content_items), 1, 'role grant is readable');
select isnt((select id from public.content_items limit 1), '20000000-0000-4000-8000-000000000001'::uuid, 'role grant does not expose private content');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.content_items), 3, 'admin reads every content item');
select ok(public.has_permission('content.manage'), 'admin has every catalog permission');
select ok(public.can_access_storage_object('10000000-0000-4000-8000-000000000002/user.pdf'), 'admin can read storage object');
reset role;

insert into public.user_permission_overrides (user_id, permission_id, allowed)
select '10000000-0000-4000-8000-000000000003', id, true from public.permissions where code = 'content.manage';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select ok(public.has_permission('content.manage'), 'user allow override is effective');
reset role;

update public.profiles set active = false where id = '10000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select is((select count(*)::integer from public.content_items), 0, 'inactive users are denied');
select is((select count(*)::integer from public.sharing_directory()), 0, 'inactive users cannot use the sharing directory');
reset role;

select is((select count(*)::integer from public.categories), 8, 'all initial Portal ARCA categories are seeded');
select ok(
  (select column_default ilike '%true%' from information_schema.columns
   where table_schema = 'public' and table_name = 'shortcuts' and column_name = 'open_new_tab'),
  'shortcuts open in a new tab by default'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'portal_files_%'),
  4,
  'private bucket has read and write policies'
);
select is(
  (select count(*)::integer from pg_tables t where t.schemaname = 'public' and t.rowsecurity and t.tablename in (
    'roles', 'permissions', 'profiles', 'role_permissions', 'user_permission_overrides', 'categories',
    'shortcuts', 'shortcut_role_grants', 'shortcut_user_grants', 'content_items', 'content_role_grants',
    'content_user_grants', 'announcements', 'announcement_role_grants', 'announcement_user_grants',
    'trainings', 'training_role_grants', 'training_user_grants', 'training_progress'
  )),
  19,
  'RLS is enabled on every Portal ARCA public table'
);

select * from finish();
rollback;
