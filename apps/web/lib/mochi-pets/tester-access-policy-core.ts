import type { MochiPetsMemberVerificationResult } from "./member-verification-core";

type MemberBindingFactory = (memberId: string) => string;
type TesterSessionVerifier = (token: string, memberBinding: string) => boolean;

export function evaluateMochiPetsTesterAccess({
  verification,
  testerToken,
  createMemberBinding,
  verifyTesterSession,
}: {
  verification: MochiPetsMemberVerificationResult;
  testerToken: string;
  createMemberBinding: MemberBindingFactory;
  verifyTesterSession: TesterSessionVerifier;
}) {
  if (!verification.ok) {
    return {
      ok: false as const,
      status: verification.status,
      clearTesterCookie: true,
    };
  }

  const memberBinding = createMemberBinding(verification.memberId);
  if (!memberBinding) {
    return { ok: false as const, status: 503 as const, clearTesterCookie: true };
  }

  const testerAccess = verifyTesterSession(testerToken, memberBinding);
  return {
    ok: true as const,
    testerAccess,
    clearTesterCookie: Boolean(testerToken && !testerAccess),
  };
}

export async function authorizeMochiPetsTesterEntry({
  verification,
  password,
  createMemberBinding,
  verifyPassword,
  createTesterSession,
}: {
  verification: MochiPetsMemberVerificationResult;
  password: string;
  createMemberBinding: MemberBindingFactory;
  verifyPassword: (password: string) => Promise<boolean>;
  createTesterSession: (memberBinding: string) => string;
}) {
  if (!verification.ok) {
    return {
      ok: false as const,
      status: verification.status,
      error: "member_required" as const,
    };
  }

  const memberBinding = createMemberBinding(verification.memberId);
  if (!memberBinding) {
    return { ok: false as const, status: 503 as const, error: "unavailable" as const };
  }
  if (!(await verifyPassword(password))) {
    return { ok: false as const, status: 403 as const, error: "invalid" as const };
  }

  const testerSession = createTesterSession(memberBinding);
  if (!testerSession) {
    return { ok: false as const, status: 503 as const, error: "unavailable" as const };
  }
  return { ok: true as const, testerSession };
}
