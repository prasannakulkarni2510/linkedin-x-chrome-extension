// Swipe Mode controller: session lifecycle, queue refills, input, and action results.
(function (root) {
  'use strict';
  const NS = root.SwipeMode;
  if (NS.started) return;
  NS.started = true;

  const { createSession } = NS.queue;
  const { resolveKey } = NS.keymap;
  const { createWheelGesture } = NS.gesture;
  const { createPacer } = NS.pacing;
  const { REACTIONS, reactionBySlot, reactionById, engageBySlot } = NS.catalog;
  const { normalizeSettings } = NS.settings;
  const { SEL } = NS.selectors;
  const det = NS.detector;
  const act = NS.actions;
  const guards = NS.guards;
  const dom = NS.dom;
  const site = NS.site;

  const HEADER_OFFSET = 60;
  const successText = (kind, arg) => {
    const s = site.success[kind];
    return typeof s === 'function' ? s((reactionById(arg) || REACTIONS[0]).label) : s;
  };
  // Retrying these could double-post if the first attempt actually landed.
  const UNSAFE_RETRY = ['comment', 'repost', 'repostThoughts'];

  let settings = normalizeSettings({});
  const S = {
    active: false,
    mode: 'idle',
    helpReturn: 'main',
    session: null,
    pacer: null,
    wheel: null,
    restore: null,
    drafts: new Map(),
    lastAction: null,
    graceTimer: null,
    exhausted: false,
    emptyRefills: 0,
    refilling: false,
    seenEls: new WeakSet(),
    timers: [],
    startPath: null,
    token: 0,
  };

  const ui = NS.ui.createUI({
    onCommand: dispatch,
    onWheel,
    onSwipe: (dir, info) =>
      dir === 'left' ? dispatch({ type: 'skip', gesture: true }) : dispatch({ type: 'openEngage', dragged: !!(info && info.dragged) }),
    canDrag: () => S.active && (S.mode === 'main' || S.mode === 'grace'),
    onDraft: (v) => {
      const r = cur();
      if (r) S.drafts.set(r.keys[0], v);
    },
  });

  const cur = () => (S.session ? S.session.current() : null);
  const secs = (ms) => Math.max(1, Math.ceil(ms / 1000));

  function setMode(mode) {
    S.mode = mode;
    ui.setMode(mode);
  }

  function keepPost(r) {
    return !(settings.excludePromoted && r.promoted);
  }

  function updateLauncher() {
    ui.setLauncherVisible(!S.active && settings.showLauncher && det.hasPosts());
  }

  // --- session ---------------------------------------------------------------------------
  function start() {
    if (S.active) return;
    S.seenEls = new WeakSet();
    const all = det.scan(S.seenEls);
    let first = all.findIndex((r) => r.el.getBoundingClientRect().bottom > HEADER_OFFSET);
    if (first < 0) first = all.length;
    const anchor = all[first] || null;
    S.restore = { y: window.scrollY, anchor, anchorTop: anchor ? anchor.el.getBoundingClientRect().top : 0 };
    S.session = createSession();
    S.session.add(all.slice(first).filter(keepPost));
    S.pacer = createPacer({ enabled: settings.pacingEnabled, minGapMs: settings.minGapMs, windowMs: 600000, maxInWindow: settings.maxPerTenMinutes });
    S.wheel = createWheelGesture();
    S.active = true;
    S.exhausted = false;
    S.emptyRefills = 0;
    S.drafts.clear();
    S.lastAction = null;
    S.startPath = location.pathname;
    ui.open();
    updateLauncher();
    S.timers.push(setInterval(watchPage, 1000));
    const g = guards.check();
    if (g.blocked) return block(g.reason);
    showCurrent(null);
  }

  function teardown() {
    S.active = false;
    S.token++;
    clearGrace();
    S.timers.forEach(clearInterval);
    S.timers = [];
    S.session = null; // FR-025: the queue is discarded
    S.drafts.clear();
    S.lastAction = null;
    ui.close();
    S.mode = 'idle';
    updateLauncher();
  }

  function exit(opts) {
    if (!S.active) return;
    const rec = cur();
    const restore = S.restore;
    teardown();
    if (opts && opts.here && rec) {
      if (det.resolve(rec)) rec.el.scrollIntoView({ block: 'center', behavior: 'instant' });
      else if (rec.pageY != null) window.scrollTo({ top: Math.max(0, rec.pageY - HEADER_OFFSET), behavior: 'instant' });
      return;
    }
    if (!restore) return;
    const anchorEl = restore.anchor && det.resolve(restore.anchor);
    const top = anchorEl ? anchorEl.getBoundingClientRect().top + window.scrollY - restore.anchorTop : restore.y;
    window.scrollTo({ top, behavior: 'instant' });
  }

  function block(reason) {
    S.token++;
    clearGrace();
    ui.showBlocked(reason);
    setMode('blocked');
    ui.announce('Swipe Mode stopped. ' + reason);
  }

  function watchPage() {
    if (!S.active) return;
    ui.ensureMounted();
    if (location.pathname !== S.startPath && !site.transientPaths.some((re) => re.test(location.pathname))) {
      teardown(); // ERR-006: page changed under us; nothing is reported as done
      return;
    }
    if (S.mode !== 'blocked') {
      const g = guards.check();
      if (g.blocked) block(g.reason);
    }
  }

  // --- showing posts ---------------------------------------------------------------------
  function render(rec, dir, opts) {
    const o = opts || {};
    ui.renderPost(rec, {
      position: S.session.position(),
      remaining: S.session.remaining(),
      dir,
      fast: o.fast !== false,
      keepScroll: !!o.keepScroll,
      status: S.session.statusOf(rec),
      gapMs: settings.postGapMs,
    });
  }

  async function showCurrent(dir, fast) {
    const rec = cur();
    if (!rec) {
      if (S.exhausted) {
        // Zero posts read in a whole session means we can't see LinkedIn's posts, not an empty feed.
        const unreadable = S.session.stats().seen === 0;
        ui.showEnd(unreadable);
        setMode('end');
        ui.announce(unreadable ? "Swipe Mode couldn't read the posts on this page" : 'No more posts found');
      } else {
        setMode('loading');
        refill();
      }
      return;
    }
    det.refresh(rec);
    setMode('main');
    render(rec, dir, { fast });
    ui.focusCard();
    ui.announce('Post ' + S.session.position() + ' by ' + (rec.author.name || 'unknown author'));
    if (rec.truncated) {
      const key = rec.keys[0];
      await det.expandText(rec);
      if (S.active && cur() && cur().keys[0] === key) render(rec, null, { keepScroll: true });
    }
    maybeRefill();
  }

  function maybeRefill() {
    if (S.active && !S.exhausted && !S.refilling && S.session.isLow(settings.lowWater)) refill();
  }

  function collect() {
    return S.session.add(det.scan(S.seenEls).filter(keepPost));
  }

  // FR-020: scroll the page underneath to load more, paced, and give up after three empty tries.
  async function refill() {
    if (S.refilling || !S.active) return;
    S.refilling = true;
    const token = S.token;
    try {
      while (S.active && token === S.token && !S.exhausted && S.session.remaining() < settings.refillTarget) {
        const loadMore = dom.qa(document, SEL.loadMore).find(dom.visible);
        if (loadMore) dom.click(loadMore);
        else window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
        let added = 0;
        await dom.waitFor(() => (added += collect()) > 0, { timeout: 2500, interval: 250 });
        if (!S.active || token !== S.token) return;
        if (added) {
          S.emptyRefills = 0;
          if (S.mode === 'loading') showCurrent(null);
          else if (cur()) ui.setProgress(S.session.position(), S.session.remaining());
        } else if (++S.emptyRefills >= 3) {
          S.exhausted = true;
        }
        await dom.sleep(400);
      }
    } finally {
      S.refilling = false;
    }
    if (S.active && token === S.token && !cur() && S.mode === 'loading') showCurrent(null);
  }

  // --- commands --------------------------------------------------------------------------
  function dispatch(c) {
    if (c.type === 'launch') return start();
    if (!S.active) return;
    if (S.mode === 'grace' && !['stay', 'scroll', 'noop'].includes(c.type)) {
      clearGrace();
      if (c.type === 'skip') return advanceAfterSuccess();
    }
    switch (c.type) {
      case 'skip':
        return skip(c.gesture);
      case 'openEngage':
        return openEngage(c.dragged);
      case 'openReactions':
        return openReactions();
      case 'openComment':
        return openComment();
      case 'save':
        return runAction('save');
      case 'openPost':
        return openPost();
      case 'undo':
        return undo();
      case 'exit':
        return exit({});
      case 'exitHere':
        return exit({ here: true });
      case 'help':
        S.helpReturn = S.mode === 'help' ? 'main' : S.mode;
        ui.showHelp(S.helpReturn);
        return setMode('help');
      case 'closeHelp':
        return backTo(S.helpReturn);
      case 'scroll':
        return ui.scrollCard(c.unit, c.dir);
      case 'engageSlot':
        return engageSlot(c.slot);
      case 'react': {
        const r = reactionBySlot(c.slot);
        return r ? runAction('react', r.id) : undefined;
      }
      case 'removeReaction':
        return runAction('removeReaction');
      case 'back':
      case 'dismiss':
      case 'closeComposer':
        return backTo('main');
      case 'submitComment':
        return submitComment();
      case 'retry':
        return S.lastAction ? runAction(S.lastAction.kind, S.lastAction.arg, { retry: true }) : undefined;
      case 'rescan':
        S.exhausted = false;
        S.emptyRefills = 0;
        setMode('loading');
        return refill();
      case 'stay':
        clearGrace();
        return backTo('main');
      case 'copyReport':
        return navigator.clipboard.writeText(JSON.stringify(det.layoutProbe())).then(
          () => ui.showToast('Layout report copied'),
          () => ui.showToast("Couldn't copy. Use Options, then Inspect page layout.")
        );
      default:
        return undefined;
    }
  }

  function backTo(mode) {
    setMode(mode || 'main');
    if (mode !== 'comment') ui.focusCard();
  }

  function skip(gesture) {
    const rec = cur();
    if (!rec || !['main', 'engage', 'reaction'].includes(S.mode)) return;
    const st = S.session.statusOf(rec);
    S.session.skip();
    if (st !== 'engaged' && st !== 'failed') ui.showToast('Skipped', { hint: 'U to undo', durationMs: 1400 });
    showCurrent('left', !gesture);
  }

  function undo() {
    const r = S.session.undo();
    if (!r) return ui.showToast('Nothing to undo');
    ui.showToast('Brought back', { durationMs: 1400 });
    showCurrent('back');
  }

  function available(rec, id) {
    const a = rec.available;
    return {
      react: a.react,
      comment: a.comment,
      repost: a.repost,
      repostThoughts: a.repost,
      save: a.save,
      open: a.open,
      copyLink: a.open,
      viewProfile: a.profile,
    }[id];
  }

  function openEngage(dragged) {
    const rec = cur();
    if (!rec) return;
    if (!dragged && S.mode !== 'engage') ui.nudge();
    ui.showEngage(rec, available);
    setMode('engage');
  }

  function openReactions() {
    const rec = cur();
    if (!rec) return;
    if (!rec.available.react) return ui.showToast(site.labels.react + " isn't available on this post.");
    if (site.singleReaction) return runAction('react', REACTIONS[0].id);
    ui.showReactions(rec);
    setMode('reaction');
  }

  function openComment() {
    const rec = cur();
    if (!rec) return;
    if (!rec.available.comment) return ui.showToast(site.labels.comment + " isn't available on this post.");
    setMode('comment');
    ui.showComposer(S.drafts.get(rec.keys[0]) || '');
  }

  function engageSlot(slot) {
    const a = engageBySlot(slot);
    const rec = cur();
    if (!a || !rec) return;
    if (!available(rec, a.id)) return ui.showToast(a.label + " isn't available on this post.");
    switch (a.id) {
      case 'react':
        return openReactions();
      case 'comment':
        return openComment();
      case 'open':
        return openPost();
      case 'copyLink':
        return copyLink();
      case 'viewProfile':
        return openTab(rec.author.profileUrl, 'Profile opened in a background tab');
      default:
        return runAction(a.id);
    }
  }

  function openTab(url, msg) {
    if (!url) return ui.showToast('No link found for this post.');
    try {
      chrome.runtime.sendMessage({ type: 'swipe-mode:open-tab', url });
    } catch (_) {
      window.open(url, '_blank', 'noopener');
    }
    if (S.mode !== 'failure') backTo('main');
    ui.showToast(msg);
  }

  function openPost() {
    const rec = cur();
    if (rec) openTab(rec.url, 'Opened in a background tab');
  }

  function copyLink() {
    const rec = cur();
    backTo('main');
    if (!rec || !rec.url) return ui.showToast('No link found for this post.');
    navigator.clipboard.writeText(rec.url).then(
      () => ui.showToast('Link copied'),
      () => ui.showToast("Couldn't copy the link.")
    );
  }

  function submitComment() {
    const text = ui.composerValue().trim();
    if (!text) return ui.showToast('Write something first.');
    runAction('comment', text);
  }

  async function runAction(kind, arg, opts) {
    const rec = cur();
    if (!rec || S.mode === 'busy') return;
    const g = guards.check();
    if (g.blocked) return block(g.reason);
    const now = Date.now();
    const pace = S.pacer.check(now);
    if (!pace.ok) {
      return ui.showToast(
        pace.reason === 'gap'
          ? 'Pacing guard: wait ' + secs(pace.waitMs) + 's between actions.'
          : 'Pacing guard: ' + settings.maxPerTenMinutes + ' actions in 10 minutes. Try again in ' + secs(pace.waitMs) + 's.',
        { kind: 'warn' }
      );
    }
    const token = ++S.token;
    ui.showBusy(site.busy[kind]);
    setMode('busy');
    // X unmounts posts scrolled far away; locate scrolls the page back to the post if needed.
    const el = await det.locate(rec);
    if (!S.active || token !== S.token) return;
    if (!el) {
      return showFailure(kind, { status: 'failed', detail: 'This post is no longer on the page. ' + site.name + ' may have removed or reloaded it.' });
    }
    S.pacer.record(now);
    S.lastAction = { kind, arg };
    let result;
    try {
      result = await act[kind](el, arg, opts || {});
    } catch (err) {
      result = { status: 'failed', detail: 'Something went wrong while talking to ' + site.name + ' (' + (err && err.message) + ').' };
    }
    if (!S.active || token !== S.token) return;
    ui.focusCard();
    const g2 = guards.check();
    if (g2.blocked) return block(g2.reason);
    if (result.status === 'native') {
      setMode('native');
      ui.showNative('Finish in ' + site.name + "'s window. Swipe Mode comes back when it closes.");
      result = await act.finishNative(result);
      if (!S.active || token !== S.token) return;
      ui.focusCard();
    }
    handleResult(kind, arg, result);
  }

  function handleResult(kind, arg, result) {
    const rec = cur();
    if (!rec) return;
    if (result.status === 'succeeded') {
      if (kind === 'comment') S.drafts.delete(rec.keys[0]);
      det.refresh(rec);
      if (result.already || kind === 'removeReaction') {
        render(rec, null, { keepScroll: true });
        backTo('main');
        return ui.showToast(result.already ? site.already[kind] : 'Reaction removed');
      }
      S.session.markCurrent('engaged');
      render(rec, null, { keepScroll: true });
      const msg = successText(kind, arg);
      ui.announce(msg);
      if (settings.graceMs > 0) {
        setMode('grace');
        ui.showToast(msg, { kind: 'success', graceMs: settings.graceMs, hint: 'next post soon · Esc to stay' });
        S.graceTimer = setTimeout(advanceAfterSuccess, settings.graceMs);
      } else {
        ui.showToast(msg, { kind: 'success', durationMs: 1400 });
        advanceAfterSuccess();
      }
      return;
    }
    if (result.status === 'cancelled') {
      backTo('main');
      return ui.showToast('Nothing was confirmed by ' + site.name + ', so nothing is marked as done.');
    }
    if (S.session.statusOf(rec) !== 'engaged') S.session.markCurrent('failed');
    showFailure(kind, result);
  }

  function showFailure(kind, result) {
    const failed = result.status === 'failed';
    ui.showFailure({
      title: failed ? "Couldn't complete that" : "Couldn't confirm that on " + site.name,
      detail: result.detail,
      retry: failed || !UNSAFE_RETRY.includes(kind),
    });
    setMode('failure');
    ui.announce((failed ? 'Action failed. ' : 'Action not confirmed. ') + result.detail);
  }

  function clearGrace() {
    if (S.graceTimer) {
      clearTimeout(S.graceTimer);
      S.graceTimer = null;
      ui.hideToast();
    }
    if (S.mode === 'grace') setMode('main');
  }

  function advanceAfterSuccess() {
    clearGrace();
    if (!S.active || !cur()) return;
    S.session.complete();
    showCurrent('right');
  }

  // --- input -----------------------------------------------------------------------------
  function keyState() {
    return S.mode === 'loading' ? 'blocked' : S.mode;
  }

  window.addEventListener(
    'keydown',
    (e) => {
      if (!S.active || !e.isTrusted) return;
      const c = resolveKey(keyState(), e);
      if (!c) {
        // Keys we don't use still must not reach the site's own shortcuts (X: L likes, T reposts).
        // Typing in the composer keeps its default action; only the site's listeners are cut off.
        if (site.isolateKeys && S.mode !== 'native' && !e.ctrlKey && !e.metaKey && !e.altKey) e.stopImmediatePropagation();
        return;
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      dispatch(c);
    },
    true
  );
  if (site.isolateKeys) {
    for (const type of ['keypress', 'keyup']) {
      window.addEventListener(
        type,
        (e) => {
          if (S.active && S.mode !== 'native' && !e.ctrlKey && !e.metaKey && !e.altKey) e.stopImmediatePropagation();
        },
        true
      );
    }
  }

  function onWheel(e, inScroll) {
    if (!S.active || S.mode === 'native') return;
    const swipeable = S.mode === 'main' || S.mode === 'grace';
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
    const dir = swipeable ? S.wheel.feed({ dx: e.deltaX * scale, dy: e.deltaY * scale, t: e.timeStamp }) : null;
    // Horizontal wheel would trigger browser back/forward; outside the card it would scroll LinkedIn.
    if ((swipeable && S.wheel.isHorizontal()) || !inScroll || Math.abs(e.deltaX) > Math.abs(e.deltaY)) e.preventDefault();
    if (dir === 'left') dispatch({ type: 'skip', gesture: true });
    else if (dir === 'right') dispatch({ type: 'openEngage' });
  }

  // --- wiring ----------------------------------------------------------------------------
  try {
    chrome.storage.local.get('settings', (o) => {
      settings = normalizeSettings(o && o.settings);
      updateLauncher();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.settings) {
        settings = normalizeSettings(changes.settings.newValue);
        updateLauncher();
      }
    });
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!msg) return;
      if (msg.type === 'swipe-mode:toggle') {
        if (S.active) exit({});
        else start();
        sendResponse({ ok: true });
      } else if (msg.type === 'swipe-mode:diagnostics') {
        sendResponse(Object.assign(det.diagnostics(), { guard: guards.check() }));
      } else if (msg.type === 'swipe-mode:probe') {
        sendResponse(det.layoutProbe());
      }
    });
  } catch (_) {
    // Extension context gone (reloaded); ERR-007: the page keeps working without Swipe Mode.
  }

  updateLauncher();
  setInterval(() => {
    if (!S.active) updateLauncher();
  }, 1500);
})(globalThis);
