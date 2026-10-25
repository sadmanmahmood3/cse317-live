/* =========================================================
   Topic: Finding roots  (Weeks 2–3)
   Bisection, False position, Secant, Newton–Raphson
   ========================================================= */

TOPICS.roots = {
  name: 'Root finding',
  week: 'Weeks 2–3',

  presets: [
    { label: 'x³ − x − 2', f: 'x^3 - x - 2', range: ['-1', '3'], p: { x0: '2.6', x1: '2.2', a: '1', b: '2' } },
    { label: 'cos x − x', f: 'cos(x) - x', range: ['-1.5', '2.5'], p: { x0: '-1', x1: '0', a: '0', b: '1' } },
    { label: 'x² − 2  (find √2)', f: 'x^2 - 2', range: ['-0.5', '3.5'], p: { x0: '3', x1: '2.5', a: '0', b: '2' } },
    { label: 'eˣ − 3x', f: 'exp(x) - 3*x', range: ['-0.5', '2.5'], p: { x0: '0', x1: '0.3', a: '0', b: '1' } },
    { label: 'arctan x  (Newton overshoots from x₀ = 1.45)', f: 'atan(x)', range: ['-7', '7'], p: { x0: '1.45', x1: '1', a: '-2', b: '3' } },
  ],

  methods: [
    { id: 'bisection', label: 'Bisection' },
    { id: 'falsepos', label: 'False position' },
    { id: 'secant', label: 'Secant' },
    { id: 'newton', label: 'Newton–Raphson' },
  ],
  params: (m) => m === 'newton' ? ['x0'] : m === 'secant' ? ['x0', 'x1'] : ['a', 'b'],
  labels: { x0: 'Start x₀', x1: 'Second guess x₁', a: 'Left end a', b: 'Right end b' },
  click: (m) => (m === 'newton' || m === 'secant') ? 'x0' : null,

  info: (m) => ({
    bisection: {
      rule: 'c = (a + b) / 2;  keep the half where the sign changes',
      blurb: 'Slow but guaranteed. If f(a) and f(b) have opposite signs, a root is trapped between them. Halve the interval every step.',
    },
    falsepos: {
      rule: 'c = b − f(b)·(b − a) / (f(b) − f(a))',
      blurb: 'Like bisection, but cut where the straight line between the endpoints crosses the axis. Usually faster, still bracketed.',
    },
    secant: {
      rule: 'xₙ₊₁ = xₙ − f(xₙ)·(xₙ − xₙ₋₁) / (f(xₙ) − f(xₙ₋₁))',
      blurb: 'Newton without the derivative. The slope comes from the last two points instead of from f′(x).',
    },
    newton: {
      rule: 'xₙ₊₁ = xₙ − f(xₙ) / f′(xₙ)',
      blurb: 'Ride the tangent line down to the x-axis. Very fast near a root (the correct digits roughly double each step), but it can overshoot when the slope is small.',
    },
  }[m]),

  legend: (m) => (m === 'bisection' || m === 'falsepos')
    ? [['f(x)', '--curve'], ['bracket [a, b]', '--approx'], ['new point c', '--accent']]
    : [['f(x)', '--curve'], [m === 'newton' ? 'tangent' : 'secant line', '--approx'], ['iterate', '--accent']],

  columns: (m) => (m === 'bisection' || m === 'falsepos')
    ? ['n', 'a', 'b', 'c', 'f(c)']
    : ['n', 'xₙ', 'f(xₙ)', '|Δx|'],

  build(ctx) {
    const { f, df, p, method: m } = ctx;
    const MAX = 40;
    const steps = [];

    /* ---------- Bisection and False position ---------- */
    if (m === 'bisection' || m === 'falsepos') {
      let a = p.a, b = p.b, fa = f(a), fb = f(b);
      if (!(b > a)) throw new Error('b must be bigger than a.');
      if (!(fa * fb < 0)) {
        throw new Error(`f(a) = ${fmt(fa)} and f(b) = ${fmt(fb)} have the same sign, so no root is guaranteed between them. Pick a and b on opposite sides of a crossing.`);
      }

      steps.push({ a, b, c: null, rows: [[0, a, b, '—', '—']],
        text: `Start with [a, b] = [${N(a)}, ${N(b)}]. f(a) = ${N(fa)} and f(b) = ${N(fb)} have opposite signs, so the curve must cross zero in between.` });

      let prevC = null;
      for (let i = 1; i <= MAX; i++) {
        const c = m === 'bisection' ? (a + b) / 2 : b - fb * (b - a) / (fb - fa);
        const fc = f(c);
        const left = fa * fc < 0;                // root is in [a, c]?
        const na = left ? a : c, nb = left ? c : b;

        let t = m === 'bisection'
          ? `Midpoint c = (${N(a)} + ${N(b)}) / 2 = ${N(c)}.`
          : `The line from (a, f(a)) to (b, f(b)) crosses the axis at c = ${N(c)}.`;
        t += ` f(c) = ${N(fc)}. `;
        t += fc === 0 ? 'Exact hit.'
          : `f(a)·f(c) ${left ? '< 0' : '> 0'}, so the root is in the <strong>${left ? 'left' : 'right'}</strong> part. New bracket: [${N(na)}, ${N(nb)}].`;

        const done = Math.abs(fc) < 1e-12 || (nb - na) < 1e-10 || (prevC !== null && Math.abs(c - prevC) < 1e-12);
        if (done) t += ` <strong>Converged:</strong> root ≈ ${N(c)} after ${i} steps.`;

        steps.push({ a, b, c, fa, fb, fc, rows: [[i, a, b, c, fc]], text: t });
        if (done) break;
        if (left) { b = c; fb = fc; } else { a = c; fa = fc; }
        prevC = c;
      }
      return steps;
    }

    /* ---------- Newton–Raphson ---------- */
    if (m === 'newton') {
      let x = p.x0;
      steps.push({ to: x, trail: [x], rows: [[0, x, f(x), '—']],
        text: `Start at x₀ = ${N(x)}, where f(x₀) = ${N(f(x))}. Press Next to draw the first tangent.` });

      for (let i = 1; i <= MAX; i++) {
        const fx = f(x), d = df(x);
        if (!isFinite(d) || Math.abs(d) < 1e-13) {
          steps[steps.length - 1].text += ' <strong>Stopped:</strong> f′(x) ≈ 0 here, so the tangent is flat and never meets the x-axis.';
          break;
        }
        const xn = x - fx / d;
        const trail = steps[steps.length - 1].trail.concat(xn);

        let t = `Tangent at x${sub(i - 1)} = ${N(x)} has slope f′ = ${N(d)}. Follow it to the x-axis: x${sub(i)} = ${N(x)} − (${N(fx)}) / (${N(d)}) = <strong>${fmt(xn)}</strong>.`;
        const diverged = !isFinite(xn) || Math.abs(xn) > 1e7;
        const done = Math.abs(xn - x) < 1e-12 || Math.abs(f(xn)) < 1e-14;
        if (diverged) t += ' <strong>Diverging:</strong> the iterates are running away. Newton needs a start closer to the root.';
        else if (done) t += ` <strong>Converged:</strong> root ≈ ${N(xn)} after ${i} steps.`;
        else if (i >= 3 && Math.abs(xn) > Math.abs(x) * 1.5 && Math.abs(x) > 1) t += ' Each jump is bigger than the last: this start is outside Newton’s safe zone.';

        steps.push({ from: x, to: xn, fx, d, trail, rows: [[i, xn, f(xn), Math.abs(xn - x)]], text: t });
        if (diverged || done) break;
        x = xn;
      }
      return steps;
    }

    /* ---------- Secant ---------- */
    let x0 = p.x0, x1 = p.x1;
    steps.push({ pts: [x0, x1], trail: [x0, x1], rows: [[0, x0, f(x0), '—'], [1, x1, f(x1), Math.abs(x1 - x0)]],
      text: `Start from two guesses x₀ = ${N(x0)} and x₁ = ${N(x1)}. No derivative needed.` });

    for (let i = 2; i <= MAX; i++) {
      const f0 = f(x0), f1 = f(x1);
      if (f1 === f0) {
        steps[steps.length - 1].text += ' <strong>Stopped:</strong> f(xₙ) = f(xₙ₋₁), so the secant line is flat.';
        break;
      }
      const x2 = x1 - f1 * (x1 - x0) / (f1 - f0);
      const trail = steps[steps.length - 1].trail.concat(x2);

      let t = `Draw the line through (x${sub(i - 2)}, f) and (x${sub(i - 1)}, f). Its slope is ${N((f1 - f0) / (x1 - x0))}. It crosses the axis at x${sub(i)} = <strong>${fmt(x2)}</strong>.`;
      const diverged = !isFinite(x2) || Math.abs(x2) > 1e7;
      const done = Math.abs(x2 - x1) < 1e-12 || Math.abs(f(x2)) < 1e-14;
      if (diverged) t += ' <strong>Diverging.</strong> Try guesses closer to the root.';
      else if (done) t += ` <strong>Converged:</strong> root ≈ ${N(x2)}.`;

      steps.push({ pts: [x0, x1], to: x2, trail, rows: [[i, x2, f(x2), Math.abs(x2 - x1)]], text: t });
      if (diverged || done) break;
      x0 = x1; x1 = x2;
    }
    return steps;
  },

  draw(plot, ctx, steps, k) {
    const s = steps[k], { f, method: m } = ctx;
    const A = col('--accent'), G = col('--approx');
    plot.curve(f, col('--curve'), 3);

    /* Bracketing methods: shaded [a, b] and the new point c */
    if (m === 'bisection' || m === 'falsepos') {
      plot.band(s.a, s.b, G, .13);
      plot.line(s.a, plot.v.y0, s.a, plot.v.y1, G, 1.25, [4, 4]);
      plot.line(s.b, plot.v.y0, s.b, plot.v.y1, G, 1.25, [4, 4]);
      plot.dot(s.a, f(s.a), G, 5);
      plot.dot(s.b, f(s.b), G, 5);
      plot.label('a', s.a, 0, G, -6, 16, 'right');
      plot.label('b', s.b, 0, G, 6, 16);
      if (m === 'falsepos' && s.c !== null) plot.line(s.a, s.fa, s.b, s.fb, G, 1.75);
      for (let i = 1; i < k; i++) plot.dot(steps[i].c, 0, col('--ghost'), 3);
      if (s.c !== null) {
        plot.line(s.c, 0, s.c, s.fc, A, 1.5, [3, 3]);
        plot.dot(s.c, s.fc, A, 5);
        plot.dot(s.c, 0, A, 5, true);
        plot.label(`c = ${fmt(s.c)}`, s.c, 0, A, 8, -10);
      }
      return;
    }

    // Earlier iterates as small grey dots
    (s.trail || []).forEach((x, i) => { if (i < s.trail.length - 1) plot.dot(x, 0, col('--ghost'), 3); });

    /* Newton: tangent line and arrow to the next x */
    if (m === 'newton') {
      if (k === 0) {
        plot.dot(s.to, f(s.to), A, 6);
        plot.line(s.to, 0, s.to, f(s.to), A, 1.25, [3, 3]);
        plot.label('x₀', s.to, 0, A, 6, 16);
        return;
      }
      plot.slopeLine(s.from, s.fx, s.d, G, 2);
      plot.line(s.from, 0, s.from, s.fx, col('--ghost'), 1.25, [3, 3]);
      plot.dot(s.from, s.fx, G, 5);
      plot.label(`x${sub(k - 1)}`, s.from, 0, col('--muted'), 6, 16);
      plot.arrow(s.from, s.fx, s.to, 0, A);
      plot.dot(s.to, 0, A, 6, true);
      plot.label(`x${sub(k)} = ${fmt(s.to)}`, s.to, 0, A, 8, -12);
      plot.line(s.to, 0, s.to, f(s.to), A, 1, [2, 4]);
      return;
    }

    /* Secant: line through the last two points */
    const [a, b] = s.pts;
    plot.dot(a, f(a), G, 5);
    plot.dot(b, f(b), G, 5);
    if (k === 0) {
      plot.label('x₀', a, f(a), G);
      plot.label('x₁', b, f(b), G);
      return;
    }
    const slope = (f(b) - f(a)) / (b - a);
    plot.slopeLine(b, f(b), slope, G, 2);
    plot.dot(s.to, 0, A, 6, true);
    plot.label(`x${sub(k + 1)} = ${fmt(s.to)}`, s.to, 0, A, 8, -12);
    plot.line(s.to, 0, s.to, f(s.to), A, 1, [2, 4]);
  },
};
