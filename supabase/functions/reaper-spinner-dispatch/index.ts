import { withProtectedCors } from "../_shared/cors.ts";
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { discordFetch } from "../_shared/discord-api.ts";
import {
  constantTimeSecretEqual,
  dispatchSpinnerOutboxRow,
  readBoundedJsonObject,
  spinnerDispatcherSecret,
  type SpinnerOutboxRow,
} from "../_shared/spinner-discord-outbox.ts";
import {
  SPINNER_DISCORD_CHANNEL_ID,
  SPINNER_DISCORD_CHANNEL_KEY,
} from "../_shared/spinner-live.ts";
import { getServiceRoleKey } from "../_shared/supabase-service-role.ts";

type JsonRecord = Record<string, unknown>;

Deno.serve((req: Request) => withProtectedCors(req, handleRequest(req)));

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return jsonResponse({ ok: true });
  if (req.method !== "POST") {
    return jsonResponse({ ok: false, message: "Method not allowed." }, 405);
  }

  const dispatchSecret =
    Deno.env.get("REAPER_SPINNER_DISPATCH_SECRET")?.trim() || "";
  if (!dispatchSecret) {
    return jsonResponse({
      ok: false,
      message: "Raffle delivery is not configured.",
    }, 500);
  }
  if (
    !await constantTimeSecretEqual(spinnerDispatcherSecret(req), dispatchSecret)
  ) {
    return jsonResponse({ ok: false, message: "Unauthorized." }, 401);
  }

  const configuredChannelId =
    Deno.env.get("DISCORD_RAFFLE_CHANNEL_ID")?.trim() || "";
  const botToken = Deno.env.get("DISCORD_BOT_TOKEN")?.trim() || "";
  if (configuredChannelId !== SPINNER_DISCORD_CHANNEL_ID || !botToken) {
    console.error(
      "reaper-spinner-dispatch missing or mismatched Discord configuration",
      {
        channelConfigMatches:
          configuredChannelId === SPINNER_DISCORD_CHANNEL_ID,
        hasBotToken: Boolean(botToken),
      },
    );
    return jsonResponse({
      ok: false,
      message: "Raffle delivery is not configured.",
    }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() || "";
  const serviceRoleKey = getServiceRoleKey();
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({
      ok: false,
      message: "Raffle delivery storage is not configured.",
    }, 500);
  }

  const bodyResult = await readBoundedJsonObject(req);
  if (!bodyResult.ok) {
    const message = bodyResult.status === 413
      ? "Request body is too large."
      : "Request body is invalid.";
    return jsonResponse({ ok: false, message }, bodyResult.status);
  }
  const body = bodyResult.value;
  const requestedLimit = Number(body.limit ?? 10);
  const limit = Number.isSafeInteger(requestedLimit) && requestedLimit >= 1 &&
      requestedLimit <= 10
    ? requestedLimit
    : 10;
  const claimToken = crypto.randomUUID();
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: claimedData, error: claimError } = await adminClient.rpc(
    "spinner_claim_discord_outbox",
    {
      p_claim_token: claimToken,
      p_limit: limit,
    },
  );
  if (claimError) {
    console.error("reaper-spinner-dispatch outbox claim failed", {
      code: claimError.code,
      message: claimError.message,
    });
    return jsonResponse({
      ok: false,
      message: "Raffle deliveries could not be claimed.",
    }, 503);
  }

  const claimed = Array.isArray(claimedData)
    ? claimedData as SpinnerOutboxRow[]
    : [];
  const results = [];
  for (const row of claimed) {
    const result = await dispatchSpinnerOutboxRow(row, {
      discordFetch: (path, options) => discordFetch(path, options),
      finishClaim: async (claimedRow, outcome, fields = {}) => {
        const { data, error } = await adminClient.rpc(
          "spinner_finish_discord_outbox_claim",
          {
            p_id: claimedRow.id,
            p_claim_token: claimToken,
            p_outcome: outcome,
            p_message_id: fields.messageId || null,
            p_error_code: fields.errorCode || null,
            p_retry_at: fields.retryAt || null,
          },
        );
        if (error) {
          console.error("reaper-spinner-dispatch outbox completion failed", {
            code: error.code,
            message: error.message,
            outcome,
          });
          return false;
        }
        return data === true;
      },
    });
    results.push({ id: row.id, drawId: row.draw_id, outcome: result.outcome });
  }

  return jsonResponse({
    ok: true,
    data: {
      channelKey: SPINNER_DISCORD_CHANNEL_KEY,
      claimed: claimed.length,
      completed: results.filter((result) =>
        result.outcome === "start_sent" || result.outcome === "result_sent"
      ).length,
      retried: results.filter((result) =>
        result.outcome === "retry"
      ).length,
      failed: results.filter((result) =>
        result.outcome === "fatal" || result.outcome === "claim_lost"
      ).length,
      results,
    },
  });
}

function jsonResponse(body: JsonRecord, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
