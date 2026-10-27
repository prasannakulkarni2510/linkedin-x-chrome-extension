// Runs at document_start, before the site's own scripts, so Swipe Mode's key listeners come first.
// Listeners on the same target run in the order they were added: X's window-level shortcuts
// (o expands a photo, l likes...) were added before a document_idle content script could, and
// could act on a key before Swipe Mode saw it. The controller adds its handlers here later.
(function (root) {
  'use strict';
  const NS = (root.SwipeMode = root.SwipeMode || {});
  if (NS.keys) return;
  const handlers = { keydown: [], keypress: [], keyup: [] };
  for (const type of Object.keys(handlers)) {
    window.addEventListener(
      type,
      (e) => {
        for (const fn of handlers[type]) {
          fn(e);
          if (e.cancelBubble) break; // a handler stopped the event
        }
      },
      true
    );
  }
  NS.keys = {
    on(type, fn) {
      handlers[type].push(fn);
    },
  };
})(globalThis);
