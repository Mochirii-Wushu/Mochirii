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

export async function getMochiSocialAlphaSession(options: { acknowledgeTerms?: boolean } = {}) {
  return invokeEdgeFunction<MochiSocialAlphaSession>("mochi-social-alpha-session", options);
}

export async function submitMochiSocialFeedback(body: { category: string; message: string; session_id?: string }) {
  return invokeEdgeFunction<{ id: string; created_at: string }>("submit-mochi-social-feedback", body);
}
