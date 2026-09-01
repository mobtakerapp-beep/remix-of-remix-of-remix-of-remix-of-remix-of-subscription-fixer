import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ADMIN_EMAILS = ["uuxz272@gmail.com"];
const ADMIN_RECOVERY_CODE = "UUXZ@272";

const signUpSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  teacherName: z.string().trim().max(120).optional().default(""),
  school: z.string().trim().max(120).optional().default(""),
});

export type SignUpResult =
  | { ok: true }
  | { ok: false; code: "email_exists" | "weak_password" | "invalid" | "failed"; message: string };

/**
 * Creates the account server-side with the email already confirmed, so users
 * never have to open a confirmation email. The client signs in right after.
 */
export const signUpDirect = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => signUpSchema.parse(input))
  .handler(async ({ data }): Promise<SignUpResult> => {
    let supabaseAdmin;
    try {
      ({ supabaseAdmin } = await import("@/integrations/supabase/client.server"));
    } catch (e) {
      console.error("[signUpDirect] admin client unavailable", e);
      return {
        ok: false,
        code: "failed",
        message: "تعذّر إنشاء الحساب مباشرة. يجب إيقاف تأكيد البريد من إعدادات الحساب.",
      };
    }

    let error: { message?: string } | null = null;
    let created: { user?: { id?: string } | null } | null = null;
    try {
      ({ data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          teacher_name: data.teacherName,
          school: data.school,
        },
      }));
      const newId = created?.user?.id;
      if (!error && newId && ADMIN_EMAILS.includes(data.email.trim().toLowerCase())) {
        await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: newId, role: "admin" });
      }
    } catch (e) {
      console.error("[signUpDirect] admin call failed", e);
      return {
        ok: false,
        code: "failed",
        message: "تعذّر حفظ الحساب مباشرة. من فضلك أوقف تأكيد البريد من إعدادات تسجيل الدخول.",
      };
    }

    if (!error) return { ok: true };

    const msg = (error.message || "").toLowerCase();
    if (msg.includes("already been registered") || msg.includes("already registered") || msg.includes("exists")) {
      return {
        ok: false,
        code: "email_exists",
        message: "هذا البريد مسجّل بالفعل. سجّل دخولك بدلاً من إنشاء حساب.",
      };
    }
    if (msg.includes("weak") || msg.includes("pwned") || msg.includes("password")) {
      return {
        ok: false,
        code: "weak_password",
        message: "كلمة المرور ضعيفة أو مسرّبة. اختر كلمة مرور أقوى (٨ أحرف مع أرقام ورموز).",
      };
    }
    console.error("[signUpDirect]", error);
    return { ok: false, code: "failed", message: "تعذّر إنشاء الحساب، حاول مرة أخرى." };
  });

const emailSchema = z.object({ email: z.string().trim().email().max(255) });

const resetWithCodeSchema = z.object({
  email: z.string().trim().email().max(255),
  code: z.string().trim().min(4).max(64),
  password: z.string().min(6).max(72),
});

export type ResetWithCodeResult =
  | { ok: true }
  | { ok: false; code: "no_account" | "bad_code" | "failed" };

/**
 * In-app password reset: no email is involved. The user proves ownership with
 * an activation code (serial) that was previously redeemed on their account,
 * then chooses a new password.
 */
export const resetPasswordWithCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => resetWithCodeSchema.parse(input))
  .handler(async ({ data }): Promise<ResetWithCodeResult> => {
    let supabaseAdmin;
    try {
      ({ supabaseAdmin } = await import("@/integrations/supabase/client.server"));
    } catch (e) {
      console.error("[resetPasswordWithCode] admin client unavailable", e);
      return { ok: false, code: "failed" };
    }

    const normalizedEmail = data.email.toLowerCase();
    const serial = data.code.trim().toUpperCase();
    const isAdminRecovery = ADMIN_EMAILS.includes(normalizedEmail) && serial === ADMIN_RECOVERY_CODE;

    // Find the account. If the fixed admin account was lost during a backend
    // reset, recreate it using the new password entered in the recovery form.
    let target: { id: string } | undefined;
    try {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (error) throw error;
      target = list.users.find(
        (u) => (u.email ?? "").toLowerCase() === normalizedEmail,
      );
      if (!target && isAdminRecovery) {
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password: data.password,
          email_confirm: true,
        });
        if (createError) throw createError;
        if (created.user) target = { id: created.user.id };
      }
    } catch (e) {
      console.error("[resetPasswordWithCode] listUsers failed", e);
      return { ok: false, code: "failed" };
    }
    if (!target) return { ok: false, code: "no_account" };

    // Verify the serial was redeemed by this account.
    const { data: codeRow } = await supabaseAdmin
      .from("activation_codes")
      .select("id")
      .eq("code", serial)
      .maybeSingle();
    if (!codeRow) return { ok: false, code: "bad_code" };

    const { data: redemption } = await supabaseAdmin
      .from("code_redemptions")
      .select("id")
      .eq("code_id", codeRow.id)
      .eq("user_id", target.id)
      .maybeSingle();
    if (!redemption && !isAdminRecovery) return { ok: false, code: "bad_code" };

    if (isAdminRecovery) {
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: target.id, role: "admin" }, { onConflict: "user_id,role" });
      if (roleError) {
        console.error("[resetPasswordWithCode] admin role failed", roleError);
        return { ok: false, code: "failed" };
      }

      if (!redemption) {
        const { error: redemptionError } = await supabaseAdmin
          .from("code_redemptions")
          .insert({ code_id: codeRow.id, user_id: target.id });
        if (redemptionError) {
          console.error("[resetPasswordWithCode] admin serial link failed", redemptionError);
          return { ok: false, code: "failed" };
        }
      }
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      target.id,
      { password: data.password },
    );
    if (updateError) {
      console.error("[resetPasswordWithCode] update failed", updateError);
      return { ok: false, code: "failed" };
    }
    return { ok: true };
  });

/**
 * Marks an existing account's email as confirmed. Used to unblock accounts
 * that were created before confirmation was turned off.
 */
export const confirmExistingEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => emailSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    let supabaseAdmin;
    try {
      ({ supabaseAdmin } = await import("@/integrations/supabase/client.server"));
    } catch (e) {
      console.error("[confirmExistingEmail] admin client unavailable", e);
      return { ok: false };
    }

    let list: { users: { id: string; email?: string | null; email_confirmed_at?: string | null }[] };
    let listError: unknown = null;
    try {
      ({ data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      }));
    } catch (e) {
      console.error("[confirmExistingEmail] admin call failed", e);
      return { ok: false };
    }
    if (listError) {
      console.error("[confirmExistingEmail] list", listError);
      return { ok: false };
    }

    const target = list.users.find(
      (u) => (u.email ?? "").toLowerCase() === data.email.toLowerCase(),
    );
    if (!target) return { ok: false };
    if (target.email_confirmed_at) return { ok: true };

    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(target.id, {
        email_confirm: true,
      });
      if (error) {
        console.error("[confirmExistingEmail] update", error);
        return { ok: false };
      }
    } catch (e) {
      console.error("[confirmExistingEmail] update failed", e);
      return { ok: false };
    }
    return { ok: true };
  });
