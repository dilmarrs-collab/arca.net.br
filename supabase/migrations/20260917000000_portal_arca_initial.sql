-- Portal ARCA: single-organization authorization, content and private storage.

create extension if not exists citext with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.portal_visibility as enum ('PRIVATE', 'ALL', 'ROLE', 'USERS');
create type public.content_kind as enum ('FILE', 'LINK', 'VIDEO', 'PHOTO');
create type public.content_scope as enum ('LIBRARY', 'PERSONAL');
create type public.training_progress_status as enum ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z][A-Z0-9_]{1,49}$'),
  slug text generated always as (lower(code)) stored unique,
  name text not null check (char_length(name) between 2 and 100),
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = lower(code) and code ~ '^[a-z][a-z0-9_.]{2,99}$'),
  name text not null check (char_length(name) between 2 and 120),
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  full_name text not null check (char_length(full_name) between 1 and 150),
  email extensions.citext not null unique,
  company text check (company is null or char_length(company) <= 150),
  phone text check (phone is null or char_length(phone) <= 30),
  job_title text check (job_title is null or char_length(job_title) <= 120),
  active boolean not null default true,
  last_access_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_id_idx on public.profiles(role_id);
create index profiles_active_idx on public.profiles(active) where active;

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create index role_permissions_permission_id_idx on public.role_permissions(permission_id);

create table public.user_permission_overrides (
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  allowed boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, permission_id)
);

create index user_permission_overrides_permission_id_idx on public.user_permission_overrides(permission_id);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_list_idx on public.categories(active, sort_order, name);

create table public.shortcuts (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  title text not null check (char_length(title) between 2 and 150),
  description text,
  url text not null check (char_length(url) between 1 and 2048),
  icon text check (icon is null or char_length(icon) <= 100),
  open_new_tab boolean not null default true,
  visible_to_all boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shortcuts_list_idx on public.shortcuts(active, sort_order, title);
create index shortcuts_created_by_idx on public.shortcuts(created_by);
create index shortcuts_category_id_idx on public.shortcuts(category_id);

create table public.shortcut_role_grants (
  shortcut_id uuid not null references public.shortcuts(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (shortcut_id, role_id)
);

create index shortcut_role_grants_role_id_idx on public.shortcut_role_grants(role_id);

create table public.shortcut_user_grants (
  shortcut_id uuid not null references public.shortcuts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (shortcut_id, user_id)
);

create index shortcut_user_grants_user_id_idx on public.shortcut_user_grants(user_id);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  kind public.content_kind not null,
  scope public.content_scope not null default 'PERSONAL',
  visibility public.portal_visibility not null default 'PRIVATE',
  title text not null check (char_length(title) between 1 and 200),
  description text,
  external_url text check (external_url is null or char_length(external_url) <= 2048),
  storage_path text check (
    storage_path is null or (
      storage_path !~ '(^/|//|\.\.)'
      and split_part(storage_path, '/', 1) = owner_id::text
      and char_length(storage_path) <= 1024
    )
  ),
  mime_type text check (mime_type is null or char_length(mime_type) <= 150),
  file_size bigint check (file_size is null or file_size >= 0),
  thumbnail_url text check (thumbnail_url is null or char_length(thumbnail_url) <= 2048),
  active boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_location_required check (
    (kind in ('FILE', 'PHOTO') and num_nonnulls(storage_path, external_url) = 1)
    or (kind in ('LINK', 'VIDEO') and external_url is not null and storage_path is null)
  )
);

create index content_items_owner_id_idx on public.content_items(owner_id);
create index content_items_category_id_idx on public.content_items(category_id);
create index content_items_discovery_idx on public.content_items(active, scope, visibility, published_at desc);
create unique index content_items_storage_path_uidx on public.content_items(storage_path) where storage_path is not null;

create table public.content_role_grants (
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (content_item_id, role_id)
);

create index content_role_grants_role_id_idx on public.content_role_grants(role_id);

create table public.content_user_grants (
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (content_item_id, user_id)
);

create index content_user_grants_user_id_idx on public.content_user_grants(user_id);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 2 and 200),
  body text not null check (char_length(body) > 0),
  visibility public.portal_visibility not null default 'ALL',
  pinned boolean not null default false,
  active boolean not null default true,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > published_at)
);

