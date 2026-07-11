import "server-only";

import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "./config";
import type { CurrentSpotlightWinner } from "./types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function getCurrentSpotlightWinner(): Promise<CurrentSpotlightWinner | null> {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/get-current-spotlight-winner`,
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        next: { revalidate: 3600 },
      },
    );
    if (!response.ok) return null;

    const payload = asRecord(await response.json());
    if (!payload || payload.ok === false) return null;

    const data = asRecord(payload.data);
    return data ? (data as CurrentSpotlightWinner) : null;
  } catch {
    return null;
  }
}
