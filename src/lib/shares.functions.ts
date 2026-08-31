import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { LessonPackage } from "./lesson-types";

const PackageSchema = z.record(z.string(), z.unknown());

function makeToken() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 22);
}

export const createShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ title: z.string().min(1).max(200), package: PackageSchema }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ token: string }> => {
    const token = makeToken();
    const { error } = await context.supabase
      .from("lesson_shares" as never)
      .insert({
        user_id: context.userId,
        title: data.title,
        package: data.package,
        token,
      } as never);
    if (error) throw new Error(error.message);
    return { token };
  });

export const getSharedLesson = createServerFn({ method: "GET" })
  .validator((input: unknown) =>
    z.object({ token: z.string().min(6).max(64) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ title: string; package: LessonPackage }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("lesson_shares" as never)
      .select("title, package")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("not_found");
    const r = row as unknown as Record<string, unknown>;
    return { title: String(r["title"]), package: r["package"] as LessonPackage };
  });
