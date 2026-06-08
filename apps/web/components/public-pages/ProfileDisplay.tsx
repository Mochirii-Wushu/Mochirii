import { BadgeRow, MetaRow, PageHero, ProseStack, publicPath, text } from "./common";

export type ProfileDisplayProps = {
  page: string;
  ariaLabel: string;
  heroImage: string;
  heroAlt: string;
  kicker: string;
  name: string;
  timezone?: string | null;
  guildTitle?: string | null;
  badges?: string[];
  cardTitle?: string;
  avatar: string;
  avatarAlt: string;
  bioTitle?: string;
  bio: unknown[] | unknown;
  centerHero?: boolean;
};

export function ProfileDisplay({
  page,
  ariaLabel,
  heroImage,
  heroAlt,
  kicker,
  name,
  timezone,
  guildTitle,
  badges = [],
  cardTitle = "Portrait",
  avatar,
  avatarAlt,
  bioTitle = "Bio",
  bio,
  centerHero = true,
}: ProfileDisplayProps) {
  const metaItems = [timezone, guildTitle].filter(Boolean);

  return (
    <>
      <PageHero
        page={page}
        ariaLabel={ariaLabel}
        image={heroImage}
        imageAlt={heroAlt}
        kicker={kicker}
        title={name}
        meta={<MetaRow label={`${name} metadata`} items={metaItems} />}
        badges={badges.length ? <BadgeRow id={`${page}Badges`} items={badges} label="Profile badges" /> : null}
        center={centerHero}
      />
      <main className="page-main" id="main">
        <div className="container">
          <section>
            <div className="grid-12 grid-gap">
              <aside className="col-4">
                <div className="glass-card glass-card--soft glass-pad">
                  <h2 className="section-title section-title--sm" id={`${page}CardTitle`}>
                    {text(cardTitle, "Portrait")}
                  </h2>
                  <img
                    id={`${page}Avatar`}
                    className="profile-avatar"
                    src={publicPath(avatar)}
                    alt={avatarAlt}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </aside>
              <section className="col-8">
                <div className="glass-card glass-card--primary glass-pad">
                  <h2 className="section-title" id={`${page}BioTitle`}>
                    {text(bioTitle, "Bio")}
                  </h2>
                  <ProseStack id={`${page}Bio`} lines={bio} />
                </div>
              </section>
              <div className="col-divider" aria-hidden="true" />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
