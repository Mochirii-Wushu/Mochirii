import type { Metadata } from "next";
import { MemberProfileView } from "@/components/member-workflow/MemberDirectory";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";

export const metadata: Metadata = {
  title: "Mōchirīī Member Profile",
  description: "Members-only Mōchirīī guild profile.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MemberProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <>
      <BodyPageMarker page="member-profile" />
      <MemberProfileView slug={slug} />
    </>
  );
}
