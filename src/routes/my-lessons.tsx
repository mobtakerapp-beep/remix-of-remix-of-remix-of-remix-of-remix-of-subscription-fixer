import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Home, Loader2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { deleteLesson, listMyLessons, type SavedLesson } from "@/lib/lessons.functions";

export const Route = createFileRoute("/my-lessons")({
  head: () => ({
    meta: [
      { title: "دروسي المحفوظة — مولّد الدروس الذكي" },
      { name: "description", content: "سجل الدروس والأسئلة التي حفظتها." },
      { property: "og:title", content: "دروسي المحفوظة" },
      { property: "og:description", content: "عرض وحذف الدروس المحفوظة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MyLessonsPage,
});

function MyLessonsPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const fetchLessons = useServerFn(listMyLessons);
  const remove = useServerFn(deleteLesson);
  const [lessons, setLessons] = useState<SavedLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      try {
        setLessons(await fetchLessons({ data: undefined } as never));
      } catch {
        toast.error(ar ? "فشل تحميل الدروس" : "Failed to load lessons");
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchLessons, navigate, ar]);

  const del = async (id: string) => {
    if (!confirm(ar ? "متأكدة من حذف هذا الدرس؟" : "Delete this lesson?")) return;
    try {
      await remove({ data: { id } });
      setLessons((prev) => prev.filter((l) => l.id !== id));
      toast.success(ar ? "تم الحذف" : "Deleted");
    } catch {
      toast.error(ar ? "فشل الحذف" : "Failed to delete");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 sm:p-8" dir={ar ? "rtl" : "ltr"}>
      <Toaster position="top-center" />
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-extrabold text-primary">
            <BookOpen className="me-2 inline size-6" />
            {ar ? "دروسي المحفوظة" : "My saved lessons"}
          </h1>
          <Link
            to="/"
            aria-label={ar ? "الرجوع للصفحة الرئيسية" : "Back to home"}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Home className="size-4" />
            <span className="hidden sm:inline">{ar ? "الرئيسية" : "Home"}</span>
          </Link>
        </div>

        {lessons.length === 0 ? (
          <Card className="rounded-3xl p-8 text-center text-muted-foreground">
            {ar ? "لم تحفظي أي درس بعد." : "No saved lessons yet."}
          </Card>
        ) : (
          <div className="grid gap-4">
            {lessons.map((lesson) => (
              <Card key={lesson.id} className="rounded-3xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">{lesson.title}</h2>
                    <p className="text-xs text-muted-foreground">
                      {new Date(lesson.updatedAt).toLocaleDateString(ar ? "ar-EG" : "en-GB")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="rounded-full">
                      <Link to="/" search={{ lesson: lesson.id }}>{ar ? "فتح" : "Open"}</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => void del(lesson.id)}
                      aria-label={ar ? "حذف" : "Delete"}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
