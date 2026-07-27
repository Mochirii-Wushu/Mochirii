import "../styles/public-side-pages.css";
import "../styles/public-content-shared.css";
import { metadataFor } from "@/components/public-pages/metadata";
import { AnnouncementsPage } from "@/components/public-pages/route-pages/AnnouncementsPage";

export const metadata = metadataFor("announcements");

export default AnnouncementsPage;
