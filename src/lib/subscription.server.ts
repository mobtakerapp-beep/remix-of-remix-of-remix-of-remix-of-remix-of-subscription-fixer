import type { Database } from "@/integrations/supabase/types";

type SupabaseClient = ReturnType<
  typeof import("@supabase/supabase-js").createClient<Database>
>;

export type SubscriptionStatus = {
  plan: "free" | "monthly" | "yearly";
  status: "active" | "expired" | "cancelled" | "pending";
  generationsUsed: number;
  generationsLimit: number;
  canGenerate: boolean;
  teacherName: string;
  school: string;
  email: string;
  remainingToday: number;
};

/** Free plan: one generation per calendar month. */
const FREE_DAILY_LIMIT = 1;
const PAID_LIMIT = 999;

function isSameDay(a: Date, b: Date) {
  // Free quota resets monthly, not daily.
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

export async function getSubscriptionStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionStatus> {
  const [subResult, profileResult, userResult] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const sub = subResult.data;
  const profile = profileResult.data;
  const email = userResult.data?.user?.email ?? "";

  const now = new Date();
  let plan: "free" | "monthly" | "yearly" = "free";
  let status: SubscriptionStatus["status"] = "active";
  let generationsUsed = 0;
  let generationsLimit = FREE_DAILY_LIMIT;
  let resetAt = now;

  if (sub) {
    plan = sub.plan as "free" | "monthly" | "yearly";
    status = sub.status as SubscriptionStatus["status"];
    generationsUsed = sub.generations_used ?? 0;
    resetAt = new Date(sub.reset_at ?? now.toISOString());

    // Check expiry for paid plans
    if (plan !== "free" && sub.expires_at) {
      const expiry = new Date(sub.expires_at);
      if (expiry < now) {
        status = "expired";
        plan = "free";
        generationsLimit = FREE_DAILY_LIMIT;
      } else {
        generationsLimit = PAID_LIMIT;
      }
    } else if (plan === "free") {
      generationsLimit = FREE_DAILY_LIMIT;
    } else {
      generationsLimit = PAID_LIMIT;
    }

    // Reset daily counter for free plan
    if (plan === "free" && !isSameDay(resetAt, now)) {
      generationsUsed = 0;
      await supabase
        .from("subscriptions")
        .update({ generations_used: 0, reset_at: now.toISOString() })
        .eq("user_id", userId);
    }
  }

  const canGenerate = generationsUsed < generationsLimit;

  return {
    plan,
    status,
    generationsUsed,
    generationsLimit,
    canGenerate,
    teacherName: profile?.teacher_name ?? "",
    school: profile?.school ?? "",
    email,
    remainingToday: Math.max(0, generationsLimit - generationsUsed),
  };
}

export async function incrementGenerationUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!sub) return;

  const now = new Date();
  const resetAt = new Date(sub.reset_at ?? now.toISOString());
  const shouldReset = !isSameDay(resetAt, now);

  await supabase
    .from("subscriptions")
    .update({
      generations_used: shouldReset ? 1 : (sub.generations_used ?? 0) + 1,
      reset_at: shouldReset ? now.toISOString() : sub.reset_at,
    })
    .eq("user_id", userId);
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  teacherName: string,
  school: string,
): Promise<void> {
  await supabase
    .from("profiles")
    .update({ teacher_name: teacherName, school })
    .eq("id", userId);
}
