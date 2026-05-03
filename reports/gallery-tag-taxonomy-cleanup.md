# Gallery Tag Taxonomy Cleanup

Gallery `tags` are present in `data/gallery.json`, but the current gallery renderer does not display or filter by them. Category browsing uses the `category` field. This cleanup keeps every category, caption, alt text, thumbnail path, and full-image path unchanged while making tags useful for future search or filtering.

| Image | Category | Old tags | Proposed tags | Reason |
| --- | --- | --- | --- | --- |
| shot-01 | portraits | community, gathering | portrait, solo, nature | Solo figure in glowing flowers. |
| shot-02 | portraits | progression, pve | portrait, solo, cave | Single smoky cave portrait. |
| shot-03 | portraits | scenery, exploration | portrait, solo, spark | White-robed pose with sparks. |
| shot-04 | gatherings | pvp, training | gathering, group, cave | Cave group before a horned figure. |
| shot-05 | action | training, atmosphere | action, cave, clash | Dark cave scene with a tense downed figure. |
| shot-06 | gatherings | scenery, travel | gathering, group, cave | Group pose in a cave beneath flame. |
| shot-07 | gatherings | coordination, strategy | gathering, courtyard, table | Courtyard tea circle. |
| shot-08 | gatherings | slice-of-life, social | gathering, courtyard, table | Low courtyard table scene. |
| shot-09 | gatherings | travel, group | gathering, courtyard, table | Courtyard seats and brazier. |
| shot-10 | gatherings | scenery, night | gathering, courtyard, table | Low table gathering. |
| shot-11 | portraits | community, rest | portrait, solo, sky | Lone figure under a red sky. |
| shot-12 | action | exploration, nature | action, umbrella, mist | Umbrella raised in a misty clash. |
| shot-13 | portraits | atmosphere, pause | portrait, solo, sky | Lone figure under blue stars. |
| shot-14 | portraits | training, discipline | portrait, solo, blade | Weapon-forward portrait. |
| shot-15 | gatherings | festival, culture | gathering, group, costume | Three hooded figures. |
| shot-16 | portraits | travel, morning | portrait, solo, nature | Fur-cloaked figure under branches. |
| shot-17 | portraits | community, rest | portrait, solo, moon, river | Moonlit solo silhouette by water. |
| shot-18 | portraits | weather, atmosphere | portrait, solo, sky | Red-robed figure under stars. |
| shot-19 | action | camp, quiet | action, pair, training | Two figures balanced above a training yard. |
| shot-20 | action | closure, journey | action, pair, blade | Two weapon-bearers at a gate. |
| shot-21 | scenery | deep, thought | scenery, nature, sunset | Sunset ridge over purple flowers. |
| shot-22 | gatherings | travel, morning | gathering, courtyard, group | Dancers before a courtyard gate. |
| shot-23 | gatherings | scenery, quiet | gathering, group, lantern | Party lined by a lit doorway. |
| shot-24 | portraits | travel, pause | portrait, solo, nature | Masked figure among flowers. |
| shot-25 | gatherings | training, reflection | gathering, group, instruments | Group with fans and instruments. |
| shot-26 | portraits | scenery, journey | portrait, solo, drums | Seated figure between drums. |
| shot-27 | scenery | night, duty | scenery, bamboo, pair | Pair standing near bamboo. |
| shot-28 | portraits | atmosphere, night | portrait, solo, companion | Seated portrait with a small companion. |
| shot-29 | companions | strategy, coordination | companion, pair, stone | Pair framed by rock. |
| shot-30 | scenery | scenery, overlook | scenery, river, lantern | Lantern reflections on dark water. |
| shot-31 | gatherings | community, rest | gathering, river, lantern | Parasol and figures beside water. |
| shot-32 | portraits | slice-of-life, quiet | portrait, solo, stone | Close portrait beside stone. |
| shot-33 | companions | nature, pause | companion, pair, sunset | Pair seated against sunset. |
| shot-34 | companions | training, discipline | companion, pair, sunset | Pair backlit by sunset. |
| shot-35 | portraits | atmosphere, evening | portrait, solo, sunset | Rockside sunset portrait. |
| shot-36 | companions | travel, terrain | companion, pair, mountain | Pair above a valley. |
| shot-37 | scenery | social, moment | scenery, mountain, pagoda | Distant mountaintop pagoda view. |
| shot-38 | portraits | weather, atmosphere | portrait, solo, sky | Low-angle portrait under open sky. |
| shot-39 | portraits | camp, morning | portrait, solo, blade | Pale-sky portrait with a blade. |

The old tag set included vague or mismatched values such as `deep`, `thought`, `closure`, `journey`, `weather`, `camp`, and `progression`. The new tag set uses short lowercase terms tied to visible subjects and the current category taxonomy.
