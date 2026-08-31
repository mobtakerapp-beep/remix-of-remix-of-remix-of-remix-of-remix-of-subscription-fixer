import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LessonPackage } from "./lesson-types";

const SummaryPointSchema = z.object({
  text: z.string(),
  subPoints: z.array(z.string()),
});

const SummarySectionSchema = z.object({
  heading: z.string(),
  points: z.array(SummaryPointSchema),
});

const MCQSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  answerIndex: z.number(),
});

const TrueFalseSchema = z.object({
  id: z.string(),
  statement: z.string(),
  answer: z.boolean(),
});

const FlashcardSchema = z.object({
  id: z.string(),
  term: z.string(),
  definition: z.string(),
});

const LessonPackageSchema = z.object({
  title: z.string(),
  summary: z.string(),
  summaryPoints: z.array(z.string()),
  summarySections: z.array(SummarySectionSchema),
  highlights: z.array(z.string()),
  language: z.enum(["ar", "en"]),
  numerals: z.enum(["ar", "en"]),
  grade: z.number(),
  mcqs: z.array(MCQSchema),
  trueFalse: z.array(TrueFalseSchema),
  flashcards: z.array(FlashcardSchema),
});

export type SavedLesson = {
  id: string;
  title: string;
  package: LessonPackage;
  createdAt: string;
  updatedAt: string;
};

function toSavedLesson(row: Record<string, unknown>): SavedLesson {
  return {
    id: String(row["id"]),
    title: String(row["title"]),
    package: row["package"] as LessonPackage,
    createdAt: String(row["created_at"]),
    updatedAt: String(row["updated_at"]),
  };
}

export const listMyLessons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedLesson[]> => {
    const { data, error } = await context.supabase
      .from("user_lessons" as any)
      .select("id, title, package, created_at, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: unknown) => toSavedLesson(r as Record<string, unknown>));
  });

export const getLessonById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<SavedLesson> => {
    const { data: row, error } = await context.supabase
      .from("user_lessons" as any)
      .select("id, title, package, created_at, updated_at")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Lesson not found");
    return toSavedLesson(row as unknown as Record<string, unknown>);
  });

export const saveLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: unknown) =>
      z
        .object({ title: z.string().min(1).max(200), package: LessonPackageSchema })
        .parse(input),
  )
  .handler(async ({ data, context }): Promise<SavedLesson> => {
    const { data: inserted, error } = await context.supabase
      .from("user_lessons" as any)
      .insert({ user_id: context.userId, title: data.title, package: data.package })
      .select("id, title, package, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return toSavedLesson(inserted as unknown as Record<string, unknown>);
  });

export const updateLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: unknown) =>
      z
        .object({
          id: z.string().uuid(),
          title: z.string().min(1).max(200).optional(),
          package: LessonPackageSchema.optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }): Promise<SavedLesson> => {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.title) update["title"] = data.title;
    if (data.package) update["package"] = data.package;
    const { data: updated, error } = await context.supabase
      .from("user_lessons" as any)
      .update(update)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select("id, title, package, created_at, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return toSavedLesson(updated as unknown as Record<string, unknown>);
  });

export const deleteLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_lessons" as any)
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
