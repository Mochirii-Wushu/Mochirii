import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const tempDir = mkdtempSync(path.join(tmpdir(), "mochirii-cutover-validator-self-test-"));

const approvalChecker = "scripts/check-dns-cutover-approval-packet.mjs";
const resultChecker = "scripts/check-live-member-workflow-result-packet.mjs";
const preflightChecker = "scripts/check-live-member-workflow-preflight.mjs";
const supabaseSecretSample = ["sb", "secret"].join("_") + "_fakeSecretValueForSelfTest";
const discordWebhookSample = `https://${["discord", "com"].join(".")}/api/${"webhooks"}/111111111111111111/fakeWebhookSecretValue`;

const validApprovalPacket = `# DNS Cutover Approval Packet

## Packet Metadata
Packet prepared by: private operator
Prepared at: 2026-05-24T12:00:00Z
Approval meeting/window: private rehearsal
Cutover operator: private operator
Rollback owner: private owner
Communication channel: private channel
Decision: GO

## Required Same-Window Commands
Same-window rehearsal and validation passed: passed

## Public State Evidence
Current custom domain still pre-cutover: confirmed
Vercel production review URL healthy: healthy
Legacy .html redirects healthy: healthy
GitHub Pages rollback files present: present
Cloudflare nameservers still authoritative: confirmed
ProtonMail records preserved: confirmed
Known accepted warning only: confirmed

## Vercel Dashboard Evidence
Production env names present: present
Preview env names present: present
Exact apex DNS instruction captured privately: captured
Exact www DNS instruction captured privately: captured
Vercel dashboard project and DNS instructions confirmed: confirmed

## Cloudflare Dashboard Evidence
Mail records untouched: confirmed
Verification TXT records untouched: confirmed
Unrelated subdomains reviewed: confirmed
Rollback DNS records captured privately: captured
Cloudflare pre-change and rollback records captured: captured

## Supabase Evidence
Redirect URLs include Vercel production/review URL: confirmed
Redirect URLs include exact custom-domain production paths: confirmed
Discord provider still enabled: confirmed
Edge Function secret names/freshness checked: confirmed
No raw secret values copied: yes
D02 live OAuth/account smoke: passed
D03 live upload/moderation smoke: deferred
If deferred, rollback owner: private owner
Live-member result packet validated: confirmed
Supabase Auth redirect plan confirmed: confirmed
D02 passed: passed
D03 passed or explicitly deferred with rollback owner: confirmed

## Discord Evidence
OAuth callback remains Supabase Auth callback: confirmed
No callback changed to Vercel/custom domain: confirmed
Bot/guild role assumptions still match the live-member QA runbook: confirmed
Discord callback confirmed: confirmed

## GitHub Pages Rollback Evidence
Tracked CNAME still present: present
Root static files still present: present
Rollback owner can restore DNS: confirmed

## Go / No-Go Decision
Rollback owner and communication path confirmed: confirmed
No secrets, tokens, private Storage paths, signed URLs, or private account identifiers exposed: yes
`;

const validResultPacket = `# Live Member Workflow Result Packet

## Packet Metadata
Packet prepared by: private operator
Prepared at: 2026-05-24T12:00:00Z
Test window: private rehearsal
Operator: private operator
Communication channel: private channel
Result: READY

## D02 Evidence
D02 strict preflight passed: passed
Vercel production review URL healthy: healthy
Supabase redirect plan confirmed: confirmed
Discord callback confirmed: confirmed
D02 live OAuth/account smoke: passed
Unverified account checked: confirmed
Verified active member checked: confirmed
Moderator account checked: confirmed
No D02 mutation performed: yes
No credentials exposed: yes

## D03 Evidence
D03 live upload/moderation smoke: deferred
D03 deferral reason: approved owner deferral
D03 deferral explicitly approved: confirmed
If deferred, rollback owner: private owner

## Cleanup Evidence
Cleanup status: deferred by owner
Cleanup owner: private owner
Artifact identifiers kept in private operator note: confirmed

## Final Validation
Post-QA validation passed: passed
No private identifiers exposed: yes

## Public Result Summary
Safe public D02 status: passed
Safe public D03 status: deferred
Cleanup public status: deferred by owner
Ready for approval packet: yes
`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runNode(script, args = []) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

