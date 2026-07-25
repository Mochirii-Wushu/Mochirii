import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";

export const metadata: Metadata = {
  title: "Mochi Pets",
  description: "Mōchirīī plans to restart Mochi Pets later from a new Unity project. No playable build is currently available.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/games/mochi-pets",
  },
};

export default function MochiPetsPage() {
  return (
    <>
      <BodyPageMarker page="games-mochi-pets" />
      <main className="page-main mochi-game-page" id="main">
        <div className="container">
          <section className="mochi-game-shell" aria-labelledby="mochi-pets-title">
            <div className="mochi-arrival-scene" aria-hidden="true">
              <Image
                className="mochi-arrival-scene__image"
                src="/assets/img/mochi-pets/gate-arrival.webp"
                alt=""
                fill
                preload
                sizes="(max-width: 860px) calc(100vw - 48px), 42vw"
              />
              <div className="mochi-arrival-scene__caption">
                <span>Future guild game</span>
                <strong>A new project will begin from a clean foundation.</strong>
              </div>
            </div>

            <div className="mochi-game-content">
              <header className="mochi-game-status">
                <div className="mochi-game-brand">
                  <Image
                    src="/assets/img/brand/emblem.webp"
                    alt=""
                    aria-hidden="true"
                    width={52}
                    height={52}
                    sizes="52px"
                  />
                  <p className="eyebrow">Mōchirīī Guild Project</p>
                </div>
                <h1 id="mochi-pets-title">Mochi Pets</h1>
                <p>
                  The previous prototype has been retired. Development will restart later from a fresh
                  Unity project before a new playable build is offered to guild members.
                </p>
              </header>

              <dl className="mochi-game-facts" aria-label="Game project status">
                <div>
                  <dt>Current status</dt>
                  <dd>New project planned</dd>
                </div>
                <div>
                  <dt>Playable build</dt>
                  <dd>Not available</dd>
                </div>
                <div>
                  <dt>Release date</dt>
                  <dd>Not announced</dd>
                </div>
              </dl>

              <section className="mochi-game-panel" aria-labelledby="mochi-pets-next">
                <p className="mochi-game-panel__kicker">Next foundation</p>
                <h2 id="mochi-pets-next">Built fresh when development resumes</h2>
                <p>
                  The next phase will establish a clean Unity project, define a focused game scope,
                  document supported devices and accessibility requirements, and verify a new build
                  before playtesting begins.
                </p>
              </section>

              <div className="mochi-game-actions">
                <Link className="hero-cta hero-cta--primary" href="/">Return to Mōchirīī</Link>
                <Link className="hero-cta" href="/announcements">View guild announcements</Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
