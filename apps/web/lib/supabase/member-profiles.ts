"use client";

import { invokeEdgeFunction } from "./client";
import { okResult, text } from "./types";
import type { VisibleProfileCardsResponse } from "./types";

export async function listVisibleProfileCards(slugs: string[]) {
  const cleanSlugs = Array.from(new Set(slugs.map((slug) => text(slug).toLowerCase()).filter(Boolean))).slice(0, 12);
  if (!cleanSlugs.length) return okResult<VisibleProfileCardsResponse>({ profiles: [], count: 0 });
  return invokeEdgeFunction<VisibleProfileCardsResponse>("list-visible-profile-cards", { slugs: cleanSlugs });
}
