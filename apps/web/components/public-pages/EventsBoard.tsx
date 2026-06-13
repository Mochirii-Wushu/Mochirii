"use client";

import { useMemo, useState } from "react";
import { StaticImage } from "./common";

type EventItem = {
  id?: string;
  date?: string;
  startIso?: string;
  endIso?: string;
  dayText?: string;
  time?: string;
  timeText?: string;
  timezone?: string;
  title?: string;
  summary?: string;
  image?: string;
  href?: string;
};

const filters = {
  upcoming: {
    label: "Upcoming",
    empty: "No upcoming events are posted yet. Watch Discord; the next gathering will find its hour.",
  },
  past: {
    label: "Past",
    empty: "No past events are archived yet. The hall is ready for new memories.",
  },
  all: {
    label: "All",
    empty: "No events are posted yet. Discord carries the freshest word when the hall begins to gather.",
  },
};

type FilterKey = keyof typeof filters;

function text(value: unknown, fallback = "") {
  const clean = String(value ?? "").trim();
  return clean || fallback;
}

function publicPath(value: unknown, fallback = "") {
  const raw = text(value, fallback);
  if (!raw) return "";
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(raw)) return raw;
  if (raw.startsWith("./")) return `/${raw.slice(2)}`;
  return `/${raw}`;
}

function parseDateOnlyUTC(value: unknown) {
  const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

function todayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function parseIso(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function eventStatus(item: EventItem) {
  const eventEnd = parseIso(item.endIso);
  if (eventEnd) return eventEnd.getTime() >= Date.now() ? "upcoming" : "past";
  const eventDate = parseDateOnlyUTC(item.date);
  if (!eventDate) return "upcoming";
  return eventDate.getTime() >= todayUTC().getTime() ? "upcoming" : "past";
}

function eventTimestamp(item: EventItem) {
  const eventStart = parseIso(item.startIso);
  if (eventStart) return eventStart.getTime();
  return parseDateOnlyUTC(item.date)?.getTime() ?? 0;
}

function formatDateUTC(value: unknown) {
  const raw = text(value);
  if (!raw) return "";
  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) return raw;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function isExternal(href: string) {
  return /^https?:\/\//i.test(href);
}

export function EventsBoard({ items }: { items: EventItem[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("upcoming");

  const normalized = useMemo(
    () =>
      items
        .map((item, index) => ({
          ...item,
          index,
          status: eventStatus(item) as FilterKey,
        }))
        .filter((item) => item.title || item.summary || item.date),
    [items],
  );

  const visible = useMemo(() => {
    const list = activeFilter === "all" ? normalized : normalized.filter((item) => item.status === activeFilter);
    const direction = activeFilter === "past" ? -1 : 1;

    return [...list].sort((a, b) => {
      if (activeFilter === "all" && a.status !== b.status) return a.status === "upcoming" ? -1 : 1;

      const delta = eventTimestamp(a) - eventTimestamp(b);
      if (delta !== 0) {
        const allDirection = activeFilter === "all" && a.status === "past" ? -1 : direction;
        return delta * allDirection;
      }

      return a.index - b.index;
    });
  }, [activeFilter, normalized]);

  const filterMeta = filters[activeFilter];
  const countText = visible.length
    ? `${filterMeta.label}: ${visible.length} ${visible.length === 1 ? "event" : "events"}`
    : `${filterMeta.label}: none posted`;

  return (
    <>
      <div className="events-toolbar" aria-labelledby="eventsBoardTitle">
        <div className="events-filters" role="group" aria-label="Filter events">
          {Object.entries(filters).map(([key, meta]) => (
            <button
              className="events-filter"
              type="button"
              data-events-filter={key}
              aria-pressed={activeFilter === key}
              key={key}
              onClick={() => setActiveFilter(key as FilterKey)}
            >
              {meta.label}
            </button>
          ))}
        </div>
        <p className="events-count muted" id="eventsCount" aria-live="polite">
          {countText}
        </p>
      </div>

      <div id="eventsUpcoming" className="events-upcoming" aria-live="polite" aria-label="Event Board results" tabIndex={0}>
        {visible.length ? (
          visible.map((item) => {
            const metaLine = [formatDateUTC(item.date), item.dayText, item.timeText || item.time, item.timezone]
              .map((value) => text(value))
              .filter(Boolean)
              .join(" • ");
            const href = text(item.href, "https://discord.com/invite/dPafqMwWPK");

            return (
              <section className="events-list__item" key={`${item.id || item.title}-${item.date}`}>
                <p className="kicker">{metaLine}</p>
                <h4 className="section-title section-title--sm">{text(item.title, "Event")}</h4>
                <p className="muted">{text(item.summary)}</p>
                {item.image ? (
                  <div className="u-mt-12">
                    <StaticImage
                      src={publicPath(item.image)}
                      alt={text(item.title, "Event")}
                      width={1600}
                      height={640}
                      className="events-list__image"
                      sizes="(max-width: 980px) calc(100vw - 86px), 320px"
                    />
                  </div>
                ) : null}
                <div className="badge-row u-mt-14">
                  <span>
                    <a href={href} target={isExternal(href) ? "_blank" : undefined} rel={isExternal(href) ? "noopener noreferrer" : undefined}>
                      Open details
                    </a>
                  </span>
                </div>
              </section>
            );
          })
        ) : (
          <p className="events-empty muted">{filterMeta.empty}</p>
        )}
      </div>
    </>
  );
}
