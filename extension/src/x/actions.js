// Performs engagement through X's own controls and reports what X confirmed.
// Result: { status: 'succeeded' | 'failed' | 'unverified' | 'native', detail, already? }.
// Success is only reported with evidence from the page (BR-007): the button flipped
// (like -> unlike, retweet -> unretweet, bookmark -> removeBookmark) or X showed a toast.
(function (root) {
  'use strict';
  const NS = root.SwipeMode;
  const { SEL, TEXT } = NS.selectors;
  const dom = NS.dom;

  const ok = (detail, extra) => Object.assign({ status: 'succeeded', detail: detail || '' }, extra || {});
  const fail = (detail) => ({ status: 'failed', detail });
  const unverified = (detail) => ({ status: 'unverified', detail });

  const bar = (post) => dom.q(post, SEL.actionBar) || post;
  const inBar = (post, sel) => dom.q(bar(post), sel);
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();

  // Element -> text at snapshot time. A confirmation is a new toast, or one that now says
  // something new.
  function toastSnapshot() {
    return new Map(dom.qa(document, SEL.toast).map((t) => [t, dom.text(t)]));
  }

  function findToast(re, before) {
    return dom.qa(document, SEL.toast).find((t) => {
      const txt = dom.text(t);
      return (!before.has(t) || before.get(t) !== txt) && re.test(txt);
    });
  }

  // X's toasts can come and go while a dialog is still closing; watch for them the whole time.
  function toastWatcher(re, before) {
    let hit = null;
    const look = () => hit || (hit = findToast(re, before) || null);
    const id = setInterval(look, 80);
    return { get: look, stop: () => clearInterval(id) };
  }

  function visibleDialogWith(sel) {
    return dom.qa(document, SEL.dialog).find((d) => dom.visible(d) && dom.q(d, sel)) || null;
  }

  function findMenuItem(re) {
    return (
      dom.qa(document, SEL.menuItem).find((el) => dom.visible(el) && (re.test(dom.firstLine(el)) || /\/compose\/(post|tweet)/.test(el.getAttribute('href') || ''))) ||
      null
    );
  }

  async function react(post) {
    if (inBar(post, SEL.unlike)) return ok('', { already: true });
    const btn = inBar(post, SEL.like);
    if (!btn) return fail('This post has no Like button.');
    dom.click(btn);
    const confirmed = await dom.waitFor(() => inBar(post, SEL.unlike), { timeout: 4000 });
    return confirmed ? ok() : unverified("X didn't show the like on the post.");
  }

  async function removeReaction(post) {
    const btn = inBar(post, SEL.unlike);
    if (!btn) return ok('', { already: true });
    dom.click(btn);
    const confirmed = await dom.waitFor(() => inBar(post, SEL.like), { timeout: 4000 });
    return confirmed ? ok() : unverified("X didn't show the like as removed.");
  }

  // X's composer is a Draft.js editor: it only accepts text that arrives as real input events.
  function insertText(editor, text) {
    editor.focus();
    editor.ownerDocument.getSelection().selectAllChildren(editor);
    const parts = text.split('\n');
    parts.forEach((line, i) => {
      if (i > 0) document.execCommand('insertLineBreak');
      if (line) document.execCommand('insertText', false, line);
    });
  }

  function submitButton(dialog) {
    const b = dom.q(dialog, SEL.composerSubmit);
    return b && !b.disabled && b.getAttribute('aria-disabled') !== 'true' ? b : null;
  }

  // Empties and closes a composer we opened but could not send, answering X's "Discard?" sheet.
  async function closeComposer(dialog) {
    const editor = dom.q(dialog, SEL.composerEditor);
    if (editor && editor.isConnected) {
      editor.focus();
      editor.ownerDocument.getSelection().selectAllChildren(editor);
      document.execCommand('delete');
    }
    const close = dom.q(dialog, SEL.composerClose);
    if (close) dom.click(close);
    else dom.pressEscape(dialog);
    const discard = await dom.waitFor(() => dom.qa(document, SEL.discardConfirm).find(dom.visible), { timeout: 800 });
    if (discard) dom.click(discard);
    await dom.waitFor(() => !dialog.isConnected || !dom.visible(dialog), { timeout: 2000 });
  }

  async function comment(post, text) {
    const btn = inBar(post, SEL.reply);
    if (!btn) return fail('This post has no Reply button.');
    dom.click(btn);
    const dialog = await dom.waitFor(() => visibleDialogWith(SEL.composerEditor), { timeout: 4000 });
    if (!dialog) return fail("X's reply window didn't open, so nothing was sent.");
    const editor = dom.q(dialog, SEL.composerEditor);
    insertText(editor, text);
    if (!norm(editor.innerText).includes(norm(text.split('\n')[0]))) {
      await closeComposer(dialog);
      return fail("X's reply box didn't accept the text, so nothing was sent.");
    }
    const submit = await dom.waitFor(() => submitButton(dialog), { timeout: 3000 });
    if (!submit) {
      await closeComposer(dialog);
      return fail("X's Reply button stayed disabled, so nothing was sent.");
    }
    const watch = toastWatcher(TEXT.toastSent, toastSnapshot());
    try {
      dom.click(submit);
      const closed = await dom.waitFor(() => !dialog.isConnected || !dom.visible(dialog), { timeout: 10000, interval: 100 });
      if (!closed) {
        return unverified("X's reply window is still open, so the reply may not have been sent. Exit Swipe Mode to check it before writing it again.");
      }
      const toast = await dom.waitFor(watch.get, { timeout: 4000, interval: 80 });
      return toast ? ok() : unverified("X closed the reply window but didn't confirm the reply. Check the post before writing it again.");
    } finally {
      watch.stop();
    }
  }

  async function openRepostMenu(post) {
    const btn = inBar(post, SEL.retweet) || inBar(post, SEL.unretweet);
    if (!btn) return null;
    dom.click(btn);
    return btn;
  }

  async function repost(post) {
    if (inBar(post, SEL.unretweet)) return ok('', { already: true });
    if (!(await openRepostMenu(post))) return fail('This post has no Repost button.');
    const item = await dom.waitFor(() => dom.qa(document, SEL.retweetConfirm).find(dom.visible), { timeout: 2500 });
    if (!item) {
      dom.pressEscape();
      return fail("X's repost menu didn't open, so nothing was reposted.");
    }
    const watch = toastWatcher(TEXT.toastRepost, toastSnapshot());
    try {
      dom.click(item);
      const confirmed = await dom.waitFor(() => inBar(post, SEL.unretweet) || watch.get(), { timeout: 5000 });
      return confirmed ? ok() : unverified("X didn't confirm the repost. Check your profile before trying again.");
    } finally {
      watch.stop();
    }
  }

  // Quote: opens X's own composer; the controller hands the screen over until it closes.
  async function repostThoughts(post) {
    if (!(await openRepostMenu(post))) return fail('This post has no Repost button.');
    const item = await dom.waitFor(() => findMenuItem(TEXT.quote), { timeout: 2500 });
    if (!item) {
      dom.pressEscape();
      return fail("X's Quote option wasn't found, so nothing was posted.");
    }
    const watch = toastWatcher(TEXT.toastSent, toastSnapshot());
    dom.click(item);
    const dialog = await dom.waitFor(() => visibleDialogWith(SEL.composerEditor), { timeout: 4000 });
    if (!dialog) {
      watch.stop();
      return fail("X's quote window didn't open, so nothing was posted.");
    }
    return { status: 'native', detail: '', dialog, watch };
  }

  async function finishNative(handoff) {
    const { dialog, watch } = handoff;
    try {
      await dom.waitFor(() => !dialog.isConnected || !dom.visible(dialog), { timeout: 15 * 60 * 1000, interval: 300 });
      const toast = await dom.waitFor(watch.get, { timeout: 4000, interval: 80 });
      return toast ? ok() : { status: 'cancelled', detail: 'Quote window closed without a confirmation from X.' };
    } finally {
      watch.stop();
    }
  }

  async function save(post) {
    if (inBar(post, SEL.removeBookmark)) return ok('', { already: true });
    const btn = inBar(post, SEL.bookmark);
    if (!btn) return fail('This post has no Bookmark button.');
    const watch = toastWatcher(TEXT.toastBookmark, toastSnapshot());
    try {
      dom.click(btn);
      const confirmed = await dom.waitFor(() => inBar(post, SEL.removeBookmark) || watch.get(), { timeout: 4000 });
      return confirmed ? ok() : unverified("X didn't confirm the bookmark.");
    } finally {
      watch.stop();
    }
  }

  NS.actions = { react, removeReaction, comment, repost, repostThoughts, finishNative, save };
})(globalThis);
