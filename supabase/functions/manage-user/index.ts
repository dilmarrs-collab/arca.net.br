import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

type Action =
  | "invite"
  | "update"
  | "reactivate"
  | "deactivate"
  | "resend_reset";

interface RequestBody {
  action?: Action;
  email?: string;
  targetUserId?: string;
  fullName?: string;
  company?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  roleCode?: string;
  redirectTo?: string;
  active?: boolean;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const allowedOrigins = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !allowedOrigins.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers":
      "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function response(
  origin: string | null,
  status: number,
  body: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(value);
}

function optionalText(
  value: unknown,
  max: number,
): value is string | undefined {
  return value === undefined ||
    (typeof value === "string" && value.trim().length > 0 &&
      value.trim().length <= max);
}

function optionalNullableText(
  value: unknown,
  max: number,
): value is string | null | undefined {
  return value === undefined || value === null ||
    (typeof value === "string" && value.trim().length <= max);
}

function validRoleCode(value: unknown): value is string {
  return typeof value === "string" &&
    /^[A-Z][A-Z0-9_]{1,49}$/.test(value);
}

function hasOnlyKeys(body: RequestBody, allowed: string[]): boolean {
  const allowedKeys = new Set(["action", ...allowed]);
  return Object.keys(body).every((key) => allowedKeys.has(key));
}

function normalizedNullable(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.trim() || null;
}

