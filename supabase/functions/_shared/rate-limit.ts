import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime?: Date;
  error?: string;
}

/**
 * Checks if a user has exceeded the rate limit for a specific endpoint.
 * Implements a database-backed Fixed Window rate limiting algorithm.
 * 
 * @param supabase The Supabase Client initialized with the service role key.
 * @param userId The ID of the authenticated user.
 * @param endpoint The name of the endpoint/action being checked (e.g. "generate-notes").
 * @param limit The maximum number of requests allowed in the window.
 * @param windowMs The duration of the window in milliseconds (e.g., 60000 for 1 minute).
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  endpoint: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  try {
    const now = new Date();
    
    // 1. Fetch the existing rate limit record for this user and endpoint
    const { data: record, error: fetchError } = await supabase
      .from("tbl_rate_limits")
      .select("*")
      .eq("user_id", userId)
      .eq("endpoint", endpoint)
      .maybeSingle();

    if (fetchError) {
      // If table doesn't exist, we print a warning and allow the request (graceful fallback)
      if (fetchError.code === "PGRST116" || fetchError.message.includes("does not exist") || fetchError.message.includes("not found")) {
        console.warn(`[RateLimit] tbl_rate_limits table or record issue: ${fetchError.message}. Gracefully allowing request.`);
        return { allowed: true, remaining: limit - 1 };
      }
      throw fetchError;
    }

    if (!record) {
      // 2. No record exists, insert a new one
      const { error: insertError } = await supabase
        .from("tbl_rate_limits")
        .insert({
          user_id: userId,
          endpoint: endpoint,
          request_count: 1,
          window_start: now.toISOString(),
        });

      if (insertError) {
        console.error("[RateLimit] Failed to insert rate limit record:", insertError);
        return { allowed: true, remaining: limit - 1 }; // Fallback to allowing request
      }

      return { allowed: true, remaining: limit - 1 };
    }

    const windowStart = new Date(record.window_start);
    const timeElapsed = now.getTime() - windowStart.getTime();

    if (timeElapsed > windowMs) {
      // 3. The window has expired, reset the counter
      const { error: resetError } = await supabase
        .from("tbl_rate_limits")
        .update({
          request_count: 1,
          window_start: now.toISOString(),
        })
        .eq("id", record.id);

      if (resetError) {
        console.error("[RateLimit] Failed to reset rate limit record:", resetError);
        return { allowed: true, remaining: limit - 1 };
      }

      return { allowed: true, remaining: limit - 1 };
    }

    // 4. Within the window, check count
    if (record.request_count >= limit) {
      const resetTime = new Date(windowStart.getTime() + windowMs);
      return { allowed: false, remaining: 0, resetTime };
    }

    // Increment request count
    const { error: updateError } = await supabase
      .from("tbl_rate_limits")
      .update({
        request_count: record.request_count + 1,
      })
      .eq("id", record.id);

    if (updateError) {
      console.error("[RateLimit] Failed to increment rate limit count:", updateError);
      return { allowed: true, remaining: limit - record.request_count - 1 };
    }

    return { allowed: true, remaining: limit - record.request_count - 1 };
  } catch (err: any) {
    console.error("[RateLimit] Unexpected error checking rate limit:", err);
    // Graceful fallback: allow the request if rate limiting system has an internal error
    return { allowed: true, remaining: 1, error: err.message };
  }
}
