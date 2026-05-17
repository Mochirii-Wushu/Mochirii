"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCurrentUser, onAuthStateChange } from "@/lib/supabase/auth";
import { getCurrentProfile, profileIsActive } from "@/lib/supabase/profile";
import {
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type NavItem = {
  href: string;
  label: string;
  nav: string;
  auth?: "signed-out" | "signed-in" | "verified";
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    id: "guild",
    label: "Guild",
    items: [
      { href: "/", label: "Home", nav: "home" },
      { href: "/spotlight", label: "Spotlight", nav: "spotlight" },
      { href: "/gallery", label: "Gallery", nav: "gallery" },
    ],
  },
  {
    id: "culture",
    label: "Culture",
    items: [
      { href: "/join", label: "Join", nav: "join" },
      { href: "/ranks", label: "Ranks", nav: "ranks" },
      { href: "/leaders", label: "Leaders", nav: "leaders" },
      { href: "/codex", label: "Codex", nav: "codex" },
      { href: "/spotify", label: "Playlists", nav: "spotify" },
    ],
  },
  {
    id: "updates",
    label: "Updates",
    items: [
      { href: "/announcements", label: "Announcements", nav: "announcements" },
      { href: "/events", label: "Events", nav: "events" },
      { href: "/raffles", label: "Raffles", nav: "raffles" },
    ],
  },
];

const notesLinks: NavItem[] = [
  { href: "/recruitment", label: "Recruitment", nav: "recruitment" },
  { href: "/auth", label: "Login", nav: "auth", auth: "signed-out" },
  { href: "/account", label: "Account", nav: "account", auth: "signed-in" },
  { href: "/gallery-submit", label: "Submit Image", nav: "gallery-submit", auth: "verified" },
  { href: "/leader-dashboard", label: "Leader Dashboard", nav: "leader-dashboard", auth: "signed-in" },
];

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function navKeyFromPath(pathname: string | null) {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/index.html") return "home";
  return path.slice(1).replace(/\.html$/, "") || "home";
}

function getFocusable(root: HTMLElement | null) {
  if (!root) return [];

  return Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter((el) => {
    if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;
    if (el.closest("[hidden]")) return false;
    return el.getClientRects().length > 0;
  });
}

function navItemHidden(item: NavItem, authState: { signedIn: boolean; activeMember: boolean }) {
  if (item.auth === "signed-out") return authState.signedIn;
  if (item.auth === "signed-in") return !authState.signedIn;
  if (item.auth === "verified") return !authState.activeMember;
  return false;
}

