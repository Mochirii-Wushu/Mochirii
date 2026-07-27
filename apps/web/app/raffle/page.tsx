import "../styles/public-side-pages.css";
import "../styles/public-content-shared.css";
import { metadataFor } from "@/components/public-pages/metadata";
import { RafflePage } from "@/components/public-pages/route-pages/RafflePage";
import { getLatestOfficialRaffleWinner } from "@/lib/raffle/latest-winner";

export const metadata = metadataFor("raffle");

export default async function RaffleRoute() {
  const featuredWinner = await getLatestOfficialRaffleWinner();
  return <RafflePage featuredWinner={featuredWinner} />;
}
