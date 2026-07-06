import spotifyData from "@/public/data/spotify.json";
import { BodyPageMarker } from "../BodyPageMarker";
import { SpotifyBrowser } from "../SpotifyBrowser";
import { PageHero, text } from "../common";
import { record, records, strings } from "../page-helpers";

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
