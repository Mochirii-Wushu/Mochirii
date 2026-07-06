"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import type { NavItem } from "@/lib/site-navigation";

export type HeaderAuthState = {
  signedIn: boolean;
  activeMember: boolean;
  moderator: boolean;
};

export function navKeyFromPath(pathname: string | null) {
  const path = (pathname || "/").replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/index.html") return "home";
  return path.slice(1).replace(/\.html$/, "") || "home";
}

export function navItemHidden(item: NavItem, authState: HeaderAuthState) {
  if (item.auth === "signed-out") return authState.signedIn;
  if (item.auth === "signed-in") return !authState.signedIn;
  if (item.auth === "verified") return !authState.activeMember;
  if (item.auth === "moderator") return !authState.moderator;
  return false;
}

export function navItemVisibleForPath(item: NavItem, activeKey: string) {
  if (activeKey === "games/mochi-pets" && item.nav === "tome") return false;
  return true;
}

export function SiteNavLink({
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
  const isActive = !item.external && item.nav === activeKey;
  const authAttrs =
    item.auth === "signed-out"
      ? { "data-auth-signed-out": true }
      : item.auth === "signed-in"
        ? { "data-auth-signed-in": true }
        : item.auth === "verified"
          ? { "data-auth-verified": true }
          : item.auth === "moderator"
            ? { "data-auth-moderator": true }
            : {};

  if (item.external) {
    return (
      <a
        className={className}
        href={item.href}
        data-nav={item.nav}
        onClick={onClick}
        hidden={hidden}
        {...authAttrs}
      >
        {item.label}
      </a>
    );
  }

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
