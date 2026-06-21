import "@supabase/functions-js/edge-runtime.d.ts";
import {
  CORS_HEADERS,
  UNITY_ROOM_KEY,
  UNITY_SHARED_PET_KEY,
  alphaAccess,
  asRecord,
  ensureAlphaProfile,
  jsonResponse,
  readJsonBody,
  requireUser,
  safeString,
  unityCustomId,
  upsertUnityPlayerLink,
} from "../_shared/mochi-social-alpha.ts";

type UnityTokenCache = {
  accessToken: string;
  expiresAt: number;
};

let cachedStatelessToken: UnityTokenCache | null = null;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse({ ok: false, message: "Method not allowed." }, 405);

  const access = await requireUser(req);
  if (!access.ok) return access.response;

  const bodyResult = await readJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;

  const state = await alphaAccess(access.adminClient, access.userId);
  if (!state.ok) {
    return jsonResponse({ ok: false, error: "alpha_access_lookup_failed", message: "Mochi Social alpha access could not be checked." }, 500);
  }
  if (!state.hasAccess) return jsonResponse({ ok: false, error: "alpha_allowlist_required", message: "This account is not active on the alpha allowlist." }, 403);
  if (!state.termsAccepted) return jsonResponse({ ok: false, error: "alpha_terms_required", message: "Alpha terms must be acknowledged before Unity play." }, 403);

  const profileError = await ensureAlphaProfile(access.adminClient, access.user);
  if (profileError) {
    return jsonResponse({ ok: false, error: "alpha_profile_failed", message: "Your Mochi Social alpha profile could not be prepared." }, 500);
  }

  const config = unityConfig();
  if (!config.ok) return config.response;

  const customId = unityCustomId(access.userId);
  const tokenResult = await signInUnityCustomId(config.value, customId);
  if (!tokenResult.ok) return tokenResult.response;

  const tokenBody = asRecord(tokenResult.body);
  const user = asRecord(tokenBody.user);
  const unityPlayerId = safeString(tokenBody.userId, 160) || safeString(user.id, 160) || customId;
  const linkResult = await upsertUnityPlayerLink(access.adminClient, {
    userId: access.userId,
    unityPlayerId,
    customId,
    roomKey: UNITY_ROOM_KEY,
  });
  if (!linkResult.ok) {
    return jsonResponse({ ok: false, error: linkResult.error, message: linkResult.message }, 500);
  }

  const unityPayload = {
    provider: "ugs-custom-id",
    projectId: config.value.projectId,
    environmentName: config.value.environmentName,
    playerId: unityPlayerId,
    unityPlayerId,
    customId,
    accessToken: safeString(tokenBody.idToken, 8192),
    idToken: safeString(tokenBody.idToken, 8192),
    sessionToken: safeString(tokenBody.sessionToken, 8192),
    expiresIn: Number(tokenBody.expiresIn || 0),
    roomKey: UNITY_ROOM_KEY,
    roomMode: "single-shared-room",
    roomCapacity: 25,
    sharedPetKey: UNITY_SHARED_PET_KEY,
    realtimeAuthority: "ugs-distributed-authority",
    stateAuthority: "ugs-cloud-save",
  };
  const alphaPayload = {
    noRealValue: true,
    allowlistRequired: true,
    termsRequired: true,
    ugc: "curated",
  };

  return jsonResponse({
    ok: true,
    userId: access.userId,
    unityPlayerId,
    playerId: unityPlayerId,
    customId,
    accessToken: unityPayload.accessToken,
    idToken: unityPayload.idToken,
    sessionToken: unityPayload.sessionToken,
    expiresIn: unityPayload.expiresIn,
    environmentName: unityPayload.environmentName,
    roomKey: UNITY_ROOM_KEY,
    roomMode: "single-shared-room",
    roomCapacity: 25,
    sharedPetKey: UNITY_SHARED_PET_KEY,
    realtimeAuthority: "ugs-distributed-authority",
    stateAuthority: "ugs-cloud-save",
    data: {
      userId: access.userId,
      unity: unityPayload,
      alpha: alphaPayload,
    },
  });
});

