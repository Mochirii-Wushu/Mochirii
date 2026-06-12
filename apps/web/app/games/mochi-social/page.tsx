import type { Metadata } from "next";
import { MochiSocialAlphaClient } from "@/components/mochi-social/MochiSocialAlphaClient";
import { MochiSocialTesterGameClient } from "@/components/mochi-social/MochiSocialTesterGameClient";
import { MochiSocialTesterPasswordGate } from "@/components/mochi-social/MochiSocialTesterPasswordGate";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";
import { hasMochiSocialTesterSession } from "@/lib/mochi-social/tester-password";

export const metadata: Metadata = {
  title: "Mochi Social Alpha",
  description: "Closed, no-real-value Mochi Social alpha preview for approved testers.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/games/mochi-social",
  },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ tester_error?: string }>;

function testerGateError(value: string | undefined) {
  if (value === "invalid" || value === "missing-config") return value;
  return null;
}

export default async function MochiSocialPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const accessMode = process.env.MOCHI_SOCIAL_ALPHA_ACCESS_MODE === "supabase" ? "supabase" : "tester-password";
  const testerSessionReady = accessMode === "tester-password" ? await hasMochiSocialTesterSession() : false;

  return (
    <>
      <BodyPageMarker page="games-mochi-social" />
      <main className="page-main mochi-game-page" id="main">
        <div className="container">
          {accessMode === "supabase" ? (
            <MochiSocialAlphaClient />
          ) : testerSessionReady ? (
            <MochiSocialTesterGameClient />
          ) : (
            <MochiSocialTesterPasswordGate error={testerGateError(params.tester_error)} />
          )}
        </div>
      </main>
    </>
  );
}
