import { Check, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { uid, type LessonPackage } from "@/lib/lesson-types";

export function EditorTab({
  pkg,
  onChange,
}: {
  pkg: LessonPackage;
  onChange: (next: LessonPackage) => void;
}) {
  const { t } = useI18n();
  const dir = pkg.language === "ar" ? "rtl" : "ltr";
  const patch = (p: Partial<LessonPackage>) => onChange({ ...pkg, ...p });

  return (
    <div className="space-y-8" dir={dir}>
      <Card className="p-5">
        <Label>{t.lessonTitle}</Label>
        <Input
          className="mt-2"
          value={pkg.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
        <Label className="mt-4 block">{t.summaryLabel}</Label>
        <Textarea
          className="mt-2"
          value={pkg.summary}
          onChange={(e) => patch({ summary: e.target.value })}
        />
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{t.mcq} ({pkg.mcqs.length})</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              patch({
                mcqs: [
                  ...pkg.mcqs,
                  { id: uid(), question: "", options: ["", "", "", ""], answerIndex: 0 },
                ],
              })
            }
          >
            <Plus className="mr-1 size-4" /> {t.add}
          </Button>
        </div>
        {pkg.mcqs.map((m, i) => (
          <Card key={m.id} className="space-y-3 p-5">
            <div className="flex items-start gap-3">
              <Textarea
                value={m.question}
                placeholder={`Question ${i + 1}`}
                onChange={(e) => {
                  const mcqs = [...pkg.mcqs];
                  mcqs[i] = { ...m, question: e.target.value };
                  patch({ mcqs });
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={t.deleteItem}
                onClick={() => patch({ mcqs: pkg.mcqs.filter((x) => x.id !== m.id) })}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {m.options.map((o, k) => (
                <div key={k} className="flex items-center gap-2">
                  <Button
                    variant={m.answerIndex === k ? "default" : "outline"}
                    size="icon"
                    aria-label={`Mark option ${k + 1} correct`}
                    onClick={() => {
                      const mcqs = [...pkg.mcqs];
                      mcqs[i] = { ...m, answerIndex: k };
                      patch({ mcqs });
                    }}
                  >
                    <Check className="size-4" />
                  </Button>
                  <Input
                    value={o}
                    onChange={(e) => {
                      const mcqs = [...pkg.mcqs];
                      const options = [...m.options];
                      options[k] = e.target.value;
                      mcqs[i] = { ...m, options };
                      patch({ mcqs });
                    }}
                  />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{t.tf} ({pkg.trueFalse.length})</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              patch({
                trueFalse: [...pkg.trueFalse, { id: uid(), statement: "", answer: true }],
              })
            }
          >
            <Plus className="mr-1 size-4" /> {t.add}
          </Button>
        </div>
        {pkg.trueFalse.map((q, i) => (
          <Card key={q.id} className="flex flex-wrap items-center gap-3 p-4">
            <Input
              className="min-w-56 flex-1"
              value={q.statement}
              onChange={(e) => {
                const trueFalse = [...pkg.trueFalse];
                trueFalse[i] = { ...q, statement: e.target.value };
                patch({ trueFalse });
              }}
            />
            <Button
              variant={q.answer ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const trueFalse = [...pkg.trueFalse];
                trueFalse[i] = { ...q, answer: !q.answer };
                patch({ trueFalse });
              }}
            >
              {q.answer ? t.trueLabel : t.falseLabel}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t.deleteItem}
              onClick={() => patch({ trueFalse: pkg.trueFalse.filter((x) => x.id !== q.id) })}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{t.cards} ({pkg.flashcards.length})</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              patch({
                flashcards: [...pkg.flashcards, { id: uid(), term: "", definition: "" }],
              })
            }
          >
            <Plus className="mr-1 size-4" /> {t.add}
          </Button>
        </div>
        {pkg.flashcards.map((f, i) => (
          <Card key={f.id} className="flex flex-wrap items-center gap-3 p-4">
            <Input
              className="w-48"
              placeholder={t.term}
              value={f.term}
              onChange={(e) => {
                const flashcards = [...pkg.flashcards];
                flashcards[i] = { ...f, term: e.target.value };
                patch({ flashcards });
              }}
            />
            <Input
              className="min-w-56 flex-1"
              placeholder={t.definition}
              value={f.definition}
              onChange={(e) => {
                const flashcards = [...pkg.flashcards];
                flashcards[i] = { ...f, definition: e.target.value };
                patch({ flashcards });
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={t.deleteItem}
              onClick={() => patch({ flashcards: pkg.flashcards.filter((x) => x.id !== f.id) })}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </Card>
        ))}
      </section>
    </div>
  );
}
