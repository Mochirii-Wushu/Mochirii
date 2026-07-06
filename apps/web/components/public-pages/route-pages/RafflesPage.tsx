import rafflesData from "@/public/data/raffles.json";
import guildScheduleData from "@/public/data/guild-schedule.json";
import { monthlyScheduleDate, scheduleTimezoneLabel } from "@/lib/guild-schedule";
import { BodyPageMarker } from "../BodyPageMarker";
import { BadgeRow, MetaRow, PageHero, ProseStack, text } from "../common";
import { badgeItems, record, strings } from "../page-helpers";

export function RafflesPage() {
  const data = record(rafflesData);
  const meta = record(data.meta);
  const thisMonth = record(data.thisMonth);
  const raffleDate = monthlyScheduleDate(guildScheduleData, thisMonth.scheduleId || "monthly-raffle", thisMonth.date);
  const raffleTime = text(thisMonth.time || record(record(guildScheduleData.monthly).raffle).time);
  const raffleTimezone = text(thisMonth.timezone || scheduleTimezoneLabel(guildScheduleData));

  return (
    <>
      <BodyPageMarker page="raffles" />
      <PageHero
        page="raffles"
        ariaLabel="Raffles hero"
        image={text(record(meta.hero).image, "./assets/img/raffles/hero.webp")}
        imageAlt="Raffles banner artwork"
        atmosphere={text(record(meta.hero).atmosphere)}
        kicker={text(meta.kicker, "Monthly raffle")}
        title={text(meta.title, "Raffles")}
        meta={<MetaRow label="Raffle metadata" items={[meta.frequency, meta.timezoneLabel]} />}
        intro={
          <p className="lede" id="rafflesIntro">
            {text(meta.intro)}
          </p>
        }
        badges={<BadgeRow id="rafflesBadges" items={strings(meta.badges)} label="Raffle notes" />}
      />
      <main className="page-main" id="main">
        <div className="container">
          <div className="grid-12 grid-gap">
            <section className="col-8">
              <div className="glass-card glass-card--primary glass-pad">
                <h2 className="section-title">How it works</h2>
                <ProseStack id="rafflesHow" lines={data.how} />
                <h3 className="section-title section-title--sm u-mt-18">
                  Rules
                </h3>
                <ul id="rafflesRules" className="list-stack">
                  {strings(data.rules).map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
            </section>
            <aside className="col-4">
              <div className="glass-card glass-card--soft glass-pad">
                <h3 className="section-title section-title--sm">This month</h3>
                <div id="rafflesThisMonth" className="prose-stack">
                  <p className="kicker">
                    {[raffleDate, raffleTime, raffleTimezone]
                      .map((value) => text(value))
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                  {strings(thisMonth.prizes).length ? (
                    <ul className="list-stack">
                      {strings(thisMonth.prizes).map((prize) => (
                        <li key={prize}>{prize}</li>
                      ))}
                    </ul>
                  ) : null}
                  {text(thisMonth.notes) ? <p className="muted">{text(thisMonth.notes)}</p> : null}
                </div>
                <BadgeRow id="rafflesLinks" items={badgeItems(data.links)} label="Raffle links" />
              </div>
            </aside>
            <div className="col-divider" aria-hidden="true" />
          </div>
          <div className="u-mt-24">
            <section className="glass-card glass-card--primary glass-pad">
              <h2 className="section-title">Raffle note</h2>
              <ProseStack id="rafflesNote" lines={data.note} />
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
