# world.execute(me); — code reproduction

An unofficial reproduction of the music video for Mili's "world.execute(me);" (the fan MV by Kaito Sugimura), written entirely as code. Each of the 60 scenes is a DOM, SVG, Canvas or WebGL module whose `render(t)` is a pure function of song time, so any frame can be drawn in any order. It can be rendered offline to MP4 or played live in the browser.

| Folder | What it is |
| --- | --- |
| [`mv/`](mv) | The remake: `engine/` (stage and runtime), `scenes/` (10 segments, 60 scenes), `assets/fonts/` (open-licensed fonts), `tools/` (frame renderer and comparison scripts). [`mv/AGENTS.md`](mv/AGENTS.md) is the working brief. |
| [`player/`](player) | Web player that runs the same scene code live with a floating playback bar, resolution and fps selection and seek-bar previews. See [`player/README.md`](player/README.md). |

## Run the player locally

Requires Node 22.

```sh
cd player
npm run build   # copies mv/ into dist/, writes the scene index and font CSS, renders preview thumbnails
npm start       # http://127.0.0.1:4173
```

Rendering the preview thumbnails (and anything else in `mv/tools/render.mjs`) needs `npm install` in `mv/`, Google Chrome and ffmpeg.

## Media not included

The song and the original video are not part of this repository.

- **Sound in the player:** if `qV0aezH6Aj8.mp4` sits next to `mv/` and `player/`, `npm run build` extracts its soundtrack and the player uses that file. Otherwise the player plays [Mili's official upload](https://www.youtube.com/watch?v=ESx_hy1n7HA) through the YouTube embed.
- **Rendering with sound:** `mv/tools/render.mjs` reads `mv/audio/song.m4a`. Pass `--no-audio` without it.
- **Comparison tools:** the scripts in `mv/tools/` that compare against the original expect `qV0aezH6Aj8.mp4` one level above `mv/`.

## Credits

"world.execute(me);" is by Mili. The music video being reproduced is the fan MV by Kaito Sugimura.
