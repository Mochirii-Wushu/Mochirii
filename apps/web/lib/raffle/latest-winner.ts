import "server-only";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import {
  latestOfficialRaffleWinnerRowsAreEmpty,
  parseLatestOfficialRaffleWinnerRows,
  type LatestOfficialRaffleWinner,
  type LatestOfficialRaffleWinnerRead,
} from "./latest-winner-core";

const MAX_RESPONSE_BYTES = 4_096;

export async function getLatestOfficialRaffleWinner(
  accessToken?: string | null,
): Promise<LatestOfficialRaffleWinner | null> {
  const result = await readLatestOfficialRaffleWinner(accessToken);
  return result.ok ? result.data : null;
}

export async function readLatestOfficialRaffleWinner(
  accessToken?: string | null,
): Promise<LatestOfficialRaffleWinnerRead> {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return { ok: false, data: null };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/get_latest_official_raffle_winner`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken || SUPABASE_PUBLISHABLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: "{}",
        cache: accessToken ? "no-store" : undefined,
        ...(accessToken ? {} : { next: { revalidate: 15 } }),
        signal: controller.signal,
      },
    );
    if (!response.ok) return { ok: false, data: null };
    const raw = await response.text();
    if (!raw || new TextEncoder().encode(raw).byteLength > MAX_RESPONSE_BYTES) {
      return { ok: false, data: null };
    }
    const payload = JSON.parse(raw) as unknown;
    const winner = parseLatestOfficialRaffleWinnerRows(payload);
    if (winner) return { ok: true, data: winner };
    if (latestOfficialRaffleWinnerRowsAreEmpty(payload)) return { ok: true, data: null };
    return { ok: false, data: null };
  } catch {
    return { ok: false, data: null };
  } finally {
    clearTimeout(timeout);
  }
}
