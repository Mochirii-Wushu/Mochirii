import type { ReactNode } from "react";
import Link from "next/link";
import { cleanRoute, isExternalHref, ProseStack, publicPath, StaticImage, text } from "./common";

export type DataRecord = Record<string, unknown>;

export function record(value: unknown): DataRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as DataRecord) : {};
}

export function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function records(value: unknown): DataRecord[] {
  return array(value).map(record).filter((item) => Object.keys(item).length > 0);
}

export function strings(value: unknown, limit?: number) {
  const list = array(value)
    .map((item) => text(item))
    .filter(Boolean);
  return typeof limit === "number" ? list.slice(0, limit) : list;
}

export function badgeItems(value: unknown) {
  return array(value)
    .map((item) => {
      if (typeof item === "string") return item;
      const badge = record(item);
      return { label: text(badge.label), href: text(badge.href) };
    })
    .filter((item) => (typeof item === "string" ? item : item.label));
}

export function linkProps(href: unknown) {
  const cleanHref = cleanRoute(href);
  return {
    href: cleanHref,
    target: isExternalHref(cleanHref) ? "_blank" : undefined,
    rel: isExternalHref(cleanHref) ? "noopener noreferrer" : undefined,
  };
}

export function ReturnHomeLink() {
  return (
    <div className="u-mt-18">
      <Link href="/" className="footer-link">
        Return to Home
      </Link>
    </div>
  );
}

export function MiniCard({ title, description }: { title: unknown; description: unknown }) {
  return (
    <div className="col-6">
      <article className="glass-card glass-card--soft glass-pad">
        <h3 className="section-title section-title--sm u-m-0">
          {text(title, "Title")}
        </h3>
        <p className="muted u-mt-10">
          {text(description)}
        </p>
      </article>
    </div>
  );
}

export function ListBlock({ title, items }: { title: unknown; items: unknown }) {
  return (
    <div className="col-12">
      <article className="glass-card glass-card--soft glass-pad">
        <h3 className="section-title section-title--sm u-m-0">
          {text(title, "Section")}
        </h3>
        <ul className="u-list-inset">
          {strings(items, 10).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    </div>
  );
}

export function RankCards({ ranks }: { ranks: unknown }) {
  const items = records(ranks);

  if (!items.length) {
    return <p className="muted">—</p>;
  }

  return (
    <>
      {items.map((rank) => (
        <div className="glass-card glass-card--soft glass-pad u-card-no-shadow" key={text(rank.name, "Rank")}>
          <h3 className="section-title section-title--sm u-mb-8">
            {text(rank.name, "Rank")}
          </h3>
          <ProseStack lines={rank.body} />
        </div>
      ))}
    </>
  );
}

export function OverlayCard({
  image,
  alt,
  aspectRatio,
  children,
}: {
  image: unknown;
  alt: unknown;
  aspectRatio: "3 / 4" | "16 / 10";
  children: ReactNode;
}) {
  const frameClass = aspectRatio === "3 / 4" ? "overlay-card__frame--portrait" : "overlay-card__frame--wide";

  return (
    <article className="glass-card glass-card--soft overlay-card">
      <div className={`overlay-card__frame ${frameClass}`}>
        {text(image) ? (
          <StaticImage
            src={publicPath(image)}
            alt={text(alt)}
            width={960}
            height={640}
            className="overlay-card__image"
            sizes="(max-width: 980px) calc(100vw - 68px), 580px"
          />
        ) : null}
        <div className="overlay-card__scrim" aria-hidden="true" />
        <div className="overlay-card__content">
          <div className="glass-card glass-card--primary overlay-card__panel">
            {children}
          </div>
        </div>
      </div>
    </article>
  );
}
