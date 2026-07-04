"use client";

import { invokeEdgeFunction } from "@/lib/supabase/client";

export type MochiPetsAlphaSession = {
  userId: string;
  hasAccess: boolean;
  termsAccepted: boolean;
  termsVersion: string;
  progress?: {
    authority: "mochirii-edge";
    userId: string;
    revision: number;
    sourceRequestId?: string | null;
    lastActionType?: string | null;
    updatedAt: string;
  } | null;
  alpha: {
    noRealValue: boolean;
    allowlistRequired: boolean;
    termsRequired: boolean;
    ugc: "curated";
  };
  unity?: {
    engine: "unity-webgl";
    roomKey: "jade-lantern-room-alpha";
    roomMode: "single-shared-room";
    roomCapacity: 25;
    sharedPetKey: "lirabao";
    realtimeAuthority: "ugs-distributed-authority";
    stateAuthority: "ugs-cloud-save";
  };
};

export type MochiPetsUnityAuth = {
  userId: string;
  unity: {
    provider: "ugs-custom-id";
    projectId: string;
    environmentName: string;
    playerId: string;
    unityPlayerId?: string;
    customId: string;
    accessToken: string;
    idToken?: string;
    sessionToken: string;
    expiresIn: number;
    roomKey: "jade-lantern-room-alpha";
    roomMode: "single-shared-room";
    roomCapacity: 25;
    sharedPetKey: "lirabao";
    realtimeAuthority: "ugs-distributed-authority";
    stateAuthority: "ugs-cloud-save";
  };
  alpha: {
    noRealValue: boolean;
    allowlistRequired: boolean;
    termsRequired: boolean;
    ugc: "curated";
  };
};

export type MochiPetsAlphaTester = {
  user_id?: string | null;
  status?: string | null;
  notes?: string | null;
  invited_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type MochiPetsAlphaAudit = {
  summary?: Record<string, number | null | undefined>;
  recentLedger?: Array<{
    id?: number | string | null;
    request_id?: string | null;
    actor_id?: string | null;
    event_type?: string | null;
    entity_type?: string | null;
    entity_id?: string | null;
    created_at?: string | null;
  }>;
  recentFeedback?: Array<{
    id?: string | null;
    user_id?: string | null;
    category?: string | null;
    message?: string | null;
    session_id?: string | null;
    created_at?: string | null;
  }>;
  recentSharedPets?: Array<{
    pet_key?: string | null;
    room_key?: string | null;
    revision?: number | null;
    source_request_id?: string | null;
    last_actor_id?: string | null;
    updated_at?: string | null;
  }>;
};

export type MochiPetsAlphaAdmin = {
  testers: MochiPetsAlphaTester[];
  audit?: MochiPetsAlphaAudit;
};

export async function getMochiPetsAlphaSession(options: { acknowledgeTerms?: boolean } = {}) {
  return invokeEdgeFunction<MochiPetsAlphaSession>("mochi-pets-alpha-session", options);
}

export async function getMochiPetsUnityAuth() {
  return invokeEdgeFunction<MochiPetsUnityAuth>("mochi-pets-unity-auth", {});
}

export async function submitMochiPetsFeedback(body: { category: string; message: string; session_id?: string }) {
  return invokeEdgeFunction<{ id: string; created_at: string }>("submit-mochi-pets-feedback", body);
}

export async function manageMochiPetsAlphaAdmin(body: { action?: "list" | "grant" | "revoke"; user_id?: string; notes?: string } = {}) {
  return invokeEdgeFunction<MochiPetsAlphaAdmin>("mochi-pets-alpha-admin", {
    action: body.action || "list",
    user_id: body.user_id,
    notes: body.notes,
  });
}