function validRedirect(value: unknown): value is string | undefined {
  if (value === undefined) return true;
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.hostname === "localhost" ||
      url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

Deno.serve(async (request: Request): Promise<Response> => {
  const origin = request.headers.get("Origin");
  if (origin && !allowedOrigins.has(origin)) {
    return response(null, 403, { error: "Origin not allowed" });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return response(origin, 405, { error: "Method not allowed" });
  }
  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (!Number.isFinite(contentLength) || contentLength > 16_384) {
    return response(origin, 413, { error: "Invalid request" });
  }
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    console.error("Missing required Supabase environment variables");
    return response(origin, 500, { error: "Service unavailable" });
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return response(origin, 401, { error: "Unauthorized" });

  const verifier = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await verifier.auth.getUser(
    match[1],
  );
  if (authError || !authData.user) {
    return response(origin, 401, { error: "Unauthorized" });
  }

  const { data: caller, error: callerError } = await admin
    .from("profiles")
    .select("active, roles!inner(code)")
    .eq("id", authData.user.id)
    .maybeSingle();
  const callerRole = caller?.roles as unknown as { code?: string } | null;
  if (callerError || !caller?.active || callerRole?.code !== "ADMIN") {
    return response(origin, 403, { error: "Forbidden" });
  }

  let body: RequestBody;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return response(origin, 400, { error: "Invalid request" });
    }
    body = parsed as RequestBody;
  } catch {
    return response(origin, 400, { error: "Invalid request" });
  }

  const action = body.action;
  if (
    !action ||
    !["invite", "update", "reactivate", "deactivate", "resend_reset"]
      .includes(action)
  ) {
    return response(origin, 400, { error: "Invalid request" });
  }

  try {
    if (action === "invite") {
      if (
        !hasOnlyKeys(body, [
          "email",
          "fullName",
          "company",
          "phone",
          "jobTitle",
          "roleCode",
          "redirectTo",
        ]) ||
        !validEmail(body.email) || !optionalText(body.fullName, 150) ||
        !optionalNullableText(body.company, 150) ||
        !optionalNullableText(body.phone, 30) ||
        !optionalNullableText(body.jobTitle, 120) ||
        !validRoleCode(body.roleCode) ||
        !validRedirect(body.redirectTo)
      ) return response(origin, 400, { error: "Invalid request" });

      const { data: role } = await admin.from("roles").select("id").eq(
        "code",
        body.roleCode,
      ).maybeSingle();
      if (!role) return response(origin, 400, { error: "Invalid request" });

      const email = body.email.trim().toLowerCase();
      const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: body.redirectTo,
          data: {
            full_name: body.fullName?.trim(),
            company: normalizedNullable(body.company),
            phone: normalizedNullable(body.phone),
            job_title: normalizedNullable(body.jobTitle),
          },
        },
      );

      // Return the same result for existing and newly invited accounts.
      if (!error && invited.user) {
        const { error: profileError } = await admin
          .from("profiles")
          .update({ role_id: role.id })
          .eq("id", invited.user.id);
        if (profileError) {
          console.error(
            "Failed to assign invited user role",
            profileError.message,
          );
          await admin.auth.admin.deleteUser(invited.user.id);
          return response(origin, 500, { error: "Service unavailable" });
        }
      } else if (error) {
        console.warn("Invite was not dispatched", error.message);
      }
      return response(origin, 202, { accepted: true });
    }

    if (action === "resend_reset") {
      if (
        !hasOnlyKeys(body, ["email", "redirectTo"]) ||
        !validEmail(body.email) || !validRedirect(body.redirectTo)
      ) {
        return response(origin, 400, { error: "Invalid request" });
      }
      const { error } = await admin.auth.resetPasswordForEmail(
        body.email.trim().toLowerCase(),
        {
          redirectTo: body.redirectTo,
        },
      );
      if (error) {
        console.warn("Password reset was not dispatched", error.message);
      }
      return response(origin, 202, { accepted: true });
    }

    if (action === "update") {
      if (
        !hasOnlyKeys(body, [
          "targetUserId",
          "fullName",
          "company",
          "phone",
          "jobTitle",
          "roleCode",
          "active",
        ]) ||
        !validUuid(body.targetUserId) ||
        !optionalText(body.fullName, 150) ||
        !optionalNullableText(body.company, 150) ||
        !optionalNullableText(body.phone, 30) ||
        !optionalNullableText(body.jobTitle, 120) ||
        (body.roleCode !== undefined && !validRoleCode(body.roleCode)) ||
        (body.active !== undefined && typeof body.active !== "boolean") ||
        !["fullName", "company", "phone", "jobTitle", "roleCode", "active"]
          .some((key) => Object.hasOwn(body, key))
      ) return response(origin, 400, { error: "Invalid request" });

      const updatingSelf = body.targetUserId === authData.user.id;
      if (
        updatingSelf &&
        (body.active === false ||
          (body.roleCode !== undefined && body.roleCode !== "ADMIN"))
      ) return response(origin, 400, { error: "Invalid request" });

      let roleId: string | undefined;
      if (body.roleCode !== undefined) {
        const { data: role } = await admin.from("roles").select("id").eq(
          "code",
          body.roleCode,
        ).maybeSingle();
        if (!role) return response(origin, 400, { error: "Invalid request" });
        roleId = role.id;
      }

      const { data: target, error: targetError } = await admin
        .from("profiles")
        .select("active")
        .eq("id", body.targetUserId)
        .maybeSingle();
      if (targetError || !target) {
        if (targetError) console.warn("Target profile lookup failed");
        return response(origin, 202, { accepted: true });
      }

      const profileUpdates: Record<string, string | boolean | null> = {};
      if (body.fullName !== undefined) {
        profileUpdates.full_name = body.fullName.trim();
      }
      if (Object.hasOwn(body, "company")) {
        profileUpdates.company = normalizedNullable(body.company);
      }
      if (Object.hasOwn(body, "phone")) {
        profileUpdates.phone = normalizedNullable(body.phone);
      }
      if (Object.hasOwn(body, "jobTitle")) {
        profileUpdates.job_title = normalizedNullable(body.jobTitle);
      }
      if (roleId) profileUpdates.role_id = roleId;
      if (body.active !== undefined) profileUpdates.active = body.active;

      if (body.active !== undefined) {
        const { error: statusError } = await admin.auth.admin.updateUserById(
          body.targetUserId,
          { ban_duration: body.active ? "none" : "876000h" },
        );
        if (statusError) {
          console.warn("Target Auth status update failed", statusError.message);
          return response(origin, 500, { error: "Service unavailable" });
        }
      }

      const { data: updatedProfile, error: profileError } = await admin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", body.targetUserId)
        .select("id")
        .maybeSingle();
      if (profileError || !updatedProfile) {
        if (body.active !== undefined) {
          await admin.auth.admin.updateUserById(body.targetUserId, {
            ban_duration: target.active ? "none" : "876000h",
          });
        }
        console.error(
          "Target profile update failed",
          profileError?.message ?? "Profile disappeared during update",
        );
        return response(origin, 500, { error: "Service unavailable" });
      }
      return response(origin, 202, { accepted: true });
    }

    if (
      !hasOnlyKeys(body, ["targetUserId"]) ||
      !validUuid(body.targetUserId) || body.targetUserId === authData.user.id
    ) {
      return response(origin, 400, { error: "Invalid request" });
    }

    const active = action === "reactivate";
    const { error: userError } = await admin.auth.admin.updateUserById(
      body.targetUserId,
      {
        ban_duration: active ? "none" : "876000h",
      },
    );
    if (userError) {
      console.warn(
        "User status action was not applied",
        userError.message,
      );
      return response(origin, 202, { accepted: true });
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({ active })
      .eq("id", body.targetUserId);
    if (profileError) {
      await admin.auth.admin.updateUserById(body.targetUserId, {
        ban_duration: active ? "876000h" : "none",
      });
      console.warn("User profile status was not applied", profileError.message);
      return response(origin, 500, { error: "Service unavailable" });
    }
    return response(origin, 202, { accepted: true });
  } catch (error) {
    console.error("manage-user failed", error);
    return response(origin, 500, { error: "Service unavailable" });
  }
});
