import "@supabase/functions-js/edge-runtime.d.ts";
import {
  createAdminClient,
  jsonResponse,
} from "../_shared/spotlight-polls.ts";
import {
  asRecord,
  safeString,
} from "../_shared/vote-reminders.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return jsonResponse({ ok: true });
  if (!["GET", "POST"].includes(req.method)) {
    return jsonResponse({ ok: false, message: "Method not allowed." }, 405);
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return jsonResponse({
      ok: false,
      message: "Spotlight winner lookup is not configured yet.",
    }, 500);
  }

  const { data, error } = await adminClient
    .from("spotlight_poll_cycles")
    .select("cycle_month,winner_display_name,published_at")
    .eq("status", "published")
    .not("winner_display_name", "is", null)
    .order("cycle_month", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("current spotlight winner lookup failed", {
      code: error.code,
      message: error.message,
    });
    return jsonResponse({
      ok: false,
      message: "Current spotlight winner could not be loaded.",
    }, 500);
  }

  const record = asRecord(data);
  const winnerName = safeString(record.winner_display_name, 120);

  return jsonResponse({
    ok: true,
    data: {
      winnerName,
      monthKey: safeString(record.cycle_month, 20),
      publishedAt: safeString(record.published_at, 40),
      source: winnerName ? "monthly-discord-poll" : "fallback",
    },
  });
});
