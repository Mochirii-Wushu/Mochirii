const MAX_BEARER_BYTES = 8_192;
const MAX_RESPONSE_BYTES = 64 * 1_024;
const MEMBER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type MemberAccessPayload = {
  galleryEligible?: boolean;
  discordVerified?: boolean;
  memberStatus?: unknown;
  profile?: {
    id?: unknown;
    member_status?: unknown;
    has_required_discord_roles?: unknown;
    discord_verified_at?: unknown;
  } | null;
};

export type MochiPetsMemberVerificationResult =
  | { ok: true; memberId: string }
  | { ok: false; status: 401 | 403 | 503 };

function validBearerToken(token: string) {
  const length = Buffer.byteLength(token, "utf8");
  return length > 0 && length <= MAX_BEARER_BYTES && /^[A-Za-z0-9._~-]+$/.test(token);
}

function payloadData(value: unknown): MemberAccessPayload | null {
  if (!value || typeof value !== "object") return null;
  const envelope = value as { ok?: unknown; data?: unknown };
  return envelope.ok === true && envelope.data && typeof envelope.data === "object"
    ? envelope.data as MemberAccessPayload
    : null;
}

async function boundedJson(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") || "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) return null;

  const reader = response.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)) as unknown;
  } catch {
    return null;
  }
}

export async function verifyMochiPetsMemberBearer({
  token,
  supabaseUrl,
  publishableKey,
  fetchImpl = fetch,
}: {
  token: string;
  supabaseUrl: string;
  publishableKey: string;
  fetchImpl?: typeof fetch;
}): Promise<MochiPetsMemberVerificationResult> {
  if (!supabaseUrl.startsWith("https://") || !publishableKey) return { ok: false, status: 503 };
  if (!validBearerToken(token)) return { ok: false, status: 401 };

  let response: Response;
  try {
    response = await fetchImpl(`${supabaseUrl.replace(/\/+$/, "")}/functions/v1/verify-member-access`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        apikey: publishableKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: '{"refreshDiscord":false}',
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, status: 503 };
  }

  const payload = payloadData(await boundedJson(response));
  if (!response.ok) {
    return { ok: false, status: response.status === 401 ? 401 : response.status === 403 ? 403 : 503 };
  }
  if (
    !payload
    || !payload.profile
    || typeof payload.memberStatus !== "string"
    || typeof payload.profile.member_status !== "string"
    || typeof payload.galleryEligible !== "boolean"
    || typeof payload.discordVerified !== "boolean"
  ) {
    return { ok: false, status: 503 };
  }

  const memberId = String(payload.profile?.id || "").trim();
  if (!MEMBER_ID_PATTERN.test(memberId)) return { ok: false, status: 503 };
  const memberActive = payload.memberStatus === "active" && payload.profile.member_status === "active";
  if (!memberActive || payload.galleryEligible !== true) return { ok: false, status: 403 };
  return { ok: true, memberId };
}
