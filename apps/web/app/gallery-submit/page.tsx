import type { Metadata } from "next";
import { GallerySubmitForm } from "@/components/member-workflow/GallerySubmitForm";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";
import { PageHero } from "@/components/public-pages/common";

export const metadata: Metadata = {
  title: "Mōchirīī Submit Image • Gallery Upload",
  description: "Submit a private pending gallery image for later Mōchirīī moderation after Discord role verification.",
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: "/gallery-submit",
  },
  openGraph: {
    type: "website",
    siteName: "Mōchirīī",
    title: "Mōchirīī Submit Image • Gallery Upload",
    description: "Submit a private pending gallery image for later Mōchirīī moderation after Discord role verification.",
    url: "https://mochirii.com/gallery-submit",
    images: ["/assets/img/gallery/hero.webp"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mōchirīī Submit Image • Gallery Upload",
    description: "Submit a private pending gallery image for later Mōchirīī moderation after Discord role verification.",
    images: ["/assets/img/gallery/hero.webp"],
  },
};

export default function GallerySubmitPage() {
  return (
    <>
      <BodyPageMarker page="gallery-submit" />
      <PageHero
        page="gallery-submit"
        ariaLabel="Gallery submit hero"
        image="./assets/img/gallery/hero.webp"
        imageAlt="Gallery upload banner artwork"
        kicker="Gallery Upload"
        title="Submit Image"
        intro={<p className="lede">Verified active members can send images into a private pending queue. Nothing submitted here appears in the public Gallery until Moderator approval.</p>}
      />
      <main className="page-main" id="main">
        <div className="container">
          <GallerySubmitForm />
        </div>
      </main>
    </>
  );
}
