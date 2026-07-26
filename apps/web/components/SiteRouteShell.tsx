"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

function isIsolatedSpinnerPath(pathname: string) {
  return pathname === "/spinner" || pathname.startsWith("/spinner/");
}

export function SiteRouteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isIsolatedSpinnerPath(pathname)) return children;

  return (
    <>
      <SiteHeader />
      <div className="bg-photo" aria-hidden="true">
        <Image
          src="/assets/bg/wuxia-bg.webp"
          alt=""
          className="bg-photo__image"
          fill
          sizes="100vw"
          loading="eager"
        />
      </div>
      {children}
      <SiteFooter />
      <Analytics />
      <SpeedInsights />
    </>
  );
}
