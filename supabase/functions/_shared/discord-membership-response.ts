import type { DiscordFetchResult, JsonRecord } from "./discord-api.ts";

export function discordErrorCode(value: unknown): number | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const code = (value as JsonRecord).code;
  return typeof code === "number" && Number.isSafeInteger(code) && code >= 0
    ? code
    : null;
}

export function isDiscordUnknownMemberResponse(
  result: Pick<DiscordFetchResult, "status" | "error">,
): boolean {
  return result.status === 404 && discordErrorCode(result.error) === 10_007;
}
