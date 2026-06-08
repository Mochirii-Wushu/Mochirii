import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./mochirii.css";

const siteUrl = "https://mochirii.com";
const title = "Mōchirīī • Where Winds Meet Guild";
const description =
  "Join Mōchirīī, a warm Where Winds Meet guild for friendly runs, clear event notes, and a cozy wuxia guild hall.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
    url: siteUrl,
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
    <html lang="en">
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
