# LinkedIn Swipe Mode — Chrome Extension V1 PRD

**Status:** V1 Product Requirements Document  
**Platform:** Google Chrome desktop extension  
**Primary principle:** **Read more. Decide faster. Engage intentionally.**

---

## 1. Objective

Create a Chrome extension that allows LinkedIn users to process large numbers of posts through a focused, swipe-based reading workflow.

The extension shall:

1. Detect posts on LinkedIn pages.
2. Prepare those posts into a processing queue.
3. Allow the user to explicitly activate **Swipe Mode**.
4. Present one post at a time in a focused interface.
5. Allow the user to read, skip, or intentionally engage with a post.
6. Perform selected engagement actions through LinkedIn's existing UI.
7. Automatically move to the next post after a successful engagement action.
8. Continue collecting posts as the queue becomes low.
9. Return the user to the original LinkedIn page and approximate scroll position when Swipe Mode ends.

The extension shall **not autonomously engage with LinkedIn content**.

---

## 2. Problem

LinkedIn's normal browsing experience requires users to repeatedly find a post, read it, decide whether it matters, locate an engagement control, interact with it, return to browsing, and repeat.

For users who consume a large volume of LinkedIn content, this creates unnecessary navigation and decision overhead.

The product separates the experience into two simple actions:

- **Vertical = consume/read**
- **Horizontal = decide**

The user should be able to process posts rapidly without losing control over every engagement action.

---

## 3. Users / Actors

### 3.1 Primary User

A LinkedIn user who wants to process a large number of posts efficiently.

Typical examples:
- LinkedIn creators
- influencers
- professionals building a network
- people who actively engage with industry content

### 3.2 LinkedIn

LinkedIn remains the source of truth for post content, available actions, reactions, comments, reposting, saving, profiles, and other native interactions.

### 3.3 Chrome Extension

The extension detects posts, maintains the temporary processing queue, provides Swipe Mode, interprets user gestures, and invokes LinkedIn's existing UI.

### 3.4 Future AI Services

Not part of V1.

No AI service is required for the V1 product.

---

## 4. Scope

### 4.1 In Scope

- Chrome desktop extension
- LinkedIn pages containing posts, including feed, profile, company, search, hashtag/topic, and other technically supported post-containing pages
- Automatic post detection and queue creation
- Duplicate detection
- Discovery-order processing
- Automatic additional post collection
- Explicit Swipe Mode activation
- One-post-at-a-time focused interface
- Vertical post reading
- Horizontal swipe decisions
- Mouse, trackpad, explicit button, and keyboard interaction
- Dynamic LinkedIn engagement actions
- Native LinkedIn reaction picker
- Extension comment interface with native LinkedIn submission
- Repost and Repost with your thoughts
- Session-only processing
- Approximate restoration of the original page and scroll position

### 4.2 Out of Scope

- Android or iOS applications
- Mobile browser extension
- AI post classification
- AI relevance scoring
- AI post ranking
- AI comment generation
- Autonomous engagement
- Automatic likes/reactions/comments/reposts/saves/follows/connections
- Extension account system
- Cloud account
- Social analytics dashboard
- Cross-device synchronization
- Permanent post history
- Recommendation engine
- Engagement automation without explicit user action

### 4.3 Future Considerations

Potential future capabilities include AI post classification, relevance filtering, queue ranking, comment suggestions, personalized prioritization, engagement analytics, persistent history, and cross-device synchronization.

---

## 5. Assumptions

1. Posts are processed in LinkedIn discovery order.
2. A Swipe Mode session begins when the user activates Swipe Mode and ends when the user exits it or the relevant browser context closes.
3. Duplicate posts are identified using the strongest stable identifier available, with URL/content-signature fallbacks where required.
4. V1 does not determine whether a post is important or relevant; the user decides.
5. LinkedIn is the source of truth for action availability.
6. The extension never claims an action succeeded without appropriate evidence.
7. Failed actions provide retry/continue behavior.
8. Swipe Mode uses a focused overlay/card rather than permanently replacing LinkedIn.
9. Media remains normally interactable where technically possible.
10. Long posts are vertically scrollable inside the card.
11. The interaction model is hybrid: the extension controls processing while selected actions use LinkedIn's native UI.
12. V1 does not send post content or engagement data to an extension backend.
13. Keyboard controls are context-sensitive and hierarchical.
14. Holding **Ctrl** displays shortcuts relevant to the current UI state.

---

## 6. Constraints

