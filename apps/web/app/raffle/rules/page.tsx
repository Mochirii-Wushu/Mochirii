import "../../styles/public-side-pages.css";
import "../../styles/public-content-shared.css";
import Link from "next/link";
import rafflesData from "@/public/data/raffles.json";
import { metadataFor } from "@/components/public-pages/metadata";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";
import { record, strings } from "@/components/public-pages/page-helpers";

export const metadata = metadataFor("raffleRules");

export default function RaffleRulesStatusPage() {
  const data = record(rafflesData);
  const rulesStatus = record(data.rulesStatus);

  return (
    <>
      <BodyPageMarker page="raffles" />
      <main className="page-main" id="main">
        <div className="container">
          <section className="glass-card glass-card--primary glass-pad" aria-labelledby="raffleRulesStatusHeading">
            <p className="kicker">Raffle rules status</p>
            <h1 className="display-title" id="raffleRulesStatusHeading">
              {String(rulesStatus.title || "No active rules")}
            </h1>
            <p className="lede">{String(rulesStatus.summary || "The Mochirii Monthly Raffle is NOT OPEN.")}</p>
            <ul className="list-stack u-mt-18">
              {strings(rulesStatus.details).map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
            <div className="badge-row u-mt-18" role="status" aria-label="Current rules status">
              <span>No current rules</span>
            </div>
            <div className="hero-cta-row u-mt-18">
              <Link className="hero-cta" href="/raffle">Back to raffle status</Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
