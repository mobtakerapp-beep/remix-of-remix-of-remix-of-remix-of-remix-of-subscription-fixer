import { Info, Printer } from "lucide-react";
import { useRef, useState } from "react";

import catImg from "@/assets/cat.png";
import dogImg from "@/assets/dog.png";
import partyImg from "@/assets/party.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useI18n, type Dict } from "@/lib/i18n";
import { fmtNum, optionLetter, type LessonPackage } from "@/lib/lesson-types";
import { exportNodeToPdf } from "@/lib/pdf-export";

function McqItem({
  m,
  index,
  answerKey,
  pkg,
}: {
  m: LessonPackage["mcqs"][number];
  index: number;
  answerKey: boolean;
  pkg: LessonPackage;
}) {
  const ar = pkg.language === "ar";
  const num = (n: number | string) => fmtNum(n, pkg.numerals);
  return (
    <li className="break-inside-avoid rounded-2xl border border-border p-3">
      <p className="font-semibold leading-relaxed">
        {num(index + 1)}. {m.question}
      </p>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2 print:grid-cols-2">
        {m.options.map((o, k) => (
          <span
            key={k}
            className={
              answerKey && k === m.answerIndex
                ? "flex items-center gap-2 font-bold text-emerald"
                : "flex items-center gap-2"
            }
          >
            <span className="grid size-5 shrink-0 place-items-center rounded-full border border-primary/50 text-[11px]">
              {optionLetter(k, pkg.language)}
            </span>
            {o}
          </span>
        ))}
      </div>
    </li>
  );
}

function TfItem({
  tf,
  index,
  answerKey,
  pkg,
}: {
  tf: LessonPackage["trueFalse"][number];
  index: number;
  answerKey: boolean;
  pkg: LessonPackage;
}) {
  const ar = pkg.language === "ar";
  const num = (n: number | string) => fmtNum(n, pkg.numerals);
  return (
    <li className="flex items-start justify-between gap-4 break-inside-avoid rounded-2xl border border-border px-3 py-2">
      <span className="leading-relaxed">
        {num(index + 1)}. {tf.statement}
      </span>
      <span className="whitespace-nowrap text-muted-foreground">
        {answerKey ? (
          <b className="text-emerald">
            {tf.answer ? (ar ? "صح ✔" : "True ✔") : ar ? "خطأ ✘" : "False ✘"}
          </b>
        ) : (
          <>
            <span className="mx-1 inline-block size-4 rounded border border-primary/50 align-middle" />
            <span className="mx-1 inline-block size-4 rounded border border-primary/50 align-middle" />
          </>
        )}
      </span>
    </li>
  );
}

function FlashItem({
  f,
  answerKey,
}: {
  f: LessonPackage["flashcards"][number];
  answerKey: boolean;
}) {
  return (
    <li className="break-inside-avoid rounded-2xl border border-border p-3">
      <b className="text-emerald">{f.term}</b>
      <p className="mt-1 leading-relaxed">
        {answerKey ? f.definition : "________________________"}
      </p>
    </li>
  );
}

function SheetHeader({ pkg, ar }: { pkg: LessonPackage; ar: boolean }) {
  return (
    <header className="border-b-4 border-double border-primary px-10 pb-5 pt-8 print:px-0 print:pt-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-xs font-bold text-emerald ${ar ? "" : "uppercase tracking-widest"}`}
          >
            {ar ? "ورقة عمل" : "Worksheet"}
          </p>
          <h2 className="mt-1 font-display text-2xl font-extrabold leading-snug text-primary">
            {pkg.title}
          </h2>
        </div>
        <div className="flex shrink-0 items-end gap-1">
          <img src={catImg} alt="" className="sheet-mascot size-12" />
          <img src={dogImg} alt="" className="sheet-mascot size-14" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3 print:grid-cols-3">
        <p className="rounded-xl border border-dashed border-primary/40 px-3 py-2">
          {ar ? "الاسم" : "Name"}: ______________
        </p>
        <p className="rounded-xl border border-dashed border-primary/40 px-3 py-2">
          {ar ? "الصف" : "Class"}: __________
        </p>
        <p className="rounded-xl border border-dashed border-primary/40 px-3 py-2">
          {ar ? "التاريخ" : "Date"}: __________
        </p>
      </div>
    </header>
  );
}

