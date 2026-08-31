import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "إكمال تسجيل الدخول — مولّد الدروس الذكي" },
      { name: "description", content: "جارٍ إكمال تسجيل الدخول…" },
      { property: "og:title", content: "إكمال تسجيل الدخول — مولّد الدروس الذكي" },
      { property: "og:description", content: "جارٍ إكمال تسجيل الدخول إلى مولّد الدروس الذكي." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("جارٍ إكمال تسجيل الدخول…");

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        const url = new URL(window.location.href);
        const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error") ?? hash.get("error");
        const errorDescription =
          url.searchParams.get("error_description") ?? hash.get("error_description");

        if (error) {
          throw new Error(errorDescription || error);
        }

        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: setError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setError) throw setError;
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }

        // التأكد المباشر من مزامنة الجلسة وحفظ الـ Tokens
        const { data, error: userError } = await supabase.auth.getSession();
        if (userError || !data.session) {
          const { data: userData } = await supabase.auth.getUser();
          if (!userData.user) {
            throw userError ?? new Error("لم تكتمل جلسة تسجيل الدخول.");
          }
        }

        if (!cancelled) {
          toast.success("تم تسجيل الدخول بنجاح!");
          
          // تحويل مباشر وسليم لنفس الدومين الحالي دون تسريب التوكن أو تخريب الجلسة
          const origin = window.location.origin;
          window.location.replace(`${origin}/`);
        }
      } catch (err) {
        const text = err instanceof Error ? err.message : "فشل تسجيل الدخول";
        if (!cancelled) {
          setMessage(text);
          toast.error(text);
        }
      }
    }

    void handleCallback();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <Loader2 className="size-10 animate-spin text-primary" />
      <p className="text-lg font-medium text-foreground">{message}</p>
    </main>
  );
}
