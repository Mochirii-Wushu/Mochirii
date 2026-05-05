# Gallery Bulk Screenshot Additions

## Source Folder

`assets/img/gallery/incoming-gallery/`

Raw source screenshots remain local input only and are not intended to be committed.

## Existing Gallery Conventions

- Naming convention: `shot-##.webp`, zero-padded two-digit sequence.
- Highest current image number before this batch: `shot-39`.
- Full-size path convention: `./assets/img/gallery/shot-##.webp`.
- Thumbnail path convention: `./assets/img/gallery/thumbs/shot-##.webp`.
- Image format: WebP for full-size images and thumbnails.
- Observable full-size convention: optimized WebP, commonly 1920px or 2560px wide depending on source era; this batch uses max 1920px without upscaling.
- Observable thumbnail convention: optimized WebP thumbnails around 900px wide without upscaling.
- Category slugs: `portraits`, `gatherings`, `action`, `scenery`, `companions`.
- Tag style: lowercase, short, useful subject terms; this batch uses lowercase/kebab-case terms.
- Caption style: concise, image-specific visible-subject descriptions with light atmosphere only where natural.
- Alt style: concrete visible-subject descriptions distinct from captions when practical.
- Home image-slot findings: Home supports `spotlight.image` and `gallery[]` image/full fields, but current fields are already populated and not placeholders; no Home slot was updated.

## Duplicate Review Method

- Exact duplicates checked with SHA-256 for incoming versus incoming, existing full-size Gallery images, and existing Gallery thumbnails.
- Near duplicates reviewed with Pillow-generated 64-bit dHash distances, contact sheets, and visual review.
- Temporary contact sheets were generated under `/tmp` and were not committed.
- Close perceptual matches were treated as visual-review candidates, not automatic duplicates.

## Incoming Inventory

