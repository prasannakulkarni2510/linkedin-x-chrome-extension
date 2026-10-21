// Context-sensitive keyboard map. Pure: (ui state, key event) -> command, or null to let the key through.
// Matches on event.code so shortcuts work on any keyboard layout.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else (root.SwipeMode = root.SwipeMode || {}).keymap = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCROLL = {
    ArrowDown: ['line', 1],
    ArrowUp: ['line', -1],
    PageDown: ['page', 1],
    PageUp: ['page', -1],
    Home: ['edge', -1],
    End: ['edge', 1],
  };

  const MAIN = {
    ArrowLeft: 'skip',
    KeyN: 'skip',
    ArrowRight: 'openEngage',
    KeyR: 'openReactions',
    KeyC: 'openComment',
    KeyS: 'save',
    KeyO: 'openPost',
    KeyU: 'undo',
    KeyX: 'exitHere',
    Escape: 'exit',
  };

  const noop = () => ({ type: 'noop' });

  function digit(code) {
    const m = /^(?:Digit|Numpad)(\d)$/.exec(code || '');
    return m ? Number(m[1]) : null;
  }

  function isHelpKey(ev) {
    return ev.code === 'KeyH' || ev.key === '?' || (ev.code === 'Slash' && ev.shiftKey);
  }

  function isEnter(ev) {
    return ev.code === 'Enter' || ev.code === 'NumpadEnter';
  }

  function scrollCmd(ev) {
    if (ev.code === 'Space') return { type: 'scroll', unit: 'page', dir: ev.shiftKey ? -1 : 1 };
    const s = SCROLL[ev.code];
    return s ? { type: 'scroll', unit: s[0], dir: s[1] } : null;
  }

  function mainCmd(ev) {
    if (isHelpKey(ev)) return { type: 'help' };
    if (MAIN[ev.code]) return { type: MAIN[ev.code] };
    return scrollCmd(ev);
  }

  function commandFor(state, ev) {
    switch (state) {
      case 'main':
        return mainCmd(ev);
      case 'grace':
        return ev.code === 'Escape' ? { type: 'stay' } : mainCmd(ev);
      case 'engage': {
        if (ev.code === 'Escape' || ev.code === 'ArrowLeft') return { type: 'back' };
        const d = digit(ev.code);
        if (d !== null) return d >= 1 && d <= 8 ? { type: 'engageSlot', slot: d } : noop();
        if (ev.code === 'KeyR') return { type: 'openReactions' };
        if (ev.code === 'KeyC') return { type: 'openComment' };
        return scrollCmd(ev);
      }
      case 'reaction': {
        if (ev.code === 'Escape' || ev.code === 'ArrowLeft') return { type: 'back' };
        const d = digit(ev.code);
        if (d === 0) return { type: 'removeReaction' };
        if (d !== null) return d <= 6 ? { type: 'react', slot: d } : noop();
        return scrollCmd(ev);
      }
      case 'failure':
        if (isEnter(ev)) return { type: 'retry' };
        if (ev.code === 'Escape') return { type: 'dismiss' };
        if (ev.code === 'KeyO') return { type: 'openPost' };
        return noop();
      case 'end':
        if (isEnter(ev)) return { type: 'rescan' };
        if (ev.code === 'Escape') return { type: 'exit' };
        return noop();
      case 'help':
        return ev.code === 'Escape' || isHelpKey(ev) ? { type: 'closeHelp' } : noop();
      case 'blocked':
        return ev.code === 'Escape' ? { type: 'exit' } : noop();
      case 'busy':
        return noop();
      default:
        return null;
    }
  }

  function resolveKey(state, ev) {
    if (!ev || ev.isComposing || state === 'native') return null;
    if (state === 'comment') {
      if (ev.code === 'Escape') return { type: 'closeComposer' };
      if (isEnter(ev) && (ev.ctrlKey || ev.metaKey)) return { type: 'submitComment' };
      return null;
    }
    // Never hijack browser or OS shortcuts, and keep Tab for focus movement.
    if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.code === 'Tab') return null;
    const cmd = commandFor(state, ev);
    if (!cmd) return null;
    if (ev.repeat && cmd.type !== 'scroll') return noop();
    return cmd;
  }

  return { resolveKey };
});
