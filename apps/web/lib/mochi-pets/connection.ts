import connection from "@/config/mochi-pets-connection.json";
import { SOCIAL_HOST } from "@/lib/public-urls";

export const MOCHI_PETS_CONNECTION_PROTOCOL_VERSION = 1 as const;

type DisconnectedMochiPetsConnectionSource = {
  protocolVersion: typeof MOCHI_PETS_CONNECTION_PROTOCOL_VERSION;
  status: "not-connected";
  websiteRoute: "/games/mochi-pets";
  repository: {
    slug: "Mochirii-Wushu/Mochirii-Pets";
    visibility: "private";
    sourceState: "scaffolded";
  };
  platforms: {
    web: { artifact: null };
    ios: { artifact: null };
  };
  social: {
    originKey: "socialHost";
    identityState: "not-connected";
    chatState: "not-ready";
  };
};

export type MochiPetsConnection = Omit<DisconnectedMochiPetsConnectionSource, "social"> & {
  social: Omit<DisconnectedMochiPetsConnectionSource["social"], "originKey"> & {
    origin: typeof SOCIAL_HOST;
  };
};

export function getMochiPetsConnection(): MochiPetsConnection {
  const source = connection as DisconnectedMochiPetsConnectionSource;
  return {
    ...source,
    social: {
      origin: SOCIAL_HOST,
      identityState: source.social.identityState,
      chatState: source.social.chatState,
    },
  };
}
