import { BookOpen, FileText, ImageIcon, Loader2, Sparkles, Type, UploadCloud, X, Youtube } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { lessonTemplates } from "@/lib/lesson-templates";
import { fmtNum, isRtl } from "@/lib/lesson-types";
import { parseYoutubeId } from "@/lib/youtube-url";

export type GenerateArgs = {
  mode: "text" | "pdf" | "image" | "youtube";
  text?: string;
  youtubeUrl?: string;
  fileName?: string;
  fileData?: string;
  mediaType?: string;
  counts: { mcq: number; trueFalse: number; flashcards: number };
  language: "auto" | "ar" | "en";
  numerals: "auto" | "ar" | "en";
  grade: number;
};

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("File could not be read"));
    reader.readAsDataURL(file);
  });
}

export function LessonInput({
  onGenerate,
  loading,
}: {
  onGenerate: (args: GenerateArgs) => void;
  loading: boolean;
}) {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<"text" | "pdf" | "image" | "youtube">("text");
  const [text, setText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mcq, setMcq] = useState(5);
  const [tf, setTf] = useState(5);
  const [cards, setCards] = useState(5);
  const [language, setLanguage] = useState<"auto" | "ar" | "en">("auto");
  const [numerals, setNumerals] = useState<"auto" | "ar" | "en">("auto");
  const [grade, setGrade] = useState(5);
  const pdfInput = useRef<HTMLInputElement>(null);
  const imgInput = useRef<HTMLInputElement>(null);

  const acceptFile = async (f: File | undefined, kind: "pdf" | "image") => {
    if (!f) return;
    if (kind === "pdf" && f.type !== "application/pdf") return void toast.error(t.errPdf);
    if (kind === "image" && !f.type.startsWith("image/")) return void toast.error(t.errImage);
    if (f.size > 12 * 1024 * 1024) return void toast.error(t.errBig);
    setFile(f);
    setImagePreview(kind === "image" ? await readAsDataUrl(f) : null);
  };

  const submit = async () => {
    const counts = { mcq, trueFalse: tf, flashcards: cards };
    if (mode === "text") {
      if (text.trim().length < 10) return void toast.error(t.errShortText);
      onGenerate({ mode, text, counts, language, numerals, grade });
      return;
    }
    if (mode === "youtube") {
      if (!parseYoutubeId(youtubeUrl)) return void toast.error(t.errYoutubeUrl);
      onGenerate({ mode, youtubeUrl: youtubeUrl.trim(), counts, language, numerals, grade });
      return;
    }
    if (!file) return void toast.error(t.errNoFile);
    const dataUrl = await readAsDataUrl(file);
    onGenerate({
      mode,
      fileName: file.name,
      fileData: dataUrl,
      mediaType: file.type,
      counts,
      language,
      numerals,
      grade,
    });
  };

  const dropZone = (kind: "pdf" | "image") => (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void acceptFile(e.dataTransfer.files[0], kind);
      }}
      onClick={() => (kind === "pdf" ? pdfInput : imgInput).current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-10 text-center transition-all ${
        dragging
          ? "scale-[1.01] border-primary bg-secondary"
          : "border-border bg-card hover:border-primary/60 hover:bg-secondary/40"
      }`}
    >
      <div className="rounded-full gradient-warm p-4 text-primary-foreground shadow-[var(--shadow-soft)]">
        {kind === "pdf" ? <FileText className="size-7" /> : <ImageIcon className="size-7" />}
      </div>
      <p className="text-lg font-bold text-foreground">
        {kind === "pdf" ? t.dropPdf : t.dropImage}
      </p>
      <p className="text-sm text-muted-foreground">
        {kind === "pdf" ? t.dropHintPdf : t.dropHintImage}
      </p>
      <input
        ref={kind === "pdf" ? pdfInput : imgInput}
        type="file"
        accept={kind === "pdf" ? "application/pdf" : "image/*"}
        className="hidden"
        onChange={(e) => void acceptFile(e.target.files?.[0], kind)}
      />
    </div>
  );

  const filePill = file && (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="flex min-w-0 items-center gap-3">
        {imagePreview ? (
          <img src={imagePreview} alt="" className="size-14 rounded-xl object-cover" />
        ) : (
          <div className="rounded-xl bg-secondary p-3 text-secondary-foreground">
            <FileText className="size-5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">
            {(file.size / 1024).toFixed(0)} KB · {t.ready}
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t.remove}
        onClick={() => {
          setFile(null);
          setImagePreview(null);
        }}
      >
        <X className="size-4" />
      </Button>
    </div>
  );

  const counter = (label: string, value: number, set: (n: number) => void, color: string) => (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">{label}</Label>
        <span className={`rounded-lg px-2.5 py-0.5 text-base font-extrabold ${color}`}>
          {value}
        </span>
      </div>
      <Slider
        className="mt-4"
        value={[value]}
        min={1}
        max={15}
        step={1}
        onValueChange={(v) => set(v[0] ?? 1)}
      />
    </div>
  );

  const applyTemplate = (tpl: (typeof lessonTemplates)[number]) => {
    setMode("text");
    setText(lang === "ar" ? tpl.textAr : tpl.textEn);
    setMcq(tpl.counts.mcq);
    setTf(tpl.counts.trueFalse);
    setCards(tpl.counts.flashcards);
    setGrade(tpl.grade);
    setNumerals(lang === "ar" ? "ar" : "en");
    setLanguage(lang === "ar" ? "ar" : "en");
    toast.success(lang === "ar" ? "تم ملء الدرس تلقائيًا" : "Lesson auto-filled");
  };

  return (
    <Card className="mx-auto w-full max-w-4xl rounded-3xl border-border/70 p-5 shadow-[var(--shadow-lift)] sm:p-7">
      <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl p-1.5 sm:grid-cols-4">
          <TabsTrigger value="text" className="rounded-xl py-2.5">
            <Type className="me-2 size-4" /> {t.tabText}
          </TabsTrigger>
          <TabsTrigger value="pdf" className="rounded-xl py-2.5">
            <FileText className="me-2 size-4" /> {t.tabPdf}
          </TabsTrigger>
          <TabsTrigger value="image" className="rounded-xl py-2.5">
            <ImageIcon className="me-2 size-4" /> {t.tabImage}
          </TabsTrigger>
          <TabsTrigger value="youtube" className="rounded-xl py-2.5">
            <Youtube className="me-2 size-4" /> {t.tabYoutube}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="mt-5">
          <Textarea
            dir={text ? (isRtl(text) ? "rtl" : "ltr") : lang === "ar" ? "rtl" : "ltr"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.textPlaceholder}
            className="min-h-52 resize-y rounded-2xl text-base"
          />
        </TabsContent>
        <TabsContent value="pdf" className="mt-5">
          {dropZone("pdf")}
          {filePill}
        </TabsContent>
        <TabsContent value="image" className="mt-5">
          {dropZone("image")}
          {filePill}
        </TabsContent>
        <TabsContent value="youtube" className="mt-5">
          <Input
            dir="ltr"
            type="url"
            inputMode="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder={t.youtubePlaceholder}
            className="h-12 rounded-2xl text-base"
          />
          <p className="mt-2 text-xs text-muted-foreground">{t.youtubeHint}</p>
          {youtubeUrl.trim() !== "" && !parseYoutubeId(youtubeUrl) && (
            <p className="mt-2 text-xs font-semibold text-destructive">{t.errYoutubeUrl}</p>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-5">
        <p className="mb-2 text-sm font-semibold text-muted-foreground">
          <BookOpen className="me-1 inline size-4" />
          {lang === "ar" ? "اختر قالب مادة سريعًا:" : "Pick a subject template:"}
        </p>
        <div className="flex flex-wrap gap-2">
          {lessonTemplates.map((tpl) => (
            <Button
              key={tpl.id}
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => applyTemplate(tpl)}
            >
              <span className="me-1">{tpl.emoji}</span>
              {lang === "ar" ? tpl.nameAr : tpl.nameEn}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {counter(t.mcq, mcq, setMcq, "bg-secondary text-secondary-foreground")}
        {counter(t.tf, tf, setTf, "bg-accent text-accent-foreground")}
        {counter(t.cards, cards, setCards, "bg-amber/30 text-amber-foreground")}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">{t.gradeLabel}</Label>
            <span className="rounded-lg bg-primary px-2.5 py-0.5 text-base font-extrabold text-primary-foreground">
              {lang === "ar" ? fmtNum(grade, "ar") : grade}
            </span>
          </div>
          <Slider
            className="mt-4"
            value={[grade]}
            min={1}
            max={12}
            step={1}
            onValueChange={(v) => setGrade(v[0] ?? 1)}
          />
          <p className="mt-2 text-xs text-muted-foreground">{t.gradeHint}</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <Label className="text-sm font-semibold">{t.numeralsLabel}</Label>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["auto", "ar", "en"] as const).map((n) => (
              <Button
                key={n}
                size="sm"
                className="rounded-full"
                variant={numerals === n ? "default" : "outline"}
                onClick={() => setNumerals(n)}
              >
                {n === "auto" ? t.auto : n === "ar" ? "١٢٣" : "123"}
              </Button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t.numeralsHint}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Label className="text-sm text-muted-foreground">{t.outLang}</Label>
          {(["auto", "ar", "en"] as const).map((l) => (
            <Button
              key={l}
              size="sm"
              className="rounded-full"
              variant={language === l ? "default" : "outline"}
              onClick={() => setLanguage(l)}
            >
              {l === "auto" ? t.auto : l === "ar" ? "العربية" : "English"}
            </Button>
          ))}
        </div>
        <Button
          size="lg"
          className="w-full rounded-full gradient-hero px-8 text-base text-primary-foreground shadow-[var(--shadow-soft)] transition-transform hover:scale-[1.03] sm:w-auto"
          disabled={loading}
          onClick={() => void submit()}
        >
          {loading ? (
            <>
              <Loader2 className="me-2 size-5 animate-spin" /> {t.generating}
            </>
          ) : (
            <>
              <Sparkles className="me-2 size-5" /> {t.generate}
            </>
          )}
        </Button>
      </div>
      {loading && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/3 animate-[pulse_1.2s_ease-in-out_infinite] gradient-warm" />
        </div>
      )}
      <p className="mt-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <UploadCloud className="size-3.5" /> {t.poweredBy}
      </p>
    </Card>
  );
}
