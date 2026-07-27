import assert from "node:assert/strict";
import test from "node:test";

import {
  latestOfficialRaffleWinnerApiIsEmpty,
  latestOfficialRaffleWinnerRowsAreEmpty,
  parseLatestOfficialRaffleWinnerApi,
  parseLatestOfficialRaffleWinnerRows,
  resolveLatestOfficialRaffleWinnerRead,
} from "./latest-winner-core.ts";

const publicRow = {
  public_label: "Winner Confirmed",
  cycle_month: "2026-08-01",
  selected_at: "2026-07-31T18:00:00.000Z",
  display_name: null,
};

test("anonymous results expose only the generic label and authoritative selection time", () => {
  assert.deepEqual(parseLatestOfficialRaffleWinnerRows([publicRow]), {
    publicLabel: "Winner Confirmed",
    cycleMonth: "2026-08-01",
    selectedAt: "2026-07-31T18:00:00.000Z",
    displayName: null,
  });
});

test("a verified-member result may contain one normalized guild display name", () => {
  const parsed = parseLatestOfficialRaffleWinnerRows([{ ...publicRow, display_name: "Jade Lantern" }]);
  assert.equal(parsed?.displayName, "Jade Lantern");
  assert.equal(
    parseLatestOfficialRaffleWinnerRows([{ ...publicRow, display_name: "月" }])?.displayName,
    "月",
  );
});

test("identifiers, hashes, malformed names, and mismatched Singapore cycles fail closed", () => {
  assert.equal(parseLatestOfficialRaffleWinnerRows([{ ...publicRow, source_draw_id: "private" }]), null);
  assert.equal(parseLatestOfficialRaffleWinnerRows([{ ...publicRow, receipt_hash: "private" }]), null);
  assert.equal(parseLatestOfficialRaffleWinnerRows([{ ...publicRow, display_name: " bad " }]), null);
  assert.equal(parseLatestOfficialRaffleWinnerRows([{ ...publicRow, display_name: "bad\u202ename" }]), null);
  assert.equal(parseLatestOfficialRaffleWinnerRows([{ ...publicRow, display_name: "bad\u0007name" }]), null);
  assert.equal(parseLatestOfficialRaffleWinnerRows([{ ...publicRow, display_name: "👩🏽‍💻".repeat(14) }]), null);
  assert.equal(parseLatestOfficialRaffleWinnerRows([{ ...publicRow, cycle_month: "2026-07-01" }]), null);
  assert.equal(parseLatestOfficialRaffleWinnerRows([publicRow, publicRow]), null);
});

test("the same exact contract validates the same-origin API envelope", () => {
  const apiWinner = {
    publicLabel: "Winner Confirmed",
    cycleMonth: "2026-08-01",
    selectedAt: "2026-07-31T18:00:00.000Z",
    displayName: "Moon Pearl",
  };
  assert.deepEqual(parseLatestOfficialRaffleWinnerApi({ ok: true, data: apiWinner }), apiWinner);
  assert.equal(parseLatestOfficialRaffleWinnerApi({ ok: true, data: { ...apiWinner, id: "private" } }), null);
  assert.equal(latestOfficialRaffleWinnerApiIsEmpty({ ok: true, data: null }), true);
  assert.equal(latestOfficialRaffleWinnerApiIsEmpty({ ok: false, data: null }), false);
});

test("stale member authorization falls back to the anonymous winner without leaking its name", () => {
  const fallbackWinner = parseLatestOfficialRaffleWinnerRows([{ ...publicRow, display_name: "Moon Pearl" }]);
  assert.ok(fallbackWinner);
  assert.deepEqual(
    resolveLatestOfficialRaffleWinnerRead(
      { ok: false, data: null },
      { ok: true, data: fallbackWinner },
    ),
    {
      ok: true,
      data: { ...fallbackWinner, displayName: null },
    },
  );

  assert.deepEqual(
    resolveLatestOfficialRaffleWinnerRead(
      { ok: true, data: null },
      { ok: true, data: fallbackWinner },
    ),
    { ok: true, data: null },
    "a genuine successful empty or revoked result must still clear the card",
  );
  assert.equal(latestOfficialRaffleWinnerRowsAreEmpty([]), true);
  assert.equal(latestOfficialRaffleWinnerRowsAreEmpty([publicRow]), false);
});
