export type MochiPetsBridgeStatus = "waiting" | "ready" | "linked" | "guest" | "error";

export type MochiPetsBridgeResolution =
  | { action: "ignore" }
  | { action: "send-auth"; status: "ready" }
  | { action: "set-status"; status: "ready" | "linked" | "guest" | "error" }
  | { action: "error"; status: "error"; message: string };

export const MOCHI_PETS_AUTH_BRIDGE_ERROR_MESSAGE =
  "Mochi Pets reported an auth bridge issue. Refresh or sign in again before testing.";

type MochiPetsGameMessage = {
  type?: unknown;
  protocolVersion?: unknown;
  payload?: {
    state?: unknown;
  };
};

export function resolveMochiPetsBridgeMessage(value: unknown): MochiPetsBridgeResolution {
  if (!value || typeof value !== "object") return { action: "ignore" };

  const data = value as MochiPetsGameMessage;
  if (data.protocolVersion !== 1 || typeof data.type !== "string") return { action: "ignore" };

  if (data.type === "MOCHI_PETS_READY") {
    return { action: "send-auth", status: "ready" };
  }

  if (data.type === "MOCHI_PETS_AUTH_STATE") {
    const nextState = normalizeAuthState(data.payload?.state);
    return {
      action: "set-status",
      status: nextState,
    };
  }

  if (data.type === "MOCHI_PETS_ERROR") {
    return {
      action: "error",
      status: "error",
      message: MOCHI_PETS_AUTH_BRIDGE_ERROR_MESSAGE,
    };
  }

  return { action: "ignore" };
}

function normalizeAuthState(value: unknown): "ready" | "linked" | "guest" | "error" {
  if (value === "linked" || value === "signed-in") return "linked";
  if (value === "guest" || value === "signed-out") return "guest";
  if (value === "error") return "error";
  return "ready";
}
