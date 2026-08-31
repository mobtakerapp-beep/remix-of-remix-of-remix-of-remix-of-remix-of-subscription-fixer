import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Gamepad2, Home, Loader2, Printer, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import logoUrl from "@/assets/logo.png";
import { FlashcardsTab } from "@/components/FlashcardsTab";
import { PlayTab } from "@/components/PlayTab";
import { SummaryTab } from "@/components/SummaryTab";
import { WorksheetTab } from "@/components/WorksheetTab";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import type { LessonPackage } from "@/lib/lesson-types";
import { getSharedLesson } from "@/lib/shares.functions";

export const Route = createFileRoute("/s/$token")({
  head: () => ({
    meta: [
      { title: "درس مشترك — مولّد الدروس الذكي" },
      {
        name: "description",
        content: "درس تفاعلي مع أسئلة وبطاقات وورقة عمل، شاركه معلّمك معك.",
      },
      { property: "og:title", content: "درس تفاعلي مشترك" },
      {
        property: "og:description",
        content: "العب، راجع البطاقات، واطبع ورقة العمل — بدون تسجيل دخول.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SharedLessonPage,
});

function SharedLessonPage() {
  const { token } = Route.useParams();
  const { lang } = useI18n();
  const ar = lang === "ar";
  const load = useServerFn(getSharedLesson);
  const [pkg, setPkg] = useState<LessonPackage | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    void (async () => {
      try {
        const res = await load({ data: { token } });
        setPkg(res.package);
        setState("ready");
      } catch {
        setState("error");
      }
    })();
  }, [load, token]);

  return (
    <main className="min-h-screen blob-bg bg-background px-4 pb-16 pt-5">
      <Toaster position="top-center" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2 font-display font-extrabold text-primary">
          <img src={logoUrl} alt="" width={40} height={40} className="size-9" loading="lazy" />
          <span className="text-sm sm:text-base">
            {ar ? "مولّد الدروس الذكي" : "Smart Lesson Generator"}
          </span>
        </Link>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold sm:text-sm"
        >
          <Home className="size-4" /> {ar ? "الرئيسية" : "Home"}
        </Link>
      </div>

      {state === "loading" && (
        <div className="mx-auto mt-24 flex max-w-md flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p>{ar ? "جارٍ تحميل الدرس…" : "Loading the lesson…"}</p>
        </div>
      )}

      {state === "error" && (
        <Card className="mx-auto mt-20 max-w-md rounded-3xl p-8 text-center">
          <h1 className="font-display text-xl font-extrabold">
            {ar ? "الرابط غير صالح" : "This link is not valid"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {ar
              ? "تأكد من الرابط أو اطلب من معلّمك رابطًا جديدًا."
              : "Check the link or ask your teacher for a new one."}
          </p>
        </Card>
      )}

      {state === "ready" && pkg && (
        <section className="mx-auto mt-6 max-w-6xl">
          <Card className="mb-5 rounded-3xl p-5" dir={pkg.language === "ar" ? "rtl" : "ltr"}>
            <h1 className="flex items-center gap-2 font-display text-xl font-extrabold sm:text-2xl">
              <Sparkles className="size-5 text-amber" /> {pkg.title}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {ar
                ? "درس مشترك من معلّمك — العب، راجع، واطبع ورقة العمل."
                : "A lesson shared by your teacher — play, review and print the worksheet."}
            </p>
          </Card>

          <Tabs defaultValue="play">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl p-1 sm:grid-cols-4">
              <TabsTrigger value="play" className="rounded-xl py-2">
                <Gamepad2 className="mr-2 size-4" /> {ar ? "العب" : "Play"}
              </TabsTrigger>
              <TabsTrigger value="cards" className="rounded-xl py-2">
                <BookOpen className="mr-2 size-4" /> {ar ? "بطاقات" : "Cards"}
              </TabsTrigger>
              <TabsTrigger value="summary" className="rounded-xl py-2">
                <Sparkles className="mr-2 size-4" /> {ar ? "الملخص" : "Summary"}
              </TabsTrigger>
              <TabsTrigger value="sheet" className="rounded-xl py-2">
                <Printer className="mr-2 size-4" /> {ar ? "ورقة عمل" : "Worksheet"}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="play" className="mt-5">
              <PlayTab pkg={pkg} />
            </TabsContent>
            <TabsContent value="cards" className="mt-5">
              <FlashcardsTab pkg={pkg} />
            </TabsContent>
            <TabsContent value="summary" className="mt-5">
              <SummaryTab pkg={pkg} />
            </TabsContent>
            <TabsContent value="sheet" className="mt-5">
              <WorksheetTab pkg={pkg} />
            </TabsContent>
          </Tabs>
        </section>
      )}
    </main>
  );
}
