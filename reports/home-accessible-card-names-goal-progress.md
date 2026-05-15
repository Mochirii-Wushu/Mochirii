# Home Accessible Card Names Goal Progress

Started: 2026-05-15
Source reports:

- `reports/accessibility-name-and-member-pages-review.md`
- `reports/home-gallery-spotlight-rotation-review.md`
- `reports/gallery-approved-feed-regression-matrix.md`

Baseline main at start: `579d2ac36229b5642271999c11514d86645f53d0`

This tracker records the Home accessible card names milestone as scoped branches plus one release baseline tag. Protected content, data files, Supabase schema/config, Edge Functions, workflows, assets, Gallery data, and Home copy remain out of scope.

## Progress

| ID | Branch or tag | Status | PR | Merge commit or tag object | Next |
| --- | --- | --- | --- | --- | --- |
| A01 | `fix/home-dynamic-card-accessible-names` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/147> | `6cb91a7d38399826f33895a0159a8f0345b8f82c` | A02 |
| A02 | `qa/home-dynamic-card-accessible-names-review` | Complete | <https://github.com/Mochirii-Wushu/Mochirii/pull/148> | `fcf5e679176e6cea831c848a73c02db2a1c674a1` | A03 |
| A03 | `v2.7.0-home-accessible-card-names-baseline` | Complete | n/a | `2c22cfb9572c49f02969d05538f60e34fddd2806` | Final validation |

## A01 Notes

- Branch: `fix/home-dynamic-card-accessible-names`
- Report: `reports/home-dynamic-card-accessible-names.md`
- PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/147>
- Merge commit: `6cb91a7d38399826f33895a0159a8f0345b8f82c`
- Validation summary: branch validation, CI validation, and post-merge validation passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none.
- Next item: A02 `qa/home-dynamic-card-accessible-names-review`.

## A02 Notes

- Branch: `qa/home-dynamic-card-accessible-names-review`
- Report: `reports/home-dynamic-card-accessible-names-review.md`
- PR: <https://github.com/Mochirii-Wushu/Mochirii/pull/148>
- Merge commit: `fcf5e679176e6cea831c848a73c02db2a1c674a1`
- Current state: complete.
- Browser QA summary: Home dynamic links have specific accessible names; Home Gallery Spotlight still renders 4 unique thumbnail category links; fallback screenshots still render 4 captioned buttons; Gallery filter, sort, copy link, Back/Forward, and lightbox checks passed locally.
- Validation summary: local branch validation, CI validation, and post-merge validation passed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none.
- Next item: A03 `v2.7.0-home-accessible-card-names-baseline`.

## A03 Notes

- Tag: `v2.7.0-home-accessible-card-names-baseline`
- Tag object: `2c22cfb9572c49f02969d05538f60e34fddd2806`
- Tagged commit: `fcf5e679176e6cea831c848a73c02db2a1c674a1`
- Current state: complete.
- Validation summary: pre-tag main validation passed before the tag was created and pushed. The known `assets/audio/mochiriiiiii.mp3` large-asset warning remained intentional.
- Blockers or limitations: none.
- Next item: final validation.