1. V1 is a Chrome desktop extension.
2. The extension uses the user's existing LinkedIn session.
3. No separate extension login is required.
4. Every engagement action requires explicit user choice.
5. The extension must not silently perform engagement actions.
6. The extension must not claim success without evidence from LinkedIn.
7. LinkedIn's changing DOM/UI structure may affect supported actions.
8. The extension must fail safely when LinkedIn controls cannot be identified.
9. The implementation should comply with applicable LinkedIn and Chrome Web Store requirements.
10. No backend is required for V1.

---

## 7. Functional Requirements

### FR-001 — LinkedIn Detection
Given the user is viewing a supported LinkedIn page, when the extension is active, it shall detect recognizable posts.

### FR-002 — Automatic Scanning
The extension may scan and prepare posts without activating Swipe Mode. Scanning shall not replace or significantly obstruct normal LinkedIn use.

### FR-003 — Swipe Mode Activation
Swipe Mode shall start only after explicit user activation through a small floating control.

### FR-004 — Normal LinkedIn State
Before activation, LinkedIn remains normally usable. The extension shall not force Swipe Mode.

### FR-005 — Queue Creation
Detected unique posts shall be placed into the current session queue in discovery order.

### FR-006 — Queue Deduplication
The same post shall not be presented more than once during a Swipe Mode session.

### FR-007 — One Post at a Time
Swipe Mode shall display one active post at a time.

### FR-008 — Post Reading
The user shall be able to read post content inside the card. Long content shall be vertically scrollable.

### FR-009 — Media Interaction
Where technically possible, users shall be able to interact with post media normally.

### FR-010 — Skip
A left swipe shall skip the current post and immediately show the next available post. The skipped post shall not reappear during the session.

### FR-011 — Engage
A right swipe shall open the engagement interface. It shall not automatically perform an engagement action.

### FR-012 — Dynamic Engagement Actions
The extension shall expose actions available for the current post. Unavailable actions shall be hidden.

### FR-013 — Native Reaction
Selecting React shall invoke LinkedIn's native reaction interface. The user chooses the reaction.

### FR-014 — Comment
Selecting Comment shall open an extension comment-writing interface. Submission shall use LinkedIn's native commenting mechanism. No AI generation is used.

### FR-015 — Repost
Repost shall provide both Repost and Repost with your thoughts where supported. The user must explicitly select the desired action.

### FR-016 — Other Actions
Where technically supported, the extension may expose actions such as Save, Follow, Connect, View Profile, Copy Link, and Open on LinkedIn. The action system shall be extensible.

### FR-017 — Explicit Engagement
Every engagement action shall originate from explicit user interaction.

### FR-018 — Automatic Advancement
After a successfully completed engagement action, the extension shall automatically advance to the next post.

### FR-019 — Action Failure
If an action fails or cannot be verified, the extension shall show failure, shall not report success, and shall allow retry or continue.

### FR-020 — Additional Queue Loading
When the queue becomes low, the extension shall attempt to obtain additional posts and may scroll the underlying LinkedIn page to trigger loading.

### FR-021 — Continuous Processing
The user shall be able to continue processing without manually returning to the LinkedIn page each time the initial queue is exhausted.

### FR-022 — No More Posts
If no additional posts can be obtained, the extension shall show **No more posts found** and provide a manual rescan option.

### FR-023 — Exit
The user shall be able to exit Swipe Mode at any time.

### FR-024 — Restore LinkedIn Context
On exit, the extension shall return the user to the original LinkedIn page and approximately restore the pre-activation scroll position.

### FR-025 — Session Disposal
When Swipe Mode ends, the temporary queue shall be discarded.

---

## 8. Business Rules

### BR-001 — User controls engagement
The extension assists with navigation and execution but never decides whether the user should engage.

### BR-002 — Right does not mean Like
A right swipe means the user wants to consider engagement. It does not mean Like.

### BR-003 — Left means Skip
A left swipe means skip this post for the current session.

### BR-004 — Explicit action
Every engagement must result from explicit user action.

### BR-005 — No duplicates
A post processed in the current session must not re-enter the queue.

### BR-006 — Native LinkedIn authority
The extension should use LinkedIn's existing UI wherever practical rather than bypassing it.

### BR-007 — Failed actions remain failed
An unsuccessful or unverifiable action must never be represented as successful.

### BR-008 — No AI
V1 performs no AI classification, ranking, recommendation, or generation.

---

## 9. UI Requirements

### UI-001 — Floating Activation Control
Normal LinkedIn pages shall contain a small, unobtrusive **Start Swipe Mode** control.

### UI-002 — Swipe Mode Layout
Swipe Mode shall use a hybrid visual design: recognizable LinkedIn post structure, reduced unnecessary chrome, and extension-specific controls.

### UI-003 — Focused Card
The active post shall be presented as a focused card/overlay showing author, content, media where available, processing state, skip, engage, and exit controls.

