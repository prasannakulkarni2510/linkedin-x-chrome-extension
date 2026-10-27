---
message: "Swipe Mode: read one post at a time, skip left, engage right, and every action stays your choice"
audience: LinkedIn power users trying the extension for the first time
mode: autonomous
canvas: 1920x1080
duration: 64.5
---

Design: light canvas #EEF3F1 (teal-tinted), ink #13201D, muted #4B5B57, accent teal #0F766E, amber #F5B83D for key flashes.
Type: Montserrat 900/400 for statements, JetBrains Mono 700 for keys and labels (sans + mono: what you read vs what you press).
Concept: the keyboard is the hero. Every demo beat pairs the real screen moment with the physical key that caused it, pressed on the exact frame it was pressed in the recording.

## Frame 1
status: outline
src: compositions/frames/01-title.html
start: 0
duration: 4.5
blueprint: titlecard-reveal (Benefits variant) + spring-pop-entrance on the icon
beat: Icon pops, "Swipe Mode" settles, two value lines slide up, a stack of post cards fans out on the right. Hold.

## Frame 2
status: outline
src: compositions/frames/02-install.html
start: 4.5
duration: 8
rules: waterfall-entry (headline), gsap-effects stagger (rows)
beat: "Install it in four clicks" cascades in; four numbered steps arrive one by one with their check marks; "Then open your LinkedIn feed."

## Frame 3
status: outline
src: compositions/frames/03-demo.html
start: 12.5
duration: 44
rules: dynamic-content-sequencing (11 step blocks timed from demo-cues.json), press-release-spring (keycaps press on the recorded keystroke times)
beat: Real recording in a browser frame; right panel walks Start, Read, Skip, Undo, Engage, React, Comment, Save, Help, Swipe, Exit; chapter rail at the bottom.

## Frame 4
status: outline
src: compositions/frames/04-recap.html
start: 56.5
duration: 8
blueprint: grid-card-assemble (Key_Feature grid variant)
beat: "Your keys" with eight key cards assembling into a 4x2 grid; closing line "Every action stays your choice." Hold.

---

# v2 — 2026-10-22: every feature, LinkedIn and X (~124s, male VO, music)

message: "Swipe Mode shows your LinkedIn feed and your X timeline one post at a time, and every action stays your choice"
audience: LinkedIn and X users trying the extension for the first time
arc: Hook → Install → Core loop (LinkedIn) → Actions → Trust → Same keys on X → Input → Exit/Settings → Close

Design: v1's world kept (it is Swipe Mode's own brand, from the icon): light canvas #EEF3F1, ink #13201D,
muted #4B5B57, teal #0F766E, amber #F5B83D for key presses. Montserrat 900/400 statements, JetBrains Mono 700 keys.
New: a site rail top-left that carries the LinkedIn or X logo for the footage on screen, so the viewer always
knows which site they are watching. Footage sits in one browser frame that persists across every demo beat.

## Frame 1 — The hook (0–8s)
- act: Hook
- status: built
- src: compositions/v2/01-hook.html
- scene: Swipe Mode icon pops; a stack of posts fans out; LinkedIn and X logos land either side
- voiceover: "Endless scrolling buries the posts you care about. Swipe Mode shows your LinkedIn feed and your X timeline one post at a time."
- rules: spring-pop-entrance, titlecard-reveal

## Frame 2 — Install from GitHub (8–18s)
- act: Install
- status: built
- src: compositions/v2/02-install.html
- scene: Repo URL, then four steps check off: Download ZIP, Developer mode, Load unpacked, pick the extension folder
- voiceover: "Get it from GitHub. Download the ZIP, turn on Developer mode in Chrome, click Load unpacked, and pick the extension folder."

## Frame 3 — Start (18–25s)
- act: Core loop · LinkedIn
- status: built
- src: compositions/v2/03-demo.html (LinkedIn recording)
- scene: Cursor clicks the Swipe Mode button; keycaps Alt+Shift+S
- voiceover: "On LinkedIn, click the Swipe Mode button, or press Alt, Shift, S."

## Frame 4 — Read, skip, undo (25–37s)
- act: Core loop · LinkedIn
- status: built
- src: compositions/v2/03-demo.html
- scene: Card scrolls (↓), skips (←, SKIP stamp), comes back (U); the promoted post is passed over
- voiceover: "Each post gets the whole card. Arrow keys scroll. Left skips it, U brings it back, and promoted posts stay out of the way."

## Frame 5 — The engage menu (37–44s)
- act: Actions
- status: built
- src: compositions/v2/03-demo.html
- scene: → opens the numbered menu 1–8; nothing happens on the post
- voiceover: "Right opens your options, numbered one to eight. Nothing happens until you pick."

## Frame 6 — React, confirm, stay (44–55s)
- act: Actions
- status: built
- src: compositions/v2/03-demo.html
- scene: R, 2 (Celebrate); "Reacted" toast with the grace bar; Esc keeps the post
- voiceover: "Press R and a number to react. Swipe Mode waits for LinkedIn to confirm, then moves on. Press Escape to stay for one more action."

