# Server-side spinner fonts

These fonts are bundled only with the protected server-side raffle media
renderer. They are not emitted by the public site, preloaded by a browser, or
used by the ordinary website font bundle.

- `NotoSerifSC-Variable.ttf`
  - Source: `google/fonts` commit
    `2e61f4355afd22b801791b0df176065082423b87`
  - Upstream path: `ofl/notoserifsc/NotoSerifSC[wght].ttf`
  - SHA-256: `050080d9255a86808f2945bffac582b31ef32bc36411ce29563b4961670c66f9`
  - License: `../../app/fonts/OFL-Noto-Serif-SC.txt`
- `NotoColorEmoji-Regular.ttf`
  - Source: `google/fonts` commit
    `be7a91f7db2db749ebfc36f598eb85501127e7db`
  - Upstream path: `ofl/notocoloremoji/NotoColorEmoji-Regular.ttf`
  - SHA-256: `be73479ba4fa277c89b85cd6c71717df30d9d0eff6da8c1e1a201e5b95459299`
  - License: `OFL-Noto-Color-Emoji.txt`

The complete CJK and emoji coverage is intentional: participant names support
Unicode, and server-rendered winning media must not depend on fonts installed
on a particular runtime host.
