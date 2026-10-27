// Draws a tweet and the replies you picked onto a 1080x1080 white canvas, laid out like a
// screenshot of X: the tweet in X's post-page style, each reply in timeline style below it.
// The layout width is chosen so the content comes out as close to square as possible, then the
// whole thing is scaled to fill the square. Images arrive already loaded (HTMLImageElement).
(function (root) {
  'use strict';
  const NS = root.SwipeMode;

  const SIZE = 1080;
  const PAD = 28;
  const INK = '#0f1419';
  const MUTED = '#536471';
  const LINE = '#eff3f4';
  const FONT = '"TwitterChirp", -apple-system, system-ui, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  const font = (px, weight) => `${weight || 400} ${px}px ${FONT}`;

  // Words wrapped to maxW; explicit newlines kept, words longer than a line broken by character.
  function wrap(ctx, text, maxW) {
    const out = [];
    for (const para of String(text || '').split('\n')) {
      let line = '';
      for (const word of para.split(/(\s+)/)) {
        const next = line + word;
        if (ctx.measureText(next).width <= maxW || !line.trim()) {
          line = next;
          while (ctx.measureText(line).width > maxW && line.length > 1) {
            let cut = line.length - 1;
            while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxW) cut--;
            out.push(line.slice(0, cut));
            line = line.slice(cut);
          }
        } else {
          out.push(line.trimEnd());
          line = word.trimStart();
        }
      }
      out.push(line.trimEnd());
    }
    while (out.length && !out[out.length - 1]) out.pop();
    return out;
  }

  function ellipsize(ctx, text, maxW) {
    if (ctx.measureText(text).width <= maxW) return text;
    let t = text;
    while (t && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
    return t + '…';
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  // Draws img to cover the box (like object-fit: cover).
  function cover(ctx, img, x, y, w, h) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const s = Math.max(w / iw, h / ih);
    const sw = w / s;
    const sh = h / s;
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
  }

  function avatar(ctx, img, x, y, d, name) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
    ctx.clip();
    if (img) cover(ctx, img, x, y, d, d);
    else {
      ctx.fillStyle = '#cfd9de';
      ctx.fillRect(x, y, d, d);
      ctx.fillStyle = '#ffffff';
      ctx.font = font(d * 0.42, 700);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((name || '?').trim().charAt(0).toUpperCase(), x + d / 2, y + d / 2 + 1);
    }
    ctx.restore();
  }

  // X's verified badge, approximated: a scalloped disc with a check, in the badge's own color.
  function badge(ctx, color, x, cy, d) {
    const r = d / 2;
    const cx = x + r;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const rr = r * (0.9 + 0.1 * Math.cos(a * 8));
      ctx[i ? 'lineTo' : 'moveTo'](cx + rr * Math.cos(a), cy + rr * Math.sin(a));
    }
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = d * 0.12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.42, cy + r * 0.02);
    ctx.lineTo(cx - r * 0.1, cy + r * 0.34);
    ctx.lineTo(cx + r * 0.44, cy - r * 0.3);
    ctx.stroke();
    ctx.restore();
  }

  // Up to four images in X's grid: 1 full, 2 side by side, 3 one tall plus two, 4 two by two.
  function mediaHeight(imgs, w) {
    if (!imgs.length) return 0;
    if (imgs.length === 1) {
      const i = imgs[0];
      const ratio = (i.naturalHeight || 1) / (i.naturalWidth || 1);
      return Math.round(w * Math.min(Math.max(ratio, 0.4), 1.1));
    }
    return Math.round(w * 0.5625);
  }

  function drawMedia(ctx, imgs, x, y, w, h) {
    const g = 3;
    const cells =
      imgs.length === 1
        ? [[0, 0, w, h]]
        : imgs.length === 2
        ? [[0, 0, (w - g) / 2, h], [(w + g) / 2, 0, (w - g) / 2, h]]
        : imgs.length === 3
        ? [[0, 0, (w - g) / 2, h], [(w + g) / 2, 0, (w - g) / 2, (h - g) / 2], [(w + g) / 2, (h + g) / 2, (w - g) / 2, (h - g) / 2]]
        : [[0, 0, (w - g) / 2, (h - g) / 2], [(w + g) / 2, 0, (w - g) / 2, (h - g) / 2], [0, (h + g) / 2, (w - g) / 2, (h - g) / 2], [(w + g) / 2, (h + g) / 2, (w - g) / 2, (h - g) / 2]];
    ctx.save();
    roundRect(ctx, x, y, w, h, 16);
    ctx.clip();
    imgs.slice(0, 4).forEach((img, i) => {
      const [cx, cy, cw, ch] = cells[i];
      cover(ctx, img, x + cx, y + cy, cw, ch);
    });
    ctx.restore();
    ctx.strokeStyle = '#cfd9de';
    ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 16);
    ctx.stroke();
  }

  // Each block measures itself at width w and returns { h, draw(ctx, y) }.
  function quoteBlock(ctx, q, x, w) {
    const inner = w - 24;
    ctx.font = font(15);
    const lines = wrap(ctx, q.text, inner).slice(0, 6);
    const h = 12 + 20 + 4 + lines.length * 20 + 12;
    return {
      h,
      draw(y) {
        ctx.strokeStyle = '#cfd9de';
        ctx.lineWidth = 1;
        roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 16);
        ctx.stroke();
        ctx.fillStyle = INK;
        ctx.textBaseline = 'alphabetic';
        ctx.font = font(15, 700);
        ctx.fillText(ellipsize(ctx, q.author || '', inner), x + 12, y + 12 + 15);
        ctx.font = font(15);
        lines.forEach((l, i) => ctx.fillText(l, x + 12, y + 12 + 20 + 4 + 15 + i * 20));
      },
    };
  }

  function mainBlock(ctx, p, w, withImages) {
    const textW = w - PAD * 2;
    const textPx = 20;
    const lh = Math.round(textPx * 1.3);
    ctx.font = font(textPx);
    const lines = wrap(ctx, p.text, textW);
    const imgs = withImages ? p.images : [];
    const mh = mediaHeight(imgs, textW);
    const quote = p.quote ? quoteBlock(ctx, p.quote, PAD, textW) : null;
    let h = PAD + 48 + 12 + lines.length * lh;
    if (mh) h += 12 + mh;
    if (quote) h += 12 + quote.h;
    if (p.time) h += 16 + 20;
    h += PAD - 8;
    return {
      h,
      draw(y) {
        avatar(ctx, p.avatar, PAD, y + PAD, 48, p.name);
        const nx = PAD + 48 + 12;
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = INK;
        ctx.font = font(17, 700);
        const name = ellipsize(ctx, p.name, w - nx - PAD - (p.verified ? 24 : 0));
        ctx.fillText(name, nx, y + PAD + 20);
        if (p.verified) badge(ctx, p.verified, nx + ctx.measureText(name).width + 4, y + PAD + 14, 19);
        ctx.fillStyle = MUTED;
        ctx.font = font(16);
        ctx.fillText(ellipsize(ctx, p.handle, w - nx - PAD), nx, y + PAD + 42);
        let cy = y + PAD + 48 + 12;
        ctx.fillStyle = INK;
        ctx.font = font(textPx);
        lines.forEach((l, i) => ctx.fillText(l, PAD, cy + textPx + i * lh - 2));
        cy += lines.length * lh;
        if (mh) {
          drawMedia(ctx, imgs, PAD, cy + 12, textW, mh);
          cy += 12 + mh;
        }
        if (quote) {
          quote.draw(cy + 12);
          cy += 12 + quote.h;
        }
        if (p.time) {
          ctx.fillStyle = MUTED;
          ctx.font = font(15);
          ctx.fillText(ellipsize(ctx, p.time, textW), PAD, cy + 16 + 15);
        }
      },
    };
  }

  function replyBlock(ctx, p, w, withImages) {
    const x = PAD + 40 + 12;
    const textW = w - x - PAD;
    ctx.font = font(15);
    const lines = wrap(ctx, p.text, textW);
    const imgs = withImages ? p.images : [];
    const mh = mediaHeight(imgs, textW);
    const quote = p.quote ? quoteBlock(ctx, p.quote, x, textW) : null;
    let h = 14 + 20 + 2 + lines.length * 20;
    if (mh) h += 10 + mh;
    if (quote) h += 10 + quote.h;
    h = Math.max(h, 14 + 40) + 14;
    return {
      h,
      draw(y) {
        ctx.fillStyle = LINE;
        ctx.fillRect(0, y, w, 1);
        avatar(ctx, p.avatar, PAD, y + 14, 40, p.name);
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = INK;
        ctx.font = font(15, 700);
        const name = ellipsize(ctx, p.name, textW * 0.6);
        ctx.fillText(name, x, y + 14 + 15);
        let hx = x + ctx.measureText(name).width + 4;
        if (p.verified) {
          badge(ctx, p.verified, hx, y + 14 + 10, 17);
          hx += 21;
        }
        ctx.fillStyle = MUTED;
        ctx.font = font(15);
        const meta = [p.handle, p.time].filter(Boolean).join(' · ');
        ctx.fillText(ellipsize(ctx, meta, x + textW - hx), hx, y + 14 + 15);
        let cy = y + 14 + 20 + 2;
        ctx.fillStyle = INK;
        lines.forEach((l, i) => ctx.fillText(l, x, cy + 15 + i * 20));
        cy += lines.length * 20;
        if (mh) {
          drawMedia(ctx, imgs, x, cy + 10, textW, mh);
          cy += 10 + mh;
        }
        if (quote) quote.draw(cy + 10);
      },
    };
  }

  function layout(ctx, shot, w) {
    const blocks = [mainBlock(ctx, shot.main, w, shot.images)].concat(shot.replies.map((r) => replyBlock(ctx, r, w, shot.images)));
    return { blocks, h: blocks.reduce((s, b) => s + b.h, 0) + (shot.replies.length ? 8 : 0) };
  }

  // shot: { main, replies: [], images: bool }. Each post: { name, handle, verified (color or
  // null), time, text, avatar (img or null), images: [img], quote: { author, text } or null }.
  function render(shot, canvas) {
    canvas = canvas || document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    // Narrowest square that holds everything: try widths, keep the one with the smallest side.
    let best = null;
    for (let w = 460; w <= 1400; w += 20) {
      const l = layout(ctx, shot, w);
      const side = Math.max(w, l.h);
      if (!best || side < best.side) best = { w, side, l };
      if (l.h <= w) break; // wider only adds empty space
    }
    const { w, side, l } = best;
    const s = SIZE / side;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.setTransform(s, 0, 0, s, ((side - w) / 2) * s, ((side - l.h) / 2) * s);
    let y = 0;
    for (const b of l.blocks) {
      b.draw(y);
      y += b.h;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return canvas;
  }

  NS.shotRender = { render, wrap, SIZE };
})(globalThis);
