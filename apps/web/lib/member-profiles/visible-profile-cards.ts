import { SUPABASE_PROJECT_REF } from "@/lib/public-urls";

export type VisibleProfileCard = {
  slug?: string | null;
  displayName?: string | null;
  guildTitle?: string | null;
  avatarUrl?: string | null;
  profileHref?: string | null;
  hasApprovedAvatar?: boolean | null;
  hasVisibleProfile?: boolean | null;
  hasFilledProfile?: boolean | null;
};

type VisibleProfileCardsResponse = {
  profiles: VisibleProfileCard[];
  count?: number;
  signedUrlSeconds?: number;
};

type VisibleProfileCardsResult = {
  ok: boolean;
  data: VisibleProfileCardsResponse | null;
};

function publicProfileCardsUrl() {
  const configuredUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
  const baseUrl = configuredUrl || `https://${SUPABASE_PROJECT_REF}.supabase.co`;
  return `${baseUrl}/functions/v1/list-visible-profile-cards`;
}

function asResponse(value: unknown): VisibleProfileCardsResponse | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<VisibleProfileCardsResponse>;
  if (!Array.isArray(candidate.profiles)) return null;
  return candidate as VisibleProfileCardsResponse;
}

export async function listVisibleProfileCards(
  slugs: string[],
  signal?: AbortSignal,
): Promise<VisibleProfileCardsResult> {
  const cleanSlugs = Array.from(
    new Set(slugs.map((slug) => String(slug || "").trim().toLowerCase()).filter(Boolean)),
  ).slice(0, 12);

  if (!cleanSlugs.length) return { ok: true, data: { profiles: [], count: 0 } };

  try {
    const response = await fetch(publicProfileCardsUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs: cleanSlugs }),
      signal,
    });
    const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
    const data = asResponse(payload?.data || payload);

    return {
      ok: response.ok && payload?.ok !== false && Boolean(data),
      data,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return { ok: false, data: null };
  }
}
