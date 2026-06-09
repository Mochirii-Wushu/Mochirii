import { metadataFor } from "@/components/public-pages/metadata";
import { AnnouncementsPage } from "@/components/public-pages/pages";

export const metadata = metadataFor("announcements");
export const revalidate = 3600;

export default AnnouncementsPage;
