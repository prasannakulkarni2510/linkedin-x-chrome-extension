# Decisions made while building V1

The PRD left these open or contradicted itself. Each one was decided as the "proposed default"
from the PRD review and is easy to change. PRD ids in brackets.

## Product

- **LinkedIn policy risk** (Constraint 6.9). Built with guardrails instead of ignoring it: pacing
  guard on by default (1.5 s between actions, 30 per 10 minutes), Swipe Mode stops and never
  retries when LinkedIn shows a sign-in wall, security check, or a restriction/limit warning, no
  background scanning, and a warning in the README and Options page. Store submission still needs
  a legal review.
- **Name.** "Swipe Mode", not "LinkedIn Swipe Mode", so it doesn't imply affiliation.
- **Undo** (gap in FR-010/BR-005). `U` brings back the last skipped post, up to 20 deep. Only skips
  can be undone; Swipe Mode never undoes something it did on LinkedIn.
- **Two actions on one post** (FR-018). Auto-advance stays, after a 1.5 s grace window. `Esc` in
  that window keeps the post, so "react, then comment" works. Configurable from 0 to 4 s.
- **Already done** (FR-012). Posts you already reacted to show a "You reacted" badge. Reacting the
  same way again or saving an already-saved post does nothing and says so. `0` in the reaction
  menu removes your reaction explicitly.
- **V1 actions** (FR-016). In: React, Comment, Repost, Repost with your thoughts, Save, Open,
  Copy link, Author's profile. Open and Copy link need a post URN, which LinkedIn's 2026 feed
  no longer exposes, so they are hidden there.
- **What counts as a post.** A feed card needs a React or Comment button. Follow-suggestion
  boxes ("Recommended for you") share the post shell and are left out.
- **Reaction safety.** On the click-to-open picker, only buttons that appear after the click
  count as reaction options, so a comment's own Like button is never pressed by mistake. Out: Follow, Connect (invitation limits, public and hard to undo),
  Send, Hide, Unfollow, Report.
- **What enters the queue.** From the first post visible when you start, downward. Promoted posts
  are left out by default. Already-engaged posts stay in, with a badge.
- **Exit** (FR-024). `Esc` returns to where you started (anchored to the post that was on screen,
  not a raw pixel offset). `X` exits and stays at the current post.
- **No memory after exit** (DATA-003). Nothing is stored except settings.

## Spec fixes

- **Reaction picker** (FR-013 vs UI-009). Swipe Mode shows its own numbered list and clicks the
  matching option in LinkedIn's native picker. You always pick; Swipe Mode never chooses for you.
- **Reaction numbers** are fixed by reaction, not by position: 1 Like, 2 Celebrate, 3 Support,
  4 Love, 5 Insightful, 6 Funny (the PRD example still listed the retired "Curious").
- **Space** scrolls the card (UI-009 had it as "advance", which made keyboard reading impossible
  for AC-017). `N` is an alias for skip.
- **Help** is `?` instead of holding `Ctrl`. Holding Ctrl while pressing R, S, O or C triggers
  reload, save page, open file and copy, and Ctrl alone silences screen readers.
- **Starting by keyboard** (FR-003). `Alt+Shift+S` and the toolbar icon also start Swipe Mode.
- **Long-press** (UI-007). Long-pressing the card opens the engage menu.
- **Shortcuts** match on physical keys (`event.code`), so they work on AZERTY, Cyrillic and other
  layouts. Held keys don't repeat actions. IME typing is never intercepted.
- **Gestures.** One trackpad swipe, momentum included, is exactly one decision. Horizontal
  scrolling over the card never triggers browser back/forward.

## Success, failure, unconfirmed

Every action ends in one of three states:

- **Succeeded**: LinkedIn showed it (reaction button state, the comment in the thread, a "saved" or
  "repost" confirmation).
- **Failed**: the control wasn't found or didn't respond. Nothing was sent. Retry is offered.
- **Not confirmed**: something may have happened. For comments and reposts there is no Retry,
  because a retry could post twice; you get "Open post" to check instead.

Repost with your thoughts hands the screen to LinkedIn's own composer and resumes when it closes.

## Not done in V1

- Testing against live LinkedIn (see README).
- Localization of the extension UI, cross-tab coordination, telemetry.

## X (x.com) support (0.2.0)

One extension, two sites. The manifest has one content-script entry per site. Each entry loads
its site profile first (`src/linkedin/site.js` or `src/x/site.js`), then the shared core, UI and
controller, then that site's selectors, detector, actions and guards. The site's name and wording,
and how it differs, come from the profile, so the controller and UI have no site checks.

