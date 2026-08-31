import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Copy,
  Download,
  FileSpreadsheet,
  Home,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Users,
} from "lucide-react";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  adminCreateCodes,
  adminListCodes,
  adminListRedemptions,
  adminSetCodeActive,
  amIAdmin,
  type CodeRow,
  type RedemptionRow,
} from "@/lib/access.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — مولّد الدروس الذكي" },
      { name: "description", content: "إدارة أكواد التفعيل والاشتراكات في مولّد الدروس الذكي." },
      { property: "og:title", content: "لوحة تحكم المشرف" },
      { property: "og:description", content: "توليد وإدارة أكواد تفعيل الاشتراك." },
    ],
  }),
  component: AdminPage,
});

/** A redemption is "active" while the subscriber's subscription has not expired. */
function isActive(r: RedemptionRow) {
  return Boolean(r.subscriptionExpiresAt && new Date(r.subscriptionExpiresAt) > new Date());
}

function fmtDate(value: string | null, ar: boolean) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(ar ? "ar-EG" : "en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}


/** Build a WhatsApp share link (opens the chat with a ready message). */
function waLink(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const text = encodeURIComponent(message);
  return digits ? `https://wa.me/${digits}?text=${text}` : `https://api.whatsapp.com/send?text=${text}`;
}

function codeMessage(code: string, plan: string, days: number, ar: boolean, name?: string | null) {
  const planLabel = plan === "yearly" ? (ar ? "سنوي" : "Yearly") : ar ? "شهري" : "Monthly";
  if (ar) {
    return `${name ? `أهلاً ${name}،\n` : ""}كود تفعيل اشتراكك في «مولّد الدروس الذكي»:\n${code}\n\nالخطة: ${planLabel} (${days} يوم)\nطريقة التفعيل: سجّل الدخول بحسابك ثم افتح صفحة الاشتراك وأدخل الكود.`;
  }
  return `${name ? `Hi ${name},\n` : ""}Your activation code for Smart Lesson Craft:\n${code}\n\nPlan: ${planLabel} (${days} days)\nSign in, open the subscribe page and enter the code.`;
}

function AdminPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const checkAdmin = useServerFn(amIAdmin);
  const listCodes = useServerFn(adminListCodes);
  const listRedemptions = useServerFn(adminListRedemptions);
  const createCodes = useServerFn(adminCreateCodes);
  const setActive = useServerFn(adminSetCodeActive);

  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<CodeRow[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [count, setCount] = useState(5);
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [durationDays, setDurationDays] = useState(30);
  const [maxUses, setMaxUses] = useState(1);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<string[]>(Array.from({ length: 5 }, () => ""));
  const [busy, setBusy] = useState(false);
  const [waPhone, setWaPhone] = useState("");
  const [waName, setWaName] = useState("");
  const [codeSearch, setCodeSearch] = useState("");
  const [redemptionSearch, setRedemptionSearch] = useState("");
  const [redemptionStatus, setRedemptionStatus] = useState<"all" | "active" | "expired">("all");

  const refresh = async () => {
    try {
      setRows(await listCodes({ data: undefined } as never));
      setRedemptions(await listRedemptions({ data: undefined } as never));
    } catch {
      /* ignore */
    }
  };

  const filteredRows = rows.filter((r) => {
    const q = codeSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      r.code.toLowerCase().includes(q) ||
      r.plan.toLowerCase().includes(q) ||
      (r.note ?? "").toLowerCase().includes(q)
    );
  });

  const filteredRedemptions = redemptions.filter((r) => {
    const active = isActive(r);
    if (redemptionStatus === "active" && !active) return false;
    if (redemptionStatus === "expired" && active) return false;
    const q = redemptionSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      r.code.toLowerCase().includes(q) ||
      (r.userEmail ?? "").toLowerCase().includes(q) ||
      r.plan.toLowerCase().includes(q)
    );
  });

  const exportCodesCsv = () => {
    const headers = ar
      ? ["الكود", "الخطة", "الأيام", "الاستخدام", "الحد", "الملاحظة", "الحالة", "تاريخ الإنشاء"]
      : ["Code", "Plan", "Days", "Uses", "Max", "Note", "Status", "Created at"];
    const lines = filteredRows.map((r) =>
      [
        r.code,
        r.plan,
        r.durationDays,
        r.usedCount,
        r.maxUses,
        `"${(r.note ?? "").replace(/"/g, '""')}"`,
        r.active ? (ar ? "فعّال" : "Active") : (ar ? "موقوف" : "Disabled"),
        fmtDate(r.createdAt, ar),
      ].join(","),
    );
    downloadCsv([headers.join(","), ...lines].join("\n"), "activation-codes.csv");
  };

  const exportRedemptionsCsv = () => {
    const headers = ar
      ? ["الكود", "الخطة", "بريد العميل", "تاريخ الاستخدام", "تاريخ الانتهاء", "الحالة"]
      : ["Code", "Plan", "Customer email", "Redeemed on", "Expires on", "Status"];
    const lines = filteredRedemptions.map((r) =>
      [
        r.code,
        r.plan,
        r.userEmail ?? "",
        fmtDate(r.redeemedAt, ar),
        fmtDate(r.subscriptionExpiresAt, ar),
        isActive(r) ? (ar ? "نشط" : "Active") : (ar ? "منتهي" : "Expired"),
      ].join(","),
    );
    downloadCsv([headers.join(","), ...lines].join("\n"), "subscribers.csv");
  };

  function downloadCsv(content: string, fileName: string) {
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    void (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate({ to: "/auth" });
        return;
      }
      try {
        const a = await checkAdmin({ data: undefined } as never);
        setAllowed(Boolean(a?.isAdmin));
        if (a?.isAdmin) await refresh();
      } catch {
        setAllowed(false);
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    setBusy(true);
    try {
      const perCode = Array.from({ length: count }, (_u, i) => notes[i] ?? "");
      const res = await createCodes({
        data: { count, plan, durationDays, maxUses, note: note || undefined, notes: perCode },
      });
      toast.success(
        ar ? `تم توليد ${res.codes.length} كود` : `Generated ${res.codes.length} codes`,
      );
      setNote("");
      setNotes(Array.from({ length: count }, () => ""));
      await refresh();
    } catch {
      toast.error(ar ? "فشل التوليد" : "Failed to generate");
    } finally {
      setBusy(false);
    }
  };

  const openWhatsApp = (code: string, plan: string, days: number, phone: string, name?: string | null) => {
    window.open(waLink(phone, codeMessage(code, plan, days, ar, name)), "_blank", "noopener");
  };

  /** One customer = one fresh single-use code, copied and ready to send on WhatsApp. */
  const quick = async (which: "monthly" | "yearly") => {
    setBusy(true);
    try {
      const days = which === "monthly" ? 30 : 365;
      const name = waName.trim();
      const res = await createCodes({
        data: {
          count: 1,
          plan: which,
          durationDays: days,
          maxUses: 1,
          note: name || notes[0]?.trim() || note || undefined,
        },
      });
      const created = res.codes[0];
      if (created) {
        await navigator.clipboard.writeText(created).catch(() => undefined);
        toast.success(ar ? `تم توليد الكود: ${created}` : `Code created: ${created}`);
        openWhatsApp(created, which, days, waPhone, name || null);
      }
      setWaName("");
      setWaPhone("");
      await refresh();
    } catch {
      toast.error(ar ? "فشل التوليد" : "Failed to generate");
    } finally {
      setBusy(false);
    }
  };

  /** Renewal: issue a brand-new code for an existing subscriber. */
  const renew = async (r: RedemptionRow) => {
    setBusy(true);
    try {
      const which: "monthly" | "yearly" = r.plan === "yearly" ? "yearly" : "monthly";
      const days = which === "monthly" ? 30 : 365;
      const label = r.note || r.userEmail || "";
      const res = await createCodes({
        data: {
          count: 1,
          plan: which,
          durationDays: days,
          maxUses: 1,
          note: ar ? `تجديد — ${label}` : `Renewal — ${label}`,
        },
      });
      const created = res.codes[0];
      if (created) {
        await navigator.clipboard.writeText(created).catch(() => undefined);
        toast.success(ar ? `كود تجديد جديد: ${created}` : `New renewal code: ${created}`);
        openWhatsApp(created, which, days, "", r.note);
      }
      await refresh();
    } catch {
      toast.error(ar ? "فشل توليد كود التجديد" : "Failed to create renewal code");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (row: CodeRow) => {
    await setActive({ data: { id: row.id, active: !row.active } });
    await refresh();
  };

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="max-w-md rounded-3xl p-8 text-center">
          <Shield className="mx-auto size-10 text-muted-foreground" />
          <h1 className="mt-3 font-display text-xl font-extrabold text-foreground">
            {ar ? "هذه الصفحة للمشرف فقط" : "Admins only"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {ar
              ? "حسابك لا يملك صلاحية إدارة أكواد التفعيل."
              : "Your account does not have permission to manage activation codes."}
          </p>
          <Button className="mt-5 rounded-full" onClick={() => navigate({ to: "/" })}>
            {ar ? "العودة للرئيسية" : "Back home"}
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 sm:p-8" dir={ar ? "rtl" : "ltr"}>
      <Toaster position="top-center" />
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-extrabold text-primary">
            <Shield className="me-2 inline size-6" />
            {ar ? "إدارة أكواد التفعيل" : "Activation codes"}
          </h1>
          <Link
            to="/"
            aria-label={ar ? "الرجوع للصفحة الرئيسية" : "Back to home"}
            title={ar ? "الرجوع للصفحة الرئيسية" : "Back to home"}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Home className="size-4" />
            <span className="hidden sm:inline">{ar ? "الرئيسية" : "Home"}</span>
          </Link>
        </div>


        <Card className="rounded-3xl border-primary/30 bg-primary/5 p-5">
          <h2 className="font-display text-lg font-bold text-foreground">
            {ar ? "توليد سريع (كود واحد لعميل واحد)" : "Quick generate (one code, one customer)"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {ar
              ? "كل عميل ليه كود جديد يُستخدم مرة واحدة فقط ويتقفل بعدها. اكتبي الاسم ورقم الواتساب واضغطي، الكود يتولّد ويُنسخ وتفتح محادثة واتساب برسالة جاهزة."
              : "Each customer gets a fresh single-use code. Enter the name and WhatsApp number — the code is created, copied, and WhatsApp opens with a ready message."}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wa-name">{ar ? "اسم العميل" : "Customer name"}</Label>
              <Input
                id="wa-name"
                value={waName}
                onChange={(e) => setWaName(e.target.value)}
                placeholder={ar ? "مثال: أ. سارة" : "e.g. Sarah"}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-phone">
                {ar ? "رقم الواتساب (بمفتاح الدولة، اختياري)" : "WhatsApp number (with country code, optional)"}
              </Label>
              <Input
                id="wa-phone"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="9689xxxxxxx"
                inputMode="tel"
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              className="rounded-full gradient-hero text-primary-foreground"
              disabled={busy}
              onClick={() => void quick("monthly")}
            >
              <Plus className="me-2 size-4" /> {ar ? "كود شهري (30 يوم)" : "Monthly code (30 days)"}
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={busy}
              onClick={() => void quick("yearly")}
            >
              <Plus className="me-2 size-4" /> {ar ? "كود سنوي (365 يوم)" : "Yearly code (365 days)"}
            </Button>
          </div>
        </Card>

        <Card className="rounded-3xl p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="count">
                {ar ? "عدد الأكواد (كود مختلف لكل شخص)" : "How many codes (one per person)"}
              </Label>
              <Input
                id="count"
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="plan">{ar ? "الخطة" : "Plan"}</Label>
              <select
                id="plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value as "monthly" | "yearly")}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="monthly">{ar ? "شهري" : "Monthly"}</option>
                <option value="yearly">{ar ? "سنوي" : "Yearly"}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="days">{ar ? "مدة الصلاحية (يوم)" : "Duration (days)"}</Label>
              <Input
                id="days"
                type="number"
                min={1}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uses">
                {ar ? "مرات استخدام الكود الواحد (اتركيها 1)" : "Uses per code (keep 1)"}
              </Label>
              <Input
                id="uses"
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                className="rounded-xl"
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label>{ar ? "اسم صاحب كل كود" : "Name for each code"}</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: Math.max(1, Math.min(count || 1, 50)) }, (_u, i) => (
                <Input
                  key={i}
                  value={notes[i] ?? ""}
                  onChange={(e) =>
                    setNotes((prev) => {
                      const next = [...prev];
                      while (next.length <= i) next.push("");
                      next[i] = e.target.value;
                      return next;
                    })
                  }
                  className="rounded-xl"
                  placeholder={
                    ar ? `اسم صاحب الكود ${i + 1}` : `Name for code ${i + 1}`
                  }
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {ar
                ? "كل خانة = كود مختلف باسم شخص مختلف. اللي تسيبيها فاضية تتولد بدون اسم."
                : "Each field is a separate code for a different person."}
            </p>
          </div>
          <Button
            className="mt-4 rounded-full gradient-hero text-primary-foreground"
            onClick={() => void generate()}
            disabled={busy}
          >
            {busy ? <Loader2 className="me-2 size-4 animate-spin" /> : <Plus className="me-2 size-4" />}
            {ar ? "توليد الأكواد" : "Generate codes"}
          </Button>
        </Card>

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="rounded-3xl p-4">
            <p className="text-xs text-muted-foreground">{ar ? "إجمالي الأكواد" : "Total codes"}</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-primary">{rows.length}</p>
          </Card>
          <Card className="rounded-3xl p-4">
            <p className="text-xs text-muted-foreground">{ar ? "أكواد فعّالة" : "Active codes"}</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-emerald">
              {rows.filter((r) => r.active).length}
            </p>
          </Card>
          <Card className="rounded-3xl p-4">
            <p className="text-xs text-muted-foreground">{ar ? "أكواد مستخدمة" : "Used codes"}</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-amber">
              {rows.filter((r) => r.usedCount > 0).length}
            </p>
          </Card>
          <Card className="rounded-3xl p-4">
            <p className="text-xs text-muted-foreground">{ar ? "إجمالي الاستخدامات" : "Total redemptions"}</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-primary">{redemptions.length}</p>
          </Card>
          <Card className="rounded-3xl p-4">
            <p className="text-xs text-muted-foreground">{ar ? "مشتركون نشطون" : "Active subscribers"}</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-emerald">
              {redemptions.filter((r) => isActive(r)).length}
            </p>
          </Card>
          <Card className="rounded-3xl p-4">
            <p className="text-xs text-muted-foreground">{ar ? "اشتراكات منتهية" : "Expired subscriptions"}</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-destructive">
              {redemptions.filter((r) => !isActive(r)).length}
            </p>
          </Card>
        </div>

        <Card className="overflow-x-auto rounded-3xl p-2">
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-lg font-bold text-foreground">
              <FileSpreadsheet className="me-2 inline size-5 text-primary" />
              {ar ? "الأكواد" : "Activation codes"}
            </h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={codeSearch}
                  onChange={(e) => setCodeSearch(e.target.value)}
                  placeholder={ar ? "ابحث بالكود أو الخطة أو الملاحظة" : "Search code, plan or note"}
                  className="rounded-full ps-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => void exportCodesCsv()}
                disabled={filteredRows.length === 0}
              >
                <Download className="me-1 size-3.5" /> {ar ? "تصدير CSV" : "Export CSV"}
              </Button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="p-2 text-start">{ar ? "الكود" : "Code"}</th>
                <th className="p-2 text-start">{ar ? "الخطة" : "Plan"}</th>
                <th className="p-2 text-start">{ar ? "الأيام" : "Days"}</th>
                <th className="p-2 text-start">{ar ? "الاستخدام" : "Uses"}</th>
                <th className="p-2 text-start">{ar ? "ملاحظة" : "Note"}</th>
                <th className="p-2 text-start">{ar ? "الحالة" : "Status"}</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-2 font-mono font-bold">{r.code}</td>
                  <td className="p-2">{r.plan}</td>
                  <td className="p-2">{r.durationDays}</td>
                  <td className="p-2">
                    {r.usedCount}/{r.maxUses}
                  </td>
                  <td className="p-2 text-muted-foreground">{r.note ?? "—"}</td>
                  <td className="p-2">
                    {r.active
                      ? ar
                        ? "فعّال"
                        : "Active"
                      : ar
                        ? "موقوف"
                        : "Disabled"}
                  </td>
                  <td className="flex gap-1 p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        void navigator.clipboard.writeText(r.code);
                        toast.success(ar ? "تم النسخ" : "Copied");
                      }}
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-emerald"
                      title={ar ? "إرسال عبر واتساب" : "Send on WhatsApp"}
                      onClick={() => openWhatsApp(r.code, r.plan, r.durationDays, "", r.note)}
                    >
                      <MessageCircle className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => void toggle(r)}
                    >
                      {r.active ? (ar ? "إيقاف" : "Disable") : (ar ? "تفعيل" : "Enable")}
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    {codeSearch
                      ? (ar ? "لا توجد نتائج مطابقة." : "No matching results.")
                      : (ar ? "لا توجد أكواد بعد." : "No codes yet.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <Card className="overflow-x-auto rounded-3xl p-2">
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-lg font-bold text-foreground">
              <Users className="me-2 inline size-5 text-primary" />
              {ar ? "الأكواد المستخدمة والمشتركون" : "Used codes & subscribers"}
            </h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={redemptionSearch}
                  onChange={(e) => setRedemptionSearch(e.target.value)}
                  placeholder={ar ? "ابحث بالكود أو البريد" : "Search code or email"}
                  className="rounded-full ps-9"
                />
              </div>
              <select
                value={redemptionStatus}
                onChange={(e) => setRedemptionStatus(e.target.value as "all" | "active" | "expired")}
                className="h-9 rounded-full border border-input bg-background px-3 text-sm"
              >
                <option value="all">{ar ? "الكل" : "All"}</option>
                <option value="active">{ar ? "نشط" : "Active"}</option>
                <option value="expired">{ar ? "منتهي" : "Expired"}</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => void exportRedemptionsCsv()}
                disabled={filteredRedemptions.length === 0}
              >
                <Download className="me-1 size-3.5" /> {ar ? "تصدير CSV" : "Export CSV"}
              </Button>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="p-2 text-start">{ar ? "الكود" : "Code"}</th>
                <th className="p-2 text-start">{ar ? "الخطة" : "Plan"}</th>
                <th className="p-2 text-start">{ar ? "بريد العميل" : "Customer email"}</th>
                <th className="p-2 text-start">{ar ? "تاريخ الاستخدام" : "Redeemed on"}</th>
                <th className="p-2 text-start">{ar ? "ينتهي في" : "Expires on"}</th>
                <th className="p-2 text-start">{ar ? "الحالة" : "Status"}</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {filteredRedemptions.map((r) => {
                const active = isActive(r);
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2 font-mono font-bold">{r.code}</td>
                    <td className="p-2">
                      {r.plan === "monthly"
                        ? ar
                          ? "شهري"
                          : "Monthly"
                        : r.plan === "yearly"
                          ? ar
                            ? "سنوي"
                            : "Yearly"
                          : r.plan}
                    </td>
                    <td className="p-2">
                      <div className="font-medium">{r.userEmail ?? "—"}</div>
                      {r.note && <div className="text-xs text-muted-foreground">{r.note}</div>}
                    </td>
                    <td className="p-2">{fmtDate(r.redeemedAt, ar)}</td>
                    <td className="p-2">{fmtDate(r.subscriptionExpiresAt, ar)}</td>
                    <td className="p-2">
                      <span
                        className={
                          active
                            ? "rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary"
                            : "rounded-full bg-destructive/10 px-2 py-1 text-xs font-bold text-destructive"
                        }
                      >
                        {active ? (ar ? "نشط" : "Active") : ar ? "منتهي" : "Expired"}
                      </span>
                    </td>
                    <td className="p-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full text-xs"
                        disabled={busy}
                        onClick={() => void renew(r)}
                        title={ar ? "توليد كود تجديد جديد وإرساله" : "Create and send a renewal code"}
                      >
                        <RefreshCw className="me-1 size-3.5" /> {ar ? "تجديد" : "Renew"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredRedemptions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    {redemptionSearch || redemptionStatus !== "all"
                      ? (ar ? "لا توجد نتائج مطابقة." : "No matching results.")
                      : (ar ? "لم يستخدم أي عميل كودًا بعد." : "No codes have been redeemed yet.")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

      </div>
    </main>
  );
}
