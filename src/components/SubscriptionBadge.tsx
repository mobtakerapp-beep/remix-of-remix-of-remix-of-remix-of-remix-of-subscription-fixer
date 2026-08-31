import { BookOpen, Crown, Home, LogOut, Shield, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { getMySubscription, saveProfile, type SubscriptionStatus } from "@/lib/subscription.functions";
import { amIAdmin } from "@/lib/access.functions";
import { setIsPremium } from "@/lib/premium-flag";


export function SubscriptionBadge({
  onLimitReached,
}: {
  onLimitReached?: () => void;
}) {
  const { t, lang } = useI18n();
  const ar = lang === "ar";
  const fetchSub = useServerFn(getMySubscription);
  const saveProfileFn = useServerFn(saveProfile);
  const fetchAdmin = useServerFn(amIAdmin);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState(false);
  const [teacherName, setTeacherName] = useState("");
  const [school, setSchool] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) {
          setSignedIn(false);
          return;
        }
        setSignedIn(true);
        const s = await fetchSub({ data: undefined } as never);
        setStatus(s);
        setIsPremium(s.plan !== "free" && s.status === "active");
        setTeacherName(s.teacherName);
        setSchool(s.school);
        try {
          const a = await fetchAdmin({ data: undefined } as never);
          setIsAdmin(Boolean(a?.isAdmin));
        } catch {
          setIsAdmin(false);
        }
      } catch {
        // not logged in or error — ignore
      }
    })();
  }, [fetchSub, fetchAdmin]);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveProfileFn({ data: { teacherName, school } });
      toast.success(ar ? "تم حفظ البيانات" : "Profile saved");
      setEditing(false);
    } catch {
      toast.error(ar ? "فشل الحفظ" : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Show the header actions for any signed-in user, even if the
  // subscription status failed to load.
  if (!signedIn) return null;

  const isFree = !status || status.plan === "free";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
          isFree
            ? "bg-secondary text-secondary-foreground"
            : "gradient-warm text-primary-foreground"
        }`}
      >
        {isFree ? <Zap className="size-3.5" /> : <Crown className="size-3.5" />}
        {isFree
          ? status
            ? ar
              ? `مجاني — بقيت ${status.remainingToday} محاولة هذا الشهر`
              : `Free — ${status.remainingToday} left this month`
            : ar
              ? "حسابي"
              : "My account"
          : ar
            ? "اشتراك مميز — غير محدود"
            : "Premium — unlimited"}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="rounded-full text-xs"
        onClick={() => setEditing(!editing)}
      >
        <Sparkles className="me-1 size-3.5" /> {ar ? "بياناتي" : "My profile"}
      </Button>

      <Button asChild size="sm" className="rounded-full gradient-warm text-xs text-primary-foreground">
        <Link to="/subscribe">
          <Crown className="me-1 size-3.5" />
          {isFree ? (ar ? "اشترك الآن" : "Subscribe") : (ar ? "إدارة الاشتراك" : "Manage plan")}
        </Link>
      </Button>

      <Button asChild variant="outline" size="sm" className="rounded-full text-xs">
        <Link to="/my-lessons">
          <BookOpen className="me-1 size-3.5" /> {ar ? "دروسي المحفوظة" : "My lessons"}
        </Link>
      </Button>

      {isAdmin && (
        <Button asChild variant="outline" size="sm" className="rounded-full text-xs">
          <Link to="/admin">
            <Shield className="me-1 size-3.5" /> {ar ? "لوحة التحكم" : "Admin"}
          </Link>
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="rounded-full text-xs text-muted-foreground"
        onClick={() => void logout()}
      >
        <LogOut className="me-1 size-3.5" /> {ar ? "خروج" : "Sign out"}
      </Button>

      {editing && (
        <div className="mt-2 w-full rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sub-teacher">{t.teacherName}</Label>
              <Input
                id="sub-teacher"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder={t.teacherPlaceholder}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-school">{ar ? "المدرسة" : "School"}</Label>
              <Input
                id="sub-school"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder={ar ? "اسم المدرسة" : "School name"}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" className="rounded-full" onClick={() => void save()} disabled={saving}>
              {saving ? (ar ? "جارٍ الحفظ…" : "Saving…") : (ar ? "حفظ" : "Save")}
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditing(false)}>
              {ar ? "إلغاء" : "Cancel"}
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link to="/">
                <Home className="me-1 size-3.5" /> {ar ? "الرئيسية" : "Home"}
              </Link>
            </Button>
          </div>
          {isFree && (
            <p className="mt-3 rounded-xl bg-amber/10 p-2 text-xs text-amber-foreground">
              {ar
                ? "للاشتراك في الخطة المميزة (وصول غير محدود)، استخدم كود التفعيل في صفحة الاشتراك."
                : "To upgrade to Premium (unlimited access), redeem an activation code on the subscribe page."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
