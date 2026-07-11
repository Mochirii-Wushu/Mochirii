import "../styles/public-content-shared.css";
import "../styles/member-workflow.css";
import type { Metadata } from "next";
import { SocialHubPanel } from "@/components/member-workflow/SocialHubPanel";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";
import { PageHero } from "@/components/public-pages/common";

export const metadata: Metadata = {
  title: "Mochirii Social Handoff",
  description: "Members-only Mochirii social handoff page.",
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
        title="Social"
        center={false}
        intro={<p className="lede">Signed-in members continue to Mochirii Social for guild sharing and internal updates.</p>}
      />
      <main className="page-main" id="main">
        <div className="container">
          <SocialHubPanel />
        </div>
      </main>
    </>
  );
}