| Source | Dimensions | Type | SHA-256 | Duplicate status | Existing match if any | Accepted? | Proposed file | Category | Tags | Home candidate? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blackheart Desert Drinking.png | 1920x1080 | PNG | `a35796eb4c770726b43475d26386ba7f3ea5dbe536848cf272582dc4caad6b12` | near duplicate / same-scene cluster | 8:assets/img/gallery/shot-17.webp; 8:assets/img/gallery/thumbs/shot-17.webp; 9:assets/img/gallery/shot-18.webp | no | - | - | - | no | Skipped as a near-duplicate sun-silhouette scene; Twills Sun Sky retained. |
| Blackheart moon.png | 1920x1080 | PNG | `bb12a228aec6dd6f515484c63944ab222b554e270f4433146d55e846856dce5e` | near duplicate / same-scene cluster | - | no | - | - | - | no | Skipped as a moon-silhouette scene close to existing shot-17 and incoming moonlight candidates. |
| Cats & Dogs.jpg | 2400x1080 | JPEG | `a3c23d9e8a7aac52fed914ea10da03d3227eda0d2707e74651dc4e64ad9f882d` | not exact duplicate | - | yes | shot-40.webp | companions | animal, companions, courtyard | yes | Accepted after visual review. |
| Group Spa.jpg | 3200x2136 | JPEG | `10744b7a5149485efcec4040be0cf625b32a2cfc3ef188b5aa2dd3e83afe3561` | near duplicate / same-scene cluster | - | no | - | - | - | no | Skipped as same pool/courtyard scene cluster; Guild pool party retained. |
| Group photo.jpg | 3200x2136 | JPEG | `7acedc81094bbe6c19ffca40f4e1919ebf068730f28e951aca67ee0219ac188e` | not exact duplicate | - | yes | shot-41.webp | gatherings | group, nature, gathering | yes | Accepted after visual review. |
| Group practice.jpg | 3200x2136 | JPEG | `eaec0c540fb5f0691d7e28deac63bd4fa3d8d283bd984861023c3ad0cc1b5438` | not exact duplicate | - | yes | shot-42.webp | gatherings | group, training, nature | no | Accepted after visual review. |
| Guild War.jpg | 3200x2136 | JPEG | `2abd0a2f3ed181291e3fd1713032b76a00c0c9d143eff02d4a094c6a8065461a` | not exact duplicate | - | yes | shot-43.webp | gatherings | group, courtyard, gathering | no | Accepted after visual review. |
| Guild bubbles.png | 2388x1668 | PNG | `666e072b7aa391773b7865aa60d21d0366d41c2ccae802fb2067c8d079009118` | not exact duplicate | - | yes | shot-44.webp | gatherings | group, nature, bubbles | yes | Accepted after visual review. |
| Guild group pic.jpg | 2400x1080 | JPEG | `cec7229438c28598d67f2a9985ee1f8672b60fa48b84ee4aa32f7e55915b2807` | near duplicate / same-scene cluster | - | no | - | - | - | no | Skipped during visual duplicate review; stronger nearby scene retained. |
| Guild minis.jpg | 2400x1080 | JPEG | `31bdd91adac0bb8edf307a40ad0fef2f2a7a27debc8fa72afa6bd65a579aa7e1` | not exact duplicate | - | yes | shot-45.webp | gatherings | group, costume, courtyard | no | Accepted after visual review. |
| Guild pool party.jpg | 3200x2136 | JPEG | `02662179652eb59bbacf1aa56197e13813230fd1a20ab2da8313d4a693812795` | not exact duplicate | - | yes | shot-46.webp | gatherings | group, courtyard, rest | yes | Accepted after visual review. |
| Isawi Desert Animal.png | 1904x1033 | PNG | `3e8d5ef1783627e17277eea4d3cd8a7c717c9d49e72346922e7c8f18eca1112c` | not exact duplicate | - | yes | shot-47.webp | companions | animal, desert, companion | no | Accepted after visual review. |
| Isawi Desert Camels.jpg | 1920x1080 | JPEG | `54dcfd0d0b09ac9d91330ce769c7ef4ece4ba6794d9916c7a54c63f5554d8605` | not exact duplicate | - | yes | shot-48.webp | scenery | desert, animal, scenery | no | Accepted after visual review. |
| Isawi Sunlight.png | 1746x968 | PNG | `19104e7230980893d17b88c39337688b3a1fbb297873877dc5829b26fc9d24ce` | not exact duplicate | - | yes | shot-49.webp | portraits | portrait, solo, sunset | no | Accepted after visual review. |
| Isawi Twills Desert.jpg | 1920x1080 | JPEG | `b3affb7af193ed17eba2995d47231130a8dbbd83dc0fffcda4c5d3c035e74060` | not exact duplicate | - | yes | shot-50.webp | companions | companion, desert, pair | no | Accepted after visual review. |
| Isawi Twills desert bows.png | 5120x2880 | PNG | `7f73ba566f49da44d6dbbd8f1cdf381e61a56beff065aa491d90c7a65ae5afa4` | not exact duplicate | - | yes | shot-51.webp | companions | companion, desert, animal | no | Accepted after visual review. |
| Isawi Twills.png | 5120x2880 | PNG | `2fba9dcfca995d43e56e74b842d5091b5277cec2dff195ee385595d44a84a153` | not exact duplicate | - | yes | shot-52.webp | companions | companion, nature, pair | no | Accepted after visual review. |
| Klutzz & Fei.png | 1920x1080 | PNG | `a8342361723a36241a1236087dcefbbba41691694d93767babb08d18659fce9b` | not exact duplicate | - | yes | shot-53.webp | companions | companion, desert, pair | no | Accepted after visual review. |
| Klutzz Twills sitting.png | 1920x1080 | PNG | `18d4ddfc40cf635f6ab139c3eada815275fe6511020845fb4f5975e80d189f6f` | not exact duplicate | - | yes | shot-54.webp | gatherings | group, nature, gathering | no | Accepted after visual review. |
| Lone block ladies.jpg | 3200x2136 | JPEG | `df3f538c79cd99d7db58f8dd0e47d1a083747b839a56f3d788f98ba9a0184ba7` | not exact duplicate | 5:assets/img/gallery/shot-18.webp; 5:assets/img/gallery/thumbs/shot-18.webp | yes | shot-55.webp | gatherings | group, nature, gathering | no | Accepted after visual review. |
| Meenari Desert Sword.jpg | 2400x1080 | JPEG | `4095736347c0b950c5cc5cca39983202cd60b2ba2641beb6765f9c2891b55b19` | not exact duplicate | - | yes | shot-56.webp | portraits | portrait, solo, blade | no | Accepted after visual review. |
| Meenari Sinbell Twills.png | 5120x2880 | PNG | `64ed3959df45639fca8666f0ed61b75450841a1302a4b97b081242f06217718d` | not exact duplicate | - | yes | shot-57.webp | gatherings | group, costume, gathering | yes | Accepted after visual review. |
| Meenari Turtle.jpg | 2400x1080 | JPEG | `db19547cfddf1ec49f1f9fed280bd7971af6a34dbbcaac408dfbfe9fa5343558` | not exact duplicate | - | yes | shot-58.webp | companions | companion, animal, desert | no | Accepted after visual review. |
| Meenari Twills matching.jpg | 2400x1080 | JPEG | `4fb80c961b6d1a48c1cfa50d90777646f8df57ef0207ce39dcc227d5bae09e78` | not exact duplicate | - | yes | shot-59.webp | companions | companion, pair, costume | no | Accepted after visual review. |
| Meenari-Sinbell Clones.jpg | 1394x1080 | JPEG | `76ee89d43c2e07817e568b80cecc969fd791010a628fd54caa0cc5344a222cc1` | not exact duplicate | - | yes | shot-60.webp | companions | companion, pair, portrait | no | Accepted after visual review. |
| Sinbell Falling.jpg | 2560x1440 | JPEG | `bfdbe2fe6a1ba4319c93fcede51206eb3a151d138a4adf539fb05fea45ddf6df` | not exact duplicate | 11:assets/img/gallery/shot-24.webp; 11:assets/img/gallery/thumbs/shot-24.webp | yes | shot-61.webp | action | action, sky, movement | no | Accepted after visual review. |
| Sinbell Meenari block bubbles.jpg | 2400x1080 | JPEG | `0e62ca333ba0d9cbdd26cf9440db6420494592f4fc95b83aa0c393151220ee7c` | near duplicate / same-scene cluster | - | no | - | - | - | no | Skipped as same bubble-field cluster; Guild bubbles retained. |
| Sinbell Moon.jpg | 2560x1440 | JPEG | `030138f8cc4bfe18670453d67fedb7e3eb55b7a1be277b706a66992c98d685d7` | near duplicate / same-scene cluster | 12:assets/img/gallery/shot-18.webp; 12:assets/img/gallery/thumbs/shot-18.webp | no | - | - | - | no | Skipped as a moon-silhouette scene close to existing shot-17. |
| Sinbell Sun.jpg | 2560x1440 | JPEG | `b66827b4c15654db34e19871eda93ca23eebf19d07f8f21b989e6e08056dff34` | near duplicate / same-scene cluster | 8:assets/img/gallery/shot-17.webp; 8:assets/img/gallery/thumbs/shot-17.webp | no | - | - | - | no | Skipped as a near-duplicate sun-silhouette scene; Twills Sun Sky retained. |
| Sinbell Twills moonlight.png | 5120x2880 | PNG | `72c617f2efebf026cca820361cae86621e50ca86910f3e73971a1caf176d9a93` | near duplicate / same-scene cluster | - | no | - | - | - | no | Skipped as same moonlight horse scene cluster; Twills Sinbell Meenari moonlight retained. |
| Twills Desert Sword.jpg | 11264x6336 | JPEG | `bd99c8cbd7eb3f98a0adef2a664240d7316bca475bc2ac0c655850181d4aee8f` | not exact duplicate | - | yes | shot-62.webp | portraits | portrait, solo, blade | yes | Accepted after visual review. |
| Twills Isawi Portrait.png | 1239x1180 | PNG | `4d83435ac8984cc3a55c0bcb389da54a677747531a31d36c28521ccebc1150fb` | not exact duplicate | - | yes | shot-63.webp | companions | companion, pair, portrait | no | Accepted after visual review. |
| Twills Klutzz outfit matching 2.png | 1920x1080 | PNG | `dde65d5b086508ba082986cfbee8e4faa81367b8ef7f09283e19ea0557541aaa` | near duplicate / same-scene cluster | - | no | - | - | - | no | Skipped as same outfit-matching cluster; Twills Klutzz outfit matching retained. |
| Twills Klutzz outfit matching.png | 1920x1080 | PNG | `91647783c15f43ab30774a4fba120cc9697e2e47b4ae481a081f0d13edafd96d` | not exact duplicate | - | yes | shot-64.webp | gatherings | group, costume, nature | no | Accepted after visual review. |
| Twills Sinbell Meenari moonlight.png | 5120x2880 | PNG | `90cd2034ba1a94e8c1e554aa8b204a1af715c863e8da683baf2bb7f2e055a66e` | not exact duplicate | - | yes | shot-65.webp | gatherings | group, moon, animal | yes | Accepted after visual review. |
| Twills Sun Sky.png | 5120x2880 | PNG | `c283ab40df86966abe534f9d7bb67ef257082ed13f20a9e229f50266f46c0302` | not exact duplicate | 3:assets/img/gallery/shot-18.webp; 3:assets/img/gallery/thumbs/shot-18.webp; 12:assets/img/gallery/shot-17.webp | yes | shot-66.webp | action | action, sky, sunset | yes | Accepted after visual review. |
| Twills desert drummer.png | 5120x2880 | PNG | `8191eb64fe463ad0db9000124903f3ffdd4431805a7f010b5e99e87bb561b30e` | not exact duplicate | - | yes | shot-67.webp | portraits | portrait, drums, desert | no | Accepted after visual review. |
| Twills desert gown.png | 5120x2880 | PNG | `0e8614b4762c7850af114e4e856a47bfb1458e5cd39f76bfe6e209323ff8c384` | not exact duplicate | - | yes | shot-68.webp | portraits | portrait, solo, costume | no | Accepted after visual review. |
| Twills rain.png | 5120x2880 | PNG | `1e210f328ace507ce12be74008a41f08436c5a4ea99cdea6ab99df5caaac4e95` | not exact duplicate | - | yes | shot-69.webp | portraits | portrait, solo, rain | no | Accepted after visual review. |
| Twills snow guy 2.png | 5120x2880 | PNG | `a60b0636c9cb9ed45d6288a32725730effbaf6eef5218f7ee665c7f11271d2d1` | near duplicate / same-scene cluster | - | no | - | - | - | no | Skipped as same snow-horse cluster; Twills snow guy retained. |
| Twills snow guy.png | 5120x2880 | PNG | `1f270e958db97341a8056edcf96ef2497ccb40075233af022d9771730c9139af` | not exact duplicate | - | yes | shot-70.webp | companions | companion, snow, animal | yes | Accepted after visual review. |

