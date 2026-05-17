import type { Metadata } from "next";
import { AuthPanel } from "@/components/member-workflow/AuthPanel";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";
import { BadgeRow, PageHero } from "@/components/public-pages/common";

export const metadata: Metadata = {
  title: "Mōchirīī Login • Guild Account",
  description: "Sign in with Discord to manage a Mōchirīī website account and request gallery upload access.",
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
    description: "Sign in with Discord to manage a Mōchirīī website account and request gallery upload access.",
    url: "https://mochirii.com/auth",
    images: ["/assets/img/join/hero.webp"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mōchirīī Login • Guild Account",
    description: "Sign in with Discord to manage a Mōchirīī website account and request gallery upload access.",
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
            Discord sign-in connects your website account. Gallery upload access is checked separately against server membership and the required Discord roles.
          </p>
        }
        badges={<BadgeRow items={["Mōchirīī - WWM", "✅Verified"]} label="Required roles" />}
      />
      <main className="page-main" id="main">
        <div className="container">
          <AuthPanel />
        </div>
      </main>
    </>
  );
}
