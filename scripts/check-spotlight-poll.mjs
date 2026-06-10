import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(file) {
  const fullPath = path.join(root, file);
  if (!existsSync(fullPath)) {
    failures.push(`${file}: missing required spotlight poll file.`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function assertIncludes(label, text, snippet) {
  if (!text.includes(snippet)) failures.push(`${label}: expected snippet not found: ${snippet}`);
}

function assertMatches(label, text, pattern, message) {
  if (!pattern.test(text)) failures.push(`${label}: ${message}`);
}

function assertNotMatches(label, text, pattern, message) {
  if (pattern.test(text)) failures.push(`${label}: ${message}`);
}

function assertSpotlightLabelsDoNotUseFallbackTitle() {
  const labelBlocks = [...homePage.matchAll(/aria-label=\{joinLabel\(\[([\s\S]*?)\]\)\}/g)].map((match) => match[1]);
  const spotlightBlocks = labelBlocks.filter(
    (block) => block.includes('"Member spotlight"') || block.includes('"Open member spotlight"'),
  );

  if (spotlightBlocks.length < 2) {
    failures.push("home page: expected stable spotlight group and link aria-label blocks.");
  }

  spotlightBlocks.forEach((block) => {
    if (block.includes("spotlight.title")) {
      failures.push("home page: spotlight aria labels must not announce the static fallback winner title.");
    }
  });
}

const packageJson = read("package.json");
const checkAll = read("scripts/check-all.mjs");
const config = read("supabase/config.toml");
const migration = read("supabase/migrations/20260610120000_add_member_spotlight_polls.sql");
const shared = read("supabase/functions/_shared/spotlight-polls.ts");
const sender = read("supabase/functions/send-member-spotlight-poll/index.ts");
const publisher = read("supabase/functions/publish-member-spotlight-winner/index.ts");
const publicWinner = read("supabase/functions/get-current-spotlight-winner/index.ts");
const envExample = read("supabase/functions/.env.example");
const homePage = read("apps/web/app/page.tsx");
const sidePages = read("apps/web/components/public-pages/pages.tsx");
const winnerComponent = read("apps/web/components/public-pages/SpotlightWinnerTitle.tsx");
const supabaseReadme = read("supabase/README.md");

assertIncludes("package.json", packageJson, '"check:spotlight-poll"');
assertIncludes("check-all", checkAll, "check:spotlight-poll");

[
  "[functions.send-member-spotlight-poll]",
  "[functions.publish-member-spotlight-winner]",
  "[functions.get-current-spotlight-winner]",
  "verify_jwt = false",
].forEach((snippet) => assertIncludes("supabase config", config, snippet));

[
  "create table if not exists public.spotlight_poll_cycles",
  "create table if not exists public.spotlight_poll_candidates",
  "create table if not exists public.spotlight_poll_results",
  "alter table public.spotlight_poll_cycles enable row level security",
  "alter table public.spotlight_poll_candidates enable row level security",
  "alter table public.spotlight_poll_results enable row level security",
  "revoke all on table public.spotlight_poll_cycles from authenticated",
  "revoke all on table public.spotlight_poll_candidates from authenticated",
  "revoke all on table public.spotlight_poll_results from authenticated",
  "grant all on table public.spotlight_poll_cycles to service_role",
].forEach((snippet) => assertIncludes("spotlight poll migration", migration, snippet));

[
  "SPOTLIGHT_POLL_MAX_ANSWERS = 10",
  "SPOTLIGHT_POLL_MAX_ANSWER_LENGTH = 55",
  "SPOTLIGHT_POLL_DURATION_HOURS = 168",
  "DISCORD_SPOTLIGHT_POLL_CHANNEL_ID",
  "SPOTLIGHT_POLL_CRON_SECRET",
  "SPOTLIGHT_POLL_EXCLUDED_MEMBER_PROFILE_IDS",
  "SPOTLIGHT_POLL_EXCLUDED_DISCORD_USER_IDS",
  "spotlightPollProfileIsExcluded",
  "0c87159c-e0b4-468d-99a8-7af5116e49aa",
  "341166431041224705",
  "buildCandidateSnapshots",
  "secureShuffle",
  "allow_multiselect: false",
  "allowed_mentions: { parse: [] }",
].forEach((snippet) => assertIncludes("spotlight shared helper", shared, snippet));

[
  "spotlightPollConfig",
  "buildDiscordPollPayload",
  "duplicate: true",
  "pollAnswerIds",
].forEach((snippet) => assertIncludes("send-member-spotlight-poll", sender, snippet));

[
  "pollResults",
  "results.finalized",
  "fetchPollAnswerVoterCount",
  "winner_display_name",
  "candidateOrder",
  "noVotes: true",
].forEach((snippet) => assertIncludes("publish-member-spotlight-winner", publisher, snippet));

[
  "winner_display_name",
  "source: winnerName ? \"monthly-discord-poll\" : \"fallback\"",
].forEach((snippet) => assertIncludes("get-current-spotlight-winner", publicWinner, snippet));

assertNotMatches(
  "get-current-spotlight-winner",
  publicWinner,
  /discord_(user_id|username|handle)|vote_count|answer_label|candidate/i,
  "public winner endpoint must not expose Discord identity, candidate, or vote-count fields.",
);

[
  "DISCORD_SPOTLIGHT_POLL_CHANNEL_ID=",
  "SPOTLIGHT_POLL_CRON_SECRET=",
].forEach((snippet) => assertIncludes("env example", envExample, snippet));

assertIncludes("home page", homePage, "SpotlightWinnerTitle");
assertIncludes("spotlight page", sidePages, "SpotlightWinnerTitle");
assertSpotlightLabelsDoNotUseFallbackTitle();
assertNotMatches(
  "home page",
  homePage,
  /SpotlightProfileCard/,
  "Home member spotlight should not expose a profile card for the poll winner.",
);
assertNotMatches(
  "spotlight page",
  sidePages,
  /SpotlightProfileCard/,
  "Spotlight page should not expose a profile card for the poll winner.",
);

[
  "getCurrentSpotlightWinner",
  "replaceHomeTitleName",
  "replaceSpotlightTitleName",
  "Congratulations to: ${winnerName}.",
  "This Month: ${winnerName}",
].forEach((snippet) => assertIncludes("winner component", winnerComponent, snippet));

[
  "Monthly member spotlight polls",
  "Discord native poll",
  "DISCORD_SPOTLIGHT_POLL_CHANNEL_ID",
  "SPOTLIGHT_POLL_CRON_SECRET",
  "get-current-spotlight-winner",
].forEach((snippet) => assertIncludes("supabase README", supabaseReadme, snippet));

assertMatches(
  "spotlight shared helper",
  shared,
  /buildDiscordPollPayload[\s\S]*poll:[\s\S]*answers:[\s\S]*duration:[\s\S]*allow_multiselect: false/,
  "native poll payload must be single-choice with explicit duration.",
);

if (failures.length) {
  console.error("Spotlight poll validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Spotlight poll validation OK.");
