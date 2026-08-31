import { LogIn, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { SubscriptionBadge } from "./SubscriptionBadge";

export function AuthHeader() {
  const { t, lang } = useI18n();
  const ar = lang === "ar";
  const [session, setSession] = useState<unknown | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      } catch {
        setSession(null);
      } finally {
        setChecking(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <Button variant="ghost" size="sm" className="rounded-full text-xs" disabled>
        <User className="me-1 size-3.5" /> {ar ? "جارٍ التحقق..." : "Checking..."}
      </Button>
    );
  }

  if (!session) {
    return (
      <Button asChild variant="outline" size="sm" className="rounded-full text-xs">
        <Link to="/auth">
          <LogIn className="me-1 size-3.5" />
          {ar ? "تسجيل الدخول" : "Sign in"}
        </Link>
      </Button>
    );
  }

  return <SubscriptionBadge />;
}
