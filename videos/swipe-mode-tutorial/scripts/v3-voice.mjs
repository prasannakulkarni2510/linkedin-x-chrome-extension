// v3 voiceover: one Kokoro clip per subtitle phrase (assets/v3/script.json), joined into one
// narration track. Writing each phrase separately gives every subtitle an exact start and end
// without a transcription pass. Output: assets/v3/voice/narration.wav + timeline.json.
// Needs: Kokoro (hyperframes tts) and ffmpeg/ffprobe on PATH.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'assets', 'v3', 'voice');
const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'v3', 'script.json'), 'utf8'));
fs.mkdirSync(DIR, { recursive: true });

const r3 = (n) => Math.round(n * 1000) / 1000;
const probe = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim());

// Kokoro pads each clip with a little silence; trim it so the gaps are ours.
function synth(text, out) {
  const raw = out.replace(/\.wav$/, '.raw.wav');
  if (!fs.existsSync(out)) {
    // npx needs a shell on Windows; the text goes in a file so spaces and quotes survive it.
    const txt = out.replace(/\.wav$/, '.txt');
    fs.writeFileSync(txt, text);
    execSync(`npx --yes hyperframes@0.8.181 tts "${txt}" -v ${script.voice} -s ${script.speed} -o "${raw}"`, { stdio: 'ignore' });
    fs.rmSync(txt, { force: true });
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse', '-ar', '24000', '-ac', '1', out]);
    fs.rmSync(raw, { force: true });
  }
  return probe(out);
}

const timeline = { voice: script.voice, beats: [] };
const parts = [];
let t = 0;
for (const beat of script.beats) {
  const b = { id: beat.id, scene: beat.scene, start: r3(t), phrases: [] };
  beat.phrases.forEach((ph, i) => {
    const file = path.join(DIR, `${beat.id}-${i + 1}.wav`);
    const d = synth(ph.text, file);
    b.phrases.push({ text: ph.text, start: r3(t), end: r3(t + d), keys: ph.keys || [], at: ph.at || 0 });
    parts.push({ file, gap: script.gap });
    t += d + script.gap;
  });
  t += script.beatTail;
  parts[parts.length - 1].gap += script.beatTail;
  b.end = r3(t);
  timeline.beats.push(b);
  console.log(`${beat.id.padEnd(10)} ${b.start.toFixed(2)}–${b.end.toFixed(2)}s`);
}
timeline.duration = r3(t);

// Join: each phrase followed by its silence.
const list = path.join(DIR, 'concat.txt');
const silences = new Map();
const lines = [];
for (const p of parts) {
  lines.push(`file '${p.file.replace(/\\/g, '/')}'`);
  const g = r3(p.gap);
  if (!silences.has(g)) {
    const s = path.join(DIR, `silence-${Math.round(g * 1000)}.wav`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', String(g), s]);
    silences.set(g, s);
  }
  lines.push(`file '${silences.get(g).replace(/\\/g, '/')}'`);
}
fs.writeFileSync(list, lines.join('\n') + '\n');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c:a', 'pcm_s16le', path.join(DIR, 'narration.wav')]);
fs.writeFileSync(path.join(ROOT, 'assets', 'v3', 'timeline.json'), JSON.stringify(timeline, null, 2));
console.log(`total ${timeline.duration}s, narration ${probe(path.join(DIR, 'narration.wav')).toFixed(2)}s`);
