import Link from "next/link";
import rafflesData from "@/public/data/raffles.json";
import { BodyPageMarker } from "../BodyPageMarker";
import { BadgeRow, MetaRow, PageHero, ProseStack, text } from "../common";
import { record, strings } from "../page-helpers";

export function RafflePage() {
  const data = record(rafflesData);
  const meta = record(data.meta);

  return (
    <>
      <BodyPageMarker page="raffles" />
      <PageHero
        page="raffles"
        ariaLabel="Mochirii raffle status"
        image={text(record(meta.hero).image, "./assets/img/raffles/hero.webp")}
        imageAlt="Mochirii raffle banner artwork"
        atmosphere={text(record(meta.hero).atmosphere)}
        kicker={text(meta.kicker, "Monthly member raffle")}
        title={text(meta.title, "Mochirii Monthly Raffle")}
        meta={<MetaRow label="Raffle status" items={[meta.statusLabel, meta.frequency]} />}
        intro={<p className="lede" id="rafflesIntro">{text(meta.intro)}</p>}
        badges={<BadgeRow id="rafflesBadges" items={strings(meta.badges)} label="Raffle notices" />}
      />
      <main className="page-main" id="main">
        <div className="container">
          <div className="grid-12 grid-gap">
            <section className="col-8">
              <div className="glass-card glass-card--primary glass-pad">
                <p className="kicker">Current availability</p>
                <h2 className="section-title">The raffle is not open</h2>
                <ProseStack id="rafflesCurrentStatus" lines={data.currentStatus} />
              </div>
            </section>
            <aside className="col-4">
              <div className="glass-card glass-card--soft glass-pad">
                <p className="kicker">Entry</p>
                <h2 className="section-title section-title--sm">Closed</h2>
                <div className="badge-row" role="status" aria-label="Current entry status">
                  <span>Entries closed</span>
                </div>
                <p className="muted u-mt-18">No entry window is open.</p>
                <div className="hero-cta-row u-mt-18">
                  <Link className="hero-cta" href="/raffle/rules">Read rules status</Link>
                </div>
              </div>
            </aside>
            <div className="col-divider" aria-hidden="true" />
          </div>

          <div className="grid-12 grid-gap u-mt-24">
            <section className="col-7">
              <div className="glass-card glass-card--primary glass-pad">
                <p className="kicker">Official status</p>
                <h2 className="section-title">How to confirm official raffle information</h2>
                <ul className="list-stack">
                  {strings(data.howToConfirm).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            </section>
            <aside className="col-5">
              <div className="glass-card glass-card--soft glass-pad">
                <p className="kicker">Member safety</p>
                <h2 className="section-title section-title--sm">No purchase necessary</h2>
                <ProseStack id="rafflesMemberSafety" lines={data.memberSafety} />
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
