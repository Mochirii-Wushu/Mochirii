import joinData from "@/public/data/join.json";
import ranksData from "@/public/data/ranks.json";
import leadersData from "@/public/data/leaders.json";
import tomeData from "@/public/data/tome.json";
import eventsData from "@/public/data/events.json";
import announcementsData from "@/public/data/announcements.json";
import rafflesData from "@/public/data/raffles.json";
import galleryData from "@/public/data/gallery.json";
import spotlightData from "@/public/data/spotlight.json";
import spotifyData from "@/public/data/spotify.json";
import guildScheduleData from "@/public/data/guild-schedule.json";
import recruitmentData from "@/public/data/recruitment.json";
import twillsData from "@/public/data/twills.json";
import type { ReactNode } from "react";
import Link from "next/link";
import { BodyPageMarker } from "./BodyPageMarker";
import { EventsBoard } from "./EventsBoard";
import { GalleryBrowser } from "./GalleryBrowser";
import { LeaderProfileButton } from "./ProfileCardLinks";
import { ProfileDisplay } from "./ProfileDisplay";
import { RecruitmentAudioPlayer } from "./RecruitmentAudioPlayer";
import { SpotlightWinnerTitle } from "./SpotlightWinnerTitle";
import { SpotifyBrowser } from "./SpotifyBrowser";
import {
  monthlyScheduleDate,
  scheduleTimezoneLabel,
  spotlightScheduleDate,
  websiteEventCardsFromSchedule,
  weeklyScheduleLines,
} from "@/lib/guild-schedule";
import { DISCORD_INVITE_URL } from "@/lib/public-urls";
import {
  BadgeRow,
  cleanRoute,
  formatDateUTC,
  ImagePanel,
  isExternalHref,
  MetaRow,
  monthYearUTC,
  PageHero,
  ProseStack,
  publicPath,
  StaticImage,
  text,
} from "./common";

type DataRecord = Record<string, unknown>;

function record(value: unknown): DataRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as DataRecord) : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function records(value: unknown): DataRecord[] {
  return array(value).map(record).filter((item) => Object.keys(item).length > 0);
}

function strings(value: unknown, limit?: number) {
  const list = array(value)
    .map((item) => text(item))
    .filter(Boolean);
  return typeof limit === "number" ? list.slice(0, limit) : list;
}

function badgeItems(value: unknown) {
  return array(value)
    .map((item) => {
      if (typeof item === "string") return item;
      const badge = record(item);
      return { label: text(badge.label), href: text(badge.href) };
    })
    .filter((item) => (typeof item === "string" ? item : item.label));
}

function linkProps(href: unknown) {
  const cleanHref = cleanRoute(href);
  return {
    href: cleanHref,
    target: isExternalHref(cleanHref) ? "_blank" : undefined,
    rel: isExternalHref(cleanHref) ? "noopener noreferrer" : undefined,
  };
}

function announcementDetails(item: DataRecord) {
  return text(item.id) === "weekly-schedule" ? weeklyScheduleLines(guildScheduleData) : strings(item.details);
}

function ReturnHomeLink() {
  return (
    <div className="u-mt-18">
      <Link href="/" className="footer-link">
        Return to Home
      </Link>
    </div>
  );
}

function MiniCard({ title, description }: { title: unknown; description: unknown }) {
  return (
    <div className="col-6">
      <article className="glass-card glass-card--soft glass-pad">
        <h3 className="section-title section-title--sm u-m-0">
          {text(title, "Title")}
        </h3>
        <p className="muted u-mt-10">
          {text(description)}
        </p>
      </article>
    </div>
  );
}

