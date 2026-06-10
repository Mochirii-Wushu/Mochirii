"use client";

import { useEffect, useState } from "react";
import { getCurrentSpotlightWinner } from "@/lib/supabase/spotlight";

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function titleForWinner(template: "home" | "spotlight", winnerName: string) {
  return template === "home" ? `Congratulations to: ${winnerName}.` : `This Month: ${winnerName}`;
}

export function SpotlightWinnerTitle({
  fallbackTitle,
  template,
}: {
  fallbackTitle: string;
  template: "home" | "spotlight";
}) {
  const [title, setTitle] = useState(clean(fallbackTitle, "Spotlight"));

  useEffect(() => {
    let alive = true;
    getCurrentSpotlightWinner().then((result) => {
      if (!alive) return;
      const winnerName = clean(result.data?.winnerName);
      if (result.ok && winnerName) setTitle(titleForWinner(template, winnerName));
    });

    return () => {
      alive = false;
    };
  }, [template]);

  return <>{title}</>;
}