- **Same slots, X labels.** 1 Like, 2 Reply, 3 Repost, 4 Quote, 5 Bookmark, 6 Open on X,
  7 Copy link, 8 Author's profile. `R` likes directly (X has one reaction, so there is no picker).
  `R` on a post you already liked does nothing and says so; it never unlikes.
- **Keys never reach X.** X binds single letters (L like, T repost, J/K move). While Swipe Mode is
  open, every unmodified key stops at Swipe Mode, including while you type a reply. The exception
  is X's own quote window during the handover.
- **Show more.** X's "Show more" opens the post page, which would end the session. Swipe Mode never
  clicks it and offers "Show more on X (O)" instead.
- **Virtualized timeline.** X removes posts far from the viewport. Before acting, Swipe Mode
  scrolls the page back to the post until X mounts it again.
- **Reply** uses Swipe Mode's composer and X's reply window, and counts as done only on X's "sent"
  toast. **Quote** hands over to X's own composer, like LinkedIn's "Repost with your thoughts".
  X's /compose/... URL during either is not treated as leaving the page.
- **Reply length** is capped at 280 characters in the card. Premium long replies are not supported
  yet.
- **Policy.** X's automation rules prohibit automated likes, reposts and replies. Swipe Mode acts only
  on an explicit choice and keeps the pacing guard, but X can still treat extension activity as
  automation. See the Options page.

## Drag handles (0.2.0)

Dragging on post text selects it, which made swiping by mouse unreliable. The card now has a grip
bar at the top and a grip zone between Skip and Engage. Dragging a handle always swipes and never
selects text. The author header, badges and footer are not selectable, and any selection is
cleared when a horizontal swipe starts. Post text stays selectable on purpose.

## Tweet screenshots (0.3.0)

- **Drawn, not captured.** The image is redrawn on a canvas from the post’s data (name, handle,
  badge, text, photos), not a screen capture. That gives a clean 1:1 frame on white regardless of
  theme, window size or what else is on screen, and needs no extra screen-capture permission.
- **Square fit.** The layout width is chosen so the content is as close to square as possible, then
  scaled to 1080×1080. Many long replies make the text smaller rather than cropping it.
- **Inside Swipe Mode.** `P` on the card and slot `9` in X's engage menu. The panel docks on the
  right and the card moves left; Swipe Mode passes keys to it (Space, Tab, Enter) but never to X.
- **Replies come from the post page.** X only loads replies there. From the timeline, the service
  worker opens the post in a background tab next to yours, the content script there reads the
  replies (waiting until no new ones arrive, scrolling further for "Load more"), and the tab closes,
  so Swipe Mode and your place in the timeline stay put. X's API would avoid the tab but needs its
  private query ids, which change often. Replies are remembered once seen, because X unmounts
  posts while you scroll.
- **Only replies.** Replies end at the first section heading below the post (X's "Discover more",
  which lists recommended posts). Ads are left out. Found by structure (a heading outside any
  post), not wording, so it works in any language; if X ever puts a heading above its replies,
  this is the place to look.
- **Long replies.** X cuts long replies off at "Show more" too. Such replies are marked in the list,
  and picking one fetches its full text from its own page in a background tab, one at a time.
  Saving waits for those fetches.
- **Folder.** Chosen once with Chrome’s folder picker in an extension window. The folder handle
  lives in the extension’s own storage and the background worker writes the file, so x.com never
  gets access to the folder. Chrome may ask to allow it again after a restart.
- **Full text.** The timeline cuts long posts off at "Show more". The post's own page shows all of
  it, so the full text comes from there: from the background tab, or from the page itself when
  you're on it. Saving before it arrives saves the cut-off text.
- **Badge colours.** Blue badges take the badge's colour; gold (organisations) and grey (government)
  badges are filled with a gradient, so their colour is read from the gradient instead.
- **Photos.** X’s image servers don’t let x.com read pixels, so the background worker fetches
  avatars and photos (new host permissions for pbs/abs/video.twimg.com). Videos use their poster.
- **X only.** LinkedIn has no equivalent yet.

## Keys before the site's (0.3.0)

`O` did nothing on live X while clicking "Show more on X" worked. X listens for keys on `window`
in the capture phase too (`o` expands a photo), and its listeners were added before Swipe Mode's,
which load at document_idle, so X saw the key first. A tiny content script now runs at
document_start (`src/core/early-keys.js`), adds the first `window` listeners on the page, and the
controller registers its key handling through it.
