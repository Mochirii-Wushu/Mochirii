export const SPINNER_APP_VERSION = "1.0.0";
export const SPINNER_ALGORITHM_VERSION = "uniform-uint32-rejection-v1";
export const SPINNER_SNAPSHOT_VERSION = 1;
export const SPINNER_MIN_PARTICIPANTS = 2;
export const SPINNER_MAX_PARTICIPANTS = 100;
export const SPINNER_MAX_NAME_GRAPHEMES = 40;
export const SPINNER_MAX_COMMAND_BODY_BYTES = 64 * 1_024;
export const SPINNER_DEFAULT_DURATION_MS = 4_800;
export const SPINNER_START_DELAY_MS = 180_000;
export const SPINNER_DISCORD_CHANNEL_KEY = "raffle_spins";
export const SPINNER_DISCORD_CHANNEL_ID = "1468667003366674721";
export const SPINNER_LIVE_URL = "https://mochirii.com/account?open=live-draw";

const UINT32_RANGE = 0x1_0000_0000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ParticipantV1 = {
  version: 1;
  id: string;
  displayName: string;
};

export type RosterStateV1 = {
  version: 1;
  participants: ParticipantV1[];
};

export type UniformSample = {
  index: number;
  rejectionLimit: number;
  sampledWords: number[];
  acceptedWord: number;
};

export type DrawReceiptV1 = {
  version: 1;
  drawId: string;
  timestampIso: string;
  singaporeTime: string;
  appVersion: string;
  algorithmVersion: string;
  rosterSnapshot: RosterStateV1;
  rosterHashSha256: string;
  rejectionLimit: number;
  sampledWords: number[];
  acceptedWord: number;
  selectedIndex: number;
  winner: ParticipantV1;
};

export type SpinnerSnapshotV1 = {
  version: 1;
  sessionId: string;
  revision: number;
  phase: "idle" | "spinning" | "revealed";
  participants: ParticipantV1[];
  startedAt: string | null;
  revealAt: string | null;
  durationMs: number;
  startRotation: number;
  finalRotation: number;
  selectedIndex: number | null;
  winner: ParticipantV1 | null;
  drawId: string | null;
  updatedAt: string;
};

type RandomWordSource = () => number;

function graphemes(value: string): string[] {
  const Segmenter = Intl.Segmenter;
  if (typeof Segmenter === "function") {
    return Array.from(
      new Segmenter(undefined, { granularity: "grapheme" }).segment(value),
      (part) => part.segment,
    );
  }
  return Array.from(value);
}

export function normalizeDisplayName(value: unknown): string {
  return typeof value === "string" ? value.normalize("NFKC").trim() : "";
}

function normalizedNameKey(value: string): string {
  return normalizeDisplayName(value)
    .toLocaleUpperCase("und")
    .toLocaleLowerCase("und")
    .normalize("NFKC");
}

export async function readBoundedSpinnerJsonObject(
  req: Request,
  maxBytes = SPINNER_MAX_COMMAND_BODY_BYTES,
): Promise<
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; status: 400 | 413 }
> {
  const mediaType = (req.headers.get("content-type") || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (mediaType !== "application/json") {
    return { ok: false, status: 400 };
  }

  const declaredLength = req.headers.get("content-length");
  if (declaredLength !== null) {
    const normalizedLength = declaredLength.trim();
    if (!/^\d+$/.test(normalizedLength)) {
      return { ok: false, status: 400 };
    }
    const declaredBytes = Number(normalizedLength);
    if (!Number.isSafeInteger(declaredBytes)) {
      return { ok: false, status: 400 };
    }
    if (declaredBytes > maxBytes) return { ok: false, status: 413 };
  }

  if (!req.body) return { ok: false, status: 400 };
  const reader = req.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let raw = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { ok: false, status: 413 };
      }
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } catch {
    return { ok: false, status: 400 };
  }

  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value)
      ? { ok: true, value: value as Record<string, unknown> }
      : { ok: false, status: 400 };
  } catch {
    return { ok: false, status: 400 };
  }
}

export function normalizeParticipants(value: unknown): ParticipantV1[] {
  if (!Array.isArray(value) || value.length > SPINNER_MAX_PARTICIPANTS) {
    throw new RangeError(
      `A live roster supports 0–${SPINNER_MAX_PARTICIPANTS} participants.`,
    );
  }

  const ids = new Set<string>();
  const names = new Set<string>();
  return value.map((candidate) => {
    const participant = normalizeParticipant(candidate);
    const { id, displayName } = participant;
    const nameKey = normalizedNameKey(displayName);
    if (ids.has(id) || names.has(nameKey)) {
      throw new TypeError("Participant IDs and names must be unique.");
    }

    ids.add(id);
    names.add(nameKey);
    return participant;
  });
}

function normalizeParticipant(candidate: unknown): ParticipantV1 {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new TypeError("The live roster contains an invalid participant.");
  }
  const record = candidate as Record<string, unknown>;
  const id = String(record.id || "").trim();
  const displayName = normalizeDisplayName(record.displayName);
  if (
    record.version !== 1 || !UUID_PATTERN.test(id) || !displayName ||
    graphemes(displayName).length > SPINNER_MAX_NAME_GRAPHEMES
  ) {
    throw new TypeError("The live roster contains an invalid participant.");
  }
  return { version: 1, id, displayName };
}

