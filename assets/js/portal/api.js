import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm';
import { isConfigured, PORTAL_CONFIG } from './config.js';
import { safeFileName, uuid } from './utils.js';

// Keep placeholder deployments renderable so the setup notice can be shown.
const clientUrl = isConfigured() ? PORTAL_CONFIG.supabaseUrl : 'https://portal-not-configured.supabase.co';
const clientKey = isConfigured() ? PORTAL_CONFIG.supabaseAnonKey : 'portal-not-configured-public-key';

export const supabase = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

function unwrap(result) {
  if (result.error) throw result.error;
  return result.data;
}

function grantError(message, cause) {
  const error = new Error(message);
  error.cause = cause;
  error.partialUpdate = true;
  return error;
}

export const authApi = {
  signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }).then(unwrap),
  signOut: () => supabase.auth.signOut({ scope: 'local' }).then(unwrap),
  resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${PORTAL_CONFIG.siteUrl}#recuperar-senha`,
  }).then(unwrap),
  updatePassword: (password) => supabase.auth.updateUser({ password }).then(unwrap),
  session: () => supabase.auth.getSession().then(unwrap),
};

export const portalApi = {
  async profile(userId) {
    return unwrap(await supabase.from('profiles')
      .select('*, role:roles(id,code,name)')
      .eq('id', userId).single());
  },

  async updateMyProfile(values) {
    const data = unwrap(await supabase.rpc('update_my_profile', {
      p_full_name: values.full_name,
      p_company: values.company || null,
      p_phone: values.phone || null,
      p_job_title: values.job_title || null,
    }));
    return Array.isArray(data) ? data[0] : data;
  },

  touchLastAccess: () => supabase.rpc('touch_last_access').then(unwrap),
  sharingDirectory: () => supabase.rpc('sharing_directory').then(unwrap),

  roles: () => supabase.from('roles').select('id,code,name').order('name').then(unwrap),
  profiles: () => supabase.from('profiles').select('id,full_name,email,company,phone,job_title,active,role_id,last_access_at,created_at,role:roles(id,code,name)').order('full_name').then(unwrap),
  permissions: () => supabase.from('permissions').select('id,code,name,description').order('name').then(unwrap),
  rolePermissions: () => supabase.from('role_permissions').select('role_id,permission_id').then(unwrap),
  permissionOverrides: () => supabase.from('user_permission_overrides').select('user_id,permission_id,allowed').then(unwrap),
  categories: (all = false) => {
    let query = supabase.from('categories').select('*').order('sort_order').order('name');
    if (!all) query = query.eq('active', true);
    return query.then(unwrap);
  },

  shortcuts: () => supabase.from('shortcuts').select('*').eq('active', true).order('sort_order').order('title').then(unwrap),
  allShortcuts: () => supabase.from('shortcuts').select('*').order('sort_order').order('title').then(unwrap),
  announcements: (all = false) => {
    let query = supabase.from('announcements').select('*').order('pinned', { ascending: false }).order('published_at', { ascending: false });
    if (!all) query = query.eq('active', true).lte('published_at', new Date().toISOString()).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
    return query.then(unwrap);
  },
  trainings: (all = false) => {
    let query = supabase.from('trainings').select('*, category:categories(id,name)').order('published_at', { ascending: false, nullsFirst: false }).order('title');
    if (!all) query = query.eq('active', true).or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`);
    return query.then(unwrap);
  },
  content: (all = false, scope = 'LIBRARY', ownerId = null) => {
    let query = supabase.from('content_items').select('*, category:categories(id,name), owner:profiles!owner_id(id,full_name)').order('published_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false });
    if (!all) query = query.eq('active', true).or(`published_at.is.null,published_at.lte.${new Date().toISOString()}`);
    if (scope) query = query.eq('scope', scope);
    if (ownerId) query = query.eq('owner_id', ownerId);
    return query.then(unwrap);
  },

  create(table, values) {
    return supabase.from(table).insert(values).select().single().then(unwrap);
  },
  update(table, id, values) {
    return supabase.from(table).update(values).eq('id', id).select().single().then(unwrap);
  },
  remove(table, id) {
    return supabase.from(table).delete().eq('id', id).then(unwrap);
  },

  async grants(roleTable, userTable, foreignKey, itemId) {
    const [roles, users] = await Promise.all([
      supabase.from(roleTable).select('role_id').eq(foreignKey, itemId).then(unwrap),
      supabase.from(userTable).select('user_id').eq(foreignKey, itemId).then(unwrap),
    ]);
    return { roleIds: roles.map((grant) => grant.role_id), userIds: users.map((grant) => grant.user_id) };
  },

  async syncGrants(roleTable, userTable, foreignKey, itemId, roleIds = [], userIds = []) {
    const current = await this.grants(roleTable, userTable, foreignKey, itemId);
    const desiredRoles = new Set(roleIds);
    const desiredUsers = new Set(userIds);
    const addRoles = roleIds.filter((id) => !current.roleIds.includes(id));
    const addUsers = userIds.filter((id) => !current.userIds.includes(id));
    const removeRoles = current.roleIds.filter((id) => !desiredRoles.has(id));
    const removeUsers = current.userIds.filter((id) => !desiredUsers.has(id));

    try {
      if (addRoles.length) unwrap(await supabase.from(roleTable).insert(addRoles.map((roleId) => ({ [foreignKey]: itemId, role_id: roleId }))));
      if (addUsers.length) unwrap(await supabase.from(userTable).insert(addUsers.map((userId) => ({ [foreignKey]: itemId, user_id: userId }))));
      if (removeRoles.length) unwrap(await supabase.from(roleTable).delete().eq(foreignKey, itemId).in('role_id', removeRoles));
      if (removeUsers.length) unwrap(await supabase.from(userTable).delete().eq(foreignKey, itemId).in('user_id', removeUsers));
    } catch (error) {
      throw grantError('O registro foi salvo, mas nao foi possivel concluir todos os compartilhamentos. Revise os destinatarios e tente novamente.', error);
    }
  },

  async savePermissionOverrides(userId, selections, currentOverrides = []) {
    const current = new Map(currentOverrides.map((item) => [item.permission_id, item.allowed]));
    const upserts = [];
    const removals = [];
    for (const [permissionId, mode] of Object.entries(selections)) {
      if (mode === 'inherit') {
        if (current.has(permissionId)) removals.push(permissionId);
      } else {
        const allowed = mode === 'allow';
        if (current.get(permissionId) !== allowed) upserts.push({ user_id: userId, permission_id: permissionId, allowed });
      }
    }
    try {
      if (upserts.length) unwrap(await supabase.from('user_permission_overrides').upsert(upserts, { onConflict: 'user_id,permission_id' }));
      if (removals.length) unwrap(await supabase.from('user_permission_overrides').delete().eq('user_id', userId).in('permission_id', removals));
    } catch (error) {
      throw grantError('Os dados do usuario foram salvos, mas algumas substituicoes de permissao nao foram aplicadas. Abra o usuario e revise as permissoes.', error);
    }
  },

  async saveContent({ values, file, roleIds, userIds, contentId, oldStoragePath }) {
    let uploadedPath = oldStoragePath || null;
    let persisted = false;
    if (file?.size) {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      uploadedPath = `${authData.user.id}/${uuid()}/${safeFileName(file.name)}`;
      unwrap(await supabase.storage.from(PORTAL_CONFIG.storageBucket).upload(uploadedPath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      }));
      Object.assign(values, {
        storage_path: uploadedPath,
        external_url: null,
        mime_type: file.type || null,
        file_size: file.size,
      });
    }

    let item;
    try {
      item = contentId
        ? await this.update('content_items', contentId, values)
        : await this.create('content_items', values);
      persisted = true;
    } catch (error) {
      if (file?.size && uploadedPath) await supabase.storage.from(PORTAL_CONFIG.storageBucket).remove([uploadedPath]);
      throw error;
    }

    try {
      await this.syncGrants('content_role_grants', 'content_user_grants', 'content_item_id', item.id, roleIds, userIds);
    } catch (error) {
      if (!persisted && file?.size && uploadedPath) await supabase.storage.from(PORTAL_CONFIG.storageBucket).remove([uploadedPath]);
      throw error;
    }

    if (file?.size && oldStoragePath && oldStoragePath !== uploadedPath) {
      const cleanup = await supabase.storage.from(PORTAL_CONFIG.storageBucket).remove([oldStoragePath]);
      if (cleanup.error) throw grantError('O conteudo foi salvo, mas o arquivo anterior nao pode ser removido do armazenamento.', cleanup.error);
    }
    if (!file?.size && ['LINK', 'VIDEO'].includes(values.kind) && oldStoragePath) {
      const cleanup = await supabase.storage.from(PORTAL_CONFIG.storageBucket).remove([oldStoragePath]);
      if (cleanup.error) throw grantError('O conteudo foi salvo, mas o arquivo anterior nao pode ser removido do armazenamento.', cleanup.error);
    }
    return item;
  },

  async deleteContent(item) {
    unwrap(await supabase.from('content_items').delete().eq('id', item.id));
    if (item.storage_path) {
      const result = await supabase.storage.from(PORTAL_CONFIG.storageBucket).remove([item.storage_path]);
      if (result.error) throw grantError('O registro foi excluido, mas o arquivo nao pode ser removido do armazenamento.', result.error);
    }
  },

  async contentUrl(item) {
    if (item.external_url) return item.external_url;
    if (!item.storage_path) throw new Error('Arquivo indisponivel.');
    const result = await supabase.storage.from(PORTAL_CONFIG.storageBucket).createSignedUrl(item.storage_path, 300);
    return unwrap(result).signedUrl;
  },

  manageUser(payload) {
    return supabase.functions.invoke('manage-user', { body: payload }).then(unwrap);
  },

  dashboard() {
    return Promise.all([
      this.shortcuts(), this.announcements(), this.content(), this.trainings(),
    ]).then(([shortcuts, announcements, content, trainings]) => ({ shortcuts, announcements, content, trainings }));
  },

  async adminData() {
    const [profiles, roles, permissions, rolePermissions, permissionOverrides, shortcuts, categories, announcements, trainings, content] = await Promise.all([
      this.profiles(), this.roles(), this.permissions(), this.rolePermissions(), this.permissionOverrides(),
      this.allShortcuts(), this.categories(true), this.announcements(true), this.trainings(true), this.content(true, null),
    ]);
    return { profiles, roles, permissions, rolePermissions, permissionOverrides, shortcuts, categories, announcements, trainings, content };
  },
};
