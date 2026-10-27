// Converts the v2 recordings to H.264 MP4 and gives every cue its exact video time.
// The recorder flips a 5x5 marker in the bottom-right corner at each cue; this reads that corner
// frame by frame. Recording under memory pressure drifts unevenly, so one offset per file is not
// enough: each cue is matched to its own flip, tracking the local drift as it goes. Cues that
// fired within one frame cancel each other's flip; those are interpolated from their neighbours.
// Writes `v` (video seconds) on every cue and `duration` per recording into assets/v2/cues.json.
// Needs ffmpeg and ffprobe on PATH.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const DIR = path.join(__dirname, '..', 'videos', 'swipe-mode-tutorial', 'assets', 'v2');
const cues = JSON.parse(fs.readFileSync(path.join(DIR, 'cues.json'), 'utf8'));

function cornerLuma(file) {
  const out = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', file, '-vf', 'crop=4:4:1276:796,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
  );
  const rows = [];
  let t = null;
  for (const line of out.split('\n')) {
    const tm = /pts_time:([\d.]+)/.exec(line);
    if (tm) t = Number(tm[1]);
    const ym = /YAVG=([\d.]+)/.exec(line);
    if (ym && t != null) rows.push([t, Number(ym[1]) > 128]);
  }
  return rows;
}

// Order-preserving alignment of cue times to flip times: each matched pair's drift (flip - cue)
// should change as little as possible from the previous matched pair. A cue may go unmatched
// (it shared a frame with another cue), and so may a flip (noise), each at a fixed cost.
function align(ts, fs) {
  const SKIP_CUE = 0.35;
  const SKIP_FLIP = 1.5;
  const n = ts.length;
  const m = fs.length;
  const cost = Array.from({ length: n }, () => new Array(m).fill(Infinity));
  const prev = Array.from({ length: n }, () => new Array(m).fill(null));
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < m; k++) {
      const d = fs[k] - ts[i];
      if (d > 0.5 || d < -6) continue; // video never runs ahead of the clock by much
      let best = i * SKIP_CUE + k * SKIP_FLIP;
      let from = null;
      for (let i2 = 0; i2 < i; i2++) {
        for (let k2 = 0; k2 < k; k2++) {
          if (cost[i2][k2] === Infinity) continue;
          const c = cost[i2][k2] + Math.abs(d - (fs[k2] - ts[i2])) + (i - i2 - 1) * SKIP_CUE + (k - k2 - 1) * SKIP_FLIP;
          if (c < best) {
            best = c;
            from = [i2, k2];
          }
        }
      }
      cost[i][k] = best;
      prev[i][k] = from;
    }
  }
  let best = n * SKIP_CUE + m * SKIP_FLIP;
  let end = null;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < m; k++) {
      const c = cost[i][k] + (n - i - 1) * SKIP_CUE + (m - k - 1) * SKIP_FLIP;
      if (c < best) {
        best = c;
        end = [i, k];
      }
    }
  }
  const match = new Array(n).fill(null);
  for (let cur = end; cur; cur = prev[cur[0]][cur[1]]) match[cur[0]] = cur[1];
  return match;
}

for (const name of ['linkedin', 'trust', 'x']) {
  const webm = path.join(DIR, name + '.webm');
  const mp4 = path.join(DIR, name + '.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30', '-crf', '18', '-preset', 'medium', '-movflags', '+faststart', '-an', mp4]);
  const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], { encoding: 'utf8' }).trim());

  const rows = cornerLuma(mp4);
  const flips = [];
  for (let i = 1; i < rows.length; i++) if (rows[i][1] !== rows[i - 1][1]) flips.push(rows[i][0]);

  const list = cues[name].cues;
  const match = align(list.map((c) => c.t), flips);
  let matched = 0;
  list.forEach((c, i) => {
    delete c.interpolated;
    if (match[i] != null) {
      c.v = Math.round(flips[match[i]] * 1000) / 1000;
      matched++;
    }
  });
  // Cues without a flip of their own (two cues inside one frame) take their neighbours' drift.
  list.forEach((c, i) => {
    if (match[i] != null) return;
    let a = i - 1;
    while (a >= 0 && match[a] == null) a--;
    let b = i + 1;
    while (b < list.length && match[b] == null) b++;
    const da = a >= 0 ? list[a].v - list[a].t : null;
    const db = b < list.length ? list[b].v - list[b].t : null;
    const d = da == null ? db : db == null ? da : da + ((db - da) * (c.t - list[a].t)) / Math.max(1e-6, list[b].t - list[a].t);
    c.v = Math.round((c.t + (d || 0)) * 1000) / 1000;
    c.interpolated = true;
  });
  cues[name].duration = duration;
  delete cues[name].offset;
  const offs = list.map((c) => c.v - c.t);
  const gaps = list.filter((c) => c.interpolated).map((c) => c.id + (c.key ? ' ' + c.key : '') + '@' + c.t);
  console.log(
    `${name}: ${duration.toFixed(2)}s video, ${flips.length} flips, ${matched}/${list.length} cues matched, drift ${Math.min(...offs).toFixed(2)}..${Math.max(...offs).toFixed(2)}s` + (gaps.length ? `
  interpolated: ${gaps.join(', ')}` : '')
  );
}

fs.writeFileSync(path.join(DIR, 'cues.json'), JSON.stringify(cues, null, 2));
