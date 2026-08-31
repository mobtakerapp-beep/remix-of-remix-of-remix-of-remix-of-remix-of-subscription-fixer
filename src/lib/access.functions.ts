import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CodeRow = {
  id: string;
  code: string;
  plan: string;
  durationDays: number;
  maxUses: number;
  usedCount: number;
  note: string | null;
  active: boolean;
  createdAt: string;
};

const ADMIN_EMAIL = "uuxz272@gmail.com";

function isConfiguredAdminEmail(email: unknown) {
  return typeof email === "string" && email.trim().toLowerCase() === ADMIN_EMAIL;
}

function getClaimEmail(claims: unknown) {
  if (!claims || typeof claims !== "object" || !("email" in claims)) return undefined;
  const email = (claims as { email?: unknown }).email;
  return typeof email === "string" ? email : undefined;
}

async function assertAdmin(userId: string, email?: unknown) {
  if (isConfiguredAdminEmail(email)) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (isConfiguredAdminEmail(getClaimEmail(context.claims))) {
      return { isAdmin: true };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: Boolean(data) };
  });

/** Redeem an activation code — binds the subscription to the signed-in account. */
export const redeemCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        code: z.string().min(4).max(64),
        device: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim().toUpperCase();

    const { data: row } = await supabaseAdmin
      .from("activation_codes")
      .select("*")
      .eq("code", code)
      .maybeSingle();

    if (!row || !row.active) return { ok: false as const, reason: "invalid" };
    if (row.expires_at && new Date(row.expires_at) < new Date())
      return { ok: false as const, reason: "expired" };

    const { data: mine } = await supabaseAdmin
      .from("code_redemptions")
      .select("id")
      .eq("code_id", row.id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!mine && (row.used_count ?? 0) >= row.max_uses)
      return { ok: false as const, reason: "used_up" };

    if (!mine) {
      await supabaseAdmin.from("code_redemptions").insert({
        code_id: row.id,
        user_id: context.userId,
        device_fingerprint: data.device ?? null,
      });
      await supabaseAdmin
        .from("activation_codes")
        .update({ used_count: (row.used_count ?? 0) + 1 })
        .eq("id", row.id);
    }

    const expires = new Date();
    expires.setDate(expires.getDate() + (row.duration_days ?? 30));

    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();

    const payload = {
      user_id: context.userId,
      plan: row.plan,
      status: "active",
      expires_at: expires.toISOString(),
      generations_used: 0,
      reset_at: new Date().toISOString(),
    };

    if (existing) {
      await supabaseAdmin.from("subscriptions").update(payload).eq("user_id", context.userId);
    } else {
      await supabaseAdmin.from("subscriptions").insert(payload);
    }

    return { ok: true as const, plan: row.plan, expiresAt: expires.toISOString() };
  });

export const adminListCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CodeRow[]> => {
    await assertAdmin(context.userId, getClaimEmail(context.claims));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("activation_codes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return (data ?? []).map((r) => ({
      id: r.id,
      code: r.code,
      plan: r.plan,
      durationDays: r.duration_days,
      maxUses: r.max_uses,
      usedCount: r.used_count,
      note: r.note,
      active: r.active,
      createdAt: r.created_at,
    }));
  });

export const adminCreateCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        count: z.number().int().min(1).max(50),
        plan: z.enum(["monthly", "yearly"]),
        durationDays: z.number().int().min(1).max(3650),
        maxUses: z.number().int().min(1).max(1000),
        note: z.string().max(200).optional(),
        notes: z.array(z.string().max(200)).max(50).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, getClaimEmail(context.claims));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const gen = () => {
      const bytes = new Uint8Array(12);
      crypto.getRandomValues(bytes);
      const raw = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
      return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    };
    const rows = Array.from({ length: data.count }, (_unused, i) => ({
      code: gen(),
      plan: data.plan,
      duration_days: data.durationDays,
      max_uses: data.maxUses,
      note: data.notes?.[i]?.trim() || data.note?.trim() || null,
      created_by: context.userId,
    }));
    const { data: inserted } = await supabaseAdmin
      .from("activation_codes")
      .insert(rows)
      .select("code");
    return { codes: (inserted ?? []).map((r) => r.code) };
  });

export type RedemptionRow = {
  id: string;
  code: string;
  plan: string;
  note: string | null;
  userId: string;
  userEmail: string | null;
  device: string | null;
  redeemedAt: string;
  subscriptionExpiresAt: string | null;
};

/** Admin: list code redemptions with the subscriber's email and current expiry. */
export const adminListRedemptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RedemptionRow[]> => {
    await assertAdmin(context.userId, getClaimEmail(context.claims));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: redemptions } = await supabaseAdmin
      .from("code_redemptions")
      .select("id, user_id, device_fingerprint, created_at, activation_codes(code, plan, note)")
      .order("created_at", { ascending: false })
      .limit(300);

    const rows = redemptions ?? [];
    const userIds = [...new Set(rows.map((r) => r.user_id))];

    const emailById = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      for (const u of usersPage?.users ?? []) {
        if (u.email) emailById.set(u.id, u.email);
      }
    }

    const expiryById = new Map<string, string | null>();
    if (userIds.length > 0) {
      const { data: subs } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id, expires_at")
        .in("user_id", userIds);
      for (const s of subs ?? []) expiryById.set(s.user_id, s.expires_at);
    }

    return rows.map((r) => {
      const codeRow = Array.isArray(r.activation_codes)
        ? r.activation_codes[0]
        : r.activation_codes;
      return {
        id: r.id,
        code: codeRow?.code ?? "—",
        plan: codeRow?.plan ?? "—",
        note: codeRow?.note ?? null,
        userId: r.user_id,
        userEmail: emailById.get(r.user_id) ?? null,
        device: r.device_fingerprint,
        redeemedAt: r.created_at,
        subscriptionExpiresAt: expiryById.get(r.user_id) ?? null,
      };
    });
  });

export const adminSetCodeActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId, getClaimEmail(context.claims));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("activation_codes").update({ active: data.active }).eq("id", data.id);
    return { ok: true };
  });
