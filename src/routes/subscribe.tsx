import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, BadgeCheck, Crown, KeyRound, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { InstallPWA } from "@/components/InstallPWA";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { redeemCode } from "@/lib/access.functions";
import { getMySubscription, type SubscriptionStatus } from "@/lib/subscription.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/subscribe")({
  head: () => ({
    meta: [
      { title: "الاشتراك — مولّد الدروس الذكي" },
      {
        name: "description",
        content: "فعّل اشتراكك بكود التفعيل واستمتع بتوليد غير محدود للأسئلة وأوراق العمل.",
      },
      { property: "og:title", content: "اشترك في مولّد الدروس الذكي" },
      {
        property: "og:description",
        content: "كود تفعيل خاص بكل معلم — توليد غير محدود للدروس والأسئلة وأوراق العمل.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubscribePage,
});

const WHATSAPP = "96872681302"; // 00968 7268 1302

const PLANS = [
  {
    id: "monthly",
    nameAr: "اشتراك شهري",
    nameEn: "Monthly",
    price: 15,
    descAr: "توليد غير محدود لمدة 30 يومًا وبدون علامة مائية",
    descEn: "Unlimited for 30 days, no watermark",
  },
  {
    id: "yearly",
    nameAr: "اشتراك سنوي",
    nameEn: "Yearly",
    price: 50,
    descAr: "توليد غير محدود لمدة 365 يومًا وبدون علامة مائية",
    descEn: "Unlimited for 365 days, no watermark",
  },
] as const;

function waLink(plan: (typeof PLANS)[number], email?: string, contactOnly = false) {
  const text = contactOnly
    ? `مرحبًا، عندي استفسار عن مولّد الدروس الذكي.${email ? ` بريدي: ${email}` : ""}`
    : `مرحبًا، أريد الاشتراك في الخطة ${plan.nameAr} بسعر ${plan.price}$.${email ? ` بريد حسابي: ${email}` : ""}`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function deviceFingerprint() {
  if (typeof window === "undefined") return "";
  return `${window.navigator.userAgent.slice(0, 80)}|${window.screen.width}x${window.screen.height}`;
}

function SubscribePage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const redeem = useServerFn(redeemCode);
  const fetchSub = useServerFn(getMySubscription);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      setSignedIn(Boolean(data.session));
      if (!data.session) return;
      try {
        setStatus(await fetchSub({ data: undefined } as never));
      } catch {
        /* ignore */
      }
    })();
  }, [fetchSub]);

  const activate = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const res = await redeem({ data: { code, device: deviceFingerprint() } });
      if (res.ok) {
        toast.success(ar ? "تم تفعيل اشتراكك بنجاح 🎉" : "Subscription activated 🎉");
        setStatus(await fetchSub({ data: undefined } as never));
        setCode("");
      } else {
        const msgs: Record<string, string> = {
          invalid: ar ? "الكود غير صحيح أو موقوف" : "Invalid or disabled code",
          expired: ar ? "انتهت صلاحية الكود" : "Code expired",
          used_up: ar ? "تم استخدام هذا الكود بالكامل" : "This code has been fully used",
        };
        toast.error(msgs[res.reason] ?? (ar ? "تعذّر التفعيل" : "Activation failed"));
      }
    } catch {
      toast.error(ar ? "تعذّر التفعيل، حاول لاحقًا" : "Could not activate, try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10" dir={ar ? "rtl" : "ltr"}>
      <Toaster />
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowRight className="size-4 rtl:rotate-180" /> {ar ? "رجوع" : "Back"}
          </Link>
          <InstallPWA />
        </div>

        <div className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl gradient-warm text-primary-foreground">
            <Crown className="size-7" />
          </div>
          <h1 className="text-2xl font-bold">{ar ? "الاشتراك المميز" : "Premium subscription"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {ar
              ? "الخطة المجانية: مرة واحدة شهريًا مع علامة مائية على الطباعة. الاشتراك المميز: توليد غير محدود وبدون علامة مائية."
              : "Free: 1 generation per month with a print watermark. Premium: unlimited, no watermark."}
          </p>
        </div>

        {status && (
          <Card className="rounded-2xl p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold">
              <BadgeCheck className="size-4 text-primary" />
              {status.plan === "free"
                ? ar
                  ? `خطتك الحالية: مجانية — بقيت ${status.remainingToday} محاولة هذا الشهر`
                  : `Current plan: Free — ${status.remainingToday} left this month`
                : ar
                  ? "خطتك الحالية: مميزة (غير محدودة)"
                  : "Current plan: Premium (unlimited)"}
            </div>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <Card key={plan.id} className={`rounded-2xl p-5 transition-shadow hover:shadow-lg ${plan.id === "yearly" ? "border-primary ring-1 ring-primary/30" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold">{ar ? plan.nameAr : plan.nameEn}</h2>
                {plan.id === "yearly" && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    {ar ? "الأوفر — وفّر 130$" : "Best value — save $130"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-2xl font-extrabold text-primary">${plan.price}</p>
              <p className="mt-1 text-sm text-muted-foreground">{ar ? plan.descAr : plan.descEn}</p>
              <Button
                className="mt-4 w-full rounded-xl gradient-warm text-primary-foreground"
                onClick={() => window.open(waLink(plan, status?.email), "_blank", "noopener")}
              >
                <MessageCircle className="me-1 size-4" />
                {ar ? "ادفع عبر واتساب" : "Pay via WhatsApp"}
              </Button>
            </Card>
          ))}
        </div>

        <Card className="rounded-2xl p-4 text-center text-sm">
          <p className="text-muted-foreground">
            {ar
              ? "بعد الدفع سنرسل لك كود تفعيل خاص بك يُستخدم مرة واحدة فقط."
              : "After payment we send you a personal activation code, usable once."}
          </p>
          <Button
            variant="outline"
            className="mt-3 rounded-xl"
            onClick={() => window.open(waLink(PLANS[0], status?.email, true), "_blank", "noopener")}
          >
            <MessageCircle className="me-1 size-4" /> {ar ? "تواصل معنا" : "Contact us"}
          </Button>
        </Card>

        <Card className="rounded-2xl p-5">
          <Label htmlFor="activation" className="flex items-center gap-2 font-semibold">
            <KeyRound className="size-4" /> {ar ? "أدخل كود التفعيل" : "Enter activation code"}
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            {ar
              ? "الكود مرتبط بحسابك بعد التفعيل، ولا يعمل لعدد أشخاص أكثر من المسموح، ويمكن إيقافه في أي وقت."
              : "Each code is bound to your account, limited in uses, and can be revoked anytime."}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              id="activation"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX"
              className="rounded-xl font-mono tracking-widest"
            />
            {signedIn === false ? (
              <Button className="rounded-xl" onClick={() => void navigate({ to: "/auth" })}>
                {ar ? "سجّل الدخول أولًا" : "Sign in first"}
              </Button>
            ) : (
              <Button className="rounded-xl" onClick={() => void activate()} disabled={busy}>
                {busy ? (ar ? "جارٍ التفعيل…" : "Activating…") : ar ? "تفعيل" : "Activate"}
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {ar
              ? "للحصول على كود: تواصل مع إدارة التطبيق بعد إتمام الدفع."
              : "To get a code: contact the app owner after payment."}
          </p>
        </Card>
      </div>
    </div>
  );
}
