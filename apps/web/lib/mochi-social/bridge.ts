export type MochiSocialBridgeStatus = "waiting" | "ready" | "linked" | "guest" | "error";

export type MochiSocialBridgeResolution =
  | { action: "ignore" }
  | { action: "send-auth"; status: "ready" }
  | { action: "set-status"; status: "ready" | "linked" | "guest" | "error" }
  | { action: "error"; status: "error"; message: string };

export const MOCHI_SOCIAL_AUTH_BRIDGE_ERROR_MESSAGE =
  "Mochi Social reported an auth bridge issue. Refresh or sign in again before testing.";

type MochiSocialGameMessage = {
  type?: unknown;
  protocolVersion?: unknown;
  payload?: {
    state?: unknown;
  };
};

export function resolveMochiSocialBridgeMessage(value: unknown): MochiSocialBridgeResolution {
  if (!value || typeof value !== "object") return { action: "ignore" };

  const data = value as MochiSocialGameMessage;
  if (data.protocolVersion !== 1 || typeof data.type !== "string") return { action: "ignore" };

  if (data.type === "MOCHI_SOCIAL_READY") {
    return { action: "send-auth", status: "ready" };
  }

  if (data.type === "MOCHI_SOCIAL_AUTH_STATE") {
    const nextState = data.payload?.state;
    return {
      action: "set-status",
      status: nextState === "linked" || nextState === "guest" || nextState === "error" ? nextState : "ready",
    };
  }

  if (data.type === "MOCHI_SOCIAL_ERROR") {
    return {
      action: "error",
      status: "error",
      message: MOCHI_SOCIAL_AUTH_BRIDGE_ERROR_MESSAGE,
    };
  }

  return { action: "ignore" };
}
