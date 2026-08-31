import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Home, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تغيير كلمة المرور — مولّد الدروس الذكي" },
      { name: "description", content: "اختر كلمة مرور جديدة لحسابك في مولّد الدروس الذكي." },
      { property: "og:title", content: "تغيير كلمة المرور — مولّد الدروس الذكي" },
      { property: "og:description", content: "اختر كلمة مرور جديدة لحسابك في مولّد الدروس الذكي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // The recovery link delivers a session (via hash or code exchange).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error(ar ? "كلمة المرور ٦ أحرف على الأقل." : "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error(ar ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success(ar ? "تم تغيير كلمة المرور!" : "Password updated!");
      navigate({ to: "/" });
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      toast.error(
        /weak|pwned/i.test(raw)
          ? ar
            ? "كلمة المرور ضعيفة أو مسرّبة، اختر كلمة مرور أقوى."
            : "Password is too weak or leaked."
          : /session|expired|invalid/i.test(raw)
            ? ar
              ? "انتهت صلاحية الرابط. اطلب رابطًا جديدًا من صفحة الدخول."
              : "The link expired. Request a new one from the sign-in page."
            : raw || (ar ? "تعذّر تغيير كلمة المرور" : "Could not update the password"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="blob-bg flex min-h-screen items-center justify-center bg-background p-4">
      <Toaster position="top-center" />
      <Card
        className="w-full max-w-md rounded-3xl border-border/70 p-6 shadow-[var(--shadow-lift)] sm:p-8"
        dir={ar ? "rtl" : "ltr"}
      >
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Home className="size-3.5" />
          {ar ? "الرئيسية" : "Home"}
        </Link>

        <h1 className="mt-4 text-center font-display text-2xl font-extrabold text-primary">
          {ar ? "كلمة مرور جديدة" : "New password"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {ready
            ? ar
              ? "اكتب كلمة المرور الجديدة لحسابك."
              : "Choose a new password for your account."
            : ar
              ? "افتح هذه الصفحة من الرابط الموجود في بريدك."
              : "Open this page from the link in your email."}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">{ar ? "كلمة المرور الجديدة" : "New password"}</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl ltr:pl-10 rtl:pr-10"
                minLength={6}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">{ar ? "تأكيد كلمة المرور" : "Confirm password"}</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
              <Input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="rounded-xl ltr:pl-10 rtl:pr-10"
                minLength={6}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full rounded-full gradient-hero text-primary-foreground"
            disabled={saving || !ready}
          >
            {saving ? (ar ? "جارٍ الحفظ…" : "Saving…") : ar ? "حفظ كلمة المرور" : "Save password"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/auth" className="text-sm font-medium text-primary hover:underline">
            {ar ? "العودة لتسجيل الدخول" : "Back to sign in"}
          </Link>
        </div>
      </Card>
    </main>
  );
}
