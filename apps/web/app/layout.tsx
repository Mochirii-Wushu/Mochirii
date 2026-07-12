import type { Metadata, Viewport } from "next";
import { Noto_Serif_SC, Zhi_Mang_Xing } from "next/font/google";
import Image from "next/image";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SITE_ORIGIN } from "@/lib/public-urls";
import { SITE_DESCRIPTION, SITE_LANGUAGE, SITE_OG_LOCALE, SITE_TITLE } from "@/lib/site-metadata";
import "./styles/tokens-base.css";
import "./styles/shared-ui.css";
import "./styles/shell-header-nav.css";
import "./styles/shell-mobile-menu.css";
import "./styles/shell-footer.css";
import "./styles/mochi-pets.css";

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
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Mōchirīī",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: SITE_OG_LOCALE,
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
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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
    <html lang={SITE_LANGUAGE} className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body data-page="home">
        <SiteHeader />
        <div className="bg-photo" aria-hidden="true">
          <Image
            src="/assets/bg/wuxia-bg.webp"
            alt=""
            className="bg-photo__image"
            fill
            sizes="100vw"
            loading="eager"
          />
        </div>
        {children}
        <SiteFooter />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
