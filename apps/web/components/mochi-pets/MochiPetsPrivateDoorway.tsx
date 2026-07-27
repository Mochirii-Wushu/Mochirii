"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { getCurrentSession, onAuthStateChange } from "@/lib/supabase/auth";
import {
  type MemberGateState,
  MochiPetsTesterPasswordGate,
  type TesterGateError,
} from "./MochiPetsTesterPasswordGate";
import { MochiPetsTesterWaitingRoom } from "./MochiPetsTesterWaitingRoom";

type PrivateState = {
  memberAccess?: boolean;
  testerAccess?: boolean;
};

type Operation = {
  controller: AbortController | null;
  generation: number;
};

async function currentBearer() {
  const result = await getCurrentSession();
  return result.ok ? result.data?.session?.access_token || "" : "";
}

async function verifyMember(token: string, signal: AbortSignal) {
  const response = await fetch("/games/mochi-pets/member-access", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
    signal,
  });
  return {
    status: response.status,
    state: await response.json().catch(() => null) as PrivateState | null,
  };
}

async function clearTesterCookie(signal: AbortSignal) {
  await fetch("/games/mochi-pets/member-access", {
    method: "DELETE",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });
}

export function MochiPetsPrivateDoorway() {
  const [memberState, setMemberState] = useState<MemberGateState>("checking");
  const [testerAccess, setTesterAccess] = useState(false);
  const [error, setError] = useState<TesterGateError>(null);
  const [busy, setBusy] = useState(false);
  const operation = useRef<Operation>({ controller: null, generation: 0 });

  const beginOperation = useCallback(() => {
    operation.current.controller?.abort();
    const controller = new AbortController();
    const generation = operation.current.generation + 1;
    operation.current = { controller, generation };
    return { controller, generation };
  }, []);

  const isCurrentOperation = useCallback((generation: number) => (
    operation.current.generation === generation && !operation.current.controller?.signal.aborted
  ), []);

  const syncPrivateAccess = useCallback(async () => {
    const { controller, generation } = beginOperation();
    setMemberState("checking");
    setTesterAccess(false);
    setError(null);
    setBusy(false);
    try {
      const token = await currentBearer();
      if (!isCurrentOperation(generation)) return;
      if (!token) {
        await clearTesterCookie(controller.signal);
        if (isCurrentOperation(generation)) setMemberState("signed-out");
        return;
      }

      const memberResult = await verifyMember(token, controller.signal);
      if (!isCurrentOperation(generation)) return;
      if (memberResult.status !== 200) {
        setMemberState(memberResult.status === 401 ? "signed-out" : memberResult.status === 403 ? "not-verified" : "unavailable");
        return;
      }

      const memberAccess = memberResult.state?.memberAccess === true;
      setTesterAccess(memberAccess && memberResult.state?.testerAccess === true);
      setMemberState(memberAccess ? "ready" : "unavailable");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      if (isCurrentOperation(generation)) setMemberState("unavailable");
    }
  }, [beginOperation, isCurrentOperation]);

  const clearPrivateAccess = useCallback(async () => {
    const { controller, generation } = beginOperation();
    try {
      await clearTesterCookie(controller.signal);
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) {
        // The local state still fails closed when the cookie-clear request is unavailable.
      }
    } finally {
      if (isCurrentOperation(generation)) {
        setTesterAccess(false);
        setMemberState("signed-out");
        setError(null);
        setBusy(false);
      }
    }
  }, [beginOperation, isCurrentOperation]);

  useEffect(() => {
    const initialCheck = window.setTimeout(() => void syncPrivateAccess(), 0);
    const subscription = onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        void clearPrivateAccess();
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        void syncPrivateAccess();
      }
    });
    return () => {
      window.clearTimeout(initialCheck);
      operation.current.controller?.abort();
      subscription.data?.subscription?.unsubscribe();
    };
  }, [clearPrivateAccess, syncPrivateAccess]);

  const submitTesterPasscode = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const testerPassword = String(form.get("testerPassword") || "");
    const { controller, generation } = beginOperation();
    setBusy(true);
    setError(null);
    try {
      const token = await currentBearer();
      if (!isCurrentOperation(generation)) return;
      if (!token) {
        await clearTesterCookie(controller.signal);
        if (isCurrentOperation(generation)) setMemberState("signed-out");
        return;
      }
      const response = await fetch("/games/mochi-pets/tester-login", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams({ testerPassword }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (!isCurrentOperation(generation)) return;
      if (response.ok && payload.ok === true) {
        formElement.reset();
        setTesterAccess(true);
        setMemberState("ready");
        return;
      }
      setTesterAccess(false);
      if (payload.error === "member_required") {
        if (response.status === 401) {
          setMemberState("signed-out");
          setError("member_required");
        } else if (response.status === 403) {
          setMemberState("not-verified");
          setError("member_required");
        } else {
          setMemberState("unavailable");
          setError("unavailable");
        }
      } else {
        setError(payload.error === "invalid" ? "invalid" : payload.error === "rate_limited" ? "rate_limited" : "unavailable");
      }
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      if (isCurrentOperation(generation)) {
        setTesterAccess(false);
        setError("unavailable");
      }
    } finally {
      if (isCurrentOperation(generation)) setBusy(false);
    }
  }, [beginOperation, busy, isCurrentOperation]);

  if (testerAccess) {
    return <MochiPetsTesterWaitingRoom />;
  }

  return (
    <MochiPetsTesterPasswordGate
      busy={busy}
      error={error}
      memberState={memberState}
      onRetry={syncPrivateAccess}
      onSubmit={submitTesterPasscode}
    />
  );
}
