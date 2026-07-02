import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

type DecisionBody = {
  authorization_id?: unknown;
  decision?: unknown;
};

type MemberAccessPayload = {
  ok?: boolean;
  data?: MemberAccessPayload;
  galleryEligible?: boolean;
  discordVerified?: boolean;
  profile?: {
    member_status?: string | null;
    has_required_discord_roles?: boolean | null;
    discord_verified_at?: string | null;
  } | null;
  message?: string | null;
};

const RECENT_VERIFICATION_MS = 7 * 24 * 60 * 60 * 1000;

function bearerToken(request: Request) {
  return (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

function memberAccessPayload(value: unknown): MemberAccessPayload {
  if (!value || typeof value !== "object") return {};
  const payload = value as MemberAccessPayload;
  return payload.data && typeof payload.data === "object" ? payload.data : payload;
}

function hasRecentDiscordVerification(profile?: MemberAccessPayload["profile"]) {
  const timestamp = new Date(profile?.discord_verified_at || 0).getTime();
  return Number.isFinite(timestamp) && Date.now() - timestamp <= RECENT_VERIFICATION_MS;
}

function memberAccessIsActive(access: MemberAccessPayload) {
  const profile = access.profile || null;
  return Boolean(
    profile?.member_status === "active" &&
      (access.galleryEligible === true ||
        access.discordVerified === true ||
        (profile.has_required_discord_roles === true && hasRecentDiscordVerification(profile))),
  );
}

export async function POST(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return NextResponse.json({ error: "Website public configuration is missing." }, { status: 500 });
  }

  const token = bearerToken(request);
  if (!token) return NextResponse.json({ error: "Missing signed-in session." }, { status: 401 });

  let body: DecisionBody;
  try {
    body = await request.json() as DecisionBody;
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const authorizationId = String(body.authorization_id || "").trim();
  const decision = String(body.decision || "").trim();
  if (!authorizationId) return NextResponse.json({ error: "Missing authorization_id." }, { status: 400 });
  if (decision !== "approve" && decision !== "deny") {
    return NextResponse.json({ error: "Decision must be approve or deny." }, { status: 400 });
  }

  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  if (decision === "approve") {
    const accessResult = await client.functions.invoke("verify-member-access", {
      body: { refreshDiscord: false },
    });
    const access = memberAccessPayload(accessResult.data);
    const activeMember = memberAccessIsActive(access);

    if (accessResult.error || !activeMember) {
      return NextResponse.json(
        { error: access.message || accessResult.error?.message || "Active guild membership is required before authorizing guild social access." },
        { status: 403 },
      );
    }
  }

  const result = decision === "approve"
    ? await client.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
    : await client.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });

  if (result.error || !result.data?.redirect_url) {
    return NextResponse.json({ error: result.error?.message || "Authorization decision failed." }, { status: 400 });
  }

  return NextResponse.json({ redirectUrl: result.data.redirect_url });
}
