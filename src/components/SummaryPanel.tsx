import { BookOpenText, CheckCircle2, Sparkles } from "lucide-react";

import type { LessonPackage } from "@/lib/lesson-types";

export function SummaryPanel({ pkg, compact = false }: { pkg: LessonPackage; compact?: boolean }) {
  const ar = pkg.language === "ar";
  const sections = pkg.summarySections;
  const points = pkg.summaryPoints.length ? pkg.summaryPoints : pkg.highlights;

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      className="summary-panel relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-card p-5 shadow-[var(--shadow-soft)]"
    >
      <div className="absolute inset-x-0 top-0 h-1.5 gradient-warm" />
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <BookOpenText className="size-6" />
        </span>
        <div>
          <p className="text-xs font-bold text-emerald">{ar ? "مراجعة مركزة" : "Focused review"}</p>
          <h3 className="font-display text-xl font-extrabold text-primary">
            {ar ? "ملخص الدرس بالتفصيل" : "Detailed lesson summary"}
          </h3>
        </div>
        <Sparkles className="ms-auto size-5 text-amber" />
      </div>

      {pkg.summary && (
        <p className="mt-4 border-s-4 border-amber ps-4 text-sm font-medium leading-8 text-foreground">
          {pkg.summary}
        </p>
      )}

      {sections.length > 0 ? (
        <div className={`mt-5 space-y-5 ${compact ? "print:columns-2 print:gap-6" : ""}`}>
          {sections.map((section, sectionIndex) => (
            <article key={`${section.heading}-${sectionIndex}`} className="rounded-2xl border border-emerald/25 bg-accent/45 p-4 break-inside-avoid">
              <h4 className="flex items-center gap-2 font-display text-base font-extrabold text-primary">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald text-sm text-emerald-foreground">
                  {sectionIndex + 1}
                </span>
                {section.heading}
              </h4>
              <ul className="mt-3 space-y-2 text-sm leading-7">
                {section.points.map((point, pointIndex) => (
                  <li key={`${point.text}-${pointIndex}`}>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald" />
                      <span>{point.text}</span>
                    </div>
                    {point.subPoints.length > 0 && (
                      <ul className="ms-6 mt-1 space-y-1 border-s-2 border-amber/50 ps-4 text-muted-foreground">
                        {point.subPoints.map((subPoint, subIndex) => (
                          <li key={`${subPoint}-${subIndex}`} className="flex items-start gap-2">
                            <span className="mt-3 size-1.5 shrink-0 rounded-full bg-amber" />
                            <span>{subPoint}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      ) : points.length > 0 && (
        <div className={`mt-5 grid gap-3 ${compact ? "sm:grid-cols-2 print:grid-cols-2" : "md:grid-cols-2"}`}>
          {points.map((point, index) => (
            <div key={`${point}-${index}`} className="flex items-start gap-3 rounded-2xl border border-emerald/25 bg-accent/45 p-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-emerald text-emerald-foreground"><CheckCircle2 className="size-4" /></span>
              <p className="text-sm leading-7">{point}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