export function secureRandomWord(): number {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== "function") {
    throw new Error("Secure drawing is unavailable.");
  }
  const words = new Uint32Array(1);
  cryptoApi.getRandomValues(words);
  return words[0];
}

export function sampleUniformIndex(
  count: number,
  randomWord: RandomWordSource = secureRandomWord,
): UniformSample {
  if (
    !Number.isSafeInteger(count) || count < SPINNER_MIN_PARTICIPANTS ||
    count > SPINNER_MAX_PARTICIPANTS
  ) {
    throw new RangeError(
      `Participant count must be ${SPINNER_MIN_PARTICIPANTS}–${SPINNER_MAX_PARTICIPANTS}.`,
    );
  }

  const rejectionLimit = Math.floor(UINT32_RANGE / count) * count;
  const sampledWords: number[] = [];
  for (;;) {
    const word = randomWord();
    if (!Number.isInteger(word) || word < 0 || word >= UINT32_RANGE) {
      throw new RangeError(
        "The random source must return an unsigned 32-bit word.",
      );
    }
    sampledWords.push(word);
    if (word < rejectionLimit) {
      return {
        index: word % count,
        rejectionLimit,
        sampledWords,
        acceptedWord: word,
      };
    }
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function sha256Hex(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== "function") {
    throw new Error("Secure hashing is unavailable.");
  }
  const digest = await subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return bytesToHex(new Uint8Array(digest));
}

export function canonicalRosterPayload(
  participants: readonly ParticipantV1[],
): string {
  return JSON.stringify({
    version: 1,
    participants: participants.map(({ version, id, displayName }) => ({
      version,
      id,
      displayName,
    })),
  });
}

export function normalizeDurationMs(value: unknown): number {
  if (value == null) return SPINNER_DEFAULT_DURATION_MS;
  const duration = Number(value);
  if (
    !Number.isSafeInteger(duration) || duration < 4_000 || duration > 30_000
  ) {
    throw new RangeError("Draw duration must be between 4 and 30 seconds.");
  }
  return duration;
}

export function targetRotationDegrees(
  selectedIndex: number,
  count: number,
  turns = 6,
): number {
  if (
    !Number.isSafeInteger(selectedIndex) || selectedIndex < 0 ||
    selectedIndex >= count
  ) {
    throw new RangeError("The selected participant is outside the roster.");
  }
  if (!Number.isSafeInteger(turns) || turns < 1) {
    throw new RangeError("A draw needs at least one full turn.");
  }
  return turns * 360 - selectedIndex * (360 / count);
}

function normalizedRotationDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function formatSingaporeTime(date: Date): string {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  }).format(date);
}

export async function createLiveDrawPlan(
  participantsValue: unknown,
  options: {
    now?: Date;
    durationMs?: number;
    startRotation?: number;
    randomWord?: RandomWordSource;
    uuidFactory?: () => string;
  } = {},
): Promise<{
  receipt: DrawReceiptV1;
  startAt: string;
  revealAt: string;
  durationMs: number;
  startRotation: number;
  finalRotation: number;
}> {
  const participants = normalizeParticipants(participantsValue);
  if (participants.length < SPINNER_MIN_PARTICIPANTS) {
    throw new RangeError(
      `A draw requires ${SPINNER_MIN_PARTICIPANTS}–${SPINNER_MAX_PARTICIPANTS} participants.`,
    );
  }
  const now = options.now ? new Date(options.now.getTime()) : new Date();
  if (Number.isNaN(now.getTime())) {
    throw new TypeError("The draw timestamp is invalid.");
  }
  const durationMs = normalizeDurationMs(options.durationMs);
  const requestedStartRotation = Number(options.startRotation || 0);
  if (!Number.isFinite(requestedStartRotation)) {
    throw new TypeError("The starting rotation is invalid.");
  }
  const startRotation = normalizedRotationDegrees(requestedStartRotation);

  // Hash and construct every fallible field before selection. One invocation
  // owns the rejection loop and its accepted word; callers never resample it.
  const rosterSnapshot: RosterStateV1 = { version: 1, participants };
  const rosterHashSha256 = await sha256Hex(
    canonicalRosterPayload(participants),
  );
  const drawId = (options.uuidFactory || (() => crypto.randomUUID()))();
  if (!UUID_PATTERN.test(drawId)) {
    throw new TypeError("The draw ID is invalid.");
  }
  const timestampIso = now.toISOString();
  const sample = sampleUniformIndex(
    participants.length,
    options.randomWord || secureRandomWord,
  );
  const winner = { ...participants[sample.index] };
  const startAtDate = new Date(now.getTime() + SPINNER_START_DELAY_MS);
  const revealAtDate = new Date(startAtDate.getTime() + durationMs);
  const targetAngle = normalizedRotationDegrees(
    targetRotationDegrees(sample.index, participants.length),
  );
  const alignmentTravel = normalizedRotationDegrees(
    targetAngle - startRotation,
  );
  const finalRotation = startRotation + 6 * 360 + alignmentTravel;

  return {
    receipt: {
      version: 1,
      drawId,
      timestampIso,
      singaporeTime: formatSingaporeTime(now),
      appVersion: SPINNER_APP_VERSION,
      algorithmVersion: SPINNER_ALGORITHM_VERSION,
      rosterSnapshot,
      rosterHashSha256,
      rejectionLimit: sample.rejectionLimit,
      sampledWords: [...sample.sampledWords],
      acceptedWord: sample.acceptedWord,
      selectedIndex: sample.index,
      winner,
    },
    startAt: startAtDate.toISOString(),
    revealAt: revealAtDate.toISOString(),
    durationMs,
    startRotation,
    finalRotation,
  };
}

