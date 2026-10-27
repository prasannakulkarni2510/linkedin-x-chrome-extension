// Every X (x.com) DOM assumption lives here (NFR-006). X marks its controls with data-testid
// attributes, which change far less often than its class names; prefer them.
// Each entry is an ordered list: first match wins.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.SwipeMode = root.SwipeMode || {}).selectors = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SEL = {
    post: ['article[data-testid="tweet"]'],
    // The post's own timestamp link; quoted posts have one too, so callers exclude the quote.
    permalink: ['a[href*="/status/"]:has(> time)', 'a[href*="/status/"]:has(time)'],

    header: ['[data-testid="socialContext"]'],
    userName: ['[data-testid="User-Name"]'],
    userLink: ['[data-testid="User-Name"] a[href^="/"]:not([href*="/status/"])', '[data-testid="Tweet-User-Avatar"] a[href^="/"]'],
    verified: ['[data-testid="icon-verified"]'],
    avatar: ['[data-testid="Tweet-User-Avatar"] img', '[data-testid^="UserAvatar-Container"] img'],
    time: ['time'],

    text: ['[data-testid="tweetText"]'],
    showMore: ['[data-testid="tweet-text-show-more-link"]'],
    images: ['[data-testid="tweetPhoto"] img'],
    video: ['[data-testid="videoPlayer"]', '[data-testid="videoComponent"]', 'video'],
    poll: ['[data-testid="cardPoll"]'],
    card: ['[data-testid="card.wrapper"]'],
    // A quoted post: a link-role block inside the post that carries its own author line.
    quote: ['div[role="link"]:has([data-testid="User-Name"])'],
    // Section headings in the post page's list, outside any post. Replies end at the first one
    // ("Discover more": posts X recommends, not replies).
    sectionHeading: ['[data-testid="cellInnerDiv"] h2', '[data-testid="cellInnerDiv"] [role="heading"]'],

    actionBar: ['[role="group"]'],
    like: ['button[data-testid="like"]'],
    unlike: ['button[data-testid="unlike"]'],
    reply: ['button[data-testid="reply"]'],
    retweet: ['button[data-testid="retweet"]'],
    unretweet: ['button[data-testid="unretweet"]'],
    bookmark: ['button[data-testid="bookmark"]'],
    removeBookmark: ['button[data-testid="removeBookmark"]'],
    caret: ['button[data-testid="caret"]'],

    retweetConfirm: ['[data-testid="retweetConfirm"]'],
    menuItem: ['[role="menuitem"]'],
    dialog: ['[role="dialog"]'],
    composerEditor: ['[data-testid="tweetTextarea_0"][contenteditable="true"]', '[data-testid="tweetTextarea_0"] [contenteditable="true"]', '[data-testid="tweetTextarea_0"]'],
    composerSubmit: ['button[data-testid="tweetButton"]'],
    composerClose: ['button[data-testid="app-bar-close"]'],
    discardConfirm: ['[data-testid="confirmationSheetConfirm"]'],
    toast: ['[data-testid="toast"]', '[role="alert"]'],
    alertDialog: ['[role="alertdialog"]'],
    loadMore: [],

    loginWall: ['[data-testid="loginButton"]', 'input[autocomplete="username"]', 'iframe[src*="arkoselabs" i]'],
  };

  // English text patterns. Localized X accounts keep the data-testid selectors and lose only
  // these fallbacks.
  const TEXT = {
    promoted: /^(ad|promoted)$/i,
    quote: /^\s*quote\b/i,
    toastSent: /\b(your (post|reply) was sent|post sent|reply sent|sent)\b/i,
    toastBookmark: /\bbookmark/i,
    toastRepost: /\brepost/i,
    warning: /rate limit|over the daily limit|temporarily (limited|restricted|locked)|account (is|has been) (locked|suspended)|unusual activity|verify (that )?you|are you a robot|try again later/i,
  };

  const BLOCKED_PATHS = [/^\/i\/flow\/(login|signup|consent_flow)/, /^\/login/, /^\/account\/access/, /^\/account\/suspended/, /^\/i\/flow\/single_sign_on/];

  return { SEL, TEXT, BLOCKED_PATHS };
});
