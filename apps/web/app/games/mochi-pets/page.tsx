import { MochiPetsConfiguredDoorway } from "@/components/mochi-pets/MochiPetsConfiguredDoorway";
import { MochiPetsPublicConcept } from "@/components/mochi-pets/MochiPetsPublicConcept";
import { metadataFor } from "@/components/public-pages/metadata";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";
import { isMochiPetsTesterAccessConfigured } from "@/lib/mochi-pets/tester-session";

export const metadata = metadataFor("mochiPets");

export default function MochiPetsPage() {
  const testerAccessConfigured = isMochiPetsTesterAccessConfigured();
  const content = testerAccessConfigured ? <MochiPetsConfiguredDoorway /> : <MochiPetsPublicConcept />;
  return (
    <>
      <BodyPageMarker page="games-mochi-pets" />
      <main className="page-main mochi-game-page" id="main">
        <div className="container">
          {content}
        </div>
      </main>
    </>
  );
}
