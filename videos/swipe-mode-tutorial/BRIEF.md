---
workflow: general-video
flow: automation
storyboard: no
message: "Swipe Mode: read one post at a time, skip left, engage right, and every action stays your choice"
destination: desktop-web
aspect: 1920x1080
language: en
audience: LinkedIn power users trying the extension for the first time
length: 60-90s
angle: how-to tutorial
---

## Intent

A short how-to video that teaches someone to use the Swipe Mode Chrome extension: install it,
start it, read, skip, undo, open the engage menu, react, comment, save, get help, and exit.
User asked: "build and create a small video to learn how to use". No narration.

## Assets

- ../../dev/mock-feed/ — mock LinkedIn-like feed; source of all screen footage.
- ../../extension/ — the extension under demo (loaded through the test build in dev/.test-extension).

## Customizations

- Real screen recordings of the extension captured with Playwright, not illustrations.
- Titles and on-screen keycap captions for every shortcut shown.

## Notes

- Inferred (no questions asked, user said just build): 16:9 1920x1080, ~70s, silent (no music requested),
  light neutral look matching the extension's teal accent.
- Footage shows fictional people from the mock feed only; no real LinkedIn branding or accounts.

---

## v2 — 2026-10-22 (follow-on version)

```yaml
workflow: general-video
flow: automation
storyboard: yes
message: "Swipe Mode shows your LinkedIn feed and your X timeline one post at a time, and every action stays your choice"
destination: desktop-web
aspect: 1920x1080
language: en
audience: LinkedIn and X users trying the extension for the first time
length: ~120s
angle: narrated how-to covering every feature
voice: kokoro am_adam (US male)
```

### Intent (user's words)
"Create again using appropriate skills and logos along with male voiceover and music, cover all the features."
Asked: real screenshots/recordings, with what's displayed matching the narration.

### Assets
- Logos: Swipe Mode (vector, dev/make-icons.js), LinkedIn (.media/images/logo_001.svg), X (.media/images/logo_002.svg), both official marks via media-use.
- Footage: Playwright recordings of the real extension on dev/mock-feed (LinkedIn) and dev/mock-feed/x (X).
- Music: this project's MusicGen bed (assets/bgm/track.wav, 28s seed) re-looped to length. Not signed in to HeyGen; MusicGen not installed on this machine (low RAM).

### Notes
- v1 root preserved as index.v1.html; v2 scenes live in compositions/v2/.
- Disclaimer on the close: not affiliated with LinkedIn or X.

---

## v3 — 2026-10-28 (new film, same project)

```yaml
workflow: general-video
flow: automation
storyboard: yes
message: "Swipe Mode runs your LinkedIn and X feed from the keyboard, and now turns a post plus picked replies into a clean square image"
destination: desktop-web (GitHub README)
aspect: 1920x1080
language: en
length: ~72s
angle: "Never touch the mouse", opened on the finished image
voice: kokoro af_heart (US female), one clip per subtitle phrase
```

### Intent (user's words)
"Create a new video with better storyboard ... mention my details in the end which are my github, my email and my linkedin";
"for other project, add this QR"; "the old one is glitchy and we have added new features";
"no need to say meme anywhere"; "we need audio"; "make sure audio and screen motion are in sync, if possible add
subtitles but keep things aesthetic". Apply the LottieFiles motion-design skill.

### Assets
- assets/v3/prasanna.png (author photo), assets/v3/pacos-qr.jpg (QR; decodes to https://pacos.onrender.com/ —
  the user wrote "pacos.onreader.com", the card shows what the code opens).
- Footage: dev/record-demo-v3.js, keyboard only, Chrome screencast frames timed to the voice.
- Music: assets/bgm-v2/bed-long.wav trimmed to length, carved under the voice.

### Notes
- This PC had no FFmpeg/Kokoro: FFmpeg 9.0.2 in ~/tools/ffmpeg (gyan.dev, checksum verified), Kokoro in
  ~/.cache/hyperframes/tts-venv with onnxruntime 1.20.1 (newer builds fail to load here).
- v2's root moved to archive/index.v2.html (two roots would both play).
