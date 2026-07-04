"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

const SOCIAL_HOST = "https://social.mochirii.com";

const guildLinks = [
  { href: "/", label: "Home" },
  { href: "/spotlight", label: "Spotlight" },
  { href: "/gallery", label: "Gallery" },
  { href: SOCIAL_HOST, label: "Social", external: true },
] satisfies FooterLink[];

const cultureLinks = [
  { href: "/join", label: "Join" },
  { href: "/ranks", label: "Ranks" },
  { href: "/leaders", label: "Leaders" },
  { href: "/tome", label: "Tome" },
  { href: "/spotify", label: "Playlists" },
] satisfies FooterLink[];

const updateLinks = [
  { href: "/announcements", label: "Announcements" },
  { href: "/events", label: "Events" },
  { href: "/raffles", label: "Raffles" },
] satisfies FooterLink[];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <div className="footer-col">
      <div className="footer-col-title">{title}</div>
      {links.map((link) => (
        link.external ? (
          <a className="footer-nav" href={link.href} key={`${title}-${link.href}`}>
            {link.label}
          </a>
        ) : (
          <Link className="footer-nav" href={link.href} key={`${title}-${link.href}`}>
            {link.label}
          </Link>
        )
      ))}
    </div>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  const pathname = usePathname();
  const hideToolingLanguage = (pathname || "").replace(/\/+$/, "") === "/games/mochi-pets";
  const visibleCultureLinks = hideToolingLanguage
    ? cultureLinks.filter((link) => link.href !== "/tome")
    : cultureLinks;

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="footer-wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <Link className="footer-brand-link" href="/" aria-label="Mōchirīī Home">
              <Image
                className="footer-emblem"
                src="/assets/img/brand/emblem.webp"
                alt=""
                width={56}
                height={56}
                sizes="56px"
              />
              <span className="brand-text">
                <span className="footer-title">Mōchirīī</span>
                <span className="footer-sub">A Where Winds Meet Guild</span>
              </span>
            </Link>

            <div className="footer-brand-text">
              <p className="footer-desc">
                Mōchirīī is a quiet Where Winds Meet guild: check event notes,
                support each other, and bring lantern warmth to the hall.
              </p>

              <div className="footer-actions">
                <a
                  className="footer-cta"
                  href="https://discord.com/invite/dPafqMwWPK"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Join Mōchirīī on Discord"
                >
                  Join<span className="footer-cta-glint" aria-hidden="true" />
                </a>

                <Link className="footer-link" href="/recruitment">
                  Recruitment Tips
                </Link>
              </div>
            </div>
          </div>

          <div className="footer-cols" aria-label="Footer navigation">
            <FooterColumn title="Guild" links={guildLinks} />
            <FooterColumn title="Culture" links={visibleCultureLinks} />
            <FooterColumn title="Updates" links={updateLinks} />
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-meta">
            <span id="copyright-text">© {year} Mōchirīī</span>
            <span className="dot" aria-hidden="true">•</span>
            <span className="footer-dim">Where Winds Meet</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
