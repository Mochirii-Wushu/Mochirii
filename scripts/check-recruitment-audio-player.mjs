import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { readAppCss } from "./lib/app-css.mjs";
import { readPublicPageExport } from "./lib/public-page-source.mjs";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function assertIncludes(label, text, snippet) {
  assert(text.includes(snippet), `${label}: expected snippet not found: ${snippet}`);
}

function assertAudioHasNoVisibleControls(label, text) {
  const audioBlocks = [...text.matchAll(/<audio\b[\s\S]*?<\/audio>/gi)].map((match) => match[0]);
  const recruitmentAudio = audioBlocks.find((block) => block.includes('id="recruitmentAudio"'));
  assert(Boolean(recruitmentAudio), `${label}: recruitment audio element not found.`);
  if (!recruitmentAudio) return;

  assert(!/\scontrols(?:=|\s|>)/i.test(recruitmentAudio), `${label}: recruitment audio must not render native controls.`);
  assert(/controlsList="nodownload"|controlslist="nodownload"/.test(recruitmentAudio), `${label}: recruitment audio must keep nodownload controlsList.`);
}

const recruitmentPage = readPublicPageExport(root, "RecruitmentPage", failures).text;
const player = read("apps/web/components/public-pages/RecruitmentAudioPlayer.tsx");
const appCss = readAppCss();
const recruitmentGuide = read("docs/recruitment-guide.md");
const recruitmentData = JSON.parse(read("apps/web/public/data/recruitment.json"));

assert(existsSync(path.join(root, "apps/web/public/assets/audio/mochiriiiiii.mp3")), "Recruitment MP3 asset is missing.");

assertIncludes("Next Recruitment page", recruitmentPage, "RecruitmentAudioPlayer");
assertIncludes("Next Recruitment page", recruitmentPage, "const audioSources = sources.map");
assert(!recruitmentPage.includes("controls={sources.length > 0}"), "Next Recruitment page must not use native audio controls.");

[
  '"use client";',
  "export function RecruitmentAudioPlayer",
  'className="recruitment-audio-player"',
  'data-custom-recruitment-audio-player="true"',
  "onContextMenu={(event) => event.preventDefault()}",
  'controlsList="nodownload"',
  'aria-label={isPlaying ? "Pause recruitment audio" : "Play recruitment audio"}',
  'aria-label={isMuted ? "Unmute recruitment audio" : "Mute recruitment audio"}',
  'aria-label="Seek recruitment audio"',
  'aria-label="Recruitment audio volume"',
  "data-audio-play",
  "data-audio-seek",
  "data-audio-time",
  "data-audio-mute",
  "data-audio-volume",
].forEach((snippet) => assertIncludes("Next custom audio player", player, snippet));
assertAudioHasNoVisibleControls("Next custom audio player", player);

[
  "recruitment-audio-shell",
  "recruitment-audio-native",
  "recruitment-audio-player",
  "recruitment-audio-button",
  "recruitment-audio-progress",
  "recruitment-audio-time",
  "recruitment-audio-volume-row",
  "recruitment-audio-volume",
  "grid-column:2 / -1",
  "grid-template-columns:36px minmax(0, 1fr) max-content",
  "inline-size:min(100%, 360px)",
  "grid-template-columns:34px minmax(0, 112px)",
  "inline-size:min(156px, 58%)",
  "block-size:4px",
  "overflow:hidden",
  "@media (max-width:520px)",
].forEach((snippet) => {
  assertIncludes("Next Recruitment CSS", appCss, snippet);
});
assert(!appCss.includes("max-content 42px"), "Next Recruitment CSS must not use the overlapping five-column audio layout.");

assertIncludes("Recruitment guide", recruitmentGuide, "custom themed audio player");
assertIncludes("Recruitment guide", recruitmentGuide, "must not render native browser controls");
assertIncludes("Recruitment guide", recruitmentGuide, "public MP3 can still be fetched by determined users");

const audioSources = Array.isArray(recruitmentData?.audio?.sources) ? recruitmentData.audio.sources : [];
assert(audioSources.some((source) => source?.src === "./assets/audio/mochiriiiiii.mp3"), "Recruitment data must keep the approved MP3 source path.");

if (failures.length) {
  console.error("Recruitment audio player validation failed.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Recruitment custom audio player validation OK.");