function outputOf(result) {
  return `${result.stdout || ""}${result.stderr || ""}`;
}

function writePacket(name, text) {
  const file = path.join(tempDir, name);
  writeFileSync(file, text, "utf8");
  return file;
}

function assertPass(label, result) {
  if (result.status === 0) return;
  throw new Error(`${label} should pass:\n${outputOf(result)}`);
}

function assertFail(label, result, expectedText) {
  const output = outputOf(result);
  assert(result.status !== 0, `${label} should fail.`);
  assert(output.includes(expectedText), `${label} did not include expected failure label: ${expectedText}`);
  return output;
}

function assertNoLeak(label, output, value) {
  assert(!output.includes(value), `${label} leaked a private value.`);
}

function assertRejectedWithoutLeak({ label, script, packetText, expectedText, value }) {
  const file = writePacket(`${label.replace(/[^a-z0-9]+/gi, "-")}.md`, `${packetText}\nPrivate self-test value: ${value}\n`);
  const result = runNode(script, [`--packet=${file}`]);
  const output = assertFail(label, result, expectedText);
  assertNoLeak(label, output, value);
}

try {
  assertPass("preflight private-value pattern self-test", runNode(preflightChecker, ["--self-test"]));

  const approvalFile = writePacket("valid-approval.md", validApprovalPacket);
  assertPass("valid approval packet", runNode(approvalChecker, [`--packet=${approvalFile}`]));

  const resultFile = writePacket("valid-live-member-result.md", validResultPacket);
  assertPass("valid live-member result packet", runNode(resultChecker, [`--packet=${resultFile}`]));

  const missingApprovalPath = path.join(tempDir, "missing-approval-packet-should-not-print.md");
  const missingApprovalOutput = assertFail(
    "missing approval packet",
    runNode(approvalChecker, [`--packet=${missingApprovalPath}`]),
    "Approval packet path does not exist.",
  );
  assertNoLeak("missing approval packet", missingApprovalOutput, missingApprovalPath);

  const missingResultPath = path.join(tempDir, "missing-result-packet-should-not-print.md");
  const missingResultOutput = assertFail(
    "missing live-member result packet",
    runNode(resultChecker, [`--packet=${missingResultPath}`]),
    "Live-member result packet path does not exist.",
  );
  assertNoLeak("missing live-member result packet", missingResultOutput, missingResultPath);

  const missingHandoffFile = writePacket(
    "approval-missing-live-member-result.md",
    validApprovalPacket.replace("Live-member result packet validated: confirmed\n", ""),
  );
  assertFail(
    "approval packet missing live-member handoff",
    runNode(approvalChecker, [`--packet=${missingHandoffFile}`]),
    "Live-member result packet validated",
  );

  [
    ["approval packet email-like identifier", approvalChecker, validApprovalPacket, "email-like identifier", "operator@example.com"],
    [
      "approval packet UUID-like private identifier",
      approvalChecker,
      validApprovalPacket,
      "UUID-like private identifier",
      "123e4567-e89b-12d3-a456-426614174000",
    ],
    [
      "approval packet private Storage object path",
      approvalChecker,
      validApprovalPacket,
      "private Storage object path",
      "member-gallery/private/proof.webp",
    ],
    [
      "approval packet Discord webhook URL",
      approvalChecker,
      validApprovalPacket,
      "Discord webhook URL",
      discordWebhookSample,
    ],
    [
      "live-member result packet Supabase secret key",
      resultChecker,
      validResultPacket,
      "Supabase secret key",
      supabaseSecretSample,
    ],
    [
      "live-member result packet private Storage object path",
      resultChecker,
      validResultPacket,
      "private Storage object path",
      "member-gallery/private/proof.webp",
    ],
  ].forEach(([label, script, packetText, expectedText, value]) => {
    assertRejectedWithoutLeak({ label, script, packetText, expectedText, value });
  });

  console.log("Cutover validator self-tests OK (values redacted).");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