function Sheet({
  pkg,
  answerKey,
  teacher,
  t,
}: {
  pkg: LessonPackage;
  answerKey: boolean;
  teacher: string;
  t: Dict;
}) {
  const ar = pkg.language === "ar";
  const dir = ar ? "rtl" : "ltr";
  const num = (n: number | string) => fmtNum(n, pkg.numerals);

  return (
    <div
      dir={dir}
      className="mx-auto w-full max-w-[820px] overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-[var(--shadow-soft)] print:max-w-none print:rounded-none print:border-0 print:shadow-none"
    >
      <SheetHeader pkg={pkg} ar={ar} />

      <div className="px-10 pb-10 print:px-0 print:pb-0">
        {pkg.mcqs.length > 0 && (
          <section className="mt-7">
            <div className="break-inside-avoid">
              <h3 className="flex items-center gap-2 font-display text-base font-extrabold text-primary">
                <span className="grid size-7 place-items-center rounded-full border border-primary bg-primary text-sm text-primary-foreground">
                  {num(1)}
                </span>
                {ar ? "اختر الإجابة الصحيحة" : "Multiple choice"}
              </h3>
              <ol className="mt-3 space-y-4 text-sm">
                <McqItem m={pkg.mcqs[0]!} index={0} answerKey={answerKey} pkg={pkg} />
              </ol>
            </div>
            {pkg.mcqs.length > 1 && (
              <ol className="mt-3 space-y-4 text-sm" start={2}>
                {pkg.mcqs.slice(1).map((m, i) => (
                  <McqItem key={m.id} m={m} index={i + 1} answerKey={answerKey} pkg={pkg} />
                ))}
              </ol>
            )}
          </section>
        )}

        {pkg.trueFalse.length > 0 && (
          <section className="mt-7">
            <div className="break-inside-avoid">
              <h3 className="flex items-center gap-2 font-display text-base font-extrabold text-primary">
                <span className="grid size-7 place-items-center rounded-full border border-primary bg-primary text-sm text-primary-foreground">
                  {num(2)}
                </span>
                {ar ? "صح أم خطأ" : "True or False"}
              </h3>
              <ol className="mt-3 space-y-2 text-sm">
                <TfItem tf={pkg.trueFalse[0]!} index={0} answerKey={answerKey} pkg={pkg} />
              </ol>
            </div>
            {pkg.trueFalse.length > 1 && (
              <ol className="mt-3 space-y-2 text-sm" start={2}>
                {pkg.trueFalse.slice(1).map((tf, i) => (
                  <TfItem key={tf.id} tf={tf} index={i + 1} answerKey={answerKey} pkg={pkg} />
                ))}
              </ol>
            )}
          </section>
        )}

        {pkg.flashcards.length > 0 && (
          <section className="mt-7">
            <div className="break-inside-avoid">
              <h3 className="flex items-center gap-2 font-display text-base font-extrabold text-primary">
                <span className="grid size-7 place-items-center rounded-full border border-primary bg-primary text-sm text-primary-foreground">
                  {num(3)}
                </span>
                {ar ? "المفاهيم والمصطلحات" : "Key vocabulary"}
              </h3>
              <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2 print:grid-cols-2">
                <FlashItem f={pkg.flashcards[0]!} answerKey={answerKey} />
              </ul>
            </div>
            {pkg.flashcards.length > 1 && (
              <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2 print:grid-cols-2">
                {pkg.flashcards.slice(1).map((f) => (
                  <FlashItem key={f.id} f={f} answerKey={answerKey} />
                ))}
              </ul>
            )}
          </section>
        )}

        <footer className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>{ar ? "بالتوفيق يا أبطال! 🌟" : "Good luck, champions! 🌟"}</span>
          <span>{teacher ? `${t.preparedBy} ${teacher}` : ""}</span>
          <img src={partyImg} alt="" className="sheet-mascot size-10" />
        </footer>
      </div>
    </div>
  );
}

export function WorksheetTab({ pkg }: { pkg: LessonPackage }) {
  const { t } = useI18n();
  const [answerKey, setAnswerKey] = useState(false);
  const [teacher, setTeacher] = useState("");
  const [exporting, setExporting] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const downloadPdf = async () => {
    if (!sheetRef.current) return;
    setExporting(true);
    try {
      await exportNodeToPdf(sheetRef.current, `${pkg.title || "worksheet"}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-3">
            <Switch id="key" checked={answerKey} onCheckedChange={setAnswerKey} />
            <Label htmlFor="key">{t.showKey}</Label>
          </div>
          <div className="min-w-56">
            <Label htmlFor="teacher-worksheet">{t.teacherName}</Label>
            <Input
              id="teacher-worksheet"
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              placeholder={t.teacherPlaceholder}
              className="mt-1.5 rounded-xl"
            />
          </div>
        </div>
        <Button
          onClick={downloadPdf}
          disabled={exporting}
          className="rounded-full gradient-hero text-primary-foreground"
        >
          <Printer className="mr-2 size-4" /> {exporting ? t.preparingPdf : t.print}
        </Button>
      </div>

      <p className="no-print flex items-start gap-2 rounded-2xl bg-secondary/60 px-4 py-3 text-xs text-secondary-foreground">
        <Info className="mt-0.5 size-4 shrink-0" /> {t.pdfTip}
      </p>

      <div ref={sheetRef} className="worksheet-export bg-card">
        <Sheet pkg={pkg} answerKey={answerKey} teacher={teacher} t={t} />
      </div>
    </div>
  );
}
