// Detects pages and messages on X that mean "stop now": sign-in walls, account locks,
// rate-limit or verification messages. Swipe Mode never retries past these.
(function (root) {
  'use strict';
  const NS = root.SwipeMode;
  const { SEL, TEXT, BLOCKED_PATHS } = NS.selectors;
  const dom = NS.dom;

  function check() {
    if (BLOCKED_PATHS.some((re) => re.test(location.pathname))) {
      return { blocked: true, reason: 'X is asking you to sign in or verify your account.' };
    }
    if (dom.qa(document, SEL.loginWall).some(dom.visible)) {
      return { blocked: true, reason: 'X is showing a sign-in or security check.' };
    }
    // Toasts and alert dialogs only: reply and quote windows show post text, which can contain
    // anything, including the words in TEXT.warning.
    const notices = dom.qa(document, SEL.toast).concat(dom.qa(document, SEL.alertDialog)).filter(dom.visible);
    const warning = notices.find((n) => TEXT.warning.test(dom.text(n)));
    if (warning) {
      return { blocked: true, reason: 'X showed a warning: "' + dom.text(warning).slice(0, 160) + '"' };
    }
    return { blocked: false };
  }

  NS.guards = { check };
})(globalThis);
