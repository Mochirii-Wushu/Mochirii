import "../styles/public-side-pages.css";
import "../styles/public-content-shared.css";
import "../styles/public-profiles.css";
import "../styles/public-profile-cards.css";
import { metadataFor } from "@/components/public-pages/metadata";
import { SpotlightPage } from "@/components/public-pages/pages";

export const metadata = metadataFor("spotlight");
export const revalidate = 3600;

export default SpotlightPage;
