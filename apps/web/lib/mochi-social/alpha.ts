"use client";

import { invokeEdgeFunction } from "@/lib/supabase/client";

export type MochiSocialAlphaSession = {
  userId: string;
  hasAccess: boolean;
  termsAccepted: boolean;
  termsVersion: string;
  alpha: {
    noRealValue: boolean;
    chainNetwork: "CANARY";
    allowlistRequired: boolean;
    termsRequired: boolean;
    ugc: "curated";
  };
};

export type MochiSocialAlphaTester = {
  user_id?: string | null;
  status?: string | null;
  notes?: string | null;
  invited_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type MochiSocialAlphaAudit = {
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
  recentChain?: Array<{
    request_id?: string | null;
    user_id?: string | null;
    operation_type?: string | null;
    network?: string | null;
    status?: string | null;
    enjin_transaction_uuid?: string | null;
    enjin_listing_id?: string | null;
    created_at?: string | null;
    finalized_at?: string | null;
  }>;
  recentFeedback?: Array<{
    id?: string | null;
    user_id?: string | null;
    category?: string | null;
    message?: string | null;
    session_id?: string | null;
    created_at?: string | null;
  }>;
};

export type MochiSocialAlphaAdmin = {
  testers: MochiSocialAlphaTester[];
  audit?: MochiSocialAlphaAudit;
};

export async function getMochiSocialAlphaSession(options: { acknowledgeTerms?: boolean } = {}) {
  return invokeEdgeFunction<MochiSocialAlphaSession>("mochi-social-alpha-session", options);
}

export async function submitMochiSocialFeedback(body: { category: string; message: string; session_id?: string }) {
  return invokeEdgeFunction<{ id: string; created_at: string }>("submit-mochi-social-feedback", body);
}

export async function manageMochiSocialAlphaAdmin(body: { action?: "list" | "grant" | "revoke"; user_id?: string; notes?: string } = {}) {
  return invokeEdgeFunction<MochiSocialAlphaAdmin>("mochi-social-alpha-admin", {
    action: body.action || "list",
    user_id: body.user_id,
    notes: body.notes,
  });
}