## New Gallery Items

| New item | Category | Tags | Caption | Alt text | Confidence |
| --- | --- | --- | --- | --- | --- |
| shot-40 | companions | animal, companions, courtyard | Cats and dogs cross the courtyard path. | Cats and dogs moving across a courtyard path. | medium |
| shot-41 | gatherings | group, nature, gathering | A guild group gathered in a field of purple blooms. | Guild members gathered in a field of purple flowers. | medium |
| shot-42 | gatherings | group, training, nature | A practice line gathers in tall grass. | Guild members standing together in tall grass for practice. | medium |
| shot-43 | gatherings | group, courtyard, gathering | A guild line gathers outside the hall. | Guild members lined up outside a lit hall. | medium |
| shot-44 | gatherings | group, nature, bubbles | A bubble-lit field gathers the guild together. | Guild members standing in a grassy field with floating bubbles. | medium |
| shot-45 | gatherings | group, costume, courtyard | Tiny companions gather beneath a golden figure. | Small companion figures gathered below a large golden figure. | medium |
| shot-46 | gatherings | group, courtyard, rest | A poolside pause gathers the guild in warm light. | Guild members seated and standing beside a courtyard pool. | medium |
| shot-47 | companions | animal, desert, companion | A white-haired figure rests beside a desert companion. | White-haired figure beside a small animal in the desert. | medium |
| shot-48 | scenery | desert, animal, scenery | Camels cross the desert behind a seated figure. | Seated figure in the desert with camels walking behind. | medium |
| shot-49 | portraits | portrait, solo, sunset | A green-cloaked portrait catches the low sun. | Green-cloaked figure in warm sunlight. | medium |
| shot-50 | companions | companion, desert, pair | Two desert companions stand beside the firelight. | Two figures standing together near desert firelight. | medium |
| shot-51 | companions | companion, desert, animal | Two travelers stand with a desert mount. | Two figures standing with a desert mount in sandy light. | medium |
| shot-52 | companions | companion, nature, pair | Two companions rest beneath violet branches. | Two figures seated together beneath purple-flowered branches. | medium |
| shot-53 | companions | companion, desert, pair | Two companions pose beneath a bronze sky. | Two figures posing together under a warm desert sky. | medium |
| shot-54 | gatherings | group, nature, gathering | A seated gathering settles into the grass. | Several guild members seated together in a grassy area. | medium |
| shot-55 | gatherings | group, nature, gathering | A small group stands close beneath night grass. | Small group of figures standing close together in dark grass. | medium |
| shot-56 | portraits | portrait, solo, blade | A desert portrait holds a blade across the sun. | Portrait of a figure holding a blade in desert light. | medium |
| shot-57 | gatherings | group, costume, gathering | Three ornate robes gather on stone steps. | Three figures in ornate robes seated together on stone steps. | medium |
| shot-58 | companions | companion, animal, desert | A traveler faces a turtle beneath an amber sky. | Figure facing a large turtle in amber desert light. | medium |
| shot-59 | companions | companion, pair, costume | Two matching companions stand beneath blue lantern light. | Two figures in matching pale outfits standing under blue light. | medium |
| shot-60 | companions | companion, pair, portrait | Two close companions lean into a bright portrait. | Two figures posed closely together in a bright indoor portrait. | medium |
| shot-61 | action | action, sky, movement | A pale figure drops through the night air. | Pale figure falling through dark blue night air. | medium |
| shot-62 | portraits | portrait, solo, blade | A desert blade pose stands against the dunes. | Figure posing with a blade in a wide desert scene. | medium |
| shot-63 | companions | companion, pair, portrait | Two weapon-bearers share a pale portrait. | Two figures standing together with weapons in a pale portrait. | medium |
| shot-64 | gatherings | group, costume, nature | Matching outfits gather around a quiet field pose. | Three figures in coordinated outfits posing in a grassy field. | medium |
| shot-65 | gatherings | group, moon, animal | A moonlit trio stands beside a pale horse. | Three figures standing beside a pale horse under a full moon. | medium |
| shot-66 | action | action, sky, sunset | A figure rises through the gold sky. | Figure leaping or flying through a golden sky. | medium |
| shot-67 | portraits | portrait, drums, desert | A drum-side portrait glows in red desert light. | Figure seated beside drums in red desert light. | medium |
| shot-68 | portraits | portrait, solo, costume | A pale gown spreads against the blue desert sky. | Figure in a pale gown posing under a blue desert sky. | medium |
| shot-69 | portraits | portrait, solo, rain | A rain-washed portrait stands under bright falls. | Figure standing in heavy rain and bright falling water. | medium |
| shot-70 | companions | companion, snow, animal | Two snowlit companions stand beside a pale horse. | Two figures standing with a pale horse in a snowy blue scene. | medium |

