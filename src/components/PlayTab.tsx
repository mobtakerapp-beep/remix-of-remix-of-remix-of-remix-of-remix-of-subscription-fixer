import { Check, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { useMemo, useState } from "react";

import catImg from "@/assets/cat.png";
import dogImg from "@/assets/dog.png";
import partyImg from "@/assets/party.png";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n";
import { playClick, playCorrect, playWin, playWrong, setSoundEnabled } from "@/lib/sfx";
import { fmtNum, optionLetter, type LessonPackage } from "@/lib/lesson-types";

type Item = {
  id: string;
  kind: "mcq" | "tf";
  prompt: string;
  options: string[];
  answerIndex: number;
};

export function PlayTab({ pkg }: { pkg: LessonPackage }) {
  const { t } = useI18n();
  const dir = pkg.language === "ar" ? "rtl" : "ltr";
  const ar = pkg.language === "ar";
  const num = (n: number | string) => fmtNum(n, pkg.numerals);

  const items = useMemo<Item[]>(
    () => [
      ...pkg.mcqs.map((m) => ({
        id: m.id,
        kind: "mcq" as const,
        prompt: m.question,
        options: m.options,
        answerIndex: m.answerIndex,
      })),
      ...pkg.trueFalse.map((q) => ({
        id: q.id,
        kind: "tf" as const,
        prompt: q.statement,
        options: ar ? ["صح", "خطأ"] : ["True", "False"],
        answerIndex: q.answer ? 0 : 1,
      })),
    ],
    [pkg, ar],
  );

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [sound, setSound] = useState(true);

  if (!items.length) return <p className="text-muted-foreground">{t.noQuestions}</p>;

  const current = items[index]!;
  const progress = ((index + (picked === null ? 0 : 1)) / items.length) * 100;

  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === current.answerIndex) {
      setScore((s) => s + 1);
      playCorrect();
    } else {
      playWrong();
    }
  };

  const next = () => {
    playClick();
    if (index + 1 >= items.length) {
      setFinished(true);
      playWin();
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null);
  };

  const restart = () => {
    playClick();
    setIndex(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <Card dir={dir} className="overflow-hidden p-10 text-center">
        <img
          src={partyImg}
          alt=""
          width={512}
          height={512}
          loading="lazy"
          className="mx-auto size-48 animate-bounce-slow object-contain"
        />
        <h3 className="mt-4 text-3xl font-extrabold text-primary">{t.resultTitle}</h3>
        <p className="mt-2 text-lg text-muted-foreground">
          {t.resultSub} {num(score)} / {num(items.length)} {t.questionsWord}
        </p>
        <Button size="lg" className="mt-6 gradient-hero text-primary-foreground" onClick={restart}>
          <RotateCcw className="me-2 size-5" /> {t.restart}
        </Button>
      </Card>
    );
  }

  return (
    <div dir={dir} className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <img
            src={index % 2 ? dogImg : catImg}
            alt=""
            width={512}
            height={512}
            loading="lazy"
            className="size-12 animate-wiggle object-contain"
          />
          <div>
            <p className="text-sm text-muted-foreground">
              {t.question} {num(index + 1)} {t.of} {num(items.length)}
            </p>
            <p className="font-bold text-emerald">
              {t.score}: {num(score)}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t.sound}
          onClick={() => {
            const on = !sound;
            setSound(on);
            setSoundEnabled(on);
          }}
        >
          {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </Button>
      </div>

      <Progress value={progress} className="h-3" />

      <Card className="p-6 sm:p-8">
        <p className="text-center text-2xl font-bold leading-relaxed sm:text-3xl">
          {current.prompt}
        </p>

        <div
          className={`mt-8 grid gap-3 ${current.kind === "tf" ? "grid-cols-2" : "sm:grid-cols-2"}`}
        >
          {current.options.map((opt, i) => {
            const isAnswer = i === current.answerIndex;
            const isPicked = picked === i;
            const state =
              picked === null
                ? "idle"
                : isAnswer
                  ? "correct"
                  : isPicked
                    ? "wrong"
                    : "dim";
            return (
              <button
                key={`${current.id}-${i}`}
                type="button"
                onClick={() => choose(i)}
                disabled={picked !== null}
                className={[
                  "flex items-center justify-between gap-3 rounded-2xl border-2 p-5 text-start text-lg font-semibold transition-all",
                  current.kind === "tf" ? "justify-center text-2xl" : "",
                  state === "idle"
                    ? "border-border bg-card hover:-translate-y-1 hover:border-primary hover:shadow-[var(--shadow-soft)]"
                    : "",
                  state === "correct"
                    ? "animate-pop border-emerald bg-emerald text-emerald-foreground"
                    : "",
                  state === "wrong" ? "animate-shake border-destructive bg-destructive/10" : "",
                  state === "dim" ? "border-border opacity-50" : "",
                ].join(" ")}
              >
                <span className="flex items-center gap-2">
                  {current.kind === "mcq" && (
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-primary/50 text-sm">
                      {optionLetter(i, pkg.language)}
                    </span>
                  )}
                  {opt}
                </span>
                {state === "correct" && <Check className="size-6 shrink-0" />}
                {state === "wrong" && <X className="size-6 shrink-0 text-destructive" />}
              </button>
            );
          })}
        </div>

        {picked !== null && (
          <div className="mt-6 flex flex-col items-center gap-4">
            <p
              className={`text-xl font-bold ${picked === current.answerIndex ? "text-emerald" : "text-destructive"}`}
            >
              {picked === current.answerIndex
                ? t.correct
                : `${t.wrong} — ${t.theAnswer}: ${current.options[current.answerIndex]}`}
            </p>
            <Button size="lg" className="gradient-hero text-primary-foreground" onClick={next}>
              {index + 1 >= items.length ? t.finish : t.next}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
