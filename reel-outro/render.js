#!/usr/bin/env node
// Renders outro.html to a video file, frame by frame.
//
//   node render.js                                  -> reel-outro.mp4
//   node render.js --handle @myshop --headline "See you next time"
//   node render.js --transparent --out reel-outro-transparent.webm   (or .mov for ProRes 4444)
//   node render.js --logo logo.png                  -> logo inside the circle instead of the initial
//
// Needs Node, ffmpeg and Playwright (npm i -g playwright && npx playwright install chromium).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync, execFileSync } = require('child_process');

function loadPlaywright() {
  try { return require('playwright'); } catch {
    return require(path.join(execSync('npm root -g').toString().trim(), 'playwright'));
  }
}

const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (!args[i].startsWith('--')) continue;
  const key = args[i].slice(2);
  const next = args[i + 1];
  flags[key] = next === undefined || next.startsWith('--') ? true : (i++, next);
}

const FPS = 30, DURATION = 3;
const transparent = !!flags.transparent;
const out = path.resolve(flags.out || (transparent ? 'reel-outro-transparent.webm' : 'reel-outro.mp4'));
const sub = Number(flags.sub || 8);

const params = new URLSearchParams({ render: '1' });
for (const k of ['headline', 'handle', 'follow', 'following', 'initials']) {
  if (k in flags) params.set(k, flags[k] === true ? '' : flags[k]);
}
if (transparent) params.set('transparent', '1');

(async () => {
  const frames = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-outro-'));
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => { console.error(e); process.exit(1); });
  await page.goto(`file://${path.join(__dirname, 'outro.html')}?${params}`);
  await page.evaluate(() => window.outroReady);
  if (flags.logo) {
    const file = path.resolve(flags.logo);
    const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(file).toLowerCase()] || 'image/png';
    await page.evaluate(src => window.setLogo(src), `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`);
  }

  const total = FPS * DURATION;
  for (let i = 0; i < total; i++) {
    const url = await page.evaluate(([i, sub]) => window.renderFrame(i, sub), [i, sub]);
    fs.writeFileSync(path.join(frames, `f${String(i).padStart(4, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
    process.stdout.write(`\rframe ${i + 1}/${total}`);
  }
  await browser.close();
  process.stdout.write('\n');

  const input = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f%04d.png')];
  const bt709 = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709'];
  const ext = path.extname(out).toLowerCase();
  let codec;
  if (ext === '.webm') {
    codec = ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '22', '-row-mt', '1', '-auto-alt-ref', '0'];
  } else if (ext === '.mov' && transparent) {
    codec = ['-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-vendor', 'apl0'];
  } else {
    // silent audio track so editors and apps that expect one don't complain when this is joined to a clip
    codec = ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', String(DURATION),
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-profile:v', 'high', ...bt709,
      '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart'];
  }
  execFileSync('ffmpeg', [...input, ...codec, out], { stdio: 'inherit' });
  fs.rmSync(frames, { recursive: true, force: true });
  console.log(`wrote ${out}`);
})();
