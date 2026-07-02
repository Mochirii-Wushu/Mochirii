import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPanel } from "@/components/member-workflow/AuthPanel";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";
import { BadgeRow, PageHero } from "@/components/public-pages/common";

export const metadata: Metadata = {
  title: "Mōchirīī Login • Guild Account",
  description: "Choose a Mōchirīī sign-in method, link identities, and request member verification for gallery upload access.",
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: "/auth",
  },
  openGraph: {
    type: "website",
    siteName: "Mōchirīī",
    title: "Mōchirīī Login • Guild Account",
    description: "Choose a Mōchirīī sign-in method, link identities, and request member verification for gallery upload access.",
    url: "https://mochirii.com/auth",
    images: ["/assets/img/join/hero.webp"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mōchirīī Login • Guild Account",
    description: "Choose a Mōchirīī sign-in method, link identities, and request member verification for gallery upload access.",
    images: ["/assets/img/join/hero.webp"],
  },
};

export default function AuthPage() {
  return (
    <>
      <BodyPageMarker page="auth" />
      <PageHero
        page="auth"
        ariaLabel="Login hero"
        image="./assets/img/join/hero.webp"
        imageAlt="Guild hall login banner artwork"
        kicker="Guild Account"
        title="Login"
        center={false}
        intro={
          <p className="lede">
            Sign-in connects your website account. Gallery upload access is checked separately through Discord roles or moderator-approved member verification.
          </p>
        }
        badges={<BadgeRow items={["Discord verified", "Moderator review"]} label="Verification routes" />}
      />
      <main className="page-main" id="main">
        <div className="container">
          <Suspense fallback={<section className="glass-card glass-card--primary glass-pad auth-panel" aria-busy="true" />}>
            <AuthPanel />
          </Suspense>
        </div>
      </main>
    </>
  );
}
