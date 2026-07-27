import "../styles/public-events.css";
import "../styles/public-side-pages.css";
import "../styles/public-content-shared.css";
import "../styles/public-gallery.css";
import { connection } from "next/server";
import { metadataFor } from "@/components/public-pages/metadata";
import { EventsPage } from "@/components/public-pages/route-pages/EventsPage";

export const metadata = metadataFor("events");

export default async function EventsRoute() {
  await connection();
  return <EventsPage referenceTime={new Date().toISOString()} />;
}
