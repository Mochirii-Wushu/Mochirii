"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUser, onAuthStateChange } from "@/lib/supabase/auth";
import { checkLeaderGalleryModerationAccess } from "@/lib/supabase/moderation";
import { getCurrentProfile, profileIsActive } from "@/lib/supabase/profile";
import type { HeaderAuthState } from "./header-navigation";

const signedOutState: HeaderAuthState = {
  signedIn: false,
  activeMember: false,
  moderator: false,
};

export function useHeaderAuthState() {
  const [authState, setAuthState] = useState<HeaderAuthState>(signedOutState);
  const [moderatorState, setModeratorState] = useState<"unknown" | "checking" | "allowed" | "denied">("unknown");

  useEffect(() => {
    let cancelled = false;

    const refreshAuthState = async () => {
      const userResult = await getCurrentUser();
      if (!userResult.ok || !userResult.data?.user) {
        if (!cancelled) {
          setAuthState(signedOutState);
          setModeratorState("unknown");
        }
        return;
      }

      const profileResult = await getCurrentProfile();
      if (!cancelled) {
        setAuthState({
          signedIn: true,
          activeMember: profileResult.ok && profileIsActive(profileResult.data),
          moderator: false,
        });
        setModeratorState("unknown");
      }
    };

    void Promise.resolve().then(() => refreshAuthState());
    const subscription = onAuthStateChange(() => {
      void refreshAuthState();
    });

    return () => {
      cancelled = true;
      subscription.data?.subscription?.unsubscribe();
    };
  }, []);

  const ensureModeratorAccess = useCallback(async () => {
    if (!authState.signedIn || moderatorState !== "unknown") return;
    setModeratorState("checking");
    const result = await checkLeaderGalleryModerationAccess();
    setAuthState((current) => (
      current.signedIn
        ? { ...current, moderator: result.ok === true }
        : current
    ));
    setModeratorState(result.ok === true ? "allowed" : "denied");
  }, [authState.signedIn, moderatorState]);

  return { authState, ensureModeratorAccess };
}
