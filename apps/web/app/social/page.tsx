import type { Metadata } from "next";
import { SocialHubPanel } from "@/components/member-workflow/SocialHubPanel";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";
import { PageHero } from "@/components/public-pages/common";

export const metadata: Metadata = {
  title: "Mochirii Social Status",
  description: "Members-only Mochirii account-link and social profile status page.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/social",
  },
};

export default function SocialPage() {
  return (
    <>
      <BodyPageMarker page="social" />
      <PageHero
        page="social"
        ariaLabel="Guild social hero"
        image="./assets/img/gallery/hero.webp"
        imageAlt="Guild social gallery banner artwork"
        kicker="Guild Social"
        title="Social Status"
        center={false}
        intro={<p className="lede">Active members can check website account-link status while the Social button opens the guild social platform.</p>}
      />
      <main className="page-main" id="main">
        <div className="container">
          <SocialHubPanel />
        </div>
      </main>
    </>
  );
}
