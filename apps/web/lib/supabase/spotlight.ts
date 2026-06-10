"use client";

import { invokeEdgeFunction } from "./client";
import type { CurrentSpotlightWinner } from "./types";

export async function getCurrentSpotlightWinner() {
  return invokeEdgeFunction<CurrentSpotlightWinner>("get-current-spotlight-winner", {});
}
