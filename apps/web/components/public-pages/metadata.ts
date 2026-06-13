import type { Metadata } from "next";

type PageKey =
  | "join"
  | "ranks"
  | "leaders"
  | "codex"
  | "events"
  | "announcements"
  | "raffles"
  | "gallery"
  | "spotlight"
  | "spotify"
  | "recruitment"
  | "twills";

const siteUrl = "https://mochirii.com";

const pageMeta: Record<
  PageKey,
  {
    title: string;
    description: string;
    path: string;
    image: string;
    imageAlt: string;
  }
> = {
  join: {
    title: "Join Mōchirīī • Where Winds Meet Guild",
    description:
      "How to join Mōchirīī in Where Winds Meet, with Discord steps, gentle expectations, and newcomer-friendly events.",
    path: "/join",
    image: "/assets/img/join/hero.webp",
    imageAlt: "Guild join path over warm hall artwork",
  },
  ranks: {
    title: "Mōchirīī Ranks • Where Winds Meet Guild",
    description:
      "Mōchirīī ranks, leadership paths, member growth, and the steady care that keeps the guild hall strong.",
    path: "/ranks",
    image: "/assets/img/ranks/hero.webp",
    imageAlt: "Guild rank path and hall artwork",
  },
  leaders: {
    title: "Mōchirīī Leaders • Where Winds Meet Guild",
    description:
      "Meet Mōchirīī leaders, hall contacts, and the people who help Where Winds Meet members find the next clear step.",
    path: "/leaders",
    image: "/assets/img/leaders/hero.webp",
    imageAlt: "Guild leadership hall artwork",
  },
  codex: {
    title: "Mōchirīī Codex • Where Winds Meet Guild",
    description:
      "The Mōchirīī Codex: values, etiquette, event rhythm, and plain guild care for Where Winds Meet members.",
    path: "/codex",
    image: "/assets/img/codex/hero.webp",
    imageAlt: "Guild codex and values artwork",
  },
  events: {
    title: "Mōchirīī Events • Where Winds Meet Guild",
    description:
      "Mōchirīī event notes, RSVP details, and shared runs for Where Winds Meet members who gather when the hour is right.",
    path: "/events",
    image: "/assets/img/events/hero.webp",
    imageAlt: "Guild events gathering artwork",
  },
  announcements: {
    title: "Mōchirīī Announcements • Where Winds Meet Guild",
    description:
      "Latest Mōchirīī announcements, schedule notes, guild notices, and Where Winds Meet updates from the hall.",
    path: "/announcements",
    image: "/assets/img/announcements/hero.webp",
    imageAlt: "Guild announcement hall artwork",
  },
  raffles: {
    title: "Mōchirīī Raffles • Where Winds Meet Guild",
    description:
      "Monthly Mōchirīī raffle notes, rules, prize timing, and small thank-you draws for active members.",
    path: "/raffles",
    image: "/assets/img/raffles/hero.webp",
    imageAlt: "Guild raffle and thank-you artwork",
  },
  gallery: {
    title: "Mōchirīī Gallery • Where Winds Meet Guild",
    description:
      "Screenshots from Mōchirīī runs, quiet roads, guild gatherings, and small Where Winds Meet moments worth keeping.",
    path: "/gallery",
    image: "/assets/img/gallery/hero.webp",
    imageAlt: "Guild gallery memory artwork",
  },
  spotlight: {
    title: "Mōchirīī Member Spotlight • Where Winds Meet Guild",
    description:
      "Monthly Mōchirīī member appreciation for the helpful, steady voices who keep the Where Winds Meet guild bright.",
    path: "/spotlight",
    image: "/assets/img/spotlight/hero.webp",
    imageAlt: "Member spotlight artwork",
  },
  spotify: {
    title: "Mōchirīī Playlists • Where Winds Meet Guild",
    description:
      "A quiet Mōchirīī listening room for ambient music, guild reading, planning, and late-night play.",
    path: "/spotify",
    image: "/assets/img/spotify/hero.webp",
    imageAlt: "Guild playlist listening room artwork",
  },
  recruitment: {
    title: "Mōchirīī Recruitment • Where Winds Meet Guild",
    description:
      "A Mōchirīī recruitment note about joining through Discord, growing the guild with care, and keeping the hall warm.",
    path: "/recruitment",
    image: "/assets/img/recruitment/hero.webp",
    imageAlt: "Guild recruitment path artwork",
  },
  twills: {
    title: "Twills • Mōchirīī Leader Profile",
    description:
      "Profile for Twills, Mōchirīī leader and guild contact for Where Winds Meet members who need a clear next step.",
    path: "/twills",
    image: "/assets/img/profiles/twills/hero.webp",
    imageAlt: "Twills leader profile artwork",
  },
};

export function metadataFor(page: PageKey): Metadata {
  const meta = pageMeta[page];
  const url = `${siteUrl}${meta.path}`;

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: meta.path,
    },
    openGraph: {
      type: "website",
      siteName: "Mōchirīī",
      title: meta.title,
      description: meta.description,
      url,
      images: [
        {
          url: meta.image,
          alt: meta.imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [meta.image],
    },
  };
}
