# Gallery Categories Plan

The gallery has one album with 39 items. Each item keeps its existing `src`, `thumb`, `full`, `alt`, and `caption` fields. Category browsing uses one data-driven `category` slug per item and a small top-level category label list.

| Proposed category | Slug | Matching images | Reason | Confidence |
| --- | --- | --- | --- | --- |
| All | all | 39 images | Default view for the full album. | High |
| Portraits | portraits | shot-01, shot-02, shot-03, shot-11, shot-13, shot-14, shot-16, shot-17, shot-18, shot-24, shot-26, shot-28, shot-32, shot-35, shot-38, shot-39 | Single-character or portrait-forward images where the figure is the main subject. | High |
| Gatherings | gatherings | shot-04, shot-06, shot-07, shot-08, shot-09, shot-10, shot-15, shot-22, shot-23, shot-25, shot-31 | Group, courtyard, party, performance, or shared-table scenes. | High |
| Action | action | shot-05, shot-12, shot-19, shot-20 | Images with visible clash, weapon, balance, or tense movement cues. | Medium |
| Scenery | scenery | shot-21, shot-27, shot-30, shot-37 | Setting-forward images where landscape, water, bamboo, or distant architecture carries the frame. | High |
| Companions | companions | shot-29, shot-33, shot-34, shot-36 | Pair-focused images with two characters framed together. | High |

Categories were kept broad and image-supported. No assets, paths, captions, thumbnails, or full-image fields should change for this feature.
