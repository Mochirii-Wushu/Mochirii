import spotlightData from "@/public/data/spotlight.json";
import guildScheduleData from "@/public/data/guild-schedule.json";
import { spotlightScheduleDate } from "@/lib/guild-schedule";
import { BodyPageMarker } from "../BodyPageMarker";
import { SpotlightWinnerTitle } from "../SpotlightWinnerTitle";
import { BadgeRow, formatDateUTC, MetaRow, PageHero, ProseStack, text } from "../common";
import { record, strings } from "../page-helpers";

export function SpotlightPage() {
  const data = record(spotlightData);
  const hero = record(data.hero);
  const spotlight = record(data.spotlight);
  const spotlightDate = spotlightScheduleDate(guildScheduleData, spotlight.date);

  return (
    <>
      <BodyPageMarker page="spotlight" />
      <PageHero
        page="spotlight"
        ariaLabel="Spotlight hero"
        image={text(hero.image, "./assets/img/spotlight/hero.webp")}
        imageAlt={text(hero.alt, "Member Spotlight banner artwork")}
        atmosphere={text(hero.atmosphereImage)}
        kicker={text(spotlight.kicker, "Member Spotlight")}
        title={<SpotlightWinnerTitle fallbackTitle={text(spotlight.title, "Spotlight")} template="spotlight" />}
        meta={<MetaRow items={[spotlightDate ? formatDateUTC(spotlightDate, { year: "numeric", month: "long", day: "2-digit" }) : "", spotlight.tag]} />}
        intro={
          <p id="spotlightIntro" className="lede">
            {text(spotlight.intro)}
          </p>
        }
        badges={<BadgeRow id="spotlightBadges" items={strings(spotlight.badges, 10)} />}
      />
      <main className="page-main" id="main">
        <div className="container">
          <div className="grid-12 grid-gap">
            <section className="col-8">
              <div className="glass-card glass-card--primary glass-pad">
                <h2 className="section-title">Appreciation</h2>
                <ProseStack id="spotlightBody" lines={spotlight.body} fallback="Spotlight write-up goes here." />
                <ProseStack id="spotlightConclusion" lines={spotlight.conclusion} fallback="" />
              </div>
            </section>
            <aside className="col-4">
              <div className="glass-card glass-card--soft glass-pad">
                <h3 className="section-title section-title--sm">Highlights</h3>
                <ul id="spotlightHighlights" className="list-stack">
                  {strings(spotlight.highlights, 10).map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </div>
            </aside>
            <div className="col-divider" aria-hidden="true" />
          </div>
        </div>
      </main>
    </>
  );
}
