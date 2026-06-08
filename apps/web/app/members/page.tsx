import type { Metadata } from "next";
import { MembersDirectory } from "@/components/member-workflow/MemberDirectory";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";
import { PageHero } from "@/components/public-pages/common";

export const metadata: Metadata = {
  title: "Mōchirīī Members • Published Profiles",
  description: "Members-only Mōchirīī profile directory for active verified guild members.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/members",
  },
};

export default function MembersPage() {
  return (
    <>
      <BodyPageMarker page="members" />
      <PageHero
        page="members"
        ariaLabel="Members hero"
        image="./assets/img/leaders/panel.webp"
        imageAlt="Guild members banner artwork"
        kicker="Members"
        title="Member Profiles"
        center={false}
        intro={<p className="lede">Published profiles are visible to active verified members.</p>}
      />
      <main className="page-main" id="main">
        <div className="container">
          <MembersDirectory />
        </div>
      </main>
    </>
  );
}
