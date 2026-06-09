"use client";

import { useEffect, useMemo, useState } from "react";
import { listVisibleProfileCards } from "@/lib/supabase/member-profiles";
import type { VisibleProfileCard } from "@/lib/supabase/types";

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function profileBySlug(profiles: VisibleProfileCard[], slug: string): VisibleProfileCard | null {
  const key = slug.toLowerCase();
  return profiles.find((profile) => clean(profile.slug).toLowerCase() === key) || null;
}

export function useVisibleProfileCards(slugs: string[]) {
  const slugKey = slugs.map((slug) => clean(slug).toLowerCase()).filter(Boolean).join("|");
  const stableSlugs = useMemo(
    () => Array.from(new Set(slugKey.split("|").filter(Boolean))).slice(0, 12),
    [slugKey],
  );
  const [profiles, setProfiles] = useState<VisibleProfileCard[]>([]);

  useEffect(() => {
    let alive = true;
    if (!stableSlugs.length) return;

    listVisibleProfileCards(stableSlugs).then((result) => {
      if (!alive) return;
      setProfiles(result.ok && result.data?.profiles ? result.data.profiles : []);
    });

    return () => {
      alive = false;
    };
  }, [stableSlugs]);

  return stableSlugs.length ? profiles : [];
}

export function LeaderProfileButton({
  slug,
  fallbackHref,
  label,
}: {
  slug?: string;
  fallbackHref?: string;
  label?: string;
}) {
  const profiles = useVisibleProfileCards(slug ? [slug] : []);
  const profile = slug ? profileBySlug(profiles, slug) : null;
  const href = clean(profile?.profileHref) || clean(fallbackHref);
  const shouldShow = Boolean(href) && (Boolean(fallbackHref) || profile?.hasFilledProfile === true);

  if (!shouldShow) return null;

  return (
    <a className="footer-link leader-profile-link" href={href} style={{ display: "inline-flex", marginTop: 12 }}>
      {clean(label, "Open profile")}
    </a>
  );
}

export function SpotlightProfileCard({
  slug,
  compact = false,
}: {
  slug?: string;
  compact?: boolean;
}) {
  const profiles = useVisibleProfileCards(slug ? [slug] : []);
  const profile = slug ? profileBySlug(profiles, slug) : null;
  const href = clean(profile?.profileHref);

  if (!profile?.hasApprovedAvatar || !profile.avatarUrl || !href) return null;

  return (
    <a className={compact ? "spotlight-profile-card spotlight-profile-card--compact" : "spotlight-profile-card"} href={href}>
      <img src={profile.avatarUrl} alt="" loading="lazy" decoding="async" />
      <span>
        <strong>{clean(profile.displayName, "Mōchirīī Member")}</strong>
        <small>{clean(profile.guildTitle, "Mōchirīī Member")}</small>
      </span>
    </a>
  );
}
