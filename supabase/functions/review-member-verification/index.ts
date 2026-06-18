import { withProtectedCors } from "../_shared/cors.ts";
import "@supabase/functions-js/edge-runtime.d.ts";
import {
  CORS_HEADERS,
  jsonResponse,
  readRequiredJsonBody,
  requireModeratorAccess,
  safeString,
  type JsonRecord,
} from "../_shared/gallery-moderation.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const VALID_ACTIONS = new Set(["approve", "reject", "revoke"]);
const VALID_METHODS = new Set(["manual_review", "phone", "apple", "facebook", "google", "kakao", "twitch", "spotify"]);

function normalizeAction(value: unknown): string | null {
  const action = safeString(value, 20)?.toLowerCase();
  return action && VALID_ACTIONS.has(action) ? action : null;
}

function normalizeMethod(value: unknown): string {
  const method = safeString(value, 40)?.toLowerCase() || "manual_review";
  return VALID_METHODS.has(method) ? method : "manual_review";
}

function normalizeExpiry(value: unknown): string | null {
  const text = safeString(value, 80);
  if (!text) return null;
  const timestamp = Date.parse(text);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function publicVerification(row: JsonRecord | null): JsonRecord | null {
  if (!row) return null;
  return {
    status: safeString(row.gallery_access_status, 40),
    method: safeString(row.gallery_access_method, 40),
    verifiedAt: safeString(row.gallery_access_verified_at, 80),
    expiresAt: safeString(row.gallery_access_expires_at, 80),
    reviewedAt: safeString(row.reviewed_at, 80),
    reason: safeString(row.redacted_reason, 500),
  };
}

Deno.serve((req: Request) => withProtectedCors(req, handleRequest(req)));

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ ok: false, message: "Method not allowed." }, 405);

  const access = await requireModeratorAccess(req);
  if (!access.ok) return access.response;

  const bodyResult = await readRequiredJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;

  const userId = safeString(bodyResult.body.user_id || bodyResult.body.userId, 80);
  const action = normalizeAction(bodyResult.body.action);
  const method = normalizeMethod(bodyResult.body.method);
  const reason = safeString(bodyResult.body.reason || bodyResult.body.redacted_reason, 500);
  const expiresAt = normalizeExpiry(bodyResult.body.expires_at || bodyResult.body.expiresAt);
  const now = new Date().toISOString();

  if (!userId || !UUID_RE.test(userId)) {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_user_id",
        message: "A valid Supabase user id is required.",
      },
      400,
    );
  }

  if (!action) {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_action",
        message: "Review action must be approve, reject, or revoke.",
      },
      400,
    );
  }

  const { data: profile, error: profileError } = await access.adminClient
    .from("member_profiles")
    .select("id,member_status")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("review-member-verification profile lookup failed", {
      code: profileError.code,
      message: profileError.message,
    });
    return jsonResponse({ ok: false, message: "Member profile could not be checked." }, 500);
  }

  if (!profile) {
    return jsonResponse(
      {
        ok: false,
        error: "missing_member_profile",
        message: "This user does not have a member profile yet.",
      },
      404,
    );
  }

  const memberStatus = safeString((profile as JsonRecord).member_status, 40);
  if (action === "approve" && (memberStatus === "suspended" || memberStatus === "archived")) {
    return jsonResponse(
      {
        ok: false,
        error: "locked_member_status",
        message: "Suspended or archived members must be restored separately before approval.",
      },
      403,
    );
  }

  const payload: JsonRecord = {
    user_id: userId,
    gallery_access_status: action === "approve" ? "approved" : action === "reject" ? "rejected" : "revoked",
    gallery_access_method: method,
    gallery_access_verified_at: action === "approve" ? now : null,
    gallery_access_expires_at: action === "approve" ? expiresAt : null,
    reviewed_by: access.userId,
    reviewed_at: now,
    redacted_reason: reason,
    updated_at: now,
  };

  const { data: updated, error: updateError } = await access.adminClient
    .from("member_verifications")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .maybeSingle();

  if (updateError || !updated) {
    console.error("review-member-verification upsert failed", {
      code: updateError?.code,
      message: updateError?.message || "Missing updated row",
    });
    return jsonResponse({ ok: false, message: "Member verification review could not be saved." }, 500);
  }

  if (action === "approve" && memberStatus !== "active") {
    const { error: statusError } = await access.adminClient
      .from("member_profiles")
      .update({ member_status: "active", updated_at: now })
      .eq("id", userId);

    if (statusError) {
      console.error("review-member-verification member activation failed", {
        code: statusError.code,
        message: statusError.message,
      });
      return jsonResponse({ ok: false, message: "Member verification was saved, but member status could not be activated." }, 500);
    }
  }

  return jsonResponse({
    ok: true,
    data: {
      userId,
      verification: publicVerification(updated as JsonRecord),
    },
    message: action === "approve" ? "Member verification approved." : action === "reject" ? "Member verification rejected." : "Member verification revoked.",
  });
}
