import type { Metadata } from "next";
import { MochiPetsAlphaClient } from "@/components/mochi-pets/MochiPetsAlphaClient";
import { MochiPetsTesterPasswordGate } from "@/components/mochi-pets/MochiPetsTesterPasswordGate";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";
import { hasMochiPetsTesterSession } from "@/lib/mochi-pets/tester-password";

export const metadata: Metadata = {
  title: "Mochi Pets Alpha",
  description: "Closed Mochi Pets playtest for approved guild members to enter a shared room and care for Lirabao together.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/games/mochi-pets",
  },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ tester_error?: string }>;

type MochiPetsGameRuntimeStatus = {
  available: boolean;
  message: string;
};

function testerGateError(value: string | undefined) {
  if (value === "invalid" || value === "missing-config") return value;
  return null;
}

async function getMochiPetsGameRuntimeStatus(): Promise<MochiPetsGameRuntimeStatus> {
  const gameOrigin = (process.env.NEXT_PUBLIC_MOCHI_PETS_URL || "https://mochi-pets-game.fly.dev").replace(/\/+$/, "");
  const paused = {
    available: false,
    message: "The Mochi Pets room is temporarily paused. The tester page is still open, and saved play will resume when the room is ready.",
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`${gameOrigin}/healthz`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return paused;
    const health = await response.json().catch(() => null) as {
      ok?: unknown;
      activeRuntime?: unknown;
      unityWebglBuild?: { present?: unknown };
      legacyFallback?: { active?: unknown };
    } | null;

    const unityReady = health?.ok === true
      && health.activeRuntime === "unity-webgl"
      && health.unityWebglBuild?.present === true
      && health.legacyFallback?.active !== true;

    return unityReady
      ? { available: true, message: "" }
      : paused;
  } catch {
    return paused;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function MochiPetsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const accessMode = process.env.MOCHI_PETS_ALPHA_ACCESS_MODE === "supabase" ? "supabase" : "tester-password";
  const testerSessionReady = accessMode === "tester-password" ? await hasMochiPetsTesterSession() : false;
  const alphaShellUnlocked = accessMode === "supabase" || testerSessionReady;
  const gameRuntime = alphaShellUnlocked
    ? await getMochiPetsGameRuntimeStatus()
    : { available: true, message: "" };

  return (
    <>
      <BodyPageMarker page="games-mochi-pets" />
      <main className="page-main mochi-game-page" id="main">
        <div className="container">
          {alphaShellUnlocked ? (
            <MochiPetsAlphaClient gameAvailable={gameRuntime.available} gamePausedMessage={gameRuntime.message} />
          ) : (
            <MochiPetsTesterPasswordGate error={testerGateError(params.tester_error)} />
          )}
        </div>
      </main>
    </>
  );
}