function unityConfig():
  | {
    ok: true;
    value: {
      projectId: string;
      environmentId: string;
      environmentName: string;
      serviceAccountKeyId: string;
      serviceAccountSecret: string;
    };
  }
  | { ok: false; response: Response } {
  const projectId = Deno.env.get("UNITY_SERVICES_PROJECT_ID") || "";
  const environmentId = Deno.env.get("UNITY_SERVICES_ENVIRONMENT_ID") || "";
  const environmentName = Deno.env.get("UNITY_SERVICES_ENVIRONMENT_NAME") || "";
  const serviceAccountKeyId = Deno.env.get("UNITY_SERVICES_SERVICE_ACCOUNT_KEY_ID") || "";
  const serviceAccountSecret = Deno.env.get("UNITY_SERVICES_SERVICE_ACCOUNT_SECRET") || "";

  if (!projectId || !environmentId || !environmentName || !serviceAccountKeyId || !serviceAccountSecret) {
    return {
      ok: false,
      response: jsonResponse(
        { ok: false, error: "unity_services_not_configured", message: "Unity shared-room authentication is not configured yet." },
        503,
      ),
    };
  }

  return { ok: true, value: { projectId, environmentId, environmentName, serviceAccountKeyId, serviceAccountSecret } };
}

async function signInUnityCustomId(
  config: {
    projectId: string;
    environmentId: string;
    environmentName: string;
    serviceAccountKeyId: string;
    serviceAccountSecret: string;
  },
  customId: string,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: Response }> {
  const statelessToken = await unityStatelessToken(config);
  if (!statelessToken.ok) return statelessToken;

  const response = await fetch(`https://player-auth.services.api.unity.com/v1/projects/${encodeURIComponent(config.projectId)}/authentication/server/custom-id`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${statelessToken.accessToken}`,
      "Content-Type": "application/json",
      "UnityEnvironment": config.environmentName,
    },
    body: JSON.stringify({ externalId: customId, signInOnly: false }),
  });

  const body = await safeJson(response);
  if (!response.ok) {
    return {
      ok: false,
      response: jsonResponse(
        { ok: false, error: "unity_custom_id_failed", message: "Unity player authentication could not be completed." },
        response.status >= 400 && response.status < 500 ? 502 : 503,
      ),
    };
  }

  if (!safeString(body.idToken, 8192) || !safeString(body.sessionToken, 8192)) {
    return {
      ok: false,
      response: jsonResponse({ ok: false, error: "unity_token_response_invalid", message: "Unity player token response was incomplete." }, 502),
    };
  }

  return { ok: true, body };
}

async function unityStatelessToken(config: {
  projectId: string;
  environmentId: string;
  serviceAccountKeyId: string;
  serviceAccountSecret: string;
}): Promise<{ ok: true; accessToken: string } | { ok: false; response: Response }> {
  if (cachedStatelessToken && cachedStatelessToken.expiresAt > Date.now() + 60_000) {
    return { ok: true, accessToken: cachedStatelessToken.accessToken };
  }

  const authorization = btoa(`${config.serviceAccountKeyId}:${config.serviceAccountSecret}`);
  const response = await fetch(
    `https://services.api.unity.com/auth/v1/token-exchange?projectId=${encodeURIComponent(config.projectId)}&environmentId=${encodeURIComponent(config.environmentId)}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authorization}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scopes: [] }),
    },
  );

  const body = await safeJson(response);
  const accessToken = safeString(body.accessToken, 8192);
  if (!response.ok || !accessToken) {
    return {
      ok: false,
      response: jsonResponse({ ok: false, error: "unity_token_exchange_failed", message: "Unity service token exchange failed." }, 503),
    };
  }

  const expiresIn = Number(body.expiresIn || body.expires_in || 3600);
  cachedStatelessToken = {
    accessToken,
    expiresAt: Date.now() + Math.max(60, Math.min(expiresIn, 3600)) * 1000,
  };

  return { ok: true, accessToken };
}

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return asRecord(await response.json());
  } catch {
    return {};
  }
}
