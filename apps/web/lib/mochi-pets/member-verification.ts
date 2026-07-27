import "server-only";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { verifyMochiPetsMemberBearer } from "./member-verification-core";

export function verifyCurrentMochiPetsMember(token: string) {
  return verifyMochiPetsMemberBearer({
    token,
    supabaseUrl: SUPABASE_URL,
    publishableKey: SUPABASE_PUBLISHABLE_KEY,
  });
}
