import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  Bookmark,
  FileText,
  Gamepad2,
  Languages,
  Loader2,
  Network,
  PartyPopper,
  PenLine,
  Printer,
  Share2,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import catImg from "@/assets/cat.png";
import dogImg from "@/assets/dog.png";
import heroImg from "@/assets/hero.png";
import logoUrl from "@/assets/logo.png";
import partyImg from "@/assets/party.png";
import { EditorTab } from "@/components/EditorTab";
import { FlashcardsTab } from "@/components/FlashcardsTab";
import { LessonInput, type GenerateArgs } from "@/components/LessonInput";
import { MindMap } from "@/components/MindMap";
import { PlayTab } from "@/components/PlayTab";
import { SummaryTab } from "@/components/SummaryTab";
import { WheelTab } from "@/components/WheelTab";
import { WorksheetTab } from "@/components/WorksheetTab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import { AuthHeader } from "@/components/AuthHeader";
import { InstallPWA } from "@/components/InstallPWA";
import { generateLessonPackage } from "@/lib/lesson.functions";
import { getLessonById, saveLesson } from "@/lib/lessons.functions";
import { createShare } from "@/lib/shares.functions";
import type { LessonPackage } from "@/lib/lesson-types";
import { useGeneration } from "@/lib/subscription.functions";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مولّد الدروس الذكي — ألعاب وأسئلة وأوراق عمل" },
      {
        name: "description",
        content:
          "حوّل أي درس PDF أو صورة أو نص إلى أسئلة تفاعلية وبطاقات وعجلة أسئلة وورقة عمل جاهزة للطباعة في ثوانٍ.",
      },
      { property: "og:title", content: "مولّد الدروس الذكي للمعلمين" },
      {
        property: "og:description",
        content: "أسئلة اختيار من متعدد وصح/خطأ وبطاقات وألعاب صفية وأوراق عمل للطباعة من أي درس.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const generate = useServerFn(generateLessonPackage);
  const markUsage = useServerFn(useGeneration);
  const save = useServerFn(saveLesson);
  const loadById = useServerFn(getLessonById);
  const share = useServerFn(createShare);
  const { t, lang, setLang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [pkg, setPkg] = useState<LessonPackage | null>(null);
  const [tab, setTab] = useState("play");
  const [savedLessonId, setSavedLessonId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lessonId = params.get("lesson");
    if (!lessonId) return;
    void (async () => {
      setLoading(true);
      try {
        const lesson = await loadById({ data: { id: lessonId } });
        setPkg(lesson.package);
        setSavedLessonId(lesson.id);
        setTimeout(
          () => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }),
          150,
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : "";
        toast.error(msg || t.failed);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadById, t.failed]);

  const run = async (args: GenerateArgs) => {
    setLoading(true);
    try {
      const result = await generate({ data: args });
      setPkg(result);
      setSavedLessonId(null);
      void markUsage({ data: undefined } as never).catch(() => {});
      toast.success(t.done);
      setTimeout(
        () => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }),
        150,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "limit_reached") {
        toast.error(t.limitReached);
      } else if (msg === "subscription_expired") {
        toast.error(t.subscriptionExpired);
      } else if (msg === "youtube_invalid_url") {
        toast.error(t.errYoutubeUrl);
      } else if (msg === "youtube_no_captions") {
        toast.error(t.errYoutubeCaptions);
      } else if (msg === "openai_quota") {
        toast.error(t.errOpenaiQuota);
      } else if (msg === "openai_invalid_key") {
        toast.error(t.errOpenaiKey);
      } else if (msg === "youtube_fetch_failed") {
        toast.error(t.errYoutubeFetch);
      } else if (msg === "Unauthorized" || /unauthorized|401/i.test(msg)) {
        toast.error(t.signInRequired);
        setTimeout(() => (window.location.href = "/auth"), 900);
      } else {
        toast.error(msg || t.failed);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!pkg) return;
    setSaving(true);
    try {
      const lesson = await save({ data: { title: pkg.title || t.lessonTitle, package: pkg } });
      setSavedLessonId(lesson.id);
      toast.success(lang === "ar" ? "تم حفظ الدرس ✅" : "Lesson saved ✅");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "Unauthorized" || /unauthorized|401/i.test(msg)) {
        toast.error(t.signInRequired);
      } else {
        toast.error(lang === "ar" ? "فشل الحفظ" : "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!pkg) return;
    setSharing(true);
    try {
      const { token } = await share({
        data: { title: pkg.title || t.lessonTitle, package: pkg as never },
      });
      const url = `${window.location.origin}/s/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success(lang === "ar" ? "تم نسخ رابط المشاركة ✅" : "Share link copied ✅");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "Unauthorized" || /unauthorized|401/i.test(msg)) {
        toast.error(t.signInRequired);
      } else {
        toast.error(lang === "ar" ? "فشل إنشاء رابط المشاركة" : "Failed to create share link");
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <main className="min-h-screen blob-bg bg-background">
      <Toaster position="top-center" />

      <section className="relative overflow-hidden px-4 pb-28 pt-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link
            to="/welcome"
            className="flex items-center gap-2 font-display text-lg font-extrabold text-primary"
          >
            <img src={logoUrl} alt="" width={40} height={40} className="size-9" />
            <span className="text-sm sm:text-base">{t.brand}</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="rounded-full text-xs">
              <Link to="/welcome">{lang === "ar" ? "عن التطبيق" : "About"}</Link>
            </Button>
            <AuthHeader />
            <InstallPWA />
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            >
              <Languages className="mr-2 size-4" /> {t.langSwitch}
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-8 grid max-w-6xl items-center gap-8 md:grid-cols-2">
          <div className="text-center md:text-start">
            <Badge className="rounded-full bg-amber px-3 py-1 text-amber-foreground">
              <Sparkles className="mr-1 size-3.5" /> {t.badge}
            </Badge>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight text-foreground sm:text-5xl">
              {t.heroTitle}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t.heroSub}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3 md:justify-start">
              <img
                src={catImg}
                alt={lang === "ar" ? "قطة كرتونية لطيفة" : "Cute cartoon cat"}
                className="size-16 animate-bounce-slow drop-shadow-md"
              />
              <img
                src={dogImg}
                alt={lang === "ar" ? "كلب كرتوني لطيف" : "Cute cartoon dog"}
                className="size-16 animate-wiggle drop-shadow-md"
              />
              <img
                src={partyImg}
                alt={lang === "ar" ? "حيوان يحتفل" : "Party animal"}
                className="size-16 animate-float-soft drop-shadow-md"
              />
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-6 -z-10 rounded-4xl gradient-warm opacity-30 blur-2xl" />
            <img
              src={heroImg}
              alt={
                lang === "ar"
                  ? "أطفال يلعبون ويتعلمون مع حيوانات لطيفة"
                  : "Kids learning and playing with cute animals"
              }
              className="mx-auto w-full max-w-md animate-float-soft rounded-4xl shadow-[var(--shadow-lift)]"
            />
          </div>
        </div>
      </section>

      <div className="relative z-20 -mt-20 px-4 pb-16">
        <LessonInput onGenerate={run} loading={loading} />
      </div>

      {pkg && (
        <section id="results" className="mx-auto max-w-6xl px-4 pb-20">
          <Card className="mb-6 rounded-3xl p-6" dir={pkg.language === "ar" ? "rtl" : "ltr"}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
                <Sparkles className="size-5 text-amber" /> {pkg.title}
              </h2>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="no-print rounded-full"
                  onClick={() => void handleSave()}
                  disabled={saving || Boolean(savedLessonId)}
                >
                  <Bookmark className="mr-2 size-4" />
                  {savedLessonId
                    ? lang === "ar"
                      ? "محفوظ"
                      : "Saved"
                    : saving
                      ? lang === "ar"
                        ? "جارٍ الحفظ…"
                        : "Saving…"
                      : lang === "ar"
                        ? "حفظ الدرس"
                        : "Save lesson"}
                </Button>
                <Button
                  variant="outline"
                  className="no-print rounded-full"
                  onClick={() => {
                    setTab("sheet");
                  }}
                >
                  <Printer className="mr-2 size-4" /> {t.print}
                </Button>
                <Button
                  variant="outline"
                  className="no-print rounded-full"
                  onClick={() => void handleShare()}
                  disabled={sharing}
                >
                  {sharing ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Share2 className="mr-2 size-4" />
                  )}
                  {sharing
                    ? lang === "ar"
                      ? "جارٍ الإنشاء…"
                      : "Creating…"
                    : lang === "ar"
                      ? "مشاركة مع الطلاب"
                      : "Share with students"}
                </Button>
              </div>
            </div>
          </Card>


          

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex h-auto w-full flex-nowrap gap-1 overflow-x-auto rounded-2xl p-1 sm:grid sm:h-auto sm:grid-cols-4 lg:grid-cols-7">
              <TabsTrigger value="play" className="shrink-0 whitespace-nowrap rounded-xl">
                <Gamepad2 className="mr-2 size-4" /> {t.tabPlay}
              </TabsTrigger>
              <TabsTrigger value="cards" className="shrink-0 whitespace-nowrap rounded-xl">
                <BookOpen className="mr-2 size-4" /> {t.tabCards}
              </TabsTrigger>
              <TabsTrigger value="wheel" className="shrink-0 whitespace-nowrap rounded-xl">
                <PartyPopper className="mr-2 size-4" /> {t.tabWheel}
              </TabsTrigger>
              <TabsTrigger value="mind" className="shrink-0 whitespace-nowrap rounded-xl">
                <Network className="mr-2 size-4" /> {t.tabMind}
              </TabsTrigger>
              <TabsTrigger value="summary" className="shrink-0 whitespace-nowrap rounded-xl">
                <FileText className="mr-2 size-4" /> {t.tabSummary}
              </TabsTrigger>
              <TabsTrigger value="sheet" className="shrink-0 whitespace-nowrap rounded-xl">
                <Printer className="mr-2 size-4" /> {t.tabSheet}
              </TabsTrigger>
              <TabsTrigger value="editor" className="shrink-0 whitespace-nowrap rounded-xl">
                <PenLine className="mr-2 size-4" /> {t.tabEditor}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="play" className="mt-6">
              <PlayTab pkg={pkg} />
            </TabsContent>
            <TabsContent value="cards" className="mt-6">
              <FlashcardsTab pkg={pkg} />
            </TabsContent>
            <TabsContent value="wheel" className="mt-6">
              <WheelTab pkg={pkg} />
            </TabsContent>
            <TabsContent value="mind" className="mt-6">
              <Card className="rounded-3xl p-4 sm:p-6" dir={pkg.language === "ar" ? "rtl" : "ltr"}>
                <h3 className="mb-4 font-display text-lg font-bold text-primary">
                  {t.mindMapTitle}
                </h3>
                <MindMap pkg={pkg} />
              </Card>
            </TabsContent>
            <TabsContent value="summary" className="mt-6">
              <SummaryTab pkg={pkg} />
            </TabsContent>
            <TabsContent value="sheet" className="mt-6">
              <WorksheetTab pkg={pkg} />
            </TabsContent>
            <TabsContent value="editor" className="mt-6">
              <EditorTab pkg={pkg} onChange={setPkg} />
            </TabsContent>
          </Tabs>
        </section>
      )}

      <footer className="no-print border-t border-border bg-card/60 px-4 py-8 text-center">
        <img
          src={partyImg}
          alt={lang === "ar" ? "حيوان يحتفل" : "Party animal"}
          className="mx-auto size-12 animate-bounce-slow"
        />
        <p className="mt-3 font-display text-base font-bold text-primary">{t.footer}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t.poweredBy}</p>
      </footer>
    </main>
  );
}