create index announcements_feed_idx on public.announcements(active, pinned desc, published_at desc);
create index announcements_author_id_idx on public.announcements(author_id);

create table public.announcement_role_grants (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (announcement_id, role_id)
);

create index announcement_role_grants_role_id_idx on public.announcement_role_grants(role_id);

create table public.announcement_user_grants (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

create index announcement_user_grants_user_id_idx on public.announcement_user_grants(user_id);

create table public.trainings (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  title text not null check (char_length(title) between 2 and 200),
  description text,
  content_url text not null check (char_length(content_url) between 1 and 2048),
  thumbnail_url text check (thumbnail_url is null or char_length(thumbnail_url) <= 2048),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  visibility public.portal_visibility not null default 'ALL',
  active boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trainings_discovery_idx on public.trainings(active, published_at desc, title);
create index trainings_created_by_idx on public.trainings(created_by);
create index trainings_category_id_idx on public.trainings(category_id);

create table public.training_role_grants (
  training_id uuid not null references public.trainings(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (training_id, role_id)
);

create index training_role_grants_role_id_idx on public.training_role_grants(role_id);

create table public.training_user_grants (
  training_id uuid not null references public.trainings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (training_id, user_id)
);

create index training_user_grants_user_id_idx on public.training_user_grants(user_id);

create table public.training_progress (
  training_id uuid not null references public.trainings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.training_progress_status not null default 'NOT_STARTED',
  progress_percent numeric(5,2) not null default 0 check (progress_percent between 0 and 100),
  last_position_seconds integer not null default 0 check (last_position_seconds >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (training_id, user_id),
  check ((status = 'COMPLETED' and progress_percent = 100 and completed_at is not null) or status <> 'COMPLETED')
);

create index training_progress_user_id_idx on public.training_progress(user_id, updated_at desc);

insert into public.roles (code, name, description, is_system) values
  ('ADMIN', 'Administrador', 'Acesso administrativo completo ao Portal ARCA.', true),
  ('EQUIPE', 'Equipe', 'Colaboradores internos da ARCA.', true),
  ('PARCEIRO', 'Parceiro', 'Parceiros autorizados.', true),
  ('COMERCIAL', 'Comercial', 'Equipe comercial.', true),
  ('TECNICO', 'Tecnico', 'Equipe tecnica.', true);

insert into public.permissions (code, name, description, is_system) values
  ('profiles.manage', 'Gerenciar perfis', 'Visualizar e administrar perfis de usuarios.', true),
  ('roles.manage', 'Gerenciar papeis', 'Administrar papeis e permissoes.', true),
  ('categories.manage', 'Gerenciar categorias', 'Administrar categorias do portal.', true),
  ('shortcuts.manage', 'Gerenciar atalhos', 'Administrar atalhos e seus publicos.', true),
  ('content.manage', 'Gerenciar conteudo', 'Administrar biblioteca e conteudos de todos os usuarios.', true),
  ('announcements.manage', 'Gerenciar comunicados', 'Administrar comunicados e seus publicos.', true),
  ('trainings.manage', 'Gerenciar treinamentos', 'Administrar treinamentos e acompanhar progresso.', true);

insert into public.categories (name, slug, sort_order) values
  ('Documentos', 'documentos', 10),
  ('Links', 'links', 20),
  ('Videos', 'videos', 30),
  ('Fotos', 'fotos', 40),
  ('Treinamentos', 'treinamentos', 50),
  ('Materiais Comerciais', 'materiais-comerciais', 60),
  ('Clientes', 'clientes', 70),
  ('Outros', 'outros', 80);

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p where r.code = 'ADMIN';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'roles', 'permissions', 'profiles', 'role_permissions', 'user_permission_overrides',
    'categories', 'shortcuts', 'shortcut_role_grants', 'shortcut_user_grants',
    'content_items', 'content_role_grants', 'content_user_grants',
    'announcements', 'announcement_role_grants', 'announcement_user_grants',
    'trainings', 'training_role_grants', 'training_user_grants', 'training_progress'
  ] loop
    execute format(
      'create trigger set_%1$s_updated_at before update on public.%1$I for each row execute function public.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

create or replace function public.protect_system_catalog_rows()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.is_system then
    raise exception 'System catalog rows cannot be deleted';
  end if;
  if tg_op = 'UPDATE' and old.is_system and (new.code <> old.code or not new.is_system) then
    raise exception 'System catalog row code and system status are immutable';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger protect_system_roles
before update or delete on public.roles
for each row execute function public.protect_system_catalog_rows();

create trigger protect_system_permissions
before update or delete on public.permissions
for each row execute function public.protect_system_catalog_rows();

create or replace function public.handle_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  default_role_id uuid;
  supplied_name text;
begin
  select id into default_role_id from public.roles where code = 'EQUIPE';
  supplied_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');

  insert into public.profiles (id, role_id, full_name, email, company, phone, job_title)
  values (
    new.id,
    default_role_id,
    coalesce(supplied_name, split_part(new.email, '@', 1)),
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'company', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'job_title', '')), '')
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user();

create or replace function public.sync_auth_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function public.sync_auth_user_email();

create or replace function public.current_profile_active()
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.active
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid() and p.active and r.code = 'ADMIN'
  );
$$;

create or replace function public.has_permission(permission_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select coalesce((
    select case
      when r.code = 'ADMIN' then true
      when upo.allowed is not null then upo.allowed
      else rp.permission_id is not null
    end
    from public.profiles pr
    join public.roles r on r.id = pr.role_id
    join public.permissions pe on pe.code = permission_code
    left join public.user_permission_overrides upo
      on upo.user_id = pr.id and upo.permission_id = pe.id
    left join public.role_permissions rp
      on rp.role_id = pr.role_id and rp.permission_id = pe.id
    where pr.id = auth.uid() and pr.active
  ), false);
$$;

create or replace function public.protect_record_attribution()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'profiles' then
    if new.email <> old.email and current_user <> 'postgres' then
      raise exception 'Profile email must be changed through Supabase Auth';
    end if;
    if (new.created_at <> old.created_at or new.last_access_at is distinct from old.last_access_at)
      and current_user not in ('postgres', 'service_role', 'supabase_auth_admin') then
      raise exception 'Profile audit fields are server managed';
    end if;
    if (new.role_id <> old.role_id or new.active <> old.active)
      and current_user not in ('postgres', 'service_role', 'supabase_auth_admin')
      and not public.has_permission('profiles.manage') then
      raise exception 'Profile role and active status require profile management permission';
    end if;
  elsif tg_table_name = 'shortcuts' then
    if new.created_by <> old.created_by then raise exception 'Record attribution is immutable'; end if;
  elsif tg_table_name = 'content_items' then
    if new.owner_id <> old.owner_id then raise exception 'Record attribution is immutable'; end if;
  elsif tg_table_name = 'announcements' then
    if new.author_id <> old.author_id then raise exception 'Record attribution is immutable'; end if;
  elsif tg_table_name = 'trainings' then
    if new.created_by <> old.created_by then raise exception 'Record attribution is immutable'; end if;
  end if;
  return new;
end;
$$;

create trigger protect_profile_email before update on public.profiles
for each row execute function public.protect_record_attribution();
create trigger protect_shortcut_attribution before update on public.shortcuts
for each row execute function public.protect_record_attribution();
create trigger protect_content_attribution before update on public.content_items
for each row execute function public.protect_record_attribution();
create trigger protect_announcement_attribution before update on public.announcements
for each row execute function public.protect_record_attribution();
create trigger protect_training_attribution before update on public.trainings
for each row execute function public.protect_record_attribution();

create or replace function public.can_access_shortcut(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select public.current_profile_active() and exists (
    select 1
    from public.shortcuts s
    join public.profiles me on me.id = auth.uid()
    where s.id = target_id and (
      public.is_admin()
      or public.has_permission('shortcuts.manage')
      or (s.active and (
        s.visible_to_all
        or exists (select 1 from public.shortcut_role_grants g where g.shortcut_id = s.id and g.role_id = me.role_id)
        or exists (select 1 from public.shortcut_user_grants g where g.shortcut_id = s.id and g.user_id = me.id)
      ))
    )
  );
$$;

create or replace function public.can_access_content_item(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select public.current_profile_active() and exists (
    select 1
    from public.content_items c
    join public.profiles me on me.id = auth.uid()
    where c.id = target_id and (
      c.owner_id = me.id
      or public.is_admin()
      or public.has_permission('content.manage')
      or (c.active and (c.published_at is null or c.published_at <= now()) and (
        c.visibility = 'ALL'
        or (c.visibility = 'ROLE' and exists (
          select 1 from public.content_role_grants g where g.content_item_id = c.id and g.role_id = me.role_id
        ))
        or (c.visibility = 'USERS' and exists (
          select 1 from public.content_user_grants g where g.content_item_id = c.id and g.user_id = me.id
        ))
      ))
    )
  );
$$;

create or replace function public.can_access_announcement(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select public.current_profile_active() and exists (
    select 1
    from public.announcements a
    join public.profiles me on me.id = auth.uid()
    where a.id = target_id and (
      public.is_admin()
      or public.has_permission('announcements.manage')
      or (a.active and a.published_at <= now() and (a.expires_at is null or a.expires_at > now()) and (
        a.visibility = 'ALL'
        or (a.visibility = 'PRIVATE' and a.author_id = me.id)
        or (a.visibility = 'ROLE' and exists (
          select 1 from public.announcement_role_grants g where g.announcement_id = a.id and g.role_id = me.role_id
        ))
        or (a.visibility = 'USERS' and exists (
          select 1 from public.announcement_user_grants g where g.announcement_id = a.id and g.user_id = me.id
        ))
      ))
    )
  );
$$;

create or replace function public.can_access_training(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select public.current_profile_active() and exists (
    select 1
    from public.trainings t
    join public.profiles me on me.id = auth.uid()
    where t.id = target_id and (
      public.is_admin()
      or public.has_permission('trainings.manage')
      or (t.active and (t.published_at is null or t.published_at <= now()) and (
        t.visibility = 'ALL'
        or (t.visibility = 'PRIVATE' and t.created_by = me.id)
        or (t.visibility = 'ROLE' and exists (
          select 1 from public.training_role_grants g where g.training_id = t.id and g.role_id = me.role_id
        ))
        or (t.visibility = 'USERS' and exists (
          select 1 from public.training_user_grants g where g.training_id = t.id and g.user_id = me.id
        ))
      ))
    )
  );
$$;

create or replace function public.storage_path_owner(object_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then split_part(object_name, '/', 1)::uuid
    else null
  end;
$$;

create or replace function public.can_access_storage_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select public.current_profile_active() and (
    public.is_admin()
    or public.storage_path_owner(object_name) = auth.uid()
    or exists (
      select 1 from public.content_items c
      where c.storage_path = object_name and public.can_access_content_item(c.id)
    )
  );
$$;

create or replace function public.update_my_profile(
  p_full_name text,
  p_company text default null,
  p_phone text default null,
  p_job_title text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  result public.profiles;
begin
  if not public.current_profile_active() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  update public.profiles
  set full_name = trim(p_full_name),
      company = nullif(trim(p_company), ''),
      phone = nullif(trim(p_phone), ''),
      job_title = nullif(trim(p_job_title), '')
  where id = auth.uid()
  returning * into result;
  return result;
end;
$$;

create or replace function public.touch_last_access()
returns timestamptz
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  touched_at timestamptz := now();
begin
  update public.profiles set last_access_at = touched_at where id = auth.uid() and active;
  if not found then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return touched_at;
end;
$$;

create or replace function public.sharing_directory()
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select p.id, p.full_name
  from public.profiles p
  where public.current_profile_active() and p.active
  order by p.full_name, p.id;
$$;

revoke all on function public.current_profile_active() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.has_permission(text) from public, anon;
revoke all on function public.can_access_shortcut(uuid) from public, anon;
revoke all on function public.can_access_content_item(uuid) from public, anon;
revoke all on function public.can_access_announcement(uuid) from public, anon;
revoke all on function public.can_access_training(uuid) from public, anon;
revoke all on function public.storage_path_owner(text) from public, anon;
revoke all on function public.can_access_storage_object(text) from public, anon;
revoke all on function public.update_my_profile(text, text, text, text) from public, anon;
revoke all on function public.touch_last_access() from public, anon;
revoke all on function public.sharing_directory() from public, anon;
revoke all on function public.handle_auth_user() from public, anon, authenticated;
revoke all on function public.sync_auth_user_email() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.protect_system_catalog_rows() from public, anon, authenticated;
revoke all on function public.protect_record_attribution() from public, anon, authenticated;

grant execute on function public.current_profile_active() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.can_access_shortcut(uuid) to authenticated;
grant execute on function public.can_access_content_item(uuid) to authenticated;
grant execute on function public.can_access_announcement(uuid) to authenticated;
grant execute on function public.can_access_training(uuid) to authenticated;
grant execute on function public.storage_path_owner(text) to authenticated;
grant execute on function public.can_access_storage_object(text) to authenticated;
grant execute on function public.update_my_profile(text, text, text, text) to authenticated;
grant execute on function public.touch_last_access() to authenticated;
grant execute on function public.sharing_directory() to authenticated;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_permission_overrides enable row level security;
alter table public.categories enable row level security;
alter table public.shortcuts enable row level security;
alter table public.shortcut_role_grants enable row level security;
alter table public.shortcut_user_grants enable row level security;
alter table public.content_items enable row level security;
alter table public.content_role_grants enable row level security;
alter table public.content_user_grants enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_role_grants enable row level security;
alter table public.announcement_user_grants enable row level security;
alter table public.trainings enable row level security;
alter table public.training_role_grants enable row level security;
alter table public.training_user_grants enable row level security;
alter table public.training_progress enable row level security;

create policy roles_read on public.roles for select to authenticated
using (public.current_profile_active());
create policy roles_manage on public.roles for all to authenticated
using (public.has_permission('roles.manage')) with check (public.has_permission('roles.manage'));

create policy permissions_read on public.permissions for select to authenticated
using (public.current_profile_active());
create policy permissions_manage on public.permissions for all to authenticated
using (public.has_permission('roles.manage')) with check (public.has_permission('roles.manage'));

create policy profiles_read on public.profiles for select to authenticated
using (public.current_profile_active() and (id = auth.uid() or public.has_permission('profiles.manage')));
create policy profiles_manage on public.profiles for update to authenticated
using (public.has_permission('profiles.manage')) with check (public.has_permission('profiles.manage'));
create policy profiles_self_update on public.profiles for update to authenticated
using (public.current_profile_active() and id = auth.uid())
with check (id = auth.uid());

create policy role_permissions_read on public.role_permissions for select to authenticated
using (public.current_profile_active());
create policy role_permissions_manage on public.role_permissions for all to authenticated
using (public.has_permission('roles.manage')) with check (public.has_permission('roles.manage'));

create policy user_permission_overrides_read on public.user_permission_overrides for select to authenticated
using (public.current_profile_active() and (user_id = auth.uid() or public.has_permission('roles.manage')));
create policy user_permission_overrides_manage on public.user_permission_overrides for all to authenticated
using (public.has_permission('roles.manage')) with check (public.has_permission('roles.manage'));

create policy categories_read on public.categories for select to authenticated
using (public.current_profile_active() and (active or public.has_permission('categories.manage')));
create policy categories_manage on public.categories for all to authenticated
using (public.has_permission('categories.manage')) with check (public.has_permission('categories.manage'));

create policy shortcuts_read on public.shortcuts for select to authenticated
using (public.can_access_shortcut(id));
create policy shortcuts_insert on public.shortcuts for insert to authenticated
with check (public.has_permission('shortcuts.manage') and created_by = auth.uid());
create policy shortcuts_update on public.shortcuts for update to authenticated
using (public.has_permission('shortcuts.manage')) with check (public.has_permission('shortcuts.manage'));
create policy shortcuts_delete on public.shortcuts for delete to authenticated
using (public.has_permission('shortcuts.manage'));

create policy shortcut_role_grants_manage on public.shortcut_role_grants for all to authenticated
using (public.has_permission('shortcuts.manage')) with check (public.has_permission('shortcuts.manage'));
create policy shortcut_user_grants_manage on public.shortcut_user_grants for all to authenticated
using (public.has_permission('shortcuts.manage')) with check (public.has_permission('shortcuts.manage'));

create policy content_items_read on public.content_items for select to authenticated
using (public.can_access_content_item(id));
create policy content_items_insert on public.content_items for insert to authenticated
with check (
  public.current_profile_active() and owner_id = auth.uid()
  and (scope = 'PERSONAL' or public.has_permission('content.manage'))
);
create policy content_items_update on public.content_items for update to authenticated
using (public.has_permission('content.manage') or (owner_id = auth.uid() and scope = 'PERSONAL'))
with check (public.has_permission('content.manage') or (owner_id = auth.uid() and scope = 'PERSONAL'));
create policy content_items_delete on public.content_items for delete to authenticated
using (public.has_permission('content.manage') or (owner_id = auth.uid() and scope = 'PERSONAL'));

create policy content_role_grants_manage on public.content_role_grants for all to authenticated
using (public.has_permission('content.manage') or exists (
  select 1 from public.content_items c where c.id = content_item_id and c.owner_id = auth.uid() and c.scope = 'PERSONAL'
))
with check (public.has_permission('content.manage') or exists (
  select 1 from public.content_items c where c.id = content_item_id and c.owner_id = auth.uid() and c.scope = 'PERSONAL'
));
create policy content_user_grants_manage on public.content_user_grants for all to authenticated
using (public.has_permission('content.manage') or exists (
  select 1 from public.content_items c where c.id = content_item_id and c.owner_id = auth.uid() and c.scope = 'PERSONAL'
))
with check (public.has_permission('content.manage') or exists (
  select 1 from public.content_items c where c.id = content_item_id and c.owner_id = auth.uid() and c.scope = 'PERSONAL'
));

create policy announcements_read on public.announcements for select to authenticated
using (public.can_access_announcement(id));
create policy announcements_insert on public.announcements for insert to authenticated
with check (public.has_permission('announcements.manage') and author_id = auth.uid());
create policy announcements_update on public.announcements for update to authenticated
using (public.has_permission('announcements.manage')) with check (public.has_permission('announcements.manage'));
create policy announcements_delete on public.announcements for delete to authenticated
using (public.has_permission('announcements.manage'));
create policy announcement_role_grants_manage on public.announcement_role_grants for all to authenticated
using (public.has_permission('announcements.manage')) with check (public.has_permission('announcements.manage'));
create policy announcement_user_grants_manage on public.announcement_user_grants for all to authenticated
using (public.has_permission('announcements.manage')) with check (public.has_permission('announcements.manage'));

create policy trainings_read on public.trainings for select to authenticated
using (public.can_access_training(id));
create policy trainings_insert on public.trainings for insert to authenticated
with check (public.has_permission('trainings.manage') and created_by = auth.uid());
create policy trainings_update on public.trainings for update to authenticated
using (public.has_permission('trainings.manage')) with check (public.has_permission('trainings.manage'));
create policy trainings_delete on public.trainings for delete to authenticated
using (public.has_permission('trainings.manage'));
create policy training_role_grants_manage on public.training_role_grants for all to authenticated
using (public.has_permission('trainings.manage')) with check (public.has_permission('trainings.manage'));
create policy training_user_grants_manage on public.training_user_grants for all to authenticated
using (public.has_permission('trainings.manage')) with check (public.has_permission('trainings.manage'));

create policy training_progress_read on public.training_progress for select to authenticated
using (public.current_profile_active() and (user_id = auth.uid() or public.has_permission('trainings.manage')));
create policy training_progress_insert on public.training_progress for insert to authenticated
with check (public.current_profile_active() and user_id = auth.uid() and public.can_access_training(training_id));
create policy training_progress_update on public.training_progress for update to authenticated
using (public.current_profile_active() and user_id = auth.uid() and public.can_access_training(training_id))
with check (public.current_profile_active() and user_id = auth.uid() and public.can_access_training(training_id));
create policy training_progress_delete on public.training_progress for delete to authenticated
using (user_id = auth.uid() or public.has_permission('trainings.manage'));

revoke all on table public.roles, public.permissions, public.profiles, public.role_permissions,
  public.user_permission_overrides, public.categories, public.shortcuts, public.shortcut_role_grants,
  public.shortcut_user_grants, public.content_items, public.content_role_grants, public.content_user_grants,
  public.announcements, public.announcement_role_grants, public.announcement_user_grants,
  public.trainings, public.training_role_grants, public.training_user_grants, public.training_progress
from anon, authenticated;

grant select on table public.roles, public.permissions, public.profiles, public.role_permissions,
  public.user_permission_overrides, public.categories to authenticated;
grant update on table public.profiles to authenticated;
grant insert, update, delete on table public.roles, public.permissions, public.role_permissions,
  public.user_permission_overrides, public.categories to authenticated;
grant select, insert, update, delete on table public.shortcuts, public.shortcut_role_grants,
  public.shortcut_user_grants, public.content_items, public.content_role_grants, public.content_user_grants,
  public.announcements, public.announcement_role_grants, public.announcement_user_grants,
  public.trainings, public.training_role_grants, public.training_user_grants, public.training_progress
to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('portal-files', 'portal-files', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy portal_files_read
on storage.objects for select to authenticated
using (bucket_id = 'portal-files' and public.can_access_storage_object(name));

create policy portal_files_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'portal-files'
  and public.current_profile_active()
  and public.storage_path_owner(name) is not null
  and exists (select 1 from public.profiles p where p.id = public.storage_path_owner(name))
  and (public.storage_path_owner(name) = auth.uid() or public.is_admin())
);

create policy portal_files_update
on storage.objects for update to authenticated
using (
  bucket_id = 'portal-files' and public.current_profile_active() and (
    public.is_admin()
    or public.storage_path_owner(name) = auth.uid()
  )
)
with check (
  bucket_id = 'portal-files'
  and public.storage_path_owner(name) is not null
  and exists (select 1 from public.profiles p where p.id = public.storage_path_owner(name))
  and (public.storage_path_owner(name) = auth.uid() or public.is_admin())
);

create policy portal_files_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'portal-files' and public.current_profile_active() and (
    public.is_admin()
    or public.storage_path_owner(name) = auth.uid()
  )
);

comment on table public.content_items is 'Unified library and personal files, links, videos and photos.';
comment on column public.content_items.storage_path is 'Path inside private portal-files bucket; first segment must be owner UUID.';
comment on table public.training_progress is 'Progress model reserved for current and future training experiences.';