## Generated Image Verification

| New item | Full image | Full dimensions | Full size | Thumbnail | Thumbnail dimensions | Thumbnail size | Valid? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| shot-40 | `assets/img/gallery/shot-40.webp` | 1920x864 | 222638 bytes | `assets/img/gallery/thumbs/shot-40.webp` | 900x405 | 64278 bytes | yes |
| shot-41 | `assets/img/gallery/shot-41.webp` | 1920x1282 | 296404 bytes | `assets/img/gallery/thumbs/shot-41.webp` | 900x601 | 67946 bytes | yes |
| shot-42 | `assets/img/gallery/shot-42.webp` | 1920x1282 | 310280 bytes | `assets/img/gallery/thumbs/shot-42.webp` | 900x601 | 78112 bytes | yes |
| shot-43 | `assets/img/gallery/shot-43.webp` | 1920x1282 | 253632 bytes | `assets/img/gallery/thumbs/shot-43.webp` | 900x601 | 71140 bytes | yes |
| shot-44 | `assets/img/gallery/shot-44.webp` | 1920x1341 | 391068 bytes | `assets/img/gallery/thumbs/shot-44.webp` | 900x629 | 92340 bytes | yes |
| shot-45 | `assets/img/gallery/shot-45.webp` | 1920x864 | 202266 bytes | `assets/img/gallery/thumbs/shot-45.webp` | 900x405 | 52646 bytes | yes |
| shot-46 | `assets/img/gallery/shot-46.webp` | 1920x1282 | 324334 bytes | `assets/img/gallery/thumbs/shot-46.webp` | 900x601 | 76976 bytes | yes |
| shot-47 | `assets/img/gallery/shot-47.webp` | 1904x1033 | 142894 bytes | `assets/img/gallery/thumbs/shot-47.webp` | 900x488 | 34180 bytes | yes |
| shot-48 | `assets/img/gallery/shot-48.webp` | 1920x1080 | 90684 bytes | `assets/img/gallery/thumbs/shot-48.webp` | 900x506 | 22242 bytes | yes |
| shot-49 | `assets/img/gallery/shot-49.webp` | 1746x968 | 76442 bytes | `assets/img/gallery/thumbs/shot-49.webp` | 900x499 | 26974 bytes | yes |
| shot-50 | `assets/img/gallery/shot-50.webp` | 1920x1080 | 260228 bytes | `assets/img/gallery/thumbs/shot-50.webp` | 900x506 | 53194 bytes | yes |
| shot-51 | `assets/img/gallery/shot-51.webp` | 1920x1080 | 130686 bytes | `assets/img/gallery/thumbs/shot-51.webp` | 900x506 | 30948 bytes | yes |
| shot-52 | `assets/img/gallery/shot-52.webp` | 1920x1080 | 281146 bytes | `assets/img/gallery/thumbs/shot-52.webp` | 900x506 | 67242 bytes | yes |
| shot-53 | `assets/img/gallery/shot-53.webp` | 1920x1080 | 75190 bytes | `assets/img/gallery/thumbs/shot-53.webp` | 900x506 | 20978 bytes | yes |
| shot-54 | `assets/img/gallery/shot-54.webp` | 1920x1080 | 143934 bytes | `assets/img/gallery/thumbs/shot-54.webp` | 900x506 | 38126 bytes | yes |
| shot-55 | `assets/img/gallery/shot-55.webp` | 1920x1282 | 173136 bytes | `assets/img/gallery/thumbs/shot-55.webp` | 900x601 | 36346 bytes | yes |
| shot-56 | `assets/img/gallery/shot-56.webp` | 1920x864 | 80174 bytes | `assets/img/gallery/thumbs/shot-56.webp` | 900x405 | 22980 bytes | yes |
| shot-57 | `assets/img/gallery/shot-57.webp` | 1920x1080 | 235934 bytes | `assets/img/gallery/thumbs/shot-57.webp` | 900x506 | 59162 bytes | yes |
| shot-58 | `assets/img/gallery/shot-58.webp` | 1920x864 | 103220 bytes | `assets/img/gallery/thumbs/shot-58.webp` | 900x405 | 28332 bytes | yes |
| shot-59 | `assets/img/gallery/shot-59.webp` | 1920x864 | 180668 bytes | `assets/img/gallery/thumbs/shot-59.webp` | 900x405 | 52386 bytes | yes |
| shot-60 | `assets/img/gallery/shot-60.webp` | 1394x1080 | 99632 bytes | `assets/img/gallery/thumbs/shot-60.webp` | 900x697 | 49158 bytes | yes |
| shot-61 | `assets/img/gallery/shot-61.webp` | 1920x1080 | 72174 bytes | `assets/img/gallery/thumbs/shot-61.webp` | 900x506 | 19798 bytes | yes |
| shot-62 | `assets/img/gallery/shot-62.webp` | 1920x1080 | 171540 bytes | `assets/img/gallery/thumbs/shot-62.webp` | 900x506 | 36990 bytes | yes |
| shot-63 | `assets/img/gallery/shot-63.webp` | 1239x1180 | 134658 bytes | `assets/img/gallery/thumbs/shot-63.webp` | 900x857 | 56574 bytes | yes |
| shot-64 | `assets/img/gallery/shot-64.webp` | 1920x1080 | 152090 bytes | `assets/img/gallery/thumbs/shot-64.webp` | 900x506 | 41972 bytes | yes |
| shot-65 | `assets/img/gallery/shot-65.webp` | 1920x1080 | 79372 bytes | `assets/img/gallery/thumbs/shot-65.webp` | 900x506 | 21396 bytes | yes |
| shot-66 | `assets/img/gallery/shot-66.webp` | 1920x1080 | 25556 bytes | `assets/img/gallery/thumbs/shot-66.webp` | 900x506 | 7884 bytes | yes |
| shot-67 | `assets/img/gallery/shot-67.webp` | 1920x1080 | 240446 bytes | `assets/img/gallery/thumbs/shot-67.webp` | 900x506 | 47570 bytes | yes |
| shot-68 | `assets/img/gallery/shot-68.webp` | 1920x1080 | 117634 bytes | `assets/img/gallery/thumbs/shot-68.webp` | 900x506 | 31324 bytes | yes |
| shot-69 | `assets/img/gallery/shot-69.webp` | 1920x1080 | 154948 bytes | `assets/img/gallery/thumbs/shot-69.webp` | 900x506 | 36480 bytes | yes |
| shot-70 | `assets/img/gallery/shot-70.webp` | 1920x1080 | 381870 bytes | `assets/img/gallery/thumbs/shot-70.webp` | 900x506 | 76592 bytes | yes |

