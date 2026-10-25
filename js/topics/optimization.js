/* =========================================================
   Topic: Finding optima  (Weeks 4–5)
   Gradient descent and Newton's method
   ========================================================= */

TOPICS.opt = {
  name: 'Optimization',
  week: 'Weeks 4–5',

  presets: [
    { label: '(x − 2)² + 1', f: '(x-2)^2 + 1', range: ['-1.5', '5.5'], p: { x0: '-1', eta: '0.15' } },
    { label: 'x⁴ − 3x³ + 2', f: 'x^4 - 3*x^3 + 2', range: ['-1.2', '3.3'], p: { x0: '3.1', eta: '0.02' } },
    { label: 'sin x + 0.1x²  (two valleys)', f: 'sin(x) + 0.1*x^2', range: ['-7', '7'], p: { x0: '5.5', eta: '0.4' } },
    { label: 'x²  (try η = 0.9, then 1.05)', f: 'x^2', range: ['-4.5', '4.5'], p: { x0: '3', eta: '0.9' } },
  ],

  methods: [
    { id: 'gd', label: 'Gradient descent' },
    { id: 'newton', label: 'Newton’s method' },
  ],
  params: (m) => m === 'gd' ? ['x0', 'eta'] : ['x0'],
  labels: { x0: 'Start x₀', eta: 'Learning rate η' },
  click: () => 'x0',

  info: (m) => m === 'gd'
    ? { rule: 'xₖ₊₁ = xₖ − η · f′(xₖ)',
        blurb: 'Roll downhill. The slope says which way is down; η says how big a step to take. Too small is slow, too big overshoots the valley.' }
    : { rule: 'xₖ₊₁ = xₖ − f′(xₖ) / f″(xₖ)',
        blurb: 'Fit a parabola using the slope and the curvature, then jump straight to its bottom. Fast near a minimum, but it can head for a maximum when f″ < 0.' },

  legend: () => [['f(x)', '--curve'], ['slope / path', '--approx'], ['current x', '--accent']],
  columns: () => ['k', 'xₖ', 'f(xₖ)', 'f′(xₖ)'],

  build(ctx) {
    const { f, df, d2f, p, method: m, view } = ctx;
    const MAX = 80;
    const steps = [];
    let x = p.x0;

    if (m === 'gd' && !(p.eta > 0)) throw new Error('η must be greater than 0.');

    steps.push({ to: x, trail: [x], rows: [[0, x, f(x), df(x)]],
      text: `Start at x₀ = ${N(x)}, where f = ${N(f(x))} and the slope f′ = ${N(df(x))}.` });

    for (let i = 1; i <= MAX; i++) {
      const g = df(x);
      let xn, t;

      if (m === 'gd') {
        xn = x - p.eta * g;
        t = `Slope at x${sub(i - 1)} is ${N(g)}, so downhill is to the ${g > 0 ? 'left' : 'right'}. Step: x${sub(i)} = ${N(x)} − ${fmt(p.eta)}·(${N(g)}) = <strong>${fmt(xn)}</strong>.`;
      } else {
        const h = d2f(x);
        if (!isFinite(h) || Math.abs(h) < 1e-13) {
          steps[steps.length - 1].text += ' <strong>Stopped:</strong> f″ ≈ 0, Newton can’t take a step.';
          break;
        }
        xn = x - g / h;
        t = `Slope ${N(g)}, curvature f″ = ${N(h)}. Jump to the bottom of the matching parabola: x${sub(i)} = <strong>${fmt(xn)}</strong>.`;
        if (h < 0) t += ' f″ < 0 here, so this step heads toward a <strong>maximum</strong>, not a minimum.';
      }

      const diverged = !isFinite(xn) || Math.abs(xn) > 1e6;
      if (diverged) {
        t += ' <strong>Diverged:</strong> the steps keep growing. ' + (m === 'gd' ? 'Make η smaller.' : 'Start closer to the minimum.');
      } else {
        const fOld = f(x), fNew = f(xn);
        t += fNew < fOld
          ? ` f dropped from ${N(fOld)} to ${N(fNew)}.`
          : ` f went <strong>up</strong> from ${N(fOld)} to ${N(fNew)}: the step overshot.${m === 'gd' ? ' Try a smaller η.' : ''}`;
        if (xn < view.x0 || xn > view.x1) t += ' (The new point is off the visible graph.)';
      }

      const done = !diverged && (Math.abs(df(xn)) < 1e-8 || Math.abs(xn - x) < 1e-11);
      if (done) t += ` <strong>Converged</strong> after ${i} steps: minimum near x ≈ ${N(xn)}.`;

      steps.push({ from: x, to: xn, trail: steps[steps.length - 1].trail.concat(xn), rows: [[i, xn, f(xn), df(xn)]], text: t });
      if (diverged || done) break;
      x = xn;
    }
    return steps;
  },

  draw(plot, ctx, steps, k) {
    const s = steps[k], { f, df } = ctx;
    const A = col('--accent'), G = col('--approx');
    plot.curve(f, col('--curve'), 3);

    // The path taken so far
    const tr = s.trail;
    for (let i = 0; i < tr.length - 1; i++) {
      plot.line(tr[i], f(tr[i]), tr[i + 1], f(tr[i + 1]), col('--ghost'), 1.25, [3, 4]);
      plot.dot(tr[i], f(tr[i]), col('--ghost'), 3.5);
    }

    // Short tangent segment at the current point
    const x = s.to, y = f(x), m = df(x);
    const span = (plot.v.x1 - plot.v.x0) * .09;
    if (isFinite(m)) plot.line(x - span, y - m * span, x + span, y + m * span, G, 2.25);

    if (k > 0) {
      plot.dot(s.from, f(s.from), G, 4.5);
      plot.arrow(s.from, f(s.from), x, y, A);
    }
    plot.dot(x, y, A, 7);
    plot.label(`x${sub(k)} = ${fmt(x)}`, x, y, A, 10, -12);
  },
};
