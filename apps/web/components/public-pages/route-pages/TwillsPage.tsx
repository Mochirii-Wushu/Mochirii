import twillsData from "@/public/data/twills.json";
import { BodyPageMarker } from "../BodyPageMarker";
import { ProfileDisplay } from "../ProfileDisplay";
import { text } from "../common";
import { record, strings } from "../page-helpers";

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
