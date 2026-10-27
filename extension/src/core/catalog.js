// Fixed slots for reactions and engage actions. Numbers never shift when an action is
// unavailable, so muscle memory stays valid from post to post. Each site has its own catalog;
// the slot numbers mean the same kind of action on every site.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else {
    const NS = (root.SwipeMode = root.SwipeMode || {});
    NS.catalog = api.forSite(NS.site && NS.site.id);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CATALOGS = {
    linkedin: {
      REACTIONS: [
        { slot: 1, id: 'like', label: 'Like', icon: '\u{1F44D}', api: 'LIKE' },
        { slot: 2, id: 'celebrate', label: 'Celebrate', icon: '\u{1F44F}', api: 'PRAISE' },
        { slot: 3, id: 'support', label: 'Support', icon: '\u{1F91D}', api: 'APPRECIATION' },
        { slot: 4, id: 'love', label: 'Love', icon: '\u{2764}\u{FE0F}', api: 'EMPATHY' },
        { slot: 5, id: 'insightful', label: 'Insightful', icon: '\u{1F4A1}', api: 'INTEREST' },
        { slot: 6, id: 'funny', label: 'Funny', icon: '\u{1F604}', api: 'ENTERTAINMENT' },
      ],
      ENGAGE_ACTIONS: [
        { slot: 1, id: 'react', label: 'React', key: 'R', mutating: true },
        { slot: 2, id: 'comment', label: 'Comment', key: 'C', mutating: true },
        { slot: 3, id: 'repost', label: 'Repost', mutating: true },
        { slot: 4, id: 'repostThoughts', label: 'Repost with your thoughts', mutating: true },
        { slot: 5, id: 'save', label: 'Save', key: 'S', mutating: true },
        { slot: 6, id: 'open', label: 'Open on LinkedIn', key: 'O', mutating: false },
        { slot: 7, id: 'copyLink', label: 'Copy link', mutating: false },
        { slot: 8, id: 'viewProfile', label: "View author's profile", mutating: false },
      ],
    },
    x: {
      REACTIONS: [{ slot: 1, id: 'like', label: 'Like', icon: '\u{2764}\u{FE0F}', api: 'LIKE' }],
      ENGAGE_ACTIONS: [
        { slot: 1, id: 'react', label: 'Like', key: 'R', mutating: true },
        { slot: 2, id: 'comment', label: 'Reply', key: 'C', mutating: true },
        { slot: 3, id: 'repost', label: 'Repost', mutating: true },
        { slot: 4, id: 'repostThoughts', label: 'Quote', mutating: true },
        { slot: 5, id: 'save', label: 'Bookmark', key: 'S', mutating: true },
        { slot: 6, id: 'open', label: 'Open on X', key: 'O', mutating: false },
        { slot: 7, id: 'copyLink', label: 'Copy link', mutating: false },
        { slot: 8, id: 'viewProfile', label: "View author's profile", mutating: false },
        { slot: 9, id: 'screenshot', label: 'Screenshot', key: 'P', mutating: false },
      ],
    },
  };

  function forSite(siteId) {
    const id = CATALOGS[siteId] ? siteId : 'linkedin';
    const { REACTIONS, ENGAGE_ACTIONS } = CATALOGS[id];

    function reactionBySlot(slot) {
      return REACTIONS.find((r) => r.slot === slot) || null;
    }

    function reactionById(rid) {
      return REACTIONS.find((r) => r.id === rid) || null;
    }

    // Word match, not substring: "Unlike" must not read as "Like".
    function reactionFromLabel(label) {
      if (typeof label !== 'string') return null;
      const words = label.toLowerCase().split(/[^a-z]+/).filter(Boolean);
      for (const r of REACTIONS) {
        if (words.includes(r.id) || words.includes(r.api.toLowerCase())) return r.id;
      }
      return null;
    }

    function engageBySlot(slot) {
      return ENGAGE_ACTIONS.find((a) => a.slot === slot) || null;
    }

    return { siteId: id, REACTIONS, ENGAGE_ACTIONS, reactionBySlot, reactionById, reactionFromLabel, engageBySlot };
  }

  // Node (unit tests) gets LinkedIn's catalog at the top level, plus forSite for the others.
  return Object.assign(forSite('linkedin'), { forSite, SITES: Object.keys(CATALOGS) });
});
