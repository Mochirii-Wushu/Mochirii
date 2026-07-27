import assert from "node:assert/strict";
import test from "node:test";
import guildScheduleData from "../../public/data/guild-schedule.json" with { type: "json" };
import { websiteEventCardsFromSchedule } from "../guild-schedule.ts";
import { eventStatusAt, parseReferenceTime } from "./reference-time.ts";

const referenceTime = parseReferenceTime("2026-07-27T01:30:00.000Z");

test("ISO end boundaries use the same server reference instant", () => {
  assert.equal(eventStatusAt({ endIso: "2026-07-27T01:30:00.000Z" }, referenceTime), "upcoming");
  assert.equal(eventStatusAt({ endIso: "2026-07-27T01:29:59.999Z" }, referenceTime), "past");
});

test("date-only events compare against the UTC reference day", () => {
  assert.equal(eventStatusAt({ date: "2026-07-27" }, referenceTime), "upcoming");
  assert.equal(eventStatusAt({ date: "2026-07-26" }, referenceTime), "past");
});

test("invalid or missing event dates remain upcoming", () => {
  assert.equal(eventStatusAt({ date: "not-a-date" }, referenceTime), "upcoming");
  assert.equal(eventStatusAt({}, referenceTime), "upcoming");
});

test("invalid server reference timestamps fail closed", () => {
  assert.throws(() => parseReferenceTime("not-a-date"), /valid ISO timestamp/);
});

test("the schedule generator uses the supplied reference at an occurrence boundary", () => {
  const beforeEnd = websiteEventCardsFromSchedule(guildScheduleData, new Date("2026-07-27T13:59:59.999Z"));
  const atEnd = websiteEventCardsFromSchedule(guildScheduleData, new Date("2026-07-27T14:00:00.000Z"));

  assert.equal(beforeEnd.find((item) => item.id === "guild-party")?.date, "2026-07-27");
  assert.equal(atEnd.find((item) => item.id === "guild-party")?.date, "2026-07-28");
});
