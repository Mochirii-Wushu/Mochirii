export type LatestOfficialRaffleWinner = {
  publicLabel: "Winner Confirmed";
  cycleMonth: string;
  selectedAt: string;
  displayName: string | null;
};

export type LatestOfficialRaffleWinnerRead =
  | { ok: true; data: LatestOfficialRaffleWinner | null }
  | { ok: false; data: null };

const RPC_KEYS = ["cycle_month", "display_name", "public_label", "selected_at"] as const;
const API_KEYS = ["cycleMonth", "displayName", "publicLabel", "selectedAt"] as const;
const BIDI_CONTROL_PATTERN = /[\u202a-\u202e\u2066-\u2069]/u;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/u;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function hasExactKeys(source: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(source).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function singaporeCycleMonth(instant: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(instant));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}-01` : null;
}

function countGraphemes(value: string) {
  if (typeof Intl.Segmenter === "function") {
    return Array.from(
      new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value),
    ).length;
  }
  return Array.from(value).length;
}

function parseFields(
  publicLabel: unknown,
  cycleMonth: unknown,
  selectedAt: unknown,
  displayName: unknown,
): LatestOfficialRaffleWinner | null {
  if (publicLabel !== "Winner Confirmed") return null;
  if (typeof cycleMonth !== "string" || !/^\d{4}-\d{2}-01$/u.test(cycleMonth)) return null;
  if (typeof selectedAt !== "string" || !Number.isFinite(Date.parse(selectedAt))) return null;
  const normalizedInstant = new Date(selectedAt).toISOString();
  if (singaporeCycleMonth(normalizedInstant) !== cycleMonth) return null;
  if (displayName !== null) {
    if (
      typeof displayName !== "string"
      || displayName !== displayName.normalize("NFKC").trim()
      || !displayName
      || countGraphemes(displayName) > 40
      || Array.from(displayName).length > 40
      || CONTROL_PATTERN.test(displayName)
      || BIDI_CONTROL_PATTERN.test(displayName)
    ) return null;
  }
  return {
    publicLabel,
    cycleMonth,
    selectedAt: normalizedInstant,
    displayName,
  };
}

export function parseLatestOfficialRaffleWinnerRows(value: unknown): LatestOfficialRaffleWinner | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (value.length !== 1) return null;
  const row = record(value[0]);
  if (!row || !hasExactKeys(row, RPC_KEYS)) return null;
  return parseFields(row.public_label, row.cycle_month, row.selected_at, row.display_name);
}

export function latestOfficialRaffleWinnerRowsAreEmpty(value: unknown) {
  return Array.isArray(value) && value.length === 0;
}

export function resolveLatestOfficialRaffleWinnerRead(
  primary: LatestOfficialRaffleWinnerRead,
  anonymousFallback?: LatestOfficialRaffleWinnerRead,
): LatestOfficialRaffleWinnerRead {
  if (primary.ok || !anonymousFallback) return primary;
  if (!anonymousFallback.ok || !anonymousFallback.data) return anonymousFallback;
  return {
    ok: true,
    data: { ...anonymousFallback.data, displayName: null },
  };
}

export function parseLatestOfficialRaffleWinnerApi(value: unknown): LatestOfficialRaffleWinner | null {
  const envelope = record(value);
  if (!envelope || !hasExactKeys(envelope, ["data", "ok"]) || envelope.ok !== true) return null;
  if (envelope.data === null) return null;
  const data = record(envelope.data);
  if (!data || !hasExactKeys(data, API_KEYS)) return null;
  return parseFields(data.publicLabel, data.cycleMonth, data.selectedAt, data.displayName);
}

export function latestOfficialRaffleWinnerApiIsEmpty(value: unknown) {
  const envelope = record(value);
  return Boolean(envelope && hasExactKeys(envelope, ["data", "ok"]) && envelope.ok === true && envelope.data === null);
}
