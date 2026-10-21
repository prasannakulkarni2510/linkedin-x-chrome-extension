// Detects pages and messages that mean "stop now": sign-in walls, security checks,
// restriction or limit warnings. Swipe Mode never retries past these.
(function (root) {
  'use strict';
  const NS = root.SwipeMode;
  const { SEL, TEXT, BLOCKED_PATHS } = NS.selectors;
  const dom = NS.dom;

  function check() {
    if (BLOCKED_PATHS.some((re) => re.test(location.pathname))) {
      return { blocked: true, reason: 'LinkedIn is asking you to sign in or verify your account.' };
    }
    if (dom.qa(document, SEL.loginWall).some(dom.visible)) {
      return { blocked: true, reason: 'LinkedIn is showing a sign-in or security check.' };
    }
    const notices = dom.qa(document, SEL.toast).concat(dom.qa(document, SEL.dialog)).filter(dom.visible);
    const warning = notices.find((n) => TEXT.warning.test(dom.text(n)));
    if (warning) {
      return { blocked: true, reason: 'LinkedIn showed a warning: "' + dom.text(warning).slice(0, 160) + '"' };
    }
    return { blocked: false };
  }

  NS.guards = { check };
})(globalThis);
