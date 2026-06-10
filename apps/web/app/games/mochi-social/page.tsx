import type { Metadata } from "next";
import { MochiSocialAlphaClient } from "@/components/mochi-social/MochiSocialAlphaClient";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";

export const metadata: Metadata = {
  title: "Mochi Social Alpha",
  description: "Closed, no-real-value Mochi Social alpha preview for allowlisted Mochirii members.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/games/mochi-social",
  },
};

export default function MochiSocialPage() {
  return (
    <>
      <BodyPageMarker page="games-mochi-social" />
      <main className="page-main mochi-game-page" id="main">
        <div className="container">
          <MochiSocialAlphaClient />
        </div>
      </main>
    </>
  );
}
