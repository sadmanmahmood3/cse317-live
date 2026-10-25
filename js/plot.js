/* =========================================================
   plot.js — draws on the <canvas>
   Topics call these methods with MATHS coordinates (x, y);
   the Plot converts them to pixel positions for you.
   ========================================================= */

class Plot {
  constructor(canvas) {
    this.cv = canvas;
    this.c = canvas.getContext('2d');
    this.v = { x0: -1, x1: 1, y0: -1, y1: 1 }; // the visible window in maths units
  }

  // Match the canvas to its on-screen size (sharp on high-DPI screens)
  size() {
    const r = this.cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.w = r.width;
    this.h = r.height;
    this.cv.width = Math.max(1, Math.round(r.width * dpr));
    this.cv.height = Math.max(1, Math.round(r.height * dpr));
    this.c.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Maths -> pixels
  X(x) { return (x - this.v.x0) / (this.v.x1 - this.v.x0) * this.w; }
  Y(y) { return this.h - (y - this.v.y0) / (this.v.y1 - this.v.y0) * this.h; }
  // Pixels -> maths (used when you click the graph)
  ix(px) { return this.v.x0 + px / this.w * (this.v.x1 - this.v.x0); }

  // Pick a y-range that shows the curve nicely (ignores huge spikes like 1/x near 0)
  fitY(f, x0, x1) {
    const ys = [];
    for (let i = 0; i <= 400; i++) {
      const y = f(x0 + (x1 - x0) * i / 400);
      if (isFinite(y)) ys.push(y);
    }
    if (!ys.length) return { y0: -1, y1: 1 };

    ys.sort((a, b) => a - b);
    const q = (p) => ys[Math.min(ys.length - 1, Math.floor(p * (ys.length - 1)))];
    let lo = ys[0], hi = ys[ys.length - 1];
    const spread = q(.95) - q(.05);
    if (spread > 0 && hi - lo > 12 * spread) { lo = q(.03); hi = q(.97); }

    lo = Math.min(lo, 0);           // always show the x-axis
    hi = Math.max(hi, 0);
    if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const pad = (hi - lo) * .12;
    return { y0: lo - pad, y1: hi + pad };
  }

  // A "nice" grid step: 1, 2, 5, 10, 20, 50 ...
  nice(range) {
    const p = 10 ** Math.floor(Math.log10(range));
    const m = range / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }

  // Background, grid lines, axes and tick labels
  grid() {
    const c = this.c, v = this.v;
    c.fillStyle = col('--plot');
    c.fillRect(0, 0, this.w, this.h);

    const sx = this.nice((v.x1 - v.x0) / 9);
    const sy = this.nice((v.y1 - v.y0) / 6);

    c.lineWidth = 1;
    c.strokeStyle = col('--grid');
    c.beginPath();
    for (let x = Math.ceil(v.x0 / sx) * sx; x <= v.x1; x += sx) {
      const px = Math.round(this.X(x)) + .5;
      c.moveTo(px, 0); c.lineTo(px, this.h);
    }
    for (let y = Math.ceil(v.y0 / sy) * sy; y <= v.y1; y += sy) {
      const py = Math.round(this.Y(y)) + .5;
      c.moveTo(0, py); c.lineTo(this.w, py);
    }
    c.stroke();

    // Axes
    c.strokeStyle = col('--axis');
    c.lineWidth = 1.25;
    c.beginPath();
    const axisY = Math.min(Math.max(this.Y(0), 0), this.h);
    const axisX = Math.min(Math.max(this.X(0), 0), this.w);
    if (v.y0 <= 0 && v.y1 >= 0) { c.moveTo(0, axisY); c.lineTo(this.w, axisY); }
    if (v.x0 <= 0 && v.x1 >= 0) { c.moveTo(axisX, 0); c.lineTo(axisX, this.h); }
    c.stroke();

    // Tick labels
    c.font = '11px "IBM Plex Mono", monospace';
    c.fillStyle = col('--muted');
    const label = (t) => { let s = String(Number(t.toFixed(10))); if (s === '-0') s = '0'; return s.replace('-', '−'); };

    c.textAlign = 'center';
    const ly = Math.min(Math.max(axisY + 14, 14), this.h - 4);
    for (let x = Math.ceil(v.x0 / sx) * sx; x <= v.x1; x += sx) {
      if (Math.abs(x) < sx / 2) continue;
      c.fillText(label(x), this.X(x), ly);
    }
    c.textAlign = 'right';
    const lx = Math.min(Math.max(axisX - 5, 30), this.w - 4);
    for (let y = Math.ceil(v.y0 / sy) * sy; y <= v.y1; y += sy) {
      if (Math.abs(y) < sy / 2) continue;
      c.fillText(label(y), lx, this.Y(y) + 4);
    }
  }

  // Draw y = f(x) across the whole window
  curve(f, color, lineWidth = 2.5, dash = null, alpha = 1) {
    const c = this.c, v = this.v;
    const n = Math.max(400, Math.round(this.w * 1.5));
    c.save();
    c.globalAlpha = alpha;
    c.strokeStyle = color;
    c.lineWidth = lineWidth;
    c.lineJoin = 'round';
    if (dash) c.setLineDash(dash);
    c.beginPath();

    let penDown = false, prevY = 0;
    for (let i = 0; i <= n; i++) {
      const x = v.x0 + (v.x1 - v.x0) * i / n;
      const y = f(x);
      if (!isFinite(y)) { penDown = false; continue; }
      const py = Math.max(-5000, Math.min(5000, this.Y(y)));
      if (penDown && Math.abs(py - prevY) > this.h * 2) penDown = false; // break at asymptotes
      penDown ? c.lineTo(this.X(x), py) : c.moveTo(this.X(x), py);
      penDown = true;
      prevY = py;
    }
    c.stroke();
    c.restore();
  }

  // Straight line from (x1, y1) to (x2, y2)
  line(x1, y1, x2, y2, color, lineWidth = 1.5, dash = null, alpha = 1) {
    const c = this.c;
    c.save();
    c.globalAlpha = alpha;
    c.strokeStyle = color;
    c.lineWidth = lineWidth;
    if (dash) c.setLineDash(dash);
    c.beginPath();
    c.moveTo(this.X(x1), this.Y(y1));
    c.lineTo(this.X(x2), this.Y(y2));
    c.stroke();
    c.restore();
  }

  // Infinite line through (x, y) with slope m — used for tangents and secants
  slopeLine(x, y, m, color, lineWidth = 1.75, dash = null) {
    const v = this.v;
    this.line(v.x0, y + m * (v.x0 - x), v.x1, y + m * (v.x1 - x), color, lineWidth, dash);
  }

  // A point. ring = true draws a hollow circle.
  dot(x, y, color, r = 5, ring = false, alpha = 1) {
    if (!isFinite(x) || !isFinite(y)) return;
    const c = this.c;
    c.save();
    c.globalAlpha = alpha;
    c.beginPath();
    c.arc(this.X(x), this.Y(y), r, 0, Math.PI * 2);
    if (ring) {
      c.fillStyle = col('--plot'); c.fill();
      c.lineWidth = 2; c.strokeStyle = color; c.stroke();
    } else {
      c.fillStyle = color; c.fill();
      c.lineWidth = 2; c.strokeStyle = col('--plot'); c.stroke();
    }
    c.restore();
  }

  // Text label next to a point (dx, dy are pixel offsets)
  label(text, x, y, color, dx = 8, dy = -10, align = 'left') {
    if (!isFinite(x) || !isFinite(y)) return;
    const c = this.c;
    c.save();
    c.font = '500 12.5px "IBM Plex Mono", monospace';
    c.textAlign = align;
    let px = this.X(x) + dx, py = this.Y(y) + dy;
    py = Math.max(14, Math.min(this.h - 6, py));
    px = Math.max(4, Math.min(this.w - 4, px));
    c.lineWidth = 4; c.strokeStyle = col('--plot'); c.strokeText(text, px, py); // halo for readability
    c.fillStyle = color; c.fillText(text, px, py);
    c.restore();
  }

  // Filled shape from a list of [x, y] points — used for integration strips
  poly(points, fill, stroke, alpha = .2) {
    const c = this.c;
    c.save();
    c.beginPath();
    points.forEach(([x, y], i) => {
      const py = Math.max(-5000, Math.min(5000, this.Y(y)));
      i ? c.lineTo(this.X(x), py) : c.moveTo(this.X(x), py);
    });
    c.closePath();
    c.globalAlpha = alpha; c.fillStyle = fill; c.fill();
    c.globalAlpha = 1;
    if (stroke) { c.lineWidth = 1.25; c.strokeStyle = stroke; c.stroke(); }
    c.restore();
  }

  // Shaded vertical band between x = a and x = b — used for brackets
  band(a, b, color, alpha = .12) {
    const c = this.c;
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.fillRect(this.X(a), 0, this.X(b) - this.X(a), this.h);
    c.restore();
  }

  // Arrow from (x1, y1) to (x2, y2)
  arrow(x1, y1, x2, y2, color) {
    const c = this.c;
    const ax = this.X(x1), ay = this.Y(y1), bx = this.X(x2), by = this.Y(y2);
    if (![ax, ay, bx, by].every(isFinite)) return;
    const L = Math.hypot(bx - ax, by - ay);
    if (L < 12) return;
    const ux = (bx - ax) / L, uy = (by - ay) / L;
    const ex = bx - ux * 9, ey = by - uy * 9;
    c.save();
    c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 2;
    c.beginPath(); c.moveTo(ax + ux * 7, ay + uy * 7); c.lineTo(ex, ey); c.stroke();
    c.beginPath();
    c.moveTo(bx - ux * 2, by - uy * 2);
    c.lineTo(ex - uy * 5, ey + ux * 5);
    c.lineTo(ex + uy * 5, ey - ux * 5);
    c.closePath(); c.fill();
    c.restore();
  }
}
