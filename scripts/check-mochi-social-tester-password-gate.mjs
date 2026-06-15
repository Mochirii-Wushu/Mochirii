import { existsSync, readFileSync } from "node:fs";

const checks = [
  {
    file: "apps/web/lib/mochi-social/tester-password.ts",
    includes: [
      "import \"server-only\"",
      "MOCHI_SOCIAL_TESTER_PASSWORD",
      "scryptSync",
      "timingSafeEqual",
      "MOCHI_SOCIAL_TESTER_COOKIE",
      "cookies()",
    ],
  },
  {
    file: "apps/web/app/games/mochi-social/tester-login/route.ts",
    includes: [
      "verifyMochiSocialTesterPassword(password)",
      "httpOnly: true",
      "secure: request.nextUrl.protocol === \"https:\"",
      "sameSite: \"lax\"",
      "path: \"/games/mochi-social\"",
      "maxAge: MOCHI_SOCIAL_TESTER_COOKIE_MAX_AGE",
    ],
  },
  {
    file: "apps/web/app/games/mochi-social/tester-logout/route.ts",
    includes: [
      "MOCHI_SOCIAL_TESTER_COOKIE",
      "httpOnly: true",
      "secure: request.nextUrl.protocol === \"https:\"",
      "path: \"/games/mochi-social\"",
      "maxAge: 0",
    ],
  },
  {
    file: "apps/web/app/games/mochi-social/page.tsx",
    includes: [
      "dynamic = \"force-dynamic\"",
      "MOCHI_SOCIAL_ALPHA_ACCESS_MODE",
      "hasMochiSocialTesterSession",
      "MochiSocialTesterPasswordGate",
      "MochiSocialTesterGameClient",
      "MochiSocialAlphaClient",
    ],
  },
  {
    file: "apps/web/components/mochi-social/MochiSocialTesterPasswordGate.tsx",
    includes: [
      "Tester password required",
      "action=\"/games/mochi-social/tester-login\"",
      "type=\"password\"",
      "name=\"testerPassword\"",
    ],
  },
  {
    file: "apps/web/components/mochi-social/MochiSocialTesterGameClient.tsx",
    includes: [
      "NEXT_PUBLIC_MOCHI_SOCIAL_URL",
      "MOCHI_SOCIAL_SIGN_OUT",
      "resolveMochiSocialBridgeMessage(event.data)",
      "configured-preview-stub",
      "mochiSocial.testerFeedbackDraft",
      "providerSubmitted: false",
      "handoffNote",
      "data-mochi-alpha-route-sheet",
      "data-mochi-alpha-route-step",
      "Jade Lantern Court loop",
      "data-mochi-tester-feedback",
      "data-mochi-tester-feedback-handoff",
      "title=\"Mochi Social\"",
    ],
  },
  {
    file: "apps/web/.env.example",
    includes: [
      "MOCHI_SOCIAL_ALPHA_ACCESS_MODE=tester-password",
      "MOCHI_SOCIAL_TESTER_PASSWORD=",
    ],
  },
  {
    file: "docs/mochi-social-alpha.md",
    includes: [
      "tester-password",
      "MOCHI_SOCIAL_TESTER_PASSWORD",
      "password-unlocked preview",
    ],
  },
];

const forbidden = [
  {
    label: "browser-exposed tester password env",
    pattern: /NEXT_PUBLIC_MOCHI_SOCIAL_(?:TESTER_)?PASSWORD/i,
  },
  {
    label: "committed tester password assignment",
    pattern: /\bMOCHI_SOCIAL_TESTER_PASSWORD[ \t]*=[ \t]*["']?(?![ \t]*(?:$|<|your-|YOUR_|REPLACE_|example\b))[^\s"']{8,}/im,
  },
  {
    label: "weak tester password SHA env",
    pattern: /\bMOCHI_SOCIAL_TESTER_PASSWORD_SHA256\b/i,
  },
];

for (const check of checks) {
  if (!existsSync(check.file)) throw new Error(`${check.file}: missing required file.`);
  const text = readFileSync(check.file, "utf8");

  for (const snippet of check.includes) {
    if (!text.includes(snippet)) throw new Error(`${check.file}: missing ${snippet}`);
  }

  for (const { label, pattern } of forbidden) {
    if (pattern.test(text)) throw new Error(`${check.file}: appears to contain ${label}.`);
  }
}

console.log("Mochi Social tester password gate check passed.");