### UI-004 — Vertical Reading
Long posts shall support vertical scrolling inside the card. Vertical reading must not unintentionally trigger skip or engage.

### UI-005 — Horizontal Swipe
Left = Skip. Right = Engage.

### UI-006 — Animation
Swipe gestures shall use slide-style transitions. Keyboard/button transitions may use faster transitions.

### UI-007 — Compact Engagement Surface
The engagement interface shall remain compact. Additional actions shall be accessible through the long-press/drag interaction model.

### UI-008 — Dynamic Action Visibility
Only actions available for the current post shall be presented.

### UI-009 — Keyboard Interaction
Swipe Mode shall be fully usable without a mouse.

#### Main Swipe Mode

| Key | Action |
|---|---|
| `←` | Skip current post |
| `→` | Open Engage mode |
| `R` | Open Reaction mode |
| `C` | Open Comment |
| `S` | Save |
| `O` | Open post on LinkedIn |
| `Space` | Advance to next post |
| `Esc` | Exit current mode / close Swipe Mode |
| `Ctrl` | Show keyboard shortcuts |

`→` shall never directly perform an engagement action.

#### Reaction Mode

Pressing `R` enters Reaction Mode.

The extension shall display the reactions currently available through LinkedIn.

Example:

```text
REACTIONS

1  Like
2  Love
3  Celebrate
4  Insightful
5  Funny
6  Curious

Esc  Back
```

The exact options shall be determined dynamically from LinkedIn.

`R → 1` selects reaction 1.  
`R → 2` selects reaction 2.  
And so on.

#### Engage Mode

Pressing `→` opens the engagement menu.

Example:

```text
ENGAGE

1  React
2  Comment
3  Repost
4  Repost with thoughts
5  Save
6  Open on LinkedIn

Esc  Back
```

Only currently available actions shall be displayed.

#### Hierarchical Commands

The shortcut system shall support multi-step commands.

Example:

```text
R → 2
```

means open Reaction Mode and select reaction 2.

A nested command may also be supported where an action opens another menu, for example:

```text
→ → 1 → 3
```

meaning Engage → React → reaction 3.

The exact sequence shall follow the currently displayed menu.

#### Context-Sensitive Shortcuts

Shortcut behavior shall change according to the current UI state.

While the user is typing a comment, normal keyboard input shall be preserved. Shortcut letters such as `C`, `R`, and `S` must not interfere with comment composition.

#### Ctrl Shortcut Overlay

Holding `Ctrl` shall display shortcuts relevant to the current state.

Example main-state overlay:

```text
KEYBOARD SHORTCUTS

←  Skip              →  Engage
R  Reactions         C  Comment
S  Save              O  Open
Space  Next          Esc  Exit

Hold Ctrl to view
```

When `Ctrl` is released, the overlay disappears.

While in Reaction Mode, the overlay shall instead show the currently available reaction keys.

### UI-010 — Exit
A clearly accessible Exit/Close control shall always be available.

### UI-011 — Queue State
The interface may communicate queue availability, but the current post remains the primary visual element.

### UI-012 — End State
When no more posts are available, display **No more posts found** with **Scan Again** and **Exit Swipe Mode**.

---

## 10. Data Requirements

### DATA-001 — Session Post Record
Temporary post records may include stable post ID, post URL, source page, discovery position, processing status, available actions, and interaction references.

### DATA-002 — Session State
Session state shall include current post, queue, seen/processed identifiers, skipped identifiers, source page, initial scroll position, and active state.

### DATA-003 — No Permanent History
V1 shall not require persistent storage of processed posts, comments, engagement history, or post content history.

### DATA-004 — Local Processing
Core V1 processing should remain local to the browser/extension.

### DATA-005 — Privacy
V1 shall not send LinkedIn post content to external AI or analytics services.

---

## 11. Error Handling

### ERR-001 — Unparseable Post
If a post cannot be reliably identified, do not add it to the queue and continue with other detectable posts.

### ERR-002 — LinkedIn UI Changed
If the expected LinkedIn control cannot be found, do not guess or perform an unintended action. Report unavailable/failed and allow continuation.

### ERR-003 — Action Failure
Show a failure state with Retry and Continue.

### ERR-004 — Content Loading Failure
Show a recoverable error and allow the user to skip the post.

### ERR-005 — Queue Loading Failure
Avoid indefinite scrolling/retrying. Notify the user and provide manual rescan.

### ERR-006 — Unexpected Navigation
Preserve session state where possible; otherwise exit safely without falsely reporting completed actions.

### ERR-007 — Extension Reload
V1 does not guarantee restoration of a Swipe Mode session after extension reload or page refresh.

---

