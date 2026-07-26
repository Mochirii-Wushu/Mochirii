"use client";

import { lazy, Suspense } from "react";
import type { SpinnerAccessMode } from "@/lib/spinner/session-policy";

const ModeratorSpinner = lazy(async () => {
  const spinnerModule = await import("./ModeratorRaffleSpinner");
  return { default: spinnerModule.ModeratorRaffleSpinner };
});

const ViewerSpinner = lazy(async () => {
  const spinnerModule = await import("./ViewerRaffleSpinner");
  return { default: spinnerModule.ViewerRaffleSpinner };
});

export function SpinnerClientEntry({ mode }: { mode: SpinnerAccessMode }) {
  return (
    <Suspense fallback={<main className="spinner-session-ended" id="main"><p role="status">Opening the private draw stage.</p></main>}>
      {mode === "controller" ? <ModeratorSpinner /> : <ViewerSpinner />}
    </Suspense>
  );
}