function InternalNavLink({
  item,
  activeKey,
  className,
  onClick,
  hidden = false,
}: {
  item: NavItem;
  activeKey?: string;
  className: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  hidden?: boolean;
}) {
  const isActive = item.nav === activeKey;
  const authAttrs =
    item.auth === "signed-out"
      ? { "data-auth-signed-out": true }
      : item.auth === "signed-in"
        ? { "data-auth-signed-in": true }
        : item.auth === "verified"
          ? { "data-auth-verified": true }
          : {};

  return (
    <Link
      className={`${className}${isActive ? " is-active" : ""}`}
      href={item.href}
      data-nav={item.nav}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
      hidden={hidden}
      {...authAttrs}
    >
      {item.label}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const activeKey = navKeyFromPath(pathname);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [authState, setAuthState] = useState({ signedIn: false, activeMember: false });
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileShellRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 8);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refreshAuthState = async () => {
      const userResult = await getCurrentUser();
      if (!userResult.ok || !userResult.data?.user) {
        if (!cancelled) setAuthState({ signedIn: false, activeMember: false });
        return;
      }

      const profileResult = await getCurrentProfile();
      if (!cancelled) {
        setAuthState({
          signedIn: true,
          activeMember: profileResult.ok && profileIsActive(profileResult.data),
        });
      }
    };

    void Promise.resolve().then(() => refreshAuthState());
    const subscription = onAuthStateChange(() => {
      void refreshAuthState();
    });

    return () => {
      cancelled = true;
      subscription.data?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const closeDropdowns = (event: globalThis.MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpenGroup(null);
    };

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpenGroup(null);
    };

    document.addEventListener("click", closeDropdowns);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("click", closeDropdowns);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    lastFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButtonRef.current?.focus({ preventScroll: true }), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const closeMobile = ({ returnFocus = false } = {}) => {
    setMobileOpen(false);
    if (returnFocus) {
      window.setTimeout(() => {
        const focusTarget = lastFocusRef.current || menuButtonRef.current;
        focusTarget?.focus({ preventScroll: true });
        lastFocusRef.current = null;
      }, 0);
    }
  };

  const trapMobileTab = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      closeMobile({ returnFocus: true });
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = getFocusable(mobileShellRef.current);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  };

  const toggleDropdown = (groupId: string) => {
    setOpenGroup((current) => (current === groupId ? null : groupId));
  };

  const focusFirstDropdownItem = (groupId: string) => {
    window.setTimeout(() => {
      const first = headerRef.current?.querySelector<HTMLAnchorElement>(
        `#nav-menu-${groupId} a`,
      );
      first?.focus({ preventScroll: true });
    }, 0);
  };

  return (
    <header
      id="site-header"
      ref={headerRef}
      className="site-header"
      data-state={scrolled ? "scrolled" : "top"}
    >
      <a className="skip-link" href="#main">
        Skip to main content
      </a>

      <div className="header-wrap">
        <Link className="brand" href="/" aria-label="Mōchirīī Home">
          <span className="brand-mark" aria-hidden="true">
            <img
              className="brand-emblem"
              src="/assets/img/brand/emblem.webp"
              alt=""
              width="56"
              height="56"
              loading="eager"
              decoding="async"
            />
          </span>
          <span className="brand-text">
            <span className="brand-name">Mōchirīī</span>
            <span className="brand-sub">Where Winds Meet Guild</span>
          </span>
        </Link>

        <nav className="nav" aria-label="Primary">
          {navGroups.map((group) => {
            const isOpen = openGroup === group.id;

            return (
              <div
                className="nav-group"
                data-dropdown
                data-open={isOpen ? "true" : "false"}
                key={group.id}
              >
                <button
                  className="nav-link nav-trigger"
                  type="button"
                  data-dropdown-btn
                  aria-haspopup="true"
                  aria-expanded={isOpen}
                  aria-controls={`nav-menu-${group.id}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleDropdown(group.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleDropdown(group.id);
                    }

                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setOpenGroup(group.id);
                      focusFirstDropdownItem(group.id);
                    }
                  }}
                >
                  {group.label} <span className="nav-caret" aria-hidden="true">▾</span>
                </button>
                <div
                  className="nav-menu"
                  id={`nav-menu-${group.id}`}
                  hidden={!isOpen}
                  data-dropdown-menu
                >
                  {group.items.map((item) => (
                    <InternalNavLink
                      className="nav-item"
                      item={item}
                      activeKey={activeKey}
                      key={item.nav}
                      onClick={() => setOpenGroup(null)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {notesLinks.map((item) => (
            <InternalNavLink
              className={`nav-link${item.auth ? " nav-auth-link" : ""}`}
              item={item}
              activeKey={activeKey}
              key={item.nav}
              hidden={navItemHidden(item, authState)}
            />
          ))}
        </nav>

        <div className="utils">
          <a
            className="cta"
            href="https://discord.com/invite/dPafqMwWPK"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join Mōchirīī"
          >
            Join <span className="cta-glint" aria-hidden="true" />
          </a>

          <button
            className="burger"
            type="button"
            id="menu-btn"
            ref={menuButtonRef}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => {
              if (mobileOpen) {
                closeMobile({ returnFocus: true });
              } else {
                setMobileOpen(true);
              }
            }}
          >
            <span className="burger-lines" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        className="mobile-shell"
        id="mobile-menu"
        ref={mobileShellRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        hidden={!mobileOpen}
        data-open={mobileOpen ? "true" : "false"}
        onKeyDown={trapMobileTab}
      >
        <div
          className="mobile-scrim"
          data-close
          aria-hidden="true"
          onClick={() => closeMobile({ returnFocus: true })}
        />
        <div className="mobile-sheet" role="document">
          <div className="mobile-top">
            <Link
              className="brand brand--mobile"
              href="/"
              aria-label="Mōchirīī Home"
              onClick={() => closeMobile()}
            >
              <span className="brand-mark" aria-hidden="true">
                <img
                  className="brand-emblem"
                  src="/assets/img/brand/emblem.webp"
                  alt=""
                  width="44"
                  height="44"
                  decoding="async"
                />
              </span>
              <span className="brand-text">
                <span className="brand-name">Mōchirīī</span>
                <span className="brand-sub">Where Winds Meet Guild</span>
              </span>
            </Link>

            <button
              className="icon-btn"
              type="button"
              data-close
              aria-label="Close menu"
              ref={closeButtonRef}
              onClick={() => closeMobile({ returnFocus: true })}
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          <nav className="mobile-nav" aria-label="Primary mobile">
            {navGroups.map((group) => (
              <div className="mobile-group" key={group.id}>
                <div className="mobile-group-title">{group.label}</div>
                {group.items.map((item) => (
                  <InternalNavLink
                    className="mobile-link"
                    item={item}
                    key={item.nav}
                    onClick={() => closeMobile()}
                  />
                ))}
              </div>
            ))}

            <div className="mobile-group">
              <div className="mobile-group-title">Notes</div>
              {notesLinks.map((item) => (
                <InternalNavLink
                  className="mobile-link"
                  item={item}
                  activeKey={activeKey}
                  key={item.nav}
                  onClick={() => closeMobile()}
                  hidden={navItemHidden(item, authState)}
                />
              ))}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
