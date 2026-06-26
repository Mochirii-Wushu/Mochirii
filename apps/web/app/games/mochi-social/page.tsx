import type { Metadata } from "next";
import { MochiSocialAlphaClient } from "@/components/mochi-social/MochiSocialAlphaClient";
import { MochiSocialTesterPasswordGate } from "@/components/mochi-social/MochiSocialTesterPasswordGate";
import { BodyPageMarker } from "@/components/public-pages/BodyPageMarker";
import { hasMochiSocialTesterSession } from "@/lib/mochi-social/tester-password";

export const metadata: Metadata = {
  title: "Mochi Social Alpha",
  description: "Closed Mochi Social playtest for approved guild members to enter a shared room and care for Lirabao together.",
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

type MochiSocialGameRuntimeStatus = {
  available: boolean;
  message: string;
};

function testerGateError(value: string | undefined) {
  if (value === "invalid" || value === "missing-config") return value;
  return null;
}

async function getMochiSocialGameRuntimeStatus(): Promise<MochiSocialGameRuntimeStatus> {
  const gameOrigin = (process.env.NEXT_PUBLIC_MOCHI_SOCIAL_URL || "https://mochi-social-game.fly.dev").replace(/\/+$/, "");
  const paused = {
    available: false,
    message: "The Mochi Social room is temporarily paused. The tester page is still open, and saved play will resume when the room is ready.",
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

export default async function MochiSocialPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const accessMode = process.env.MOCHI_SOCIAL_ALPHA_ACCESS_MODE === "supabase" ? "supabase" : "tester-password";
  const testerSessionReady = accessMode === "tester-password" ? await hasMochiSocialTesterSession() : false;
  const alphaShellUnlocked = accessMode === "supabase" || testerSessionReady;
  const gameRuntime = alphaShellUnlocked
    ? await getMochiSocialGameRuntimeStatus()
    : { available: true, message: "" };

  return (
    <>
      <BodyPageMarker page="games-mochi-social" />
      <main className="page-main mochi-game-page" id="main">
        <div className="container">
          {alphaShellUnlocked ? (
            <MochiSocialAlphaClient gameAvailable={gameRuntime.available} gamePausedMessage={gameRuntime.message} />
          ) : (
            <MochiSocialTesterPasswordGate error={testerGateError(params.tester_error)} />
          )}
        </div>
      </main>
    </>
  );
}
