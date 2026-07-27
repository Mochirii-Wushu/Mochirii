import "../../styles/public-content-shared.css";
import "../../styles/member-workflow.css";
import "../../styles/member-forms.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { OAuthConsentPanel } from "@/components/member-workflow/OAuthConsentPanel";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";
import { PageHero } from "@/components/public-pages/common";

export const metadata: Metadata = {
  title: "Mōchirīī Social Access",
  description: "Review access to Mōchirīī Social.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/oauth/consent",
  },
};

export default function OAuthConsentPage() {
  return (
    <>
      <BodyPageMarker page="oauth-consent" />
      <PageHero
        page="oauthConsent"
        ariaLabel="Guild social access"
        image="./assets/img/leaders/panel.webp"
        imageAlt="Guild consent banner artwork"
        kicker="Guild Social"
        title="Connect Mōchirīī Social"
        center={false}
        intro={<p className="lede">Review the requested guild social access before continuing.</p>}
      />
      <main className="page-main" id="main">
        <div className="container">
          <Suspense fallback={<section className="glass-card glass-card--primary glass-pad auth-panel" aria-busy="true" />}>
            <OAuthConsentPanel />
          </Suspense>
        </div>
      </main>
    </>
  );
}