function ListBlock({ title, items }: { title: unknown; items: unknown }) {
  return (
    <div className="col-12">
      <article className="glass-card glass-card--soft glass-pad">
        <h3 className="section-title section-title--sm u-m-0">
          {text(title, "Section")}
        </h3>
        <ul className="u-list-inset">
          {strings(items, 10).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    </div>
  );
}

function RankCards({ ranks }: { ranks: unknown }) {
  const items = records(ranks);

  if (!items.length) {
    return <p className="muted">—</p>;
  }

  return (
    <>
      {items.map((rank) => (
        <div className="glass-card glass-card--soft glass-pad u-card-no-shadow" key={text(rank.name, "Rank")}>
          <h3 className="section-title section-title--sm u-mb-8">
            {text(rank.name, "Rank")}
          </h3>
          <ProseStack lines={rank.body} />
        </div>
      ))}
    </>
  );
}

function OverlayCard({
  image,
  alt,
  aspectRatio,
  children,
}: {
  image: unknown;
  alt: unknown;
  aspectRatio: "3 / 4" | "16 / 10";
  children: ReactNode;
}) {
  const frameClass = aspectRatio === "3 / 4" ? "overlay-card__frame--portrait" : "overlay-card__frame--wide";

  return (
    <article className="glass-card glass-card--soft overlay-card">
      <div className={`overlay-card__frame ${frameClass}`}>
        {text(image) ? (
          <StaticImage
            src={publicPath(image)}
            alt={text(alt)}
            width={960}
            height={640}
            className="overlay-card__image"
            sizes="(max-width: 980px) calc(100vw - 68px), 580px"
          />
        ) : null}
        <div className="overlay-card__scrim" aria-hidden="true" />
        <div className="overlay-card__content">
          <div className="glass-card glass-card--primary overlay-card__panel">
            {children}
          </div>
        </div>
      </div>
    </article>
  );
}

function GalleryItems() {
  const data = record(galleryData);
  const categories = records(data.categories).map((category) => ({
    slug: text(category.slug),
    label: text(category.label),
  }));
  const items = records(data.albums).flatMap((album) =>
    records(album.items).map((item) => ({
      id: text(item.id),
      src: text(item.src),
      full: text(item.full),
      thumb: text(item.thumb),
      alt: text(item.alt),
      caption: text(item.caption),
      category: text(item.category),
      categories: strings(item.categories),
      galleryAddedAt: text(item.galleryAddedAt),
    })),
  );

  return <GalleryBrowser categories={categories} items={items} />;
}

export function JoinPage() {
  const data = record(joinData);
  const hero = record(data.hero);
  const steps = record(data.steps);
  const quickStart = record(data.quickStart);
  const checklist = record(data.checklist);
  const culture = record(data.culture);
  const notes = record(data.notes);

  return (
    <>
      <BodyPageMarker page="join" />
      <PageHero
        page="join"
        ariaLabel="Join hero"
        image={text(hero.image, "./assets/img/join/hero.webp")}
        imageAlt={text(hero.imageAlt, "Join Mōchirīī banner artwork")}
        atmosphere={text(hero.atmosphereImage)}
        kicker={text(hero.kicker, "Join")}
        title={text(hero.title, "Join Mōchirīī")}
        center={false}
        meta={
          <MetaRow
            label="Join metadata"
            items={[hero.updated ? `Updated ${monthYearUTC(hero.updated)}` : "", hero.timezone]}
          />
        }
        intro={
          <p className="lede" id="joinIntro">
            {text(hero.intro)}
          </p>
        }
        badges={<BadgeRow id="joinBadges" items={badgeItems(hero.badges)} label="Join notes" />}
      />

      <main className="page-main" id="main">
        <div className="container">
          <div className="grid-12 grid-gap">
            <section className="col-8">
              <div className="glass-card glass-card--primary glass-pad">
                <h2 className="section-title" id="joinStepsTitle">
                  {text(steps.title, "The Joining Path")}
                </h2>
                <ProseStack id="joinStepsIntro" lines={steps.intro} />
                <ol id="joinStepsList" className="list-stack" aria-label="Joining steps">
                  {records(steps.items).map((step, index) => (
                    <li key={`${text(step.number, String(index + 1))}-${text(step.title, "Step")}`}>
                      <strong>
                        {text(step.number, String(index + 1))}. {text(step.title, "Step")}
                      </strong>
                      {text(step.description) ? <p className="muted">{text(step.description)}</p> : null}
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            <aside className="col-4">
              <div className="glass-card glass-card--soft glass-pad">
                <h3 className="section-title section-title--sm" id="joinQuickTitle">
                  {text(quickStart.title, "Quick Start")}
                </h3>
                <ProseStack id="joinQuickBody" lines={quickStart.body} />
                <BadgeRow id="joinLinks" items={badgeItems(quickStart.links)} label="Join links" />
                <div className="join-discord-widget" aria-label="Mōchirīī Discord server widget">
                  <div className="join-discord-widget__frame">
                    <iframe
                      title="Mōchirīī Discord server widget"
                      src="https://discord.com/widget?id=1078630751077142608&theme=dark"
                      width="350"
                      height="500"
                      loading="lazy"
                      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                    />
                  </div>
                </div>
              </div>
            </aside>

            <section className="col-12 join-checklist" aria-labelledby="joinChecklistTitle">
              <div className="glass-card glass-card--soft glass-pad">
                <p className="kicker" id="joinChecklistEyebrow">
                  {text(checklist.eyebrow, "Before You Join")}
                </p>
                <h2 className="section-title" id="joinChecklistTitle">
                  {text(checklist.title, "New Cupcake Checklist")}
                </h2>
                <p className="muted join-checklist__intro" id="joinChecklistIntro">
                  {text(checklist.intro)}
                </p>
                <ul className="join-checklist__grid" id="joinChecklistItems">
                  {records(checklist.items).map((item, index) => {
                    const href = cleanRoute(item.href, "");
                    return (
                      <li className="join-checklist__item" key={`${index}-${text(item.title, "Checklist item")}`}>
                        <span className="join-checklist__marker" aria-hidden="true">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="join-checklist__body">
                          <h3 className="join-checklist__title">{text(item.title, "Checklist item")}</h3>
                          {text(item.text) ? <p className="join-checklist__text">{text(item.text)}</p> : null}
                          {href && text(item.label) ? (
                            <a className="join-checklist__link" {...linkProps(href)}>
                              {text(item.label)}
                            </a>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>

            <div className="col-divider" aria-hidden="true" />
          </div>

          <div className="grid-12 grid-gap u-mt-24">
            <section className="col-8">
              <div className="glass-card glass-card--primary glass-pad">
                <h2 className="section-title" id="joinCultureTitle">
                  {text(culture.title, "Expectations & Culture")}
                </h2>
                <ProseStack id="joinCultureIntro" lines={culture.intro} />
                <div id="joinCultureCards" className="prose-stack" aria-live="polite">
                  {records(culture.cards).map((item) => (
                    <div key={text(item.title, "Note")}>
                      <h3 className="section-title section-title--sm">{text(item.title, "Note")}</h3>
                      <p className="muted">{text(item.description)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="col-4">
              <div className="glass-card glass-card--soft glass-pad">
                <h3 className="section-title section-title--sm" id="joinFaqTitle">
                  {text(notes.title, "Notes")}
                </h3>
                <ProseStack id="joinNotes" lines={notes.body} />
                <BadgeRow id="joinNotesBadges" items={badgeItems(notes.links)} label="Helpful links" />
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}

export function RanksPage() {
  const data = record(ranksData);
  const hero = record(data.hero);
  const progression = record(data.progression);
  const tiers = record(data.tiers);
  const senior = record(tiers.senior);
  const middle = record(tiers.middle);
  const members = record(tiers.members);

  return (
    <>
      <BodyPageMarker page="ranks" />
      <PageHero
        page="ranks"
        ariaLabel="Ranks hero"
        image={text(hero.image, "./assets/img/ranks/hero.webp")}
        imageAlt="Ranks and progression banner artwork"
        atmosphere={text(hero.atmosphereImage)}
        kicker={text(hero.kicker, "Ranks")}
        title={text(hero.title, "Ranks & Progression")}
        intro={
          <p className="lede" id="ranksIntro">
            {text(hero.intro)}
          </p>
        }
        badges={<BadgeRow id="ranksHeroPills" items={strings(hero.pills, 10)} label="Rank notes" />}
      />
      <main className="page-main" id="main">
        <div className="container">
          <section>
            <div className="glass-card glass-card--primary glass-pad">
              <h2 className="section-title" id="progressionTitle">
                {text(progression.title, "Progression")}
              </h2>
              <BadgeRow id="progressionPills" items={strings(progression.pills, 10)} label="Progression categories" />
              <ProseStack id="progressionBody" lines={progression.body} className="prose-stack" />
            </div>
          </section>

          {[
            { id: "senior", data: senior, asideTitle: "Direction & Stewardship", label: "Senior Leadership artwork" },
            { id: "middle", data: middle, asideTitle: "Guardianship & Mentorship", label: "Middle Leadership artwork" },
            { id: "members", data: members, asideTitle: "Growth & Fellowship", label: "Members artwork" },
          ].map((tier) => (
            <div className="grid-12 grid-gap u-mt-24" key={tier.id}>
              <section className="col-8">
                <div className="glass-card glass-card--primary glass-pad">
                  <h2 className="section-title" id={`${tier.id}Title`}>
                    {text(tier.data.title)}
                  </h2>
                  <p className="muted" id={`${tier.id}Desc`}>
                    {text(tier.data.description)}
                  </p>
                  {tier.id !== "senior" ? (
                    <BadgeRow id={`${tier.id}Pills`} items={strings(tier.data.pills, 10)} label={`${text(tier.data.title)} categories`} />
                  ) : null}
                  <div id={`${tier.id}Ranks`} className="prose-stack u-mt-14">
                    <RankCards ranks={tier.data.ranks} />
                  </div>
                  <p className="muted u-mt-14" id={`${tier.id}Note`}>
                    {text(tier.data.note)}
                  </p>
                  {tier.id === "members" ? <ReturnHomeLink /> : null}
                </div>
              </section>
              <aside className="col-4">
                <ImagePanel id={`${tier.id}Image`} src={text(tier.data.image)} alt={tier.label} title={tier.asideTitle} />
              </aside>
              <div className="col-divider" aria-hidden="true" />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}

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

export function TomePage() {
  const data = record(tomeData);
  const hero = record(data.hero);
  const intro = record(data.intro);
  const tenets = record(data.tenets);
  const etiquette = record(data.etiquette);
  const rhythm = record(data.rhythm);
  const recognition = record(data.recognition);

  return (
    <>
      <BodyPageMarker page="tome" />
      <PageHero
        page="tome"
        ariaLabel="Tome hero"
        image={text(hero.image, "./assets/img/tome/hero.webp")}
        imageAlt="The Tome banner artwork"
        kicker={text(hero.kicker, "Tome")}
        title={text(hero.title, "The Tome")}
        intro={<ProseStack id="tomeIntro" lines={hero.introBody} />}
        badges={<BadgeRow id="tomeHeroPills" items={strings(hero.pills, 12)} label="Tome summary pills" />}
      />
      <main className="page-main" id="main">
        <div className="container">
          <section>
            <div className="grid-12 grid-gap">
              <aside className="col-4">
                <ImagePanel id="introImage" src={text(intro.image)} alt="Tome artwork" title={text(intro.badge, "Values & Rhythm")} />
              </aside>
              <section className="col-8">
                <div className="glass-card glass-card--primary glass-pad">
                  <h2 className="section-title" id="introTitle">
                    {text(intro.title, "A living guide")}
                  </h2>
                  <ProseStack id="introBody" lines={intro.body} />
                </div>
              </section>
              <div className="col-divider" aria-hidden="true" />
            </div>
          </section>

          {[
            { data: tenets, id: "tenets", image: "tenetsImage", alt: "Tenets artwork", grid: "tenetsGrid" },
            { data: rhythm, id: "rhythm", image: "rhythmImage", alt: "Guild rhythm artwork", grid: "rhythmGrid" },
          ].map((section) => (
            <section className="u-mt-24" key={section.id}>
              <div className="grid-12 grid-gap">
                <section className="col-12">
                  <div className="glass-card glass-card--primary glass-pad">
                    <h2 className="section-title" id={`${section.id}Title`}>
                      {text(section.data.title)}
                    </h2>
                    <p className="muted" id={`${section.id}Desc`}>
                      {text(section.data.description)}
                    </p>
                    <div className="grid-12 grid-gap u-mt-14">
                      <div className="col-6">
                        <div className="glass-card glass-card--soft glass-pad">
                          <StaticImage
                            id={section.image}
                            src={section.data.image}
                            alt={section.alt}
                            width={960}
                            height={640}
                            className="image-panel__img"
                            sizes="(max-width: 980px) calc(100vw - 68px), 760px"
                          />
                          <h3 className="section-title section-title--sm u-mt-12" id={`${section.id}CapTitle`}>
                            {text(section.data.captionTitle)}
                          </h3>
                          <p className="muted" id={`${section.id}CapDesc`}>
                            {text(section.data.caption)}
                          </p>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="glass-card glass-card--soft glass-pad">
                          <BadgeRow id={`${section.id}Pills`} items={strings(section.data.pills, 12)} label={`${text(section.data.title)} categories`} />
                          <div id={section.grid} className="grid-12 grid-gap u-mt-12">
                            {records(section.data.items).map((item) => (
                              <MiniCard key={text(item.title, "Title")} title={item.title} description={item.description} />
                            ))}
                          </div>
                          <p className="muted u-mt-12" id={`${section.id}Note`}>
                            {text(section.data.note)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
                <div className="col-divider" aria-hidden="true" />
              </div>
            </section>
          ))}

          <section className="u-mt-24">
            <div className="grid-12 grid-gap">
              <aside className="col-4">
                <ImagePanel id="etiquetteImage" src={text(etiquette.image)} alt="Etiquette artwork" title={text(etiquette.badge, "How we treat each other")} />
              </aside>
              <section className="col-8">
                <div className="glass-card glass-card--primary glass-pad">
                  <h2 className="section-title" id="etiquetteTitle">
                    {text(etiquette.title, "Etiquette")}
                  </h2>
                  <p className="muted" id="etiquetteDesc">
                    {text(etiquette.description)}
                  </p>
                  <div id="etiquetteBlocks" className="grid-12 grid-gap u-mt-14">
                    {records(etiquette.blocks).slice(0, 6).map((block) => (
                      <ListBlock key={text(block.title, "Section")} title={block.title} items={block.items} />
                    ))}
                  </div>
                  <p className="muted u-mt-12" id="etiquetteNote">
                    {text(etiquette.note)}
                  </p>
                </div>
              </section>
              <div className="col-divider" aria-hidden="true" />
            </div>
          </section>

          <section className="u-mt-24">
            <div className="glass-card glass-card--primary glass-pad">
              <h2 className="section-title" id="recTitle">
                {text(recognition.title, "Recognition")}
              </h2>
              <p className="muted" id="recDesc">
                {text(recognition.description)}
              </p>
              <div className="grid-12 grid-gap u-mt-14">
                <aside className="col-4">
                  <ImagePanel id="recImage" src={text(recognition.image)} alt="Recognition artwork" />
                </aside>
                <section className="col-8">
                  <div id="recGrid" className="grid-12 grid-gap">
                    {records(recognition.items).map((item) => (
                      <MiniCard key={text(item.title, "Title")} title={item.title} description={item.description} />
                    ))}
                  </div>
                  <div className="u-mt-16">
                    <a id="recLink" href={cleanRoute(recognition.ranksHref, "/ranks")} className="footer-link">
                      View Ranks
                    </a>
                  </div>
                </section>
              </div>
              <ReturnHomeLink />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export function EventsPage() {
  const data = record(eventsData);
  const meta = record(data.meta);
  const featured = record(data.featured);
  const recurring = record(data.recurring);
  const eventBoardItems = websiteEventCardsFromSchedule(guildScheduleData);
  const featuredEvent = eventBoardItems[0];
  const featuredHref = text(featuredEvent?.href || featured.href);
  const featuredMeta = [
    featured.tag,
    featuredEvent?.date ? formatDateUTC(featuredEvent.date) : featured.date,
    featuredEvent?.dayText,
    featuredEvent?.timeText || featured.time,
    featuredEvent?.timezone || featured.timezone || scheduleTimezoneLabel(guildScheduleData),
  ];
  const featuredImage = text(featuredEvent?.image || featured.image);
  const featuredTitle = text(featuredEvent?.title || featured.title);
  const featuredSummary = text(featuredEvent?.summary || featured.summary);

  return (
    <>
      <BodyPageMarker page="events" />
      <PageHero
        page="events"
        ariaLabel="Events hero"
        image={text(record(meta.hero).image, "./assets/img/events/hero.webp")}
        imageAlt="Events banner artwork"
        atmosphere={text(record(meta.hero).atmosphere)}
        kicker={text(meta.kicker, "Guild calendar")}
        title={text(meta.title, "Events")}
        meta={<MetaRow label="Events metadata" items={[meta.updated ? `Updated ${formatDateUTC(meta.updated)}` : "", meta.timezoneLabel]} />}
        intro={
          <p className="lede" id="eventsIntro">
            {text(meta.intro)}
          </p>
        }
        badges={<BadgeRow id="eventsBadges" items={strings(meta.badges)} label="Event notes" />}
      />
      <main className="page-main" id="main">
        <div className="container">
          <div className="grid-12 grid-gap">
            <section className="col-8">
              <div className="glass-card glass-card--primary glass-pad">
                <h2 className="section-title">Featured Event</h2>
                <div className="prose-stack">
                  <p className="muted" id="featuredLead">
                    {text(featured.lead)}
                  </p>
                </div>
                <div id="featuredCard" className="events-featured" aria-live="polite">
                  <div className="glass-card glass-card--soft glass-pad">
                    <p className="kicker">
                      {featuredMeta
                        .map((value) => text(value))
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                    {featuredImage ? (
                      <div className="u-mt-12">
                        <StaticImage
                          src={publicPath(featuredImage, "./assets/img/events/featured.webp")}
                          alt={text(featuredTitle, "Featured event")}
                          width={1600}
                          height={640}
                          className="events-featured__img"
                          sizes="(max-width: 980px) calc(100vw - 68px), 760px"
                        />
                      </div>
                    ) : null}
                    <h3 className="section-title section-title--sm u-mt-14">
                      {featuredTitle}
                    </h3>
                    <p className="lede">{featuredSummary}</p>
                    {strings(featured.bullets).length ? (
                      <ul className="list-stack">
                        {strings(featured.bullets).map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    ) : null}
                    {featuredHref ? (
                      <div className="badge-row u-mt-14">
                        <span>
                          <a {...linkProps(featuredHref)}>{text(featured.linkLabel, "Open details")}</a>
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <aside className="col-4">
              <div className="glass-card glass-card--soft glass-pad events-board-card">
                <h3 className="section-title section-title--sm" id="eventsBoardTitle">
                  Event Board
                </h3>
                <EventsBoard
                  items={eventBoardItems}
                />
              </div>
            </aside>
            <div className="col-divider" aria-hidden="true" />
          </div>

          <div className="grid-12 grid-gap u-mt-24">
            <section className="col-8">
              <div className="glass-card glass-card--primary glass-pad">
                <h2 className="section-title">Recurring Events</h2>
                <p className="muted" id="eventsRhythmIntro">
                  {text(recurring.intro)}
                </p>
                <div id="eventsRecurring" className="events-recurring" aria-live="polite">
                  {records(recurring.items).length ? (
                    <ul className="list-stack">
                      {records(recurring.items).map((item) => (
                        <li key={text(item.title)}>
                          <strong>{text(item.title)}</strong> — {text(item.summary)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">No recurring events posted yet.</p>
                  )}
                </div>
              </div>
            </section>
            <aside className="col-4">
              <div className="glass-card glass-card--soft glass-pad">
                <h3 className="section-title section-title--sm">Participation</h3>
                <div id="eventsParticipation" className="prose-stack" aria-live="polite">
                  {records(data.participation).map((block) => (
                    <div key={text(block.title)}>
                      <p>
                        <strong>{text(block.title)}</strong>
                      </p>
                      <p className="muted">{text(block.body)}</p>
                    </div>
                  ))}
                </div>
                <div className="badge-row u-mt-14">
                  <span>
                    <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer">
                      Discord RSVP
                    </a>
                  </span>
                  <span>
                    <a href="/join">How to join</a>
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}

export function AnnouncementsPage() {
  const data = record(announcementsData);
  const meta = record(data.meta);
  const items = records(data.items).sort((a, b) => {
    const pinned = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    return pinned || text(b.date).localeCompare(text(a.date));
  });

  return (
    <>
      <BodyPageMarker page="announcements" />
      <PageHero
        page="announcements"
        ariaLabel="Announcements hero"
        image={text(record(meta.hero).image, "./assets/img/announcements/hero.webp")}
        imageAlt="Announcements banner artwork"
        atmosphere={text(record(meta.hero).atmosphere)}
        kicker="Announcements"
        title={text(meta.title, "Mōchirīī Announcements")}
        meta={<MetaRow label="Announcements metadata" items={[meta.updated ? `Updated ${formatDateUTC(meta.updated)}` : "", meta.tagline]} />}
        intro={
          <p className="lede" id="announcementsIntro">
            {text(meta.intro)}
          </p>
        }
        badges={<BadgeRow id="announcementsBadges" items={strings(meta.badges)} label="Announcements badges" />}
      />
      <main className="page-main" id="main">
        <div className="container">
          <section className="glass-card glass-card--primary glass-pad">
            <h2 className="section-title">Latest Notices</h2>
            <div id="announcementsList" className="prose-stack" aria-live="polite">
              {items.length ? (
                items.map((item) => (
                  <section className="glass-card glass-card--soft glass-pad" data-announcement={text(item.id)} key={text(item.id, text(item.title))}>
                    <p className="kicker">
                      {item.pinned ? "Pinned" : "Notice"}
                      {text(item.date) ? ` • ${formatDateUTC(item.date)}` : ""}
                    </p>
                    <h3 className="section-title section-title--sm">{text(item.title, "Announcement")}</h3>
                    {text(item.summary) ? <p className="lede">{text(item.summary)}</p> : null}
                    {announcementDetails(item).length ? (
                      <ul className="list-stack">
                        {announcementDetails(item).map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                    ) : null}
                    <BadgeRow items={strings(item.tags)} label="Tags" />
                  </section>
                ))
              ) : (
                <p className="muted">No announcements yet.</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

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

export function GalleryPage() {
  const data = record(galleryData);
  const meta = record(data.meta);

  return (
    <>
      <BodyPageMarker page="gallery" />
      <PageHero
        page="gallery"
        ariaLabel="Gallery hero"
        image="./assets/img/gallery/hero.webp"
        imageAlt="Gallery banner artwork"
        kicker="Gallery"
        title={text(meta.title, "Guild Album")}
        intro={
          <p className="lede" id="galleryDesc">
            {text(meta.description, "Shared runs, quiet roads, and little guild moments worth keeping.")}
          </p>
        }
        badges={<BadgeRow items={["Tip: click any image to view it full size."]} label="Gallery tips" />}
      />
      <main className="page-main" id="main">
        <div className="container">
          <section className="glass-card glass-card--primary glass-pad center-stack">
            <h2 className="section-title">Gallery</h2>
            <p className="muted" id="galleryIntro">
              Send screenshots to the Discord gallery channel when a run, view, or tiny guild moment feels worth saving.
            </p>
            <GalleryItems />
            <p id="galleryError" className="sr-only" role="status" aria-live="polite" />
          </section>
        </div>
      </main>
    </>
  );
}

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

export function SpotifyPage() {
  const data = record(spotifyData);
  const items = records(data.items).map((item) => ({
    title: text(item.title),
    subtitle: text(item.subtitle),
    type: text(item.type),
    tags: strings(item.tags),
    embed: text(item.embed),
    url: text(item.url),
    height: Number(item.height) || undefined,
    description: text(item.description),
  }));

  return (
    <>
      <BodyPageMarker page="spotify" />
      <PageHero
        page="spotify"
        ariaLabel="Playlists hero"
        image="./assets/img/spotify/hero.webp"
        imageAlt="Playlists banner artwork"
        kicker="Listening room"
        title="Playlists"
        center={false}
        intro={
          <div className="prose-stack">
            <p className="muted">Soft music for reading, roaming & late-night guild hours.</p>
          </div>
        }
      />
      <main className="page-main" id="main">
        <div className="container">
          <SpotifyBrowser intro={text(data.intro)} items={items} />
        </div>
      </main>
    </>
  );
}

export function RecruitmentPage() {
  const data = record(recruitmentData);
  const hero = record(data.hero);
  const meta = record(data.meta);
  const audio = record(data.audio);
  const content = record(data.content);
  const sources = records(audio.sources);
  const audioSources = sources.map((source) => ({
    src: publicPath(source.src),
    type: text(source.type),
  }));

  return (
    <>
      <BodyPageMarker page="recruitment" />
      <PageHero
        page="recruitment"
        ariaLabel="Recruitment hero"
        image={text(hero.image, "./assets/img/recruitment/hero.webp")}
        imageAlt={text(hero.alt, "Recruitment banner artwork")}
        atmosphere={text(hero.atmosphere)}
        kicker={text(meta.kicker, "Recruitment")}
        title={text(meta.heading, "Recruitment & Membership")}
        meta={<MetaRow label="Recruitment metadata" items={[meta.author, meta.updated ? monthYearUTC(meta.updated) : ""]} />}
        intro={
          <p className="lede" id="recruitmentIntro">
            {text(meta.intro)}
          </p>
        }
        badges={<BadgeRow id="recruitmentBadges" items={strings(meta.badges)} label="Recruitment tags" />}
      />
      <main className="page-main" id="main">
        <div className="container">
          <div className="grid-12 grid-gap">
            <section className="col-4" aria-describedby="recruitmentAudioDesc">
              <div className="glass-card glass-card--soft glass-pad center-stack">
                <h2 className="section-title section-title--sm" id="recruitmentAudioTitle">
                  {text(audio.title, "A Note")}
                </h2>
                <p className="muted" id="recruitmentAudioDesc">
                  {text(audio.description)}
                </p>
                <RecruitmentAudioPlayer sources={audioSources} />
                <BadgeRow
                  id="recruitmentAudioBadges"
                  items={sources.map((source) => {
                    const type = text(source.type);
                    const slash = type.indexOf("/");
                    return type ? `Audio: ${slash >= 0 ? type.slice(slash + 1) : type}` : "";
                  })}
                  label="Audio formats"
                />
              </div>
            </section>
            <section className="col-8">
              <div className="glass-card glass-card--primary glass-pad">
                <h2 className="section-title" id="recruitmentBodyTitle">
                  {text(content.title, "Recruitment")}
                </h2>
                <ProseStack id="recruitmentBody" lines={content.paragraphs} />
                <ProseStack id="recruitmentConclusion" lines={content.conclusion} className="prose-stack" />
              </div>
            </section>
            <div className="col-divider" aria-hidden="true" />
          </div>
        </div>
      </main>
    </>
  );
}

export function TwillsPage() {
  const data = record(twillsData);
  const hero = record(data.hero);
  const profile = record(data.profile);

  return (
    <>
      <BodyPageMarker page="twills" />
      <ProfileDisplay
        page="twills"
        ariaLabel="Twills hero"
        heroImage={text(hero.image, "./assets/img/profiles/twills/hero.webp")}
        heroAlt="Twills profile banner artwork"
        kicker={text(hero.kicker, "Profile")}
        name={text(profile.name, "Twills")}
        timezone={text(profile.timezone)}
        badges={strings(profile.badges, 10)}
        cardTitle={text(profile.cardTitle, "Portrait")}
        avatar={text(profile.avatar, "./assets/img/profiles/twills/avatar.webp")}
        avatarAlt="Twills profile picture"
        bioTitle={text(profile.bioTitle, "Bio")}
        bio={profile.bio}
      />
    </>
  );
}
