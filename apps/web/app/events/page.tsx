import { metadataFor } from "@/components/public-pages/metadata";
import { EventsPage } from "@/components/public-pages/pages";

export const metadata = metadataFor("events");
export const revalidate = 3600;

export default EventsPage;
