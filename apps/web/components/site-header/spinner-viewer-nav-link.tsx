"use client";

import { useState } from "react";
import type { NavItem } from "@/lib/site-navigation";

export function SpinnerViewerNavLink({
  item,
  activeKey,
  className,
  hidden,
  launchSpinnerViewer,
  onNavigate,
}: {
  item: NavItem;
  activeKey?: string;
  className: string;
  hidden: boolean;
  launchSpinnerViewer: () => Promise<boolean>;
  onNavigate?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (hidden) return null;

  const isActive = item.nav === activeKey;

  return (
    <>
      <a
        className={`${className}${isActive ? " is-active" : ""}`}
        href={item.href}
        data-nav={item.nav}
        data-auth-spinner-viewer
        aria-current={isActive ? "page" : undefined}
        aria-busy={busy || undefined}
        onClick={async (event) => {
          event.preventDefault();
          if (busy) return;

          onNavigate?.();
          setBusy(true);
          setMessage("");
          const opened = await launchSpinnerViewer();
          if (opened) {
            window.location.assign(item.href);
            return;
          }

          setBusy(false);
          setMessage("Live draw access is unavailable. Review your member access in Account.");
        }}
      >
        {busy ? "Opening…" : item.label}
      </a>
      {message ? <span className="sr-only" role="status">{message}</span> : null}
    </>
  );
}
