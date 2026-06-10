"use client";

import { useEffect, useState } from "react";
import { getCurrentSpotlightWinner } from "@/lib/supabase/spotlight";

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function replaceHomeTitleName(fallbackTitle: string, winnerName: string) {
  const fallback = clean(fallbackTitle, "Congratulations to: Meenari.");
  const match = fallback.match(/^(Congratulations to:\s*)(.*?)(\.)$/);
  return match ? `${match[1]}${winnerName}${match[3]}` : `Congratulations to: ${winnerName}.`;
}

function replaceSpotlightTitleName(fallbackTitle: string, winnerName: string) {
  const fallback = clean(fallbackTitle, "This Month: Meenari");
  const match = fallback.match(/^(This Month:\s*)(.+)$/);
  return match ? `${match[1]}${winnerName}` : `This Month: ${winnerName}`;
}

function titleForWinner(template: "home" | "spotlight", fallbackTitle: string, winnerName: string) {
  return template === "home"
    ? replaceHomeTitleName(fallbackTitle, winnerName)
    : replaceSpotlightTitleName(fallbackTitle, winnerName);
}

export function SpotlightWinnerTitle({
  fallbackTitle,
  template,
}: {
  fallbackTitle: string;
  template: "home" | "spotlight";
}) {
  const fallback = clean(fallbackTitle, "Spotlight");
  const [winnerTitle, setWinnerTitle] = useState<{
    fallback: string;
    template: "home" | "spotlight";
    title: string;
  } | null>(null);

  useEffect(() => {
    let alive = true;

    getCurrentSpotlightWinner().then((result) => {
      if (!alive) return;
      const winnerName = clean(result.data?.winnerName);
      if (result.ok && winnerName) {
        setWinnerTitle({
          fallback,
          template,
          title: titleForWinner(template, fallback, winnerName),
        });
      }
    });

    return () => {
      alive = false;
    };
  }, [fallback, template]);

  const title =
    winnerTitle?.fallback === fallback && winnerTitle.template === template ? winnerTitle.title : fallback;

  return <>{title}</>;
}
