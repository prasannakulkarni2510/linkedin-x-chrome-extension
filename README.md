# Swipe Mode

A Chrome extension that turns your LinkedIn feed or X timeline into a focused, one-post-at-a-time reader.
Read vertically, skip left, open your options right, and pick the action yourself. Every
reaction, comment, repost and save goes through LinkedIn's own buttons, and Swipe Mode only
reports success when LinkedIn shows it.

Built from `linkedin-swipe-extension-prd.md`. Choices the PRD left open are recorded in
[`docs/DECISIONS.md`](docs/DECISIONS.md).

> **Read this first.** LinkedIn's help page "Prohibited software and extensions" says third-party
> extensions that scrape, modify the appearance of, or automate activity on LinkedIn are not
> allowed, and accounts using them can be restricted. Swipe Mode reads posts on the page, draws its
> own overlay, and clicks LinkedIn's controls on your behalf when you choose an action. Use it at
> your own risk, keep the pacing guard on, and get legal advice before publishing it.

## Install

Swipe Mode is not on the Chrome Web Store. Install it from this repository:

1. Get the code, either way:
   - **Download:** on the repository page, click **Code**, then **Download ZIP**. Unzip it.
   - **Clone:**
     ```bash
     git clone https://github.com/prasannakulkarni2510/linkedin-x-chrome-extension.git
     ```
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and choose the `extension` folder inside the downloaded or cloned
   folder. Choose `extension`, not the top-level folder.
5. Open (or reload) your LinkedIn feed or your X timeline (x.com/home).

No `npm install` is needed to use the extension. That is only for running the tests.

**Update:** download the ZIP again (or run `git pull`), then click the reload icon on the Swipe Mode
card in `chrome://extensions` and reload your LinkedIn or X tab.

**On X** the same keys apply with X's actions: `R` Like (no picker), `C` Reply, `S` Bookmark, and
engage `3` Repost, `4` Quote. Keys never reach X's own shortcuts while Swipe Mode is open. See
`docs/DECISIONS.md` (X support) and the X automation-rules note on the Options page.

## Use

Start with the floating **Swipe Mode** button (bottom left), the toolbar icon, or `Alt+Shift+S`.

| Key | Action |
| --- | --- |
| `←` or `N` | Skip the post |
| `→` | Open the engage menu (never acts by itself) |
| `R`, then `1`-`6` | React: Like, Celebrate, Support, Love, Insightful, Funny (`0` removes yours) |
| `C`, then `Ctrl+Enter` | Write a comment and post it |
| `S` | Save |
| `O` | Open the post on LinkedIn in a background tab |
| `U` | Undo the last skip (up to 20) |
| `Space`, `↓`, `PgDn` / `Shift+Space`, `↑`, `PgUp` | Read further / back |
| `?` | Shortcuts for the current screen |
| `Esc` | Back one level; on the main card, exit and return to where you started |
| `X` | Exit and stay at the current post |

In the engage menu the numbers are fixed: `1` React, `2` Comment, `3` Repost, `4` Repost with your
thoughts, `5` Save, `6` Open, `7` Copy link, `8` Author's profile. Unavailable actions are hidden
but never renumber the others.

Trackpad: two-finger swipe left to skip, right to engage (one swipe is one decision, momentum
included). Mouse: drag the grip bar at the top of the card or the grip zone between Skip and
Engage. These never select text. Long-press the card for the engage menu.

After an action succeeds, Swipe Mode waits 1.5 seconds before moving on. Press `Esc` in that
window to stay on the post and do a second action (react, then comment).

## Settings and diagnostics

Right-click the toolbar icon, then **Options**:

- Wait after an action (0 to 4 seconds), pause before the next post appears (none to 1.2 seconds),
  Promoted posts on/off, floating button on/off.
- Pacing guard: minimum time between actions and a cap per 10 minutes. Reading and skipping are
  never limited.
- **Check my LinkedIn tab**: shows how many posts and buttons Swipe Mode can find on your open
  LinkedIn tab. Nothing is sent anywhere.

## Status: what is and isn't verified

- Verified: 84 unit tests (queue, keys, gestures, pacing, settings, ids) and 29 end-to-end tests
  that load the real extension in Chromium against `dev/mock-feed`, a local page that copies
  LinkedIn's post markup and behavior. `?scenario=v2` reproduces LinkedIn's 2026 feed (hashed
  classes, no post URNs), built from a real layout report of one post.
- Checked on a real feed (version 0.1.3): posts are found, read and skipped.
- **Not yet checked on a real feed:** the "Recommended for you" filter (0.1.4), the reaction
  safety fix (0.1.5 and 0.1.6), and reacting, commenting, saving, reposting. On the 2026 layout
  the reaction picker, comment box, menus and confirmation messages are best guesses (the layout
  report showed one post at rest, not its menus). The mock copies those guesses, so passing tests
  prove the code matches them, not that LinkedIn does. If an action shows "Couldn't complete
  that" or "Couldn't confirm", nothing was claimed as done; note the message and adjust
  `extension/src/linkedin/selectors.js`.
- **X (0.2.0) is not yet checked on real x.com.** It passes 15 end-to-end tests against
  `dev/mock-feed/x`, which copies X's `data-testid` markup from public knowledge of the site, not
  from a capture of the live site. If something fails there, run Options, then Inspect page layout
  on an X tab, and adjust `extension/src/x/selectors.js`.
- On the 2026 layout, **Open on LinkedIn** and **Copy link** are hidden: the page no longer
  exposes a post link Swipe Mode can read.
- Non-English LinkedIn: class-based selectors still work; the English text fallbacks (menu item
  names, toast messages) won't, so Save and Repost confirmation may show as "not confirmed".

## Develop

```bash
npm install          # Playwright, for tests and icons
npm test             # unit tests (Node built-in runner)
npm run e2e          # builds dev/.test-extension and runs the browser tests on the mock feed
npm run serve        # mock feed at http://localhost:5173
npm run icons        # regenerate extension/icons
node dev/record-demo.js   # re-record the tutorial footage
```

The test build (`dev/build-test-extension.js`) is a copy of `extension/` that also runs on
`http://localhost`. The shipped manifest only matches `https://www.linkedin.com/*`.

## Layout

```
extension/
  manifest.json
  src/core/        pure logic: ids, queue, keymap, gesture, pacing, catalog, settings
  src/linkedin/    LinkedIn profile + every LinkedIn DOM assumption: site, selectors, detector, actions, guards
  src/x/           X profile + every X DOM assumption (data-testid based), same file set
  src/ui/          shadow-DOM overlay and styles
  src/content/     controller (session, refill, input, results)
  src/background/  toolbar button, shortcut, background tabs
  options/         settings and diagnostics page
dev/               mock feeds (LinkedIn at /, X at /x/), test build, recorder, icon script
tests/unit, tests/e2e
videos/swipe-mode-tutorial/   HyperFrames project for the how-to video
```
