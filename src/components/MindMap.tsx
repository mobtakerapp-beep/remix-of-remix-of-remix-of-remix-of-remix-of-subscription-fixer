import { BookOpen, Lightbulb, Network, Tag } from "lucide-react";

import type { LessonPackage } from "@/lib/lesson-types";

type Node = { label: string; children: string[] };
export type Branch = Node;

const TONES = [
  "border-primary/35 bg-secondary/70",
  "border-emerald/35 bg-accent/60",
  "border-amber/45 bg-amber/10",
  "border-primary/25 bg-card",
];

/**
 * Build a real hierarchy: main idea -> main branches -> sub branches.
 * Sections of the detailed summary are the branches; their points (and
 * nested sub-points) become the leaves.
 */
export function buildBranches(pkg: LessonPackage): Branch[] {
  if (pkg.summarySections.length) {
    return pkg.summarySections.slice(0, 6).map((section) => ({
      label: section.heading,
      children: section.points
        .slice(0, 6)
        .flatMap((point) => [point.text, ...point.subPoints.slice(0, 3)]),
    }));
  }
  const base = (pkg.summaryPoints.length ? pkg.summaryPoints : pkg.highlights).slice(0, 4);
  const terms = pkg.flashcards.map((f) => f.term);
  if (!base.length) return [];
  return base.map((label, i) => ({
    label,
    children: terms.filter((_, k) => k % base.length === i).slice(0, 3),
  }));
}

/** A responsive HTML mind map. It avoids SVG text collisions in Arabic and print. */
export function MindMap({ pkg }: { pkg: LessonPackage }) {
  const ar = pkg.language === "ar";
  const branches = buildBranches(pkg);
  if (!branches.length) return null;

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      className="mind-map w-full overflow-hidden rounded-3xl border border-primary/20 bg-card p-4 sm:p-6"
    >
      <div className="mx-auto flex max-w-lg items-center justify-center gap-3 rounded-2xl bg-primary px-5 py-4 text-center text-primary-foreground shadow-[var(--shadow-soft)] print:shadow-none">
        <Network className="size-6 shrink-0" />
        <div>
          <p className="text-xs font-bold opacity-80">{ar ? "الفكرة الرئيسية" : "Main idea"}</p>
          <h4 className="font-display text-base font-extrabold leading-7">{pkg.title}</h4>
        </div>
      </div>

      <div className="mx-auto h-6 w-0.5 bg-primary/40" />
      <div className="relative mx-auto max-w-4xl">
        <div className="absolute inset-x-[12%] top-0 hidden h-0.5 bg-primary/30 sm:block" />
        <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          {branches.map((b, i) => (
            <article key={`${b.label}-${i}`} className="flex min-w-0 break-inside-avoid flex-col items-center">
              <span className="h-5 w-0.5 bg-primary/35" />
              <div className={`h-full w-full rounded-2xl border-2 p-4 ${TONES[i % TONES.length]}`}>
                <div className="flex items-start gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-card text-primary">
                    {i % 3 === 0 ? <Lightbulb className="size-4" /> : i % 3 === 1 ? <BookOpen className="size-4" /> : <Tag className="size-4" />}
                  </span>
                  <p className="min-w-0 text-sm font-extrabold leading-7 text-foreground">{b.label}</p>
                </div>
                {b.children.length > 0 && (
                  <ul className="mt-3 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    {b.children.map((c, k) => (
                      <li key={`${c}-${k}`} className="flex items-start gap-1.5">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald" />
                        <span className="leading-6">{c}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
