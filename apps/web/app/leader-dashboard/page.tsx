import type { Metadata } from "next";
import { LeaderDashboard } from "@/components/member-workflow/LeaderDashboard";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";
import { PageHero } from "@/components/public-pages/common";

export const metadata: Metadata = {
  title: "Mōchirīī Leader Dashboard • Gallery Moderation",
  description: "Review pending member gallery image submissions with Discord Moderator access.",
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: "/leader-dashboard",
  },
  openGraph: {
    type: "website",
    siteName: "Mōchirīī",
    title: "Mōchirīī Leader Dashboard • Gallery Moderation",
    description: "Review pending member gallery image submissions with Discord Moderator access.",
    url: "https://mochirii.com/leader-dashboard",
    images: ["/assets/img/gallery/hero.webp"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mōchirīī Leader Dashboard • Gallery Moderation",
    description: "Review pending member gallery image submissions with Discord Moderator access.",
    images: ["/assets/img/gallery/hero.webp"],
  },
};

export default function LeaderDashboardPage() {
  return (
    <>
      <BodyPageMarker page="leader-dashboard" />
      <PageHero
        page="leader-dashboard"
        ariaLabel="Leader dashboard hero"
        image="./assets/img/gallery/hero.webp"
        imageAlt="Gallery moderation banner artwork"
        kicker="Leader Dashboard"
        title="Gallery Moderation"
        center={false}
        intro={<p className="lede">Review member image uploads, inspect context, and keep moderation decisions traceable.</p>}
      />
      <main className="page-main" id="main">
        <div className="container">
          <LeaderDashboard />
        </div>
      </main>
    </>
  );
}
