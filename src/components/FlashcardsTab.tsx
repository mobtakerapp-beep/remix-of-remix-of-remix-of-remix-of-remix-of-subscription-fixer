import { RotateCcw } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import type { LessonPackage } from "@/lib/lesson-types";

type CardItem = { id: string; front: string; back: string; kind: string };

function FlipCard({ item, dir }: { item: CardItem; dir: "rtl" | "ltr" }) {
  const { t } = useI18n();
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      dir={dir}
      className="flip-card h-52 w-full text-start"
      data-flipped={flipped}
      onClick={() => setFlipped((f) => !f)}
      aria-label={`Flip card: ${item.front}`}
    >
      <div className="flip-inner h-full w-full">
        <div className="flip-face flex h-full w-full flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <Badge variant="secondary">{item.kind}</Badge>
          <p className="text-lg font-semibold leading-snug text-card-foreground">{item.front}</p>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RotateCcw className="size-3.5" /> {t.tapReveal}
          </span>
        </div>
        <div className="flip-face flip-back flex h-full w-full flex-col justify-between rounded-2xl border border-transparent gradient-hero p-5 text-primary-foreground shadow-[var(--shadow-lift)]">
          <span className="text-xs uppercase tracking-wide opacity-80">{t.answer}</span>
          <p className="text-lg font-semibold leading-snug">{item.back}</p>
          <span className="text-xs opacity-80">{t.tapBack}</span>
        </div>
      </div>
    </button>
  );
}

export function FlashcardsTab({ pkg }: { pkg: LessonPackage }) {
  const { t } = useI18n();
  const dir = pkg.language === "ar" ? "rtl" : "ltr";
  const items: CardItem[] = [
    ...pkg.flashcards.map((f) => ({
      id: `f-${f.id}`,
      front: f.term,
      back: f.definition,
      kind: t.cards,
    })),
    ...pkg.mcqs.map((m) => ({
      id: `m-${m.id}`,
      front: m.question,
      back: m.options[m.answerIndex] ?? "",
      kind: t.mcq,
    })),
    ...pkg.trueFalse.map((q) => ({
      id: `t-${q.id}`,
      front: q.statement,
      back: q.answer ? t.trueLabel : t.falseLabel,
      kind: t.tf,
    })),
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <FlipCard key={item.id} item={item} dir={dir} />
      ))}
    </div>
  );
}