## Frame 7 — Comment, save, repost (55–67s)
- act: Actions
- status: built
- src: compositions/v2/03-demo.html
- scene: C, typed comment, Ctrl+Enter; S saves; engage 3 reposts, 4 opens LinkedIn's composer
- voiceover: "C writes a comment, and Control Enter posts it. S saves. Three reposts, and four adds your thoughts in LinkedIn's own window."

## Frame 8 — Honest results (67–74s)
- act: Trust
- status: built
- src: compositions/v2/03-demo.html (LinkedIn, broken-control recording)
- scene: "Couldn't confirm that on LinkedIn" dialog; nothing marked done; pacing-guard toast
- voiceover: "If the site doesn't confirm, Swipe Mode tells you. Nothing is marked done on a guess, and a pacing guard keeps you at human speed."

## Frame 9 — Same keys on X (74–91s)
- act: X
- status: built
- src: compositions/v2/04-x.html (X recording)
- scene: Site rail swaps LinkedIn → X; R likes (heart fills), C replies, S bookmarks, engage 4 quotes
- voiceover: "On X, it's the same keys. R likes, C replies, S bookmarks, and four quotes. X's own shortcuts are switched off, so a stray key never acts on the wrong post."

## Frame 10 — Swipe and drag (91–100s)
- act: Input
- status: built
- src: compositions/v2/04-x.html
- scene: Trackpad swipe skips; mouse drags the grip handle; long-press opens the menu
- voiceover: "On a trackpad, just swipe. With a mouse, drag the grip handle. It never selects text."

## Frame 11 — Help and exit (100–107s)
- act: Input
- status: built
- src: compositions/v2/04-x.html
- scene: ? opens shortcuts; Esc returns to the feed where you started; X stays on the post
- voiceover: "Question mark lists every shortcut. Escape returns you to where you started, and X leaves you on the current post."

## Frame 12 — Settings and safety (107–116s)
- act: Settings
- status: built
- src: compositions/v2/05-settings.html (Options page screenshot)
- scene: Options page: wait after an action, promoted posts, pacing guard, Check my tab
- voiceover: "In Options, tune the timing, keep the pacing guard on, and check your tab if a site changes its layout."

## Frame 13 — Close (116–124s)
- act: Close
- status: built
- src: compositions/v2/06-close.html
- scene: Swipe Mode logo with LinkedIn and X; repo address; "Every action stays your choice."; not-affiliated line
- voiceover: "Swipe Mode. Every action stays your choice."
- rules: grid-card-assemble (close), logo landing over still-moving footage

---

# v3 — 2026-10-28: never touch the mouse (~72s, female VO, subtitles, music)

Built by scripts/make-v3.mjs from assets/v3/timeline.json (voice: one entry per subtitle phrase) and
assets/v3/rec.json (take starts and key presses). Script: assets/v3/script.json. Recording: dev/record-demo-v3.js.

Lessons from v2 (glitches): spliced takes flashed mid-action; footage was a third of the frame; repeating giant
background words had broken seams; long dead holds; unreadable chapter rail. v3: one clean take per scene, the
window fills the frame and never moves between footage scenes, no background text, every beat moves.

Design: warm paper #f4f1ea, ink #14181f, teal #0f766e, amber #f5b83d only for key presses. Montserrat 800/500/600,
JetBrains Mono for keys and addresses. Motion (LottieFiles motion-design): one calm, polished personality;
rise-and-fade entrances power3.out ~0.6s, exits power2.in ~0.3s, hero first then a ≤0.3s stagger, ambient
light drifting behind every scene, camera pushes slowly on footage.

Sync: each phrase's keys fire in the recording at the moment the phrase is spoken; keycaps press on the
recorded frame; subtitles are the phrases themselves (one track).

| # | Scene | Picture | Voice |
|---|-------|---------|-------|
| 1 | hook | The real saved image; "5 keypresses. 0 mouse clicks." | This image took five keypresses. No mouse. |
| 2 | title | Icon, Swipe Mode, LinkedIn + X chips | This is Swipe Mode... one post at a time. |
| 3 | linkedin | Start, scroll, skip, undo, engage, react, save | Press Alt, Shift, S ... S saves the post. |
| 4 | trust | "Couldn't confirm that on LinkedIn" lands on its line | If LinkedIn doesn't confirm... |
| 5 | x | Same keys: start, like, bookmark | On X, it's the same keys... |
| 6 | shot | P, replies, 1 3, R (next takes its place), Enter; camera to the panel and back; "Saved" chip | Now, the new part... |
| 7 | result | The saved PNG, 1080×1080, file name | Clean, white, and ready to share. |
| 8 | install | Free on GitHub, repo URL, three steps | Swipe Mode is free on GitHub... |
| 9 | end | Photo, name, GitHub, LinkedIn, email; then PACOS card with QR, pacos.onrender.com | Built by ... my other project, PACOS. |

A "mouse clicks 0" counter sits in the window bar through every footage scene.
