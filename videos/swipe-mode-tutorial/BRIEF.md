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
