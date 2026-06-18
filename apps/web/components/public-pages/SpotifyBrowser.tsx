"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SpotifyItem = {
  title?: string;
  subtitle?: string;
  type?: string;
  tags?: string[];
  embed?: string;
  url?: string;
  height?: number;
  description?: string;
};

const allowedKinds = new Set(["album", "artist", "episode", "playlist", "show", "track"]);

function text(value: unknown, fallback = "") {
  const clean = String(value ?? "").trim();
  return clean || fallback;
}

function normalizeTags(tags: unknown) {
  if (!Array.isArray(tags)) return [];
  return tags.map((tag) => text(tag)).filter(Boolean);
}

function toSpotifyEmbedSrc(value: unknown) {
  const raw = text(value);
  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (url.hostname !== "open.spotify.com") return "";

    const parts = url.pathname.split("/").filter(Boolean);
    const embedIndex = parts[0] === "embed" ? 1 : 0;
    const kind = parts[embedIndex];
    const id = parts[embedIndex + 1];

    if (!kind || !id || !allowedKinds.has(kind)) return "";
    return `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator`;
  } catch {
    return "";
  }
}

function SpotifyEmbed({
  title,
  src,
  height,
}: {
  title: string;
  src: string;
  height: number;
}) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;

    const shell = shellRef.current;
    if (!shell || typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "640px 0px" },
    );

    observer.observe(shell);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div
      className="spotify-embed u-mt-12"
      ref={shellRef}
      style={{ minHeight: `${height}px` }}
      data-deferred-spotify-embed="true"
      aria-label={`Spotify player shell: ${title}`}
    >
      {shouldLoad ? (
        <iframe
          src={src}
          width="100%"
          height={height}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title={`Spotify embed: ${title}`}
        />
      ) : (
        <div className="spotify-embed__placeholder" aria-hidden="true" />
      )}
    </div>
  );
}

export function SpotifyBrowser({
  intro,
  items,
}: {
  intro: string;
  items: SpotifyItem[];
}) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("All");

  const normalized = useMemo(
    () =>
      items
        .map((item) => ({
          title: text(item.title, "Untitled"),
          subtitle: text(item.subtitle),
          description: text(item.description),
          type: text(item.type, "playlist"),
          tags: normalizeTags(item.tags),
          src: toSpotifyEmbedSrc(item.embed || item.url),
          height: Number(item.height) > 0 ? Number(item.height) : 352,
        }))
        .filter((item) => item.src),
    [items],
  );

  const tags = useMemo(() => {
    const set = new Set(["All"]);
    normalized.forEach((item) => item.tags.forEach((itemTag) => set.add(itemTag)));
    return [...set];
  }, [normalized]);

  const filtered = normalized.filter((item) => {
    const haystack = [item.title, item.subtitle, item.description, item.type, ...item.tags].join(" ").toLowerCase();
    const queryOk = !query.trim() || haystack.includes(query.trim().toLowerCase());
    const tagOk = tag === "All" || item.tags.includes(tag);
    return queryOk && tagOk;
  });

  return (
    <section className="glass-card glass-card--primary glass-pad" aria-label="Spotify playlists">
      <h2 className="section-title">Collection</h2>
      <p className="muted" id="spotifyIntro">
        {intro || "Browse and play from the embedded shelf."}
      </p>

      <div className="spotify-toolbar" aria-label="Playlist tools">
        <div className="spotify-search">
          <label className="muted u-block u-mb-6" htmlFor="spotifySearch">
            Search
          </label>
          <input
            id="spotifySearch"
            type="search"
            placeholder="Type a title, mood, or tag..."
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="spotify-chips" id="spotifyChips" aria-label="Tag filters">
          {tags.map((itemTag) => (
            <button
              type="button"
              className="spotify-chip"
              data-tag={itemTag}
              aria-pressed={itemTag === tag}
              key={itemTag}
              onClick={() => setTag(itemTag)}
            >
              {itemTag}
            </button>
          ))}
        </div>
      </div>

      <div className="spotify-grid" id="spotifyGrid" aria-label="Playlist embeds">
        {filtered.map((item) => (
          <article className="spotify-card glass-card glass-card--primary glass-pad" aria-label={item.title} key={item.src}>
            <div className="spotify-card__head">
              <div>
                <h3 className="spotify-card__title">{item.title}</h3>
                <div className="spotify-card__meta">
                  {item.subtitle ? `${item.subtitle} • ` : ""}
                  {item.type}
                </div>
                {item.description ? <p className="muted u-mt-10">{item.description}</p> : null}
              </div>
            </div>
            <SpotifyEmbed title={item.title} src={item.src} height={item.height} />
          </article>
        ))}
      </div>

      <div className="spotify-empty" id="spotifyEmpty" hidden={filtered.length > 0}>
        <p className="muted u-m-0">
          No matches. Try clearing filters or using fewer keywords.
        </p>
      </div>
    </section>
  );
}
