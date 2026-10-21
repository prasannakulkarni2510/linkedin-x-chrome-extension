// Site profile for X (x.com): names and wording the shared UI and controller need.
// Loaded first, so catalog.js and everything after it know which site they run on.
(function (root) {
  'use strict';
  const NS = (root.SwipeMode = root.SwipeMode || {});
  if (NS.site) return;
  NS.site = {
    id: 'x',
    name: 'X',
    singleReaction: true, // X has one reaction: Like. R likes directly, no picker.
    // X binds single letters (L like, T repost, R reply, J/K move). While Swipe Mode is open,
    // keys must never reach X, or a stray letter acts on whichever post X has focused.
    isolateKeys: true,
    // X moves the URL to /compose/... while its reply or quote window is open.
    transientPaths: [/^\/compose\//, /^\/i\/compose\//],
    labels: { react: 'Like', comment: 'Reply', repost: 'Repost', save: 'Bookmark', reshare: 'Quote' },
    likeIcon: 'heart',
    reactedBadge: () => 'You liked this',
    composer: { title: 'Reply', placeholder: 'Post your reply…', note: "Sent through X's reply window", max: 280, aria: 'Reply text' },
    success: {
      react: () => 'Liked',
      comment: 'Reply posted',
      repost: 'Reposted',
      repostThoughts: 'Quote posted',
      save: 'Bookmarked',
    },
    already: {
      react: 'You already liked this. Nothing changed.',
      removeReaction: 'You had not liked this.',
      comment: 'That reply is already posted.',
      repost: 'You already reposted this. Nothing changed.',
      save: 'Already bookmarked. Nothing changed.',
    },
    busy: {
      react: 'Liking through X…',
      removeReaction: 'Removing your like…',
      comment: 'Posting your reply through X…',
      repost: 'Reposting through X…',
      repostThoughts: "Opening X's quote window…",
      save: 'Bookmarking through X…',
    },
  };
})(globalThis);
