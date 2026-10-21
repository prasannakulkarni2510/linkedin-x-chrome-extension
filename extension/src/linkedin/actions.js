// Performs engagement through LinkedIn's own controls and reports what LinkedIn confirmed.
// Result: { status: 'succeeded' | 'failed' | 'unverified' | 'native', detail, already? }.
// Success is only reported with evidence from the page (BR-007).
(function (root) {
  'use strict';
  const NS = root.SwipeMode;
  const { SEL, TEXT } = NS.selectors;
  const { reactionFromLabel } = NS.catalog;
  const dom = NS.dom;
  const det = NS.detector;

  const ok = (detail, extra) => Object.assign({ status: 'succeeded', detail: detail || '' }, extra || {});
  const fail = (detail) => ({ status: 'failed', detail });
  const unverified = (detail) => ({ status: 'unverified', detail });

  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const bar = (post) => dom.q(post, SEL.actionBar) || post;

  // Element -> text at snapshot time. A confirmation is a new element, or a live region that
  // stayed on the page but now says something new.
  function toastSnapshot() {
    return new Map(dom.qa(document, SEL.toast).map((t) => [t, dom.text(t)]));
  }

  function waitForToast(re, before, timeout) {
    return dom.waitFor(
      () =>
        dom.qa(document, SEL.toast).find((t) => {
          const txt = dom.text(t);
          return (!before.has(t) || before.get(t) !== txt) && re.test(txt);
        }),
      { timeout: timeout || 5000, interval: 100 }
    );
  }

  function findMenuItem(re) {
    return dom.qa(document, SEL.menuItem).find((el) => dom.visible(el) && re.test(dom.firstLine(el)));
  }

  function findReactionsMenu(post) {
    const local = dom.qa(post, SEL.reactionsMenu).find(dom.visible);
    return local || dom.qa(document, SEL.reactionsMenu).find(dom.visible) || null;
  }

  // Options live in the picker. A click-opened picker may be portaled anywhere, so then only
  // buttons that appeared after the click count: comment Like buttons ("React Like to X's
  // comment") already on the page must never be mistaken for the picker.
  function findReactionOption(post, btn, opener, reactionId, before) {
    const menu = findReactionsMenu(post);
    const pool = menu
      ? dom.qa(menu, SEL.reactionOption)
      : opener
        ? dom.qa(document, ['button']).filter((b) => !before.has(b))
        : [];
    return (
      pool.find((b) => {
        if (b === btn || b === opener || !dom.visible(b)) return false;
        const label = b.getAttribute('aria-label') || dom.text(b);
        if (TEXT.reactionState.test(label) || /open reactions menu/i.test(label)) return false;
        return reactionFromLabel(label) === reactionId;
      }) || null
    );
  }

  async function react(post, reactionId) {
    const btn = det.reactButton(post);
    if (!btn) return fail('This post has no React button.');
    if (det.readReaction(btn) === reactionId) return ok('', { already: true });

    // 2026 feed: a separate "Open reactions menu" button; older feed: hover the React button.
    const opener = dom.q(post, SEL.reactionsOpen);
    // Visible buttons only: a picker pre-rendered hidden must still count once the click reveals it.
    const before = new Set(dom.qa(document, ['button']).filter(dom.visible));
    if (opener) dom.click(opener);
    else dom.hover(btn);
    const option = await dom.waitFor(() => findReactionOption(post, btn, opener, reactionId, before), { timeout: 1500 });
    if (option) {
      dom.click(option);
    } else if (reactionId === 'like' && !det.readReaction(btn)) {
      dom.click(btn);
    } else {
      dom.unhover(btn);
      return fail("LinkedIn's reaction picker didn't open, so nothing was sent.");
    }
    dom.unhover(btn);
    const confirmed = await dom.waitFor(() => det.readReaction(det.reactButton(post)) === reactionId, { timeout: 4000 });
    return confirmed ? ok() : unverified("LinkedIn didn't show the reaction on the post.");
  }

  async function removeReaction(post) {
    const btn = det.reactButton(post);
    if (!btn) return fail('This post has no React button.');
    if (!det.readReaction(btn)) return ok('', { already: true });
    dom.click(btn);
    const confirmed = await dom.waitFor(() => !det.readReaction(det.reactButton(post)), { timeout: 4000 });
    return confirmed ? ok() : unverified("LinkedIn didn't show the reaction as removed.");
  }

  // How often the comment text shows in the post outside the editor. Without known comment
  // classes, success needs this to grow: text already in the post body is not evidence.
  function occurrences(post, text) {
    const needle = norm(text).slice(0, 80);
    if (!needle) return 0;
    const editor = dom.q(post, SEL.commentEditor);
    const inEditor = editor ? norm(editor.innerText).split(needle).length - 1 : 0;
    return norm(dom.text(post)).split(needle).length - 1 - inEditor;
  }

  function hasComment(post, text, baseline) {
    const needle = norm(text).slice(0, 80);
    const items = dom.qa(post, SEL.commentItem);
    if (items.length) return items.some((c) => norm(dom.text(c)).includes(needle));
    return editorEmpty(post) && occurrences(post, text) > (baseline || 0);
  }

  function findSubmit(post, editor, actionBtn) {
    const known = dom.q(post, SEL.commentSubmit);
    if (known) return known;
    let box = editor.parentElement;
    for (let i = 0; i < 6 && box && box !== post.parentElement; i++, box = box.parentElement) {
      const b = Array.from(box.querySelectorAll('button')).find((x) => x !== actionBtn && TEXT.submitLabel.test(dom.text(x) || x.getAttribute('aria-label') || ''));
      if (b) return b;
    }
    return null;
  }

  function visibleEditor(post) {
    const e = dom.q(post, SEL.commentEditor);
    return e && dom.visible(e) ? e : null;
  }

  function editorEmpty(post) {
    const e = dom.q(post, SEL.commentEditor);
    return !e || !e.isConnected || norm(e.innerText) === '';
  }

  function insertText(editor, text) {
    editor.focus();
    const sel = editor.ownerDocument.getSelection();
    sel.selectAllChildren(editor);
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      if (i > 0) document.execCommand('insertLineBreak');
      if (line) document.execCommand('insertText', false, line);
    });
    if (!norm(editor.innerText).includes(norm(lines[0]))) {
      editor.textContent = text;
      editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    }
  }

  function clearEditor(editor) {
    if (!editor || !editor.isConnected) return;
    editor.focus();
    editor.ownerDocument.getSelection().selectAllChildren(editor);
    document.execCommand('delete');
  }

  async function comment(post, text, opts) {
    const btn = dom.q(bar(post), SEL.commentButton);
    if (!btn) return fail('This post has no Comment button.');
    // Retry pre-check trusts real comment items only; text that merely appears in the post body
    // is not proof the earlier attempt landed.
    if (opts && opts.retry && dom.qa(post, SEL.commentItem).some((c) => norm(dom.text(c)).includes(norm(text).slice(0, 80)))) {
      return ok('', { already: true });
    }

    let editor = visibleEditor(post);
    if (!editor) {
      dom.click(btn);
      editor = await dom.waitFor(() => visibleEditor(post), { timeout: 3000 });
    }
    if (!editor) return fail("LinkedIn's comment box didn't open, so nothing was sent.");

    const baseline = occurrences(post, text);
    insertText(editor, text);
    const submit = await dom.waitFor(() => {
      const b = findSubmit(post, editor, btn);
      return b && !b.disabled && b.getAttribute('aria-disabled') !== 'true' ? b : null;
    }, { timeout: 3000 });
    if (!submit) {
      clearEditor(editor);
      return fail("LinkedIn's Comment button stayed disabled, so nothing was sent.");
    }
    dom.click(submit);
    const posted = await dom.waitFor(() => hasComment(post, text, baseline) && editorEmpty(post), { timeout: 10000, interval: 100 });
    if (posted) return ok();
    return unverified(
      editorEmpty(post)
        ? 'LinkedIn accepted the comment but it has not appeared yet. Check the post before writing it again.'
        : "LinkedIn didn't confirm the comment. Check the post before writing it again."
    );
  }

  async function openMenuItem(trigger, re) {
    dom.click(trigger);
    return dom.waitFor(() => findMenuItem(re), { timeout: 2500 });
  }

  async function repost(post) {
    const btn = dom.q(bar(post), SEL.repostButton);
    if (!btn) return fail('This post has no Repost button.');
    const item = await openMenuItem(btn, TEXT.repostPlain);
    if (!item) {
      dom.pressEscape();
      return fail("LinkedIn's repost menu didn't open, so nothing was reposted.");
    }
    const before = toastSnapshot();
    dom.click(item);
    const toast = await waitForToast(TEXT.toastRepost, before, 6000);
    return toast ? ok() : unverified("LinkedIn didn't confirm the repost. Check your profile before trying again.");
  }

  // Opens LinkedIn's own composer; the controller hands the screen over until it closes.
  async function repostThoughts(post) {
    const btn = dom.q(bar(post), SEL.repostButton);
    if (!btn) return fail('This post has no Repost button.');
    const item = await openMenuItem(btn, TEXT.repostThoughts);
    if (!item) {
      dom.pressEscape();
      return fail("LinkedIn's repost menu didn't open, so nothing was reposted.");
    }
    const before = toastSnapshot();
    dom.click(item);
    const dialog = await dom.waitFor(() => dom.qa(document, SEL.dialog).find(dom.visible), { timeout: 4000 });
    if (!dialog) return fail("LinkedIn's composer didn't open, so nothing was reposted.");
    return { status: 'native', detail: '', dialog, before };
  }

  async function finishNative(handoff) {
    await dom.waitFor(() => !dom.qa(document, SEL.dialog).some(dom.visible), { timeout: 15 * 60 * 1000, interval: 300 });
    const toast = await waitForToast(TEXT.toastPosted, handoff.before, 5000);
    return toast ? ok() : { status: 'cancelled', detail: 'Composer closed without a confirmation from LinkedIn.' };
  }

  async function save(post) {
    const reshare = dom.q(post, SEL.reshare);
    const trigger = dom.qOwn(post, SEL.controlMenuTrigger, reshare ? [reshare] : []);
    if (!trigger) return fail("This post's menu wasn't found.");
    dom.click(trigger);
    const found = await dom.waitFor(() => {
      const unsave = findMenuItem(TEXT.unsave);
      if (unsave) return { unsave };
      const saveItem = findMenuItem(TEXT.save);
      return saveItem ? { save: saveItem } : null;
    }, { timeout: 2500 });
    if (!found) {
      dom.pressEscape();
      return fail("LinkedIn's Save option wasn't found, so nothing was saved.");
    }
    if (found.unsave) {
      dom.pressEscape();
      return ok('', { already: true });
    }
    const before = toastSnapshot();
    dom.click(found.save);
    const toast = await waitForToast(TEXT.toastSaved, before, 5000);
    return toast ? ok() : unverified("LinkedIn didn't confirm the save.");
  }

  NS.actions = { react, removeReaction, comment, repost, repostThoughts, finishNative, save };
})(globalThis);