const NO_MENTIONS = Object.freeze({
  parse: [],
  users: [],
  roles: [],
  replied_user: false,
});

export function sanitizeDiscordDisplayName(value: string): string {
  const plain = normalizeDisplayName(value)
    .replace(/[\u0000-\u001f\u007f]/gu, "")
    .replace(/@/gu, "＠")
    .replace(/</gu, "‹")
    .replace(/>/gu, "›")
    .replace(/[`*_~|\\]/gu, "");
  return graphemes(plain).slice(0, SPINNER_MAX_NAME_GRAPHEMES).join("") ||
    "Mōchirīī member";
}

export function buildDiscordOutboxPayloads(
  receipt: DrawReceiptV1,
  startAt: string,
): {
  channelKey: string;
  channelId: string;
  startPayload: Record<string, unknown>;
  resultPayload: Record<string, unknown>;
} {
  const startAtMs = Date.parse(startAt);
  if (!Number.isFinite(startAtMs)) {
    throw new TypeError("The live draw start timestamp is invalid.");
  }
  const startAtUnixSeconds = Math.floor(startAtMs / 1_000);
  const winner = sanitizeDiscordDisplayName(receipt.winner.displayName);
  const nonce = receipt.drawId.replace(/-/gu, "").slice(0, 25);
  return {
    channelKey: SPINNER_DISCORD_CHANNEL_KEY,
    channelId: SPINNER_DISCORD_CHANNEL_ID,
    startPayload: {
      content:
        `A Mōchirīī monthly guild raffle begins <t:${startAtUnixSeconds}:R>.\nWatch the moonwheel live: ${SPINNER_LIVE_URL}`,
      nonce,
      enforce_nonce: true,
      allowed_mentions: { ...NO_MENTIONS, parse: [], users: [], roles: [] },
    },
    resultPayload: {
      content:
        `Mōchirīī raffle complete.\nWinner: **${winner}**\nDraw: \`${receipt.drawId}\`\nReceipt: \`${receipt.rosterHashSha256}\``,
      allowed_mentions: { ...NO_MENTIONS, parse: [], users: [], roles: [] },
    },
  };
}

export async function commandRequestHash(value: unknown): Promise<string> {
  return sha256Hex(JSON.stringify(value));
}

export function serializeSnapshot(
  value: unknown,
  now = new Date(),
): SpinnerSnapshotV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Live spinner state is unavailable.");
  }
  const row = value as Record<string, unknown>;
  const participants = normalizeParticipants(row.participants);
  const storedPhase = row.phase === "spinning" || row.phase === "revealed"
    ? row.phase
    : "idle";
  const revealAt = typeof row.revealAt === "string" ? row.revealAt : null;
  const revealedByTime = storedPhase === "spinning" && revealAt !== null &&
    Date.parse(revealAt) <= now.getTime();
  const phase = revealedByTime ? "revealed" : storedPhase;
  const includeWinner = phase === "revealed";
  const winner = includeWinner && row.winner && typeof row.winner === "object"
    ? normalizeParticipant(row.winner)
    : null;

  return {
    version: 1,
    sessionId: String(row.sessionId || ""),
    revision: Number(row.revision || 0),
    phase,
    participants,
    startedAt: typeof row.startedAt === "string" ? row.startedAt : null,
    revealAt,
    durationMs: Number(row.durationMs || 0),
    startRotation: Number(row.startRotation || 0),
    finalRotation: Number(row.finalRotation || 0),
    selectedIndex: includeWinner && Number.isInteger(Number(row.selectedIndex))
      ? Number(row.selectedIndex)
      : null,
    winner,
    drawId: typeof row.drawId === "string" ? row.drawId : null,
    updatedAt: String(row.updatedAt || now.toISOString()),
  };
}

export function buildSnapshotResponseData(
  mode: "controller" | "viewer",
  snapshot: SpinnerSnapshotV1,
  serverNow: string,
  receipt?: Record<string, unknown>,
  commandId?: string,
): Record<string, unknown> {
  return {
    mode,
    snapshot,
    serverNow,
    ...(mode === "controller" && receipt ? { receipt } : {}),
    ...(mode === "controller" && commandId ? { commandId } : {}),
  };
}