## Gallery Count Summary

- Previous total count: 39
- Accepted screenshots: 31
- New total count: 70
- Exact duplicates skipped: 0
- Near duplicates / same-scene screenshots skipped: 10

| Category | Count after update |
| --- | --- |
| portraits | 22 |
| gatherings | 22 |
| action | 6 |
| scenery | 5 |
| companions | 15 |

## Home Updates

- Home image slots updated? no
- Fields changed: none
- Images selected: none
- Reason: Home-supported image fields are already populated and not clear placeholders or unfinished slots.
- `data/home.json seal.verse` unchanged: yes.

## Skipped Files

| Source | Reason |
| --- | --- |
| Blackheart Desert Drinking.png | Skipped as a near-duplicate sun-silhouette scene; Twills Sun Sky retained. |
| Blackheart moon.png | Skipped as a moon-silhouette scene close to existing shot-17 and incoming moonlight candidates. |
| Group Spa.jpg | Skipped as same pool/courtyard scene cluster; Guild pool party retained. |
| Guild group pic.jpg | Skipped during visual duplicate review; stronger nearby scene retained. |
| Sinbell Meenari block bubbles.jpg | Skipped as same bubble-field cluster; Guild bubbles retained. |
| Sinbell Moon.jpg | Skipped as a moon-silhouette scene close to existing shot-17. |
| Sinbell Sun.jpg | Skipped as a near-duplicate sun-silhouette scene; Twills Sun Sky retained. |
| Sinbell Twills moonlight.png | Skipped as same moonlight horse scene cluster; Twills Sinbell Meenari moonlight retained. |
| Twills Klutzz outfit matching 2.png | Skipped as same outfit-matching cluster; Twills Klutzz outfit matching retained. |
| Twills snow guy 2.png | Skipped as same snow-horse cluster; Twills snow guy retained. |

## Validation

| Command / check | Result | Notes |
| --- | --- | --- |
| `npm run check` | Pass | Raw incoming screenshots and known MP3 report large-asset warnings only. |
| `git diff --check` | Pass | No whitespace errors. |
| `node scripts/check-json.mjs` | Pass | `JSON OK (16 files).` |
| `node scripts/check-js.mjs` | Pass | `JavaScript syntax OK (23 files).` |
| `node scripts/check-refs.mjs` | Pass | `Local references OK (414 refs checked).` |
| `node scripts/check-assets.mjs` | Pass with warnings | Warnings are raw incoming source screenshots plus known MP3; generated WebPs are below the large-asset threshold. |
| `npm run check:production` | Pass | `Production smoke check OK.` |
| `npm run smoke:gallery` | Pass | Local server on port 8765. |
| Local Gallery browser smoke | Pass | 70 total items, 31 new items checked, category counts verified, new thumbnails render, lightbox opens full images, Copy link works with clipboard permission, URL filters work. |
| Local Home/browser regression smoke | Pass | Home and key public pages loaded with no horizontal overflow at checked widths. |
| Protected content diff check | Pass | Home seal verse, Recruitment body/conclusion, and Twills profile body unchanged. |
