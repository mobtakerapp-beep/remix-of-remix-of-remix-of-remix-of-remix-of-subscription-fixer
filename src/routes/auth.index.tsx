import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Home, Lock, Mail, School, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import partyImg from "@/assets/party.png";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

import { confirmExistingEmail, resetPasswordWithCode, signUpDirect } from "@/lib/auth.functions";
import { useI18n } from "@/lib/i18n";
import { saveProfile } from "@/lib/subscription.functions";

export const Route = createFileRoute("/auth/")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — مولّد الدروس الذكي" },
      { name: "description", content: "سجّل دخولك أو أنشئ حسابًا للوصول إلى مولّد الدروس الذكي." },
      { property: "og:title", content: "تسجيل الدخول — مولّد الدروس الذكي" },
      { property: "og:description", content: "سجّل دخولك أو أنشئ حسابًا للوصول إلى مولّد الدروس الذكي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const createAccount = useServerFn(signUpDirect);
  const confirmEmail = useServerFn(confirmExistingEmail);
  const saveProfileFn = useServerFn(saveProfile);
  const resetPasswordFn = useServerFn(resetPasswordWithCode);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(true);
  const [password, setPassword] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [school, setSchool] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const ar = lang === "ar";

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  // Remembered email (saved locally on the device).
  useEffect(() => {
    const saved = localStorage.getItem("remembered_email");
    if (saved) {
      setEmail(saved);
      setRemember(true);
    } else {
      setRemember(false);
    }
  }, []);

  const persistEmail = () => {
    if (remember) localStorage.setItem("remembered_email", email.trim());
    else localStorage.removeItem("remembered_email");
  };

  const sendReset = async () => {
    const target = email.trim();
    if (!target) {
      toast.error(ar ? "اكتب بريدك الإلكتروني أولاً." : "Enter your email first.");
      return;
    }
    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(target, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(
        ar
          ? "أرسلنا رابط تغيير كلمة المرور إلى بريدك. افحص صندوق الوارد (وملف السبام)."
          : "We sent a password reset link to your email. Check your inbox (and spam).",
      );
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      toast.error(
        /rate|limit/i.test(raw)
          ? ar
            ? "تم إرسال عدد كبير من الرسائل، حاول بعد قليل."
            : "Too many emails sent, try again shortly."
          : raw || (ar ? "تعذّر إرسال الرسالة" : "Could not send the email"),
      );
    } finally {
      setSendingReset(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        // Preferred path: create the user as confirmed on the server.
        let created: Awaited<ReturnType<typeof createAccount>>;
        try {
          created = await createAccount({
            data: {
              email: email.trim(),
              password,
              teacherName: teacherName.trim(),
              school: school.trim(),
            },
          });
        } catch {
          created = { ok: false, code: "failed", message: "" };
        }

        // If the server path isn't available on this deployment, fall back to a
        // normal signup (email confirmation is disabled on the backend).
        if (!created.ok && created.code === "failed") {
          const { error: signUpError } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/`,
              data: { teacher_name: teacherName.trim(), school: school.trim() },
            },
          });
          if (signUpError) throw signUpError;
        } else if (!created.ok) {
          throw new Error(created.message);
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        // Persist the teacher name / school on the profile right away.
        try {
          await saveProfileFn({
            data: { teacherName: teacherName.trim(), school: school.trim() },
          });
        } catch {
          // non-blocking
        }
        persistEmail();
        toast.success(ar ? "تم إنشاء الحساب وتسجيل الدخول!" : "Account created — you're signed in!");
        navigate({ to: "/" });
      } else {
        let { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        // Older accounts may still be flagged as unconfirmed: confirm them
        // server-side and retry once, so nobody is stuck on a confirmation email.
        if (error && /confirm/i.test(error.message)) {
          const fixed = await confirmEmail({ data: { email: email.trim() } });
          if (fixed.ok) {
            ({ error } = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            }));
          }
        }
        if (error) throw error;
        persistEmail();
        toast.success(ar ? "تم تسجيل الدخول!" : "Signed in!");
        navigate({ to: "/" });
      }
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      const friendly = /invalid login credentials/i.test(raw)
        ? ar
          ? "البريد أو كلمة المرور غير صحيحة."
          : "Invalid email or password."
        : /weak|pwned/i.test(raw)
          ? ar
            ? "كلمة المرور ضعيفة أو مسرّبة، اختر كلمة مرور أقوى."
            : "Password is too weak or leaked."
          : raw || (ar ? "تعذّر إتمام العملية" : "Authentication failed");
      toast.error(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="blob-bg flex min-h-screen items-center justify-center bg-background p-4">
      <Toaster position="top-center" />
      <Card className="w-full max-w-md rounded-3xl border-border/70 p-6 shadow-[var(--shadow-lift)] sm:p-8" dir={ar ? "rtl" : "ltr"}>
        <Link
          to="/"
          aria-label={ar ? "الرجوع للصفحة الرئيسية" : "Back to home"}
          title={ar ? "الرجوع للصفحة الرئيسية" : "Back to home"}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Home className="size-3.5" />
          {ar ? "الرئيسية" : "Home"}
        </Link>
        <div className="text-center">
          <img src={partyImg} alt="" className="mx-auto size-16 animate-bounce-slow" />
          <h1 className="mt-3 font-display text-2xl font-extrabold text-primary">
            {mode === "login" ? (ar ? "تسجيل الدخول" : "Sign in") : (ar ? "إنشاء حساب جديد" : "Create account")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ar ? "مولّد الدروس الذكي للمعلمين" : "Smart Lesson Generator for teachers"}
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="teacher">{t.teacherName}</Label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
                  <Input
                    id="teacher"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder={t.teacherPlaceholder}
                    className="rounded-xl ltr:pl-10 rtl:pr-10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="school">{ar ? "المدرسة" : "School"}</Label>
                <div className="relative">
                  <School className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
                  <Input
                    id="school"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder={ar ? "اسم المدرسة (اختياري)" : "School name (optional)"}
                    className="rounded-xl ltr:pl-10 rtl:pr-10"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">{ar ? "البريد الإلكتروني" : "Email"}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={ar ? "بريدك الإلكتروني" : "your@email.com"}
                className="rounded-xl ltr:pl-10 rtl:pr-10"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">{ar ? "كلمة المرور" : "Password"}</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={ar ? "كلمة المرور (٦ أحرف على الأقل)" : "Password (min 6 characters)"}
                className="rounded-xl ltr:pl-10 rtl:pr-10"
                required
                minLength={6}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4 accent-[hsl(var(--primary))]"
              />
              {ar ? "تذكّر بريدي" : "Remember my email"}
            </label>
            {mode === "login" && (
              <button
                type="button"
                onClick={() => void sendReset()}
                disabled={sendingReset}
                className="text-sm font-medium text-primary hover:underline disabled:opacity-60"
              >
                {sendingReset
                  ? (ar ? "جارٍ الإرسال…" : "Sending…")
                  : (ar ? "نسيت كلمة المرور؟" : "Forgot password?")}
              </button>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full rounded-full gradient-hero text-primary-foreground"
            disabled={loading}
          >
            {loading
              ? (ar ? "جارٍ المعالجة…" : "Processing…")
              : mode === "login"
                ? (ar ? "دخول" : "Sign in")
                : (ar ? "إنشاء الحساب" : "Sign up")}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login"
              ? (ar ? "ليس لديك حساب؟ أنشئ حسابًا" : "No account? Sign up")
              : (ar ? "لديك حساب؟ سجّل دخولك" : "Have an account? Sign in")}
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-amber/30 bg-amber/10 p-3 text-center text-xs text-amber-foreground">
          {ar
            ? "الحساب المجاني يتيح محاولة واحدة فقط. اشترك للحصول على وصول غير محدود."
            : "Free plan allows one generation only. Subscribe for unlimited access."}
        </div>
      </Card>
    </main>
  );
}
