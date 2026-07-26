import type { Metadata } from "next";
import { MochiPetsTesterPasswordGate } from "@/components/mochi-pets/MochiPetsTesterPasswordGate";
import { MochiPetsTesterWaitingRoom } from "@/components/mochi-pets/MochiPetsTesterWaitingRoom";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";
import { getMochiPetsConnection } from "@/lib/mochi-pets/connection";
import { hasMochiPetsTesterSession } from "@/lib/mochi-pets/tester-session";

export const metadata: Metadata = {
  title: "Mochi Pets",
  description: "Private Mochirii tester doorway for a future Mochi Pets game on the web and in the Mochirii iPhone app.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/games/mochi-pets",
  },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Promise<{ tester_error?: string | string[] }>;

function testerGateError(value: string | string[] | undefined) {
  if (value === "invalid" || value === "unavailable") return value;
  return null;
}

export default async function MochiPetsPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, testerSessionReady] = await Promise.all([
    searchParams,
    hasMochiPetsTesterSession(),
  ]);

  return (
    <>
      <BodyPageMarker page="games-mochi-pets" />
      <main className="page-main mochi-game-page" id="main">
        <div className="container">
          {testerSessionReady ? (
            <MochiPetsTesterWaitingRoom connection={getMochiPetsConnection()} />
          ) : (
            <MochiPetsTesterPasswordGate error={testerGateError(params.tester_error)} />
          )}
        </div>
      </main>
    </>
  );
}
