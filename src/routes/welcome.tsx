import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  BookOpen,
  Check,
  Gamepad2,
  Languages,
  Printer,
  Share2,
  Sparkles,
  Upload,
} from "lucide-react";

import heroImg from "@/assets/hero.png";
import logoUrl from "@/assets/logo.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "مولّد الدروس الذكي — من الدرس إلى لعبة وورقة عمل في دقيقة" },
      {
        name: "description",
        content:
          "منصة للمعلمين تحوّل أي درس PDF أو صورة أو نص إلى أسئلة تفاعلية وبطاقات وخريطة ذهنية وورقة عمل جاهزة للطباعة، بالعربية والإنجليزية.",
      },
      { property: "og:title", content: "مولّد الدروس الذكي للمعلمين" },
      {
        property: "og:description",
        content: "قوالب لكل مادة، ألعاب صفية، أوراق عمل للطباعة، ومشاركة الدرس مع الطلاب برابط.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WelcomePage,
});

function WelcomePage() {
  const { lang, setLang } = useI18n();
  const ar = lang === "ar";

  const features = [
    {
      icon: Upload,
      titleAr: "ارفع أي درس",
      titleEn: "Upload any lesson",
      bodyAr: "ملف PDF أو صورة من الكتاب أو نص ملصوق — والباقي على الذكاء الاصطناعي.",
      bodyEn: "A PDF, a textbook photo or pasted text — AI handles the rest.",
    },
    {
      icon: Gamepad2,
      titleAr: "ألعاب صفية",
      titleEn: "Classroom games",
      bodyAr: "أسئلة اختيار من متعدد وصح/خطأ وعجلة أسئلة تفاعلية للحصة.",
      bodyEn: "Multiple choice, true/false and a spin-the-wheel game for class.",
    },
    {
      icon: Printer,
      titleAr: "أوراق عمل للطباعة",
      titleEn: "Printable worksheets",
      bodyAr: "ورقة عمل مرتبة مع نموذج إجابة، وكل سؤال في صفحة واحدة بدون تقطيع.",
      bodyEn: "Neat worksheets with an answer key; questions never split across pages.",
    },
    {
      icon: BookOpen,
      titleAr: "قوالب لكل مادة",
      titleEn: "Templates per subject",
      bodyAr: "عربي، إنجليزي، رياضيات، علوم، دراسات، تربية إسلامية — بضغطة واحدة.",
      bodyEn: "Arabic, English, Math, Science, Social and Islamic studies in one click.",
    },
    {
      icon: Share2,
      titleAr: "شارك مع الطلاب",
      titleEn: "Share with students",
      bodyAr: "رابط واحد يفتح الدرس والأسئلة للطلاب بدون تسجيل دخول.",
      bodyEn: "One link opens the lesson for students — no sign-in needed.",
    },
    {
      icon: Languages,
      titleAr: "عربي وإنجليزي",
      titleEn: "Arabic & English",
      bodyAr: "دعم كامل للاتجاهين مع أرقام عربية أو إنجليزية حسب المادة.",
      bodyEn: "Full RTL/LTR support with Arabic or Latin numerals.",
    },
  ];

  const plans = [
    {
      nameAr: "مجاني",
      nameEn: "Free",
      priceAr: "٠",
      priceEn: "0",
      perAr: "للتجربة",
      perEn: "to try",
      items: ar
        ? ["محاولة توليد واحدة", "كل التبويبات والألعاب", "طباعة ورقة العمل"]
        : ["One generation", "All tabs and games", "Printable worksheet"],
      highlight: false,
    },
    {
      nameAr: "شهري",
      nameEn: "Monthly",
      priceAr: "كود تفعيل",
      priceEn: "Activation code",
      perAr: "٣٠ يومًا",
      perEn: "30 days",
      items: ar
        ? ["توليد غير محدود", "حفظ الدروس ومشاركتها", "دعم مباشر على واتساب"]
        : ["Unlimited generations", "Save & share lessons", "Direct WhatsApp support"],
      highlight: true,
    },
    {
      nameAr: "سنوي",
      nameEn: "Yearly",
      priceAr: "كود تفعيل",
      priceEn: "Activation code",
      perAr: "٣٦٥ يومًا",
      perEn: "365 days",
      items: ar
        ? ["كل مزايا الشهري", "سعر أوفر للعام كامل", "أولوية في الميزات الجديدة"]
        : ["Everything in monthly", "Better yearly value", "Early access to features"],
      highlight: false,
    },
  ];

  return (
    <main className="min-h-screen blob-bg bg-background">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pt-5">
        <Link to="/welcome" className="flex items-center gap-2 font-display font-extrabold text-primary">
          <img src={logoUrl} alt="" width={44} height={44} className="size-10" />
          <span className="text-sm sm:text-lg">
            {ar ? "مولّد الدروس الذكي" : "Smart Lesson Generator"}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={() => setLang(ar ? "en" : "ar")}
          >
            <Languages className="mr-2 size-4" /> {ar ? "English" : "العربية"}
          </Button>
          <Button asChild size="sm" className="rounded-full gradient-hero text-primary-foreground">
            <Link to="/">{ar ? "ابدأ الآن" : "Start now"}</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:py-16">
        <div className="text-center md:text-start">
          <Badge className="rounded-full bg-amber px-3 py-1 text-amber-foreground">
            <Sparkles className="mr-1 size-3.5" /> {ar ? "ذكاء اصطناعي للمعلمين" : "AI for teachers"}
          </Badge>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight text-foreground sm:text-5xl">
            {ar
              ? "من الدرس إلى لعبة وورقة عمل في دقيقة"
              : "From a lesson to a game and a worksheet in one minute"}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {ar
              ? "ارفع درسك أو اختر قالب مادتك، وسنجهّز لك أسئلة تفاعلية وبطاقات وخريطة ذهنية وورقة عمل جاهزة للطباعة — بالعربية أو الإنجليزية."
              : "Upload your lesson or pick a subject template and get interactive questions, flashcards, a mind map and a printable worksheet — in Arabic or English."}
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
            <Button
              asChild
              size="lg"
              className="w-full rounded-full gradient-hero px-8 text-primary-foreground sm:w-auto"
            >
              <Link to="/">{ar ? "جرّب مجانًا" : "Try it free"}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full rounded-full sm:w-auto">
              <Link to="/subscribe">{ar ? "اطلب كود تفعيل" : "Get an activation code"}</Link>
            </Button>
          </div>
        </div>
        <img
          src={heroImg}
          alt={ar ? "أطفال يتعلمون ويلعبون" : "Children learning and playing"}
          className="mx-auto w-full max-w-md rounded-4xl shadow-[var(--shadow-lift)]"
        />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-center font-display text-2xl font-extrabold sm:text-3xl">
          {ar ? "كل ما تحتاجه المعلمة في مكان واحد" : "Everything a teacher needs in one place"}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.titleEn} className="rounded-3xl p-5">
              <div className="w-fit rounded-2xl gradient-warm p-3 text-primary-foreground">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-3 font-display text-lg font-bold">{ar ? f.titleAr : f.titleEn}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {ar ? f.bodyAr : f.bodyEn}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-center font-display text-2xl font-extrabold sm:text-3xl">
          {ar ? "الأسعار" : "Pricing"}
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          {ar
            ? "الاشتراك بكود تفعيل يُرسل لك على واتساب."
            : "Subscriptions are activated with a code sent to you on WhatsApp."}
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <Card
              key={p.nameEn}
              className={`rounded-3xl p-6 ${
                p.highlight ? "border-primary shadow-[var(--shadow-lift)]" : ""
              }`}
            >
              {p.highlight && (
                <Badge className="mb-3 rounded-full bg-primary text-primary-foreground">
                  <BadgeCheck className="mr-1 size-3.5" /> {ar ? "الأكثر طلبًا" : "Most popular"}
                </Badge>
              )}
              <h3 className="font-display text-xl font-extrabold">{ar ? p.nameAr : p.nameEn}</h3>
              <p className="mt-2 font-display text-2xl font-extrabold text-primary">
                {ar ? p.priceAr : p.priceEn}
              </p>
              <p className="text-xs text-muted-foreground">{ar ? p.perAr : p.perEn}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {p.items.map((i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald" />
                    {i}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className={`mt-5 w-full rounded-full ${
                  p.highlight ? "gradient-hero text-primary-foreground" : ""
                }`}
                variant={p.highlight ? "default" : "outline"}
              >
                <Link to={p.highlight ? "/subscribe" : "/"}>
                  {p.highlight ? (ar ? "اشترك الآن" : "Subscribe") : ar ? "ابدأ مجانًا" : "Start free"}
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <section className="px-4 pb-16">
        <Card className="mx-auto max-w-4xl rounded-4xl gradient-hero p-8 text-center text-primary-foreground">
          <h2 className="font-display text-2xl font-extrabold sm:text-3xl">
            {ar ? "جاهزة تجهّزي حصة اليوم؟" : "Ready to prepare today's class?"}
          </h2>
          <p className="mt-2 text-sm opacity-90 sm:text-base">
            {ar
              ? "أنشئي حسابك بالبريد الإلكتروني وابدئي أول درس خلال دقيقة."
              : "Create your account with email and build your first lesson in a minute."}
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-5 rounded-full px-8">
            <Link to="/auth">{ar ? "إنشاء حساب" : "Create an account"}</Link>
          </Button>
        </Card>
      </section>

      <footer className="border-t border-border bg-card/60 px-4 py-8 text-center">
        <p className="font-display text-base font-bold text-primary">
          {ar ? "تصميم مروة أبوبكر" : "Designed by Marwa Aboubakr"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {ar ? "مدعوم بالذكاء الاصطناعي" : "Powered by AI"}
        </p>
      </footer>
    </main>
  );
}
