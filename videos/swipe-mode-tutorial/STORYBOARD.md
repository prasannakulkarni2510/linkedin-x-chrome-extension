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
