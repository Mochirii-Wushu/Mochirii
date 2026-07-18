# No-Change Copy Audit

Prepared: 2026-07-12 PDT

No public text, metadata, structured data, Recruitment copy, or Twills copy was
changed during this audit.

## Findings

1. `apps/web/public/data/home.json` contains the grammar defect: `A warm shoutout for a members whose...`.
2. `Monthly gatherings open to all members to be heard.` appears in
   `apps/web/public/data/home.json` and twice in `apps/web/public/data/guild-schedule.json`.
3. The footer proposition repeats homepage themes including a quiet guild,
   event notes, and lantern warmth. The repetition is coherent but weakens the
   distinction between the homepage introduction and persistent site footer.
4. Across editorial JSON excluding gallery data, recurring terms include
   `presence` (14), `together` (13), `realm` (10), `path` (8), `clear` (9),
   `lantern` (5), `warm` (5), `quiet` (5), `bright` (4), and `journey` (1).
   These are motif counts, not automatic rewrite targets.
5. A mechanical scan found zero uses of the selected generic phrases
   `delve`, `unlock`, `seamless`, `elevate`, `tapestry`, `vibrant`, `dynamic`,
   `leverage`, `empower`, `foster`, `cutting-edge`, `game-changer`, and
   `transformative`.

## Interpretation

- The site does not show a broad generic AI-vocabulary problem.
- The highest-value copy repair is the single grammar defect.
- Event wording should have one editorial owner now that PR #452 guards
  structural parity between the legacy and canonical event sources.
- Wuxia motifs such as lanterns, paths, realms, and gathering are intentional
  brand language. Repetition should be reviewed in context, not removed by a
  word-frequency threshold.
- Recruitment body paragraphs, Recruitment conclusion, the guild seal verse,
  and Twills body text remain protected and were not proposed for editing.

## Recommended Review Order

1. Approve an exact replacement for the grammar defect.
2. Choose the canonical public wording for the repeated monthly-gathering
   sentence, then mirror it without changing dates or behavior.
3. Review home and footer copy side by side and approve only specific lines
   that are genuinely redundant.
4. Leave all other motifs unchanged unless a manual page-by-page review finds
   a clarity or voice problem.

Google recommends people-first content written for the intended audience,
rather than search-engine-first rewrites. See [Google helpful content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).
