import { getCurrentUser, onAuthStateChange, openPrivateSpinnerSession } from "@/lib/supabase/auth";
import { checkLeaderGalleryModerationAccess } from "@/lib/supabase/moderation";
import { getCurrentProfile, profileIsActive, verifyMemberAccess } from "@/lib/supabase/profile";
import type { HeaderAuthState } from "./header-navigation";

const signedOutState: HeaderAuthState = {
  signedIn: false,
  activeMember: false,
  moderator: false,
  spinnerViewer: false,
};

export async function readHeaderAuthState(): Promise<HeaderAuthState> {
  const userResult = await getCurrentUser();
  if (!userResult.ok || !userResult.data?.user) return signedOutState;

  const [profileResult, memberAccessResult] = await Promise.all([
    getCurrentProfile(),
    verifyMemberAccess(),
  ]);
  const memberAccess = memberAccessResult.ok ? memberAccessResult.data : null;
  return {
    signedIn: true,
    activeMember: profileResult.ok && profileIsActive(profileResult.data),
    moderator: false,
    spinnerViewer: Boolean(
      memberAccessResult.ok &&
      memberAccess?.galleryEligible === true &&
      memberAccess.memberStatus === "active"
    ),
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

export async function openHeaderSpinnerViewer() {
  const result = await openPrivateSpinnerSession("viewer");
  return result.ok === true && result.mode === "viewer";
}
