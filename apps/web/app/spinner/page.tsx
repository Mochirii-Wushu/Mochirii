import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSpinnerRequestAccess } from "@/lib/spinner/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PRIVATE_ROBOTS = {
  index: false,
  follow: false,
  nocache: true,
  noarchive: true,
  nosnippet: true,
  noimageindex: true,
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const access = await getSpinnerRequestAccess();
  if (!access.ok) {
    return {
      title: "Page unavailable",
      description: "Page unavailable.",
      alternates: { canonical: null },
      robots: PRIVATE_ROBOTS,
      openGraph: null,
      twitter: null,
      icons: { icon: [], apple: [] },
    };
  }

  return {
    title: "Mōchirīī Raffle Spinner",
    description: "A private live raffle wheel for verified Mōchirīī members.",
    alternates: { canonical: null },
    robots: PRIVATE_ROBOTS,
    openGraph: null,
    twitter: null,
  };
}

export default async function SpinnerPage() {
  const access = await getSpinnerRequestAccess();
  if (!access.ok) notFound();

  const { AuthorizedSpinnerStage } = await import("./authorized");
  return <AuthorizedSpinnerStage mode={access.mode} />;
}
