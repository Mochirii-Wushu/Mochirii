import { getCurrentUser, onAuthStateChange } from "@/lib/supabase/auth";
import { checkLeaderGalleryModerationAccess } from "@/lib/supabase/moderation";
import { getCurrentProfile, profileIsActive } from "@/lib/supabase/profile";
import type { HeaderAuthState } from "./header-navigation";

const signedOutState: HeaderAuthState = {
  signedIn: false,
  activeMember: false,
  moderator: false,
};

export async function readHeaderAuthState(): Promise<HeaderAuthState> {
  const userResult = await getCurrentUser();
  if (!userResult.ok || !userResult.data?.user) return signedOutState;

  const profileResult = await getCurrentProfile();
  return {
    signedIn: true,
    activeMember: profileResult.ok && profileIsActive(profileResult.data),
    moderator: false,
  };
}

export function subscribeToHeaderAuthState(refresh: () => void) {
  const subscription = onAuthStateChange(refresh);
  return () => subscription.data?.subscription?.unsubscribe();
}

export async function readHeaderModeratorAccess() {
  const result = await checkLeaderGalleryModerationAccess();
  return result.ok === true;
}
