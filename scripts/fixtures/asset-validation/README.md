# Asset validation canaries

These are tiny, locally generated positive fixtures for the dependency-free
asset-structure validator. They contain no third-party artwork or user data.

- `valid-1x1.webp`: lossless 1 x 1 white image, SHA-256
  `52DC24C0429EA6CCC5B579A6DA8BB79BF41E471FE5108A62009F3C2E195551C0`
- `valid-silent.mp3`: 0.052245 seconds of generated 44.1 kHz stereo silence,
  SHA-256
  `78299FA7BE021A34CB293E3045FD0A580949E425B7ED608D51901E75C648B1F8`

They were produced without network access and decoded successfully with
ImageMagick 7.1.2 and FFmpeg/ffprobe 7.0.2. Equivalent regeneration commands
are:

```sh
magick -size 1x1 xc:white -strip -define webp:lossless=true valid-1x1.webp
ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 0.001 \
  -c:a libmp3lame -b:a 128k -map_metadata -1 -id3v2_version 0 \
  -write_id3v1 0 valid-silent.mp3
```

The negative canaries are constructed in memory by
`scripts/lib/asset-format-validation.mjs`; malformed bytes must cause the
validator to throw.
