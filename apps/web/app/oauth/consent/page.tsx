import "../../styles/public-content-shared.css";
import "../../styles/member-workflow.css";
import "../../styles/member-forms.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { OAuthConsentPanel } from "@/components/member-workflow/OAuthConsentPanel";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";
import { PageHero } from "@/components/public-pages/common";

export const metadata: Metadata = {
  title: "Mochirii OAuth Consent - Guild Social",
  description: "Approve or deny guild social OAuth access for active Mochirii members.",
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
        ariaLabel="OAuth consent hero"
        image="./assets/img/leaders/panel.webp"
        imageAlt="Guild consent banner artwork"
        kicker="Guild Social"
        title="OAuth Consent"
        center={false}
        intro={<p className="lede">Review the client request before guild social access is granted.</p>}
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
