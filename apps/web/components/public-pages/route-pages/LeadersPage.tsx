import leadersData from "@/public/data/leaders.json";
import { BodyPageMarker } from "../BodyPageMarker";
import { LeaderProfileButton } from "../ProfileCardLinks";
import { BadgeRow, cleanRoute, ImagePanel, PageHero, ProseStack, text } from "../common";
import { OverlayCard, ReturnHomeLink, record, records, strings } from "../page-helpers";

export function LeadersPage() {
  const data = record(leadersData);
  const hero = record(data.hero);
  const panel = record(data.panel);
  const council = record(data.council);
  const responsibilities = record(data.responsibilities);

  return (
    <>
      <BodyPageMarker page="leaders" />
      <PageHero
        page="leaders"
        ariaLabel="Leaders hero"
        image={text(hero.image, "./assets/img/leaders/hero.webp")}
        imageAlt="Leaders Hall banner artwork"
        kicker={text(hero.kicker, "Leaders")}
        title={text(hero.title, "Leaders Hall")}
        intro={<ProseStack id="leadersIntro" lines={hero.introBody} />}
        badges={<BadgeRow id="leadersHeroPills" items={strings(hero.pills, 10)} label="Contact notes" />}
      />
      <main className="page-main" id="main">
        <div className="container">
          <section>
            <div className="grid-12 grid-gap">
              <section className="col-8">
                <div className="glass-card glass-card--primary glass-pad">
                  <h2 className="section-title" id="leadersPanelTitle">
                    {text(panel.title, "Guild Leadership")}
                  </h2>
                  <ProseStack id="leadersPanelBody" lines={panel.body} />
                  <p className="muted u-mt-14" id="leadersPanelNote">
                    {text(panel.note)}
                  </p>
                </div>
              </section>
              <aside className="col-4">
                <ImagePanel id="leadersPanelImage" src={text(panel.image)} alt="Leadership hall artwork" title={text(panel.badge, "Contact & Profiles")} />
              </aside>
              <div className="col-divider" aria-hidden="true" />
            </div>
          </section>

          <section className="u-mt-24">
            <div className="leaders-council-intro">
              <h2 className="section-title" id="leadersGridTitle">
                {text(council.title, "The Council")}
              </h2>
              <p className="muted" id="leadersGridDesc">
                {text(council.description)}
              </p>
            </div>
            <div id="leadersGrid" className="grid-12 grid-gap u-mt-14" aria-label="Leadership roster">
              {records(data.leaders).slice(0, 12).map((leader) => (
                <div className="col-4" key={`${text(leader.role)}-${text(leader.name)}`}>
                  <OverlayCard image={leader.image || "./assets/img/leaders/leader-silhouette.webp"} alt={leader.alt || `${text(leader.role, "Leader")} portrait`} aspectRatio="3 / 4">
                    <div className="overlay-card__meta">
                      <BadgeRow items={[text(leader.role, "Role")]} />
                      <span className="meta-text">{text(leader.availability)}</span>
                    </div>
                    <h3 className="section-title section-title--sm u-mt-10">
                      {text(leader.name, "Leader")}
                    </h3>
                    <p className="muted u-mt-10">
                      {text(leader.summary)}
                    </p>
                    <LeaderProfileButton
                      slug={text(leader.memberProfileSlug)}
                      fallbackHref={cleanRoute(leader.profileHref, "")}
                      label={text(leader.profileLabel, "Open profile")}
                    />
                  </OverlayCard>
                </div>
              ))}
            </div>
          </section>

          <section className="u-mt-24">
            <div className="glass-card glass-card--primary glass-pad">
              <h2 className="section-title" id="respTitle">
                {text(responsibilities.title, "Responsibilities")}
              </h2>
              <p className="muted" id="respDesc">
                {text(responsibilities.description)}
              </p>
              <div id="respGrid" className="grid-12 grid-gap u-mt-14" aria-label="Leadership responsibilities">
                {records(responsibilities.items).slice(0, 6).map((item) => (
                  <div className="col-4" key={text(item.title, "Responsibility")}>
                    <OverlayCard image={item.image} alt={item.alt || "Responsibilities visual panel"} aspectRatio="16 / 10">
                      <h3 className="section-title section-title--sm u-m-0">
                        {text(item.title, "Responsibility")}
                      </h3>
                      <p className="muted u-mt-10">
                        {text(item.description)}
                      </p>
                    </OverlayCard>
                  </div>
                ))}
              </div>
              <ReturnHomeLink />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
