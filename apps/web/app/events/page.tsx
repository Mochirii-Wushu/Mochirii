import "../styles/public-events.css";
import "../styles/public-side-pages.css";
import "../styles/public-content-shared.css";
import "../styles/public-gallery.css";
import { metadataFor } from "@/components/public-pages/metadata";
import { EventsPage } from "@/components/public-pages/pages";

export const metadata = metadataFor("events");

export default EventsPage;
