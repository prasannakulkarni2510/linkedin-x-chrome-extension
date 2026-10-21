// Site profile for LinkedIn: names and wording the shared UI and controller need.
// Loaded first, so catalog.js and everything after it know which site they run on.
(function (root) {
  'use strict';
  const NS = (root.SwipeMode = root.SwipeMode || {});
  if (NS.site) return;
  NS.site = {
    id: 'linkedin',
    name: 'LinkedIn',
    singleReaction: false, // six reactions behind a picker
    isolateKeys: false, // LinkedIn has no single-key shortcuts on posts
    transientPaths: [],
    labels: { react: 'Like', comment: 'Comment', repost: 'Repost', save: 'Save', reshare: 'Repost' },
    likeIcon: 'like',
    reactedBadge: (label) => 'You reacted: ' + label,
    composer: { title: 'Comment', placeholder: 'Write your comment…', note: "Posted through LinkedIn's comment box", max: 1250, aria: 'Comment text' },
    success: {
      react: (label) => 'Reacted: ' + label,
      comment: 'Comment posted',
      repost: 'Reposted',
      repostThoughts: 'Reposted with your thoughts',
      save: 'Saved',
    },
    already: {
      react: 'You already reacted that way. Nothing changed.',
      removeReaction: 'There was no reaction to remove.',
      comment: 'That comment is already on the post.',
      repost: 'You already reposted this. Nothing changed.',
      save: 'Already saved. Nothing changed.',
    },
    busy: {
      react: 'Reacting through LinkedIn…',
      removeReaction: 'Removing your reaction…',
      comment: 'Posting your comment through LinkedIn…',
      repost: 'Reposting through LinkedIn…',
      repostThoughts: "Opening LinkedIn's composer…",
      save: 'Saving through LinkedIn…',
    },
  };
})(globalThis);
