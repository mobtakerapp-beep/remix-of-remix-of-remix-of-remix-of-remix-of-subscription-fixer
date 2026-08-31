import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getSubscriptionStatus,
  incrementGenerationUsage,
  updateProfile,
  type SubscriptionStatus,
} from "./subscription.server";

export type { SubscriptionStatus };

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SubscriptionStatus> => {
    return getSubscriptionStatus(context.supabase, context.userId);
  });

export const useGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await incrementGenerationUsage(context.supabase, context.userId);
    return { ok: true };
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: unknown) =>
      z
        .object({
          teacherName: z.string().max(100),
          school: z.string().max(200),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    await updateProfile(context.supabase, context.userId, data.teacherName, data.school);
    return { ok: true };
  });
