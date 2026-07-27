import "../styles/public-content-shared.css";
import "../styles/public-profiles.css";
import "../styles/public-profile-cards.css";
import "../styles/public-ceremony.css";
import { metadataFor } from "@/components/public-pages/metadata";
import { LeadersPage } from "@/components/public-pages/route-pages/LeadersPage";

export const metadata = metadataFor("leaders");

export default LeadersPage;
