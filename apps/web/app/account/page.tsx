import type { Metadata } from "next";
import { AccountPanel } from "@/components/member-workflow/AccountPanel";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";
import { PageHero } from "@/components/public-pages/common";
import { SITE_ORIGIN } from "@/lib/public-urls";

export const metadata: Metadata = {
  title: "Mōchirīī Account • Guild Verification",
  description: "View member verification, linked sign-in methods, member status, and safe profile fields for a Mōchirīī website account.",
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: "/account",
  },
  openGraph: {
    type: "website",
    siteName: "Mōchirīī",
    title: "Mōchirīī Account • Guild Verification",
    description: "View member verification, linked sign-in methods, member status, and safe profile fields for a Mōchirīī website account.",
    url: `${SITE_ORIGIN}/account`,
    images: ["/assets/img/leaders/panel.webp"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mōchirīī Account • Guild Verification",
    description: "View member verification, linked sign-in methods, member status, and safe profile fields for a Mōchirīī website account.",
    images: ["/assets/img/leaders/panel.webp"],
  },
};

export default function AccountPage() {
  return (
    <>
      <BodyPageMarker page="account" />
      <PageHero
        page="account"
        ariaLabel="Account hero"
        image="./assets/img/leaders/panel.webp"
        imageAlt="Guild account banner artwork"
        kicker="Guild Account"
        title="Account"
        center={false}
        intro={<p className="lede">Check member verification, review member status, and keep safe profile details current.</p>}
      />
      <main className="page-main" id="main">
        <div className="container">
          <AccountPanel />
        </div>
      </main>
    </>
  );
}
