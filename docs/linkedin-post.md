# LinkedIn post draft

Every claim below is backed by the project as it stands (see "Before you post" for what to avoid
saying).

## Main version

I built a swipe-style reader for my LinkedIn feed. Halfway through, LinkedIn redesigned the page.

I read a lot of posts here and wanted a calmer way through the feed: one post at a time, skip
left, engage right, keyboard first. So I wrote a product spec and built "Swipe Mode", a small
Chrome extension prototype, together with an AI coding agent.

What it does:
• One post at a time in a focused card
• ← skips, U undoes, → opens your options (it never likes anything on its own)
• R plus a number reacts, C comments, S saves, all through LinkedIn's own buttons
• Runs entirely in your browser: no account, no server, no history kept

What I learned:

1. "Never claim success without evidence" is a design rule, not a slogan. In testing, a
reaction could land on a comment's Like button instead of the post. A test now guards against
it, and a comment LinkedIn silently drops is reported as failed, not done.

2. Test against reality, not your assumptions. All my tests passed against a mock feed while the
real feed had been redesigned with scrambled class names and no post IDs. One layout report from
the live page showed what changed, and the fix followed.

3. Speed limits are a feature. A fast keyboard can look like a bot, so pacing is built in.

It's a personal prototype: 113 automated tests against a mock feed, plus checks on my own feed.
The video uses a mock feed with fictional people.

Would you read your feed this way?

#BuildInPublic #ChromeExtension #ProductDesign #AI

## Shorter version

I built a swipe-style reader for my LinkedIn feed: one post at a time, ← to skip, → to engage,
every action my explicit choice and confirmed before it counts.

Biggest lesson: my tests passed while the real page had been redesigned underneath me. Test
against reality, not your assumptions.

Personal prototype, built with an AI coding agent. Video uses a mock feed with fictional people.

#BuildInPublic #ChromeExtension

## Before you post

- **Account risk.** LinkedIn's help page "Prohibited software and extensions" says extensions
  that modify or automate LinkedIn aren't allowed, and LinkedIn's own scripts on your feed probe
  for installed extensions (the `chrome-extension://invalid/` errors you saw). Posting about it
  is your call. The draft frames it as a personal prototype with no download link or "install
  this" call to action; adding one raises the risk.
- **Media.** Attach the tutorial video (`videos/swipe-mode-tutorial/renders/…mp4`) or stills
  from it. It shows only the mock feed and fictional people. It still shows the older teal design;
  re-record first if you want the LinkedIn-style card. Re-recording changes the timing, so the
  key-press times (`STEPS[].at/press` in `compositions/frames/03-demo.html`) and every sound
  effect's `data-start` in `index.html` must be re-derived from the new `assets/demo-cues.json`. Don't post screenshots of your real feed:
  they show your name and other people's posts.
- **Claims to avoid** until you've tried them on your real feed: "works on LinkedIn",
  "tested on LinkedIn", or anything about reacting, commenting or saving working there. Those
  actions are only verified against the mock so far.
- "Built with an AI coding agent" is accurate; name the tool if you want to.
