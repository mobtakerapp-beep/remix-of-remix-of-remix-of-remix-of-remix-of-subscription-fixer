import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ADMIN_EMAILS = ["uuxz272@gmail.com"];

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
