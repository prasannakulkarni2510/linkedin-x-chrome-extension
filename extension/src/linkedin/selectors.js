// Every LinkedIn DOM assumption lives here (NFR-006). When LinkedIn changes its markup,
// update these lists; nothing else should hard-code LinkedIn classes or labels.
// Each entry is an ordered list: first match wins.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.SwipeMode = root.SwipeMode || {}).selectors = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SEL = {
    post: [
      // 2026 feed: hashed classes, no URNs; the card id lives in componentkey.
      'div[role="listitem"][componentkey^="update-card"]',
      '[componentkey^="update-card"]',
      'div.feed-shared-update-v2[data-urn]',
      'div[data-urn^="urn:li:activity:"]',
      'div[data-urn^="urn:li:ugcPost:"]',
      'div[data-urn^="urn:li:share:"]',
      'div[data-id^="urn:li:activity:"]',
      'div[data-view-name="feed-full-update"]',
    ],
    permalink: ['a[href*="/feed/update/urn:li:"]', 'a[href*="/posts/"]'],

    header: ['.update-components-header', '.feed-shared-header'],
    actor: ['.update-components-actor', '.feed-shared-actor'],
    actorName: [
      '.update-components-actor__title span[aria-hidden="true"]',
      '.update-components-actor__title',
      '.update-components-actor__name',
      '.feed-shared-actor__name',
    ],
    actorHeadline: ['.update-components-actor__description', '.feed-shared-actor__description'],
    actorTime: ['.update-components-actor__sub-description', '.feed-shared-actor__sub-description'],
    actorLink: [
      'a.update-components-actor__meta-link',
      'a.update-components-actor__image',
      'a[href*="/in/"]',
      'a[href*="/company/"]',
    ],
    actorAvatar: ['.update-components-actor__avatar img', 'img.update-components-actor__avatar-image', 'img'],

    text: ['[data-testid="expandable-text-box"]', '.update-components-text', '.feed-shared-update-v2__description', '.feed-shared-inline-show-more-text', '.feed-shared-text'],
    seeMore: [
      '[data-testid="expandable-text-button"]',
      'button.feed-shared-inline-show-more-text__see-more-less-toggle',
      'button[aria-label*="see more" i]',
    ],
    images: ['img.update-components-image__image', '.update-components-image img', '.feed-shared-image img'],
    video: ['.update-components-linkedin-video', '.feed-shared-linkedin-video', 'video'],
    document: ['.update-components-document__container', '.feed-shared-document'],
    poll: ['.update-components-poll', '.feed-shared-poll'],
    article: ['.update-components-article', '.feed-shared-article'],
    articleTitle: ['.update-components-article__title', '.feed-shared-article__title'],
    articleSubtitle: ['.update-components-article__subtitle', '.feed-shared-article__subtitle'],
    articleLink: ['a.update-components-article__meta', 'a[href]'],
    reshare: ['.update-components-mini-update-v2', '.feed-shared-update-v2__update-content-wrapper'],
    socialCounts: ['.social-details-social-counts'],

    actionBar: ['.feed-shared-social-action-bar', '.feed-shared-social-actions', '.social-actions'],
    reactButton: [
      'button[aria-label^="Reaction button state"]',
      'button.react-button__trigger',
      'button[aria-label^="React"]',
      'button[aria-label="Like"]',
    ],
    reactionsOpen: ['button[aria-label="Open reactions menu"]'],
    reactionsMenu: ['.reactions-menu', '[role="toolbar"][aria-label*="eaction"]'],
    reactionOption: ['button.reactions-menu__reaction-index', 'button.reactions-menu__reaction', 'button'],
    commentButton: ['button.comment-button', 'button[aria-label="Comment"]', 'button[aria-label^="Comment"]'],
    commentEditor: [
      '.comments-comment-box__form .ql-editor',
      '.comments-comment-texteditor [contenteditable="true"]',
      '.comments-comment-box [contenteditable="true"]',
      '[contenteditable="true"][role="textbox"]',
    ],
    commentSubmit: [
      'button.comments-comment-box__submit-button',
      'button.comments-comment-box__submit-button--cr',
      '.comments-comment-box__form button[type="submit"]',
    ],
    commentItem: ['article.comments-comment-entity', 'article.comments-comment-item', '.comments-comment-item'],
    repostButton: ['button.social-reshare-button', 'button[aria-label^="Repost"]'],
    controlMenuTrigger: [
      'button.feed-shared-control-menu__trigger',
      'button[aria-label*="control menu" i]',
      'button[aria-label*="More actions" i]',
    ],
    menuItem: [
      '.artdeco-dropdown__content [role="button"]',
      '.artdeco-dropdown__item',
      '.feed-shared-control-menu__item',
      '[role="menuitem"]',
    ],
    toast: ['.artdeco-toast-item', '.artdeco-toasts_toasts li', '[role="alert"]', '[role="status"]', '[aria-live="polite"]', '[aria-live="assertive"]'],
    dialog: ['div[role="dialog"]', '.artdeco-modal'],
    loadMore: ['button.scaffold-finite-scroll__load-button'],

    loginWall: ['.authwall', 'form.login__form', '#captcha-internal', 'iframe[src*="captcha" i]'],
  };

  // English text patterns. LinkedIn localizes its UI, so non-English accounts rely on the
  // class/attribute selectors above and lose only the text-based fallbacks.
  const TEXT = {
    promoted: /\bpromoted\b/i,
    menuAuthor: /post by (.+?)\s*$/i,
    reactionState: /reaction button state:\s*(.+)$/i,
    timeStamp: /^(\d+\s?(s|m|h|d|w|mo|yr|y)\b|promoted\b|just now)/i,
    moreButton: /^(…|\.\.\.)?\s*(see )?more$/i,
    submitLabel: /^(comment|post|reply)$/i,
    seeMoreTail: /(?:…|\.\.\.)\s*(?:see )?more\s*$/i,
    save: /^\s*save\b/i,
    unsave: /^\s*(unsave|remove from saved)\b/i,
    repostPlain: /^\s*repost\s*$|^\s*repost\b(?![\s\S]*thought)/i,
    repostThoughts: /thought/i,
    toastSaved: /\bsaved\b/i,
    toastRepost: /\brepost/i,
    toastPosted: /\bpost(ed)?\b.*\b(success|shared|live)|successfully|view post/i,
    warning: /unusual activity|temporarily restricted|restricted your account|reached the (weekly )?(invitation )?limit|security (check|verification)|verify (that )?you/i,
  };

  const BLOCKED_PATHS = [/^\/checkpoint\//, /^\/uas\/login/, /^\/login/, /^\/authwall/, /^\/signup/];

  return { SEL, TEXT, BLOCKED_PATHS };
});
