import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSubscriptionStatus } from "./subscription.server";

const InputSchema = z.object({
  mode: z.enum(["text", "pdf", "image", "youtube"]),
  text: z.string().optional(),
  youtubeUrl: z.string().optional(),
  fileName: z.string().optional(),
  /** data URL, e.g. data:application/pdf;base64,... */
  fileData: z.string().optional(),
  mediaType: z.string().optional(),
  counts: z.object({
    mcq: z.number().int().min(1).max(20),
    trueFalse: z.number().int().min(1).max(20),
    flashcards: z.number().int().min(1).max(20),
  }),
  language: z.enum(["auto", "ar", "en"]).default("auto"),
  numerals: z.enum(["auto", "ar", "en"]).default("auto"),
  grade: z.number().int().min(1).max(12).default(5),
});

export const generateLessonPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Subscription gate: check before generating
    const status = await getSubscriptionStatus(context.supabase, context.userId);
    if (!status.canGenerate) {
      throw new Error(
        status.plan === "free"
          ? "limit_reached"
          : "subscription_expired",
      );
    }

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { buildLessonPackage } = await import("./lesson.server");

    if (data.mode === "youtube") {
      const { fetchYoutubeTranscript } = await import("./youtube.server");
      // Whisper fallback only works with a real OpenAI key; never send the Lovable key there.
      const transcriptKey = process.env["OPENAI_API_KEY"];
      const { title, text } = await fetchYoutubeTranscript(data.youtubeUrl ?? "", transcriptKey);

      const { youtubeUrl: _ignored, ...rest } = data;
      return buildLessonPackage(
        { ...rest, mode: "text", text: `${title}\n\n${text}` },
        key,
      );
    }

    const { youtubeUrl: _unused, ...payload } = data;
    return buildLessonPackage(payload as never, key);
  });
