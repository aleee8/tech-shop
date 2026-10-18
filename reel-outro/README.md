# Reel outro

A 3-second end card for Reels / TikTok / Shorts: 1080×1920, 30 fps.

- `reel-outro.mp4`: drop it at the end of your video. It has a silent audio track, so it joins cleanly to other clips.
- `reel-outro-transparent.webm`: the same animation with a transparent background, to lay over the last 3 seconds of your own footage (CapCut desktop, Premiere, DaVinci Resolve, After Effects).

What happens: the background bursts open from a ring, your logo pops in, "Thanks for watching" slides up with your handle, then a finger taps **Follow**, it flips to **✓ Following** with confetti and hearts, and everything fades to black.

## Change the text or add your logo

Open `outro.html` in Chrome to preview it. You can change the text in the address bar, e.g.
`outro.html?handle=@myshop&headline=See you next time`

Then render a new video (needs Node, ffmpeg and Playwright):

```
node render.js --handle @myshop --headline "See you next time" --logo logo.png
node render.js --handle @myshop --transparent --out reel-outro-transparent.webm
node render.js --handle @myshop --transparent --out reel-outro-transparent.mov   # ProRes 4444, for Final Cut / Premiere
```

Options: `--headline`, `--handle`, `--follow`, `--following`, `--initials` (letter in the circle when there's no logo), `--logo`, `--transparent`, `--out`.
