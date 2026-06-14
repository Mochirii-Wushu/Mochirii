import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const textFileSkip = /\.(png|jpg|jpeg|webp|gif|ico|mp3|wav|ogg|zip|7z|exe|dll|mdb|keys|wallet)$/i;

const requiredSnippets = [
  {
    file: "package.json",
    includes: ["check:mochi-social-monero-treasury"]
  },
  {
    file: "AGENTS.md",
    includes: ["Monero treasury", "operator-only", "no browser mining", "check:mochi-social-monero-treasury"]
  },
  {
    file: "scripts/check-all.mjs",
    includes: ["check:mochi-social-monero-treasury"]
  },
  {
    file: "scripts/check-mochi-social-alpha.mjs",
    includes: ["check:mochi-social-monero-treasury", "docs/mochi-social-monero-treasury.md"]
  },
  {
    file: "docs/mochi-social-monero-treasury.md",
    includes: [
      "Monero can mine XMR, but it cannot directly fund Enjin Canary cENJ",
      "no browser mining",
      "no GitHub Actions mining",
      "Supabase owns budget and finality authority",
      "min(fuelTankRemaining, tankBudget, perUserBudget, operatorCap, dailyCap) - pendingReservations",
      "Enjin state is `FINALIZED`",
      "Discord remains an auth/community surface",
      "configured-preview-stub",
      "The Monero wallet cannot cap Vercel, Supabase, Fly, GitHub, Discord, or Enjin provider bills",
      "Starting a miner is also cost-bearing"
    ]
  }
];

const forbiddenTrackedFilePatterns = [
  { label: "ops workspace", pattern: /(^|\/)Mochi Social Ops(\/|$)/i },
  { label: "Monero wallet keys", pattern: /(^|\/).*\.keys$/i },
  { label: "Monero wallet file", pattern: /(^|\/).*\.wallet$/i },
  { label: "wallet seed file", pattern: /(^|\/)wallet\.seed$/i },
  { label: "wallet address note", pattern: /(^|\/).*\.address\.txt$/i },
  { label: "Monero blockchain data", pattern: /(^|\/)lmdb\/data\.mdb$/i },
  { label: "Monero archive", pattern: /(^|\/)monero.*\.(zip|tar\.bz2|7z)$/i },
  { label: "XMRig archive", pattern: /(^|\/)xmrig.*\.(zip|tar\.gz|7z)$/i },
  { label: "P2Pool archive", pattern: /(^|\/)p2pool.*\.(zip|tar\.gz|7z)$/i },
  { label: "Monero executable", pattern: /(^|\/)monero(?:d|-wallet-cli|-wallet-rpc)?\.exe$/i },
  { label: "XMRig executable", pattern: /(^|\/)xmrig\.exe$/i },
  { label: "P2Pool executable", pattern: /(^|\/)p2pool\.exe$/i }
];

// Explicit names covered by the executable regexes above: monerod.exe, monero-wallet-cli.exe, monero-wallet-rpc.exe, xmrig.exe, p2pool.exe.

const forbiddenSecretPatterns = [
  { label: "Monero wallet password assignment", pattern: /\bMONERO_WALLET_PASSWORD\s*=\s*["']?(?!\.\.\.|<|your-|YOUR_|REPLACE_|example\b)[^\s"']{8,}/i },
  { label: "Monero seed assignment", pattern: /\b(?:XMR|MONERO)_(?:SEED|MNEMONIC)\s*=\s*["']?(?!\.\.\.|<|your-|YOUR_|REPLACE_|example\b)[^\r\n"']{12,}/i },
  { label: "Monero private spend key assignment", pattern: /\b(?:MONERO_)?PRIVATE_SPEND_KEY\s*=\s*["']?(?!\.\.\.|<|your-|YOUR_|REPLACE_|example\b)[0-9a-f]{32,}/i },
  { label: "Monero private view key assignment", pattern: /\b(?:MONERO_)?PRIVATE_VIEW_KEY\s*=\s*["']?(?!\.\.\.|<|your-|YOUR_|REPLACE_|example\b)[0-9a-f]{32,}/i },
  { label: "Exchange API key assignment", pattern: /\bEXCHANGE_API_KEY\s*=\s*["']?(?!\.\.\.|<|your-|YOUR_|REPLACE_|example\b)[^\s"']{8,}/i },
  { label: "Exchange API secret assignment", pattern: /\bEXCHANGE_API_SECRET\s*=\s*["']?(?!\.\.\.|<|your-|YOUR_|REPLACE_|example\b)[^\s"']{8,}/i }
];

function read(file) {
  const fullPath = path.join(root, file);
  if (!existsSync(fullPath)) {
    failures.push(`${file}: missing required file.`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

for (const check of requiredSnippets) {
  const text = read(check.file);
  for (const snippet of check.includes) {
    if (!text.includes(snippet)) {
      failures.push(`${check.file}: expected snippet not found: ${snippet}`);
    }
  }
}

const trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split(/\r?\n/)
  .map((file) => file.trim())
  .filter(Boolean);

for (const file of trackedFiles) {
  const normalized = file.replace(/\\/g, "/");
  for (const { label, pattern } of forbiddenTrackedFilePatterns) {
    if (pattern.test(normalized)) {
      failures.push(`${file}: tracked ${label} is not allowed.`);
    }
  }

  if (textFileSkip.test(normalized) || !existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const { label, pattern } of forbiddenSecretPatterns) {
    if (pattern.test(text)) {
      failures.push(`${file}: possible ${label} committed.`);
    }
  }
}

if (failures.length) {
  console.error("Mochi Social Monero treasury guardrails failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Mochi Social Monero treasury guardrails OK (${trackedFiles.length} tracked files checked).`);