## 12. Non-Functional Requirements

### NFR-001 — Responsiveness
Transitions between already queued posts should feel immediate.

### NFR-002 — Performance
Post scanning shall be incremental and avoid unnecessary processing.

### NFR-003 — Resource Usage
Automatic collection shall avoid excessive DOM scanning, scrolling, memory use, and CPU use.

### NFR-004 — Reliability
Correct interaction is more important than aggressive automation. Unknown states shall fail safely.

### NFR-005 — Privacy
No external backend is required for the core V1 experience.

### NFR-006 — Maintainability
LinkedIn selectors/action detection should be isolated so LinkedIn UI changes can be adapted without rewriting the entire application.

### NFR-007 — Extensibility
New LinkedIn actions should be addable without redesigning Swipe Mode.

---

## 13. Dependencies

### Required
- Google Chrome desktop
- LinkedIn web application
- User's authenticated LinkedIn session
- Chrome Extension APIs

### Expected Technical Architecture
1. **Content script** — page detection, post discovery, DOM interaction, native action invocation.
2. **Swipe Mode UI** — focused card, gestures, actions, queue presentation.
3. **Extension state layer** — queue, deduplication, current post, restoration state.
4. **Background/service worker** — extension lifecycle and supporting Chrome APIs where required.

No backend is required for V1.

---

## 14. Acceptance Criteria

### AC-001 — Activation
Given the user is viewing LinkedIn, the normal LinkedIn interface remains usable until the user explicitly activates Swipe Mode.

### AC-002 — Reading
Given a long post is displayed, the user can vertically scroll it without accidentally skipping or engaging.

### AC-003 — Skip
Given a post is displayed, when the user swipes left, the post is skipped and the next post appears. The skipped post does not reappear during the session.

### AC-004 — Engage
Given a post is displayed, when the user swipes right, the engagement interface opens and no engagement action occurs automatically.

### AC-005 — Reaction
Given React is available, selecting React opens LinkedIn's native reaction picker. The extension does not silently choose a reaction.

### AC-006 — Keyboard Reaction
Given multiple reactions are available, pressing `R` opens Reaction Mode and pressing a displayed number selects that reaction without requiring a mouse.

### AC-007 — Comment
Given Comment is available, the user can write and submit a comment through LinkedIn's native commenting mechanism.

### AC-008 — Repost
Given Repost is available, the user can explicitly choose between Repost and Repost with thoughts where supported.

### AC-009 — Dynamic Actions
Given two posts expose different actions, each engagement interface displays only actions available for that post.

### AC-010 — Automatic Advancement
Given an engagement action succeeds, the extension advances to the next post.

### AC-011 — Failed Action
Given an action fails, the extension displays failure and never reports it as successful.

### AC-012 — Queue Expansion
Given the queue is low and more posts are available, the extension attempts to load additional posts.

### AC-013 — No More Posts
Given no additional posts can be discovered, the extension shows the no-more-posts state and allows Scan Again or Exit.

### AC-014 — Exit Restoration
Given Swipe Mode was activated from a particular page and scroll position, exiting returns to that page and approximately restores that position.

### AC-015 — Session Disposal
Given the user exits Swipe Mode, the temporary queue is discarded.

### AC-016 — Explicit Engagement
Given the user takes no engagement action, the extension performs no LinkedIn engagement.

### AC-017 — Mouse-Free Workflow
Given Swipe Mode is active, the user can read, skip, open engagement, select reactions, comment, repost, save, open a post, advance, and exit using only keyboard interaction.

### AC-018 — Ctrl Help
Given the user holds `Ctrl`, the extension displays shortcuts relevant to the current UI state.

### AC-019 — Comment Typing
Given the user is entering a comment, keyboard input is entered into the comment field and does not trigger unrelated extension shortcuts.

### AC-020 — No AI
Given any post is processed, V1 requires no AI service for classification, ranking, recommendation, or generation.

---

## 15. Open Questions

No product-blocking questions remain.

The following may be finalized during implementation:

1. Exact gesture thresholds.
2. Exact queue low-water threshold.
3. Exact animation durations.
4. Exact keyboard timing/chord behavior.
5. Exact post-ID fallback hierarchy.
6. Exact LinkedIn DOM selectors and action-detection mechanisms.
7. Exact visual dimensions and responsive behavior.
8. Exact confirmation mechanism where LinkedIn's native UI varies.

These are implementation decisions rather than unresolved product requirements.

---

## Product Definition

**LinkedIn Swipe Mode is a Chrome extension that turns LinkedIn's post stream into a user-controlled processing queue: read vertically, skip left, consider engagement right, explicitly choose the LinkedIn action, then move immediately to the next post.**
