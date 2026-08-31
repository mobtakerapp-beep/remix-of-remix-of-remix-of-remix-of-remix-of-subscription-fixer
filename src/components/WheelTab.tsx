import { Eye, RotateCw } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { fmtNum, optionLetter, type LessonPackage } from "@/lib/lesson-types";

type WheelQuestion = { id: string; label: string; prompt: string; answer: string };

const SEGMENT_TONES = ["var(--primary)", "var(--emerald)", "var(--amber)"];

export function WheelTab({ pkg }: { pkg: LessonPackage }) {
  const { t: tr } = useI18n();
  const dir = pkg.language === "ar" ? "rtl" : "ltr";
  const ar = pkg.language === "ar";
  const questions = useMemo<WheelQuestion[]>(
    () => [
      ...pkg.mcqs.map((m, i) => ({
        id: m.id,
        label: `${ar ? "س" : "Q"}${fmtNum(i + 1, pkg.numerals)}`,
        prompt: `${m.question}\n${m.options.map((o, k) => `${optionLetter(k, pkg.language)}. ${o}`).join("\n")}`,
        answer: m.options[m.answerIndex] ?? "",
      })),
      ...pkg.trueFalse.map((t, i) => ({
        id: t.id,
        label: `${ar ? "ص" : "T"}${fmtNum(i + 1, pkg.numerals)}`,
        prompt: t.statement,
        answer: t.answer ? tr.trueLabel : tr.falseLabel,
      })),
    ],
    [pkg, tr, ar],
  );

  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [selected, setSelected] = useState<WheelQuestion | null>(null);
  const [revealed, setRevealed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!questions.length) return <p className="text-muted-foreground">{tr.noQuestions}</p>;

  const slice = 360 / questions.length;

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setRevealed(false);
    setSelected(null);
    const index = Math.floor(Math.random() * questions.length);
    const target = 360 * 6 + (360 - (index * slice + slice / 2));
    setAngle((a) => a + (target - (a % 360)));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSelected(questions[index] ?? null);
      setSpinning(false);
    }, 4200);
  };

  const radius = 150;
  const center = 160;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="absolute left-1/2 top-0 z-10 size-0 -translate-x-1/2 border-x-[12px] border-t-[22px] border-x-transparent border-t-amber" />
          <svg
            viewBox="0 0 320 320"
            className="size-[300px] drop-shadow-xl sm:size-[360px]"
            style={{
              transform: `rotate(${angle}deg)`,
              transition: "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)",
            }}
            role="img"
            aria-label="Question spinning wheel"
          >
            {questions.map((q, i) => {
              const start = (i * slice - 90) * (Math.PI / 180);
              const end = ((i + 1) * slice - 90) * (Math.PI / 180);
              const x1 = center + radius * Math.cos(start);
              const y1 = center + radius * Math.sin(start);
              const x2 = center + radius * Math.cos(end);
              const y2 = center + radius * Math.sin(end);
              const mid = (start + end) / 2;
              return (
                <g key={q.id}>
                  <path
                    d={`M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${slice > 180 ? 1 : 0} 1 ${x2},${y2} Z`}
                    fill={SEGMENT_TONES[i % SEGMENT_TONES.length]}
                    stroke="var(--background)"
                    strokeWidth={2}
                    opacity={0.92}
                  />
                  <text
                    x={center + radius * 0.68 * Math.cos(mid)}
                    y={center + radius * 0.68 * Math.sin(mid)}
                    fill="white"
                    fontSize="14"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {q.label}
                  </text>
                </g>
              );
            })}
            <circle cx={center} cy={center} r={34} fill="var(--card)" />
            <text
              x={center}
              y={center}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="13"
              fontWeight="700"
              fill="var(--foreground)"
            >
              {tr.spin.split(" ")[0]}
            </text>
          </svg>
        </div>
        <Button
          size="lg"
          className="mt-6 gradient-hero text-primary-foreground"
          onClick={spin}
          disabled={spinning}
        >
          <RotateCw className={`mr-2 size-5 ${spinning ? "animate-spin" : ""}`} />
          {spinning ? tr.spinning : tr.spin}
        </Button>
      </div>

      <Card className="min-h-64 p-6" dir={dir}>
        {selected ? (
          <div className="space-y-4">
            <Badge className="bg-emerald text-emerald-foreground">{selected.label}</Badge>
            <p className="whitespace-pre-line text-xl font-semibold leading-relaxed">
              {selected.prompt}
            </p>
            {revealed ? (
              <div className="rounded-xl bg-accent p-4 text-accent-foreground">
                <p className="text-sm font-medium opacity-70">{tr.theAnswer}</p>
                <p className="text-lg font-bold">{selected.answer}</p>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setRevealed(true)}>
                <Eye className="mr-2 size-4" /> {tr.reveal}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
            <p className="text-lg font-medium">{tr.spinHint}</p>
            
          </div>
        )}
      </Card>
    </div>
  );
}
