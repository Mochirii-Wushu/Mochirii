import { existsSync, readFileSync } from "node:fs";

const checks = [
  {
    file: "apps/web/lib/mochi-pets/tester-password.ts",
    includes: [
      "import \"server-only\"",
      "MOCHI_PETS_TESTER_PASSWORD",
      "scryptSync",
      "timingSafeEqual",
      "MOCHI_PETS_TESTER_COOKIE",
      "cookies()",
    ],
  },
  {
    file: "apps/web/app/games/mochi-pets/tester-login/route.ts",
    includes: [
      "verifyMochiPetsTesterPassword(password)",
      "httpOnly: true",
      "secure: request.nextUrl.protocol === \"https:\"",
      "sameSite: \"lax\"",
      "path: \"/games/mochi-pets\"",
      "maxAge: MOCHI_PETS_TESTER_COOKIE_MAX_AGE",
    ],
  },
  {
    file: "apps/web/app/games/mochi-pets/tester-logout/route.ts",
    includes: [
      "MOCHI_PETS_TESTER_COOKIE",
      "httpOnly: true",
      "secure: request.nextUrl.protocol === \"https:\"",
      "path: \"/games/mochi-pets\"",
      "maxAge: 0",
    ],
  },
  {
    file: "apps/web/app/games/mochi-pets/page.tsx",
    includes: [
      "dynamic = \"force-dynamic\"",
      "MOCHI_PETS_ALPHA_ACCESS_MODE",
      "hasMochiPetsTesterSession",
      "MochiPetsTesterPasswordGate",
      "MochiPetsAlphaClient",
      "alphaShellUnlocked",
      "getMochiPetsGameRuntimeStatus",
      "/healthz",
      "activeRuntime === \"unity-webgl\"",
      "legacyFallback?.active !== true",
      "gamePausedMessage",
    ],
  },
  {
    file: "apps/web/components/mochi-pets/MochiPetsTesterPasswordGate.tsx",
    includes: [
      "Tester password required",
      "action=\"/games/mochi-pets/tester-login\"",
      "type=\"password\"",
      "name=\"testerPassword\"",
    ],
  },
  {
    file: "apps/web/.env.example",
    includes: [
      "MOCHI_PETS_ALPHA_ACCESS_MODE=tester-password",
      "MOCHI_PETS_TESTER_PASSWORD=",
    ],
  },
  {
    file: "docs/mochi-pets-alpha.md",
    includes: [
      "tester-password",
      "password opens the playtest page",
      "Saved play requires Mochirii member sign-in",
    ],
  },
];

const blockedToolReferencePattern = new RegExp(`\\b(?:${
  [
    ['Co', 'dex'].join(''),
    ['A', 'I'].join(''),
    ['L', 'L', 'M'].join(''),
    ['ag', 'ent'].join(''),
    ['Open', 'A', 'I'].join(''),
    ['tool', 'ing'].join('')
  ].join('|')
})\\b`, 'i');

const forbidden = [
  {
    label: "browser-exposed tester password env",
    pattern: /NEXT_PUBLIC_MOCHI_PETS_(?:TESTER_)?PASSWORD/i,
  },
  {
    label: "committed tester password assignment",
    pattern: /\bMOCHI_PETS_TESTER_PASSWORD[ \t]*=[ \t]*["']?(?![ \t]*(?:$|<|your-|YOUR_|REPLACE_|example\b))[^\s"']{8,}/im,
  },
  {
    label: "weak tester password SHA env",
    pattern: /\bMOCHI_PETS_TESTER_PASSWORD_SHA256\b/i,
  },
];

const publicCopyForbidden = [
  /\bconfigured-preview-stub\b/i,
  /\bEnjin\b/i,
  /\bCanary\b/i,
  /\bmarket\b/i,
  /\b(?:buying|selling)\b/i,
  /\btrad(?:e|es|ing)\b/i,
  /\bcashout\b/i,
  /\bfunded-chain\b/i,
  /\bpublic[- ](?:launch|release)\b/i,
  /\bwider release\b/i,
  /\boperator\b/i,
  /\bledger\b/i,
  /\b(?:Distributed Authority|Cloud Save|Edge Function|Unity Custom ID)\b/i,
  blockedToolReferencePattern,
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

  if (check.file.includes("apps/web/components/mochi-pets/") || check.file.includes("apps/web/app/games/mochi-pets/")) {
    for (const pattern of publicCopyForbidden) {
      if (pattern.test(text)) throw new Error(`${check.file}: public tester copy contains internal wording matching ${pattern}.`);
    }
  }
}

console.log("Mochi Pets tester password gate check passed.");
