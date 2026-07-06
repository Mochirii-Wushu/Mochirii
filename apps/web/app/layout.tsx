import type { Metadata, Viewport } from "next";
import { Noto_Serif_SC, Zhi_Mang_Xing } from "next/font/google";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE_ORIGIN } from "@/lib/public-urls";
import "./styles/tokens-base.css";
import "./styles/shared-ui.css";
import "./styles/public-join.css";
import "./styles/public-events.css";
import "./styles/public-side-pages.css";
import "./styles/public-home.css";
import "./styles/public-profiles.css";
import "./styles/public-ceremony.css";
import "./styles/public-gallery.css";
import "./styles/member-workflow.css";
import "./styles/member-account.css";
import "./styles/member-forms.css";
import "./styles/member-gallery-submit.css";
import "./styles/member-leader-dashboard.css";
import "./styles/shell-lightbox.css";
import "./styles/shell-header-nav.css";
import "./styles/shell-mobile-menu.css";
import "./styles/shell-footer.css";
import "./styles/mochi-pets.css";

const title = "Mōchirīī • Where Winds Meet Guild";
const description =
  "Join Mōchirīī, a warm Where Winds Meet guild for friendly runs, clear event notes, and a cozy wuxia guild hall.";

const displayFont = Zhi_Mang_Xing({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-zhi-mang",
});

const bodyFont = Noto_Serif_SC({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-noto-serif-sc",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title,
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Mōchirīī",
    title,
    description,
    url: SITE_ORIGIN,
    images: [
      {
        url: "/assets/img/hero/hero.webp",
        width: 1536,
        height: 1024,
        alt: "Hero artwork for Mōchirīī guild",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/assets/img/hero/hero.webp"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/assets/img/brand/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0c0e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body data-page="home">
        <SiteHeader />
        <div className="bg-photo" aria-hidden="true" />
        {children}
        <SiteFooter />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
