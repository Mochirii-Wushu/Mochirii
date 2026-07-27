import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";
import "./styles/public-not-found.css";

export const metadata: Metadata = {
  title: "Page not found | Mōchirīī",
  description: "We couldn't find this page.",
  alternates: { canonical: null },
};

export default function NotFound() {
  return (
    <>
      <BodyPageMarker page="not-found" />
      <main className="page-main not-found-main" id="main">
        <div className="container not-found-shell">
          <section
            className="glass-card glass-card--strong glass-pad center-stack not-found-card"
            aria-labelledby="not-found-heading"
          >
            <Image
              className="not-found-emblem"
              src="/assets/img/brand/emblem.webp"
              alt=""
              width={112}
              height={112}
              sizes="(max-width: 640px) 72px, 112px"
              priority
            />
            <p className="kicker">404</p>
            <h1 className="display-title" id="not-found-heading">
              Page not found
            </h1>
            <p className="lede">We couldn&apos;t find this page.</p>
            <div className="hero-cta-row">
              <Link className="hero-cta hero-cta--primary" href="/">
                Return Home
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
