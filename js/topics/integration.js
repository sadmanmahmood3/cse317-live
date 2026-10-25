/* =========================================================
   Topic: Approximating integration  (Weeks 4–5)
   Trapezoidal rule and Simpson's 1/3 rule
   ========================================================= */

// Composite trapezoidal rule with n strips
function trapezoid(f, a, b, n) {
  const h = (b - a) / n;
  let s = (f(a) + f(b)) / 2;
  for (let i = 1; i < n; i++) s += f(a + i * h);
  return s * h;
}

// Composite Simpson's 1/3 rule with n strips (n must be even)
function simpson(f, a, b, n) {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
  return s * h / 3;
}

TOPICS.integ = {
  name: 'Integration',
  week: 'Weeks 4–5',

  presets: [
    { label: 'sin x on [0, π]  (exact = 2)', f: 'sin(x)', range: ['-0.4', '3.6'], p: { a: '0', b: 'pi' } },
    { label: 'e^(−x²) on [−2, 2]', f: 'exp(-x^2)', range: ['-2.6', '2.6'], p: { a: '-2', b: '2' } },
    { label: 'x³ − 2x² + 1 on [−1, 2]', f: 'x^3 - 2*x^2 + 1', range: ['-1.4', '2.4'], p: { a: '-1', b: '2' } },
    { label: '1 / (1 + x²) on [0, 4]', f: '1/(1+x^2)', range: ['-0.4', '4.4'], p: { a: '0', b: '4' } },
  ],

  methods: [
    { id: 'trap', label: 'Trapezoidal rule' },
    { id: 'simpson', label: 'Simpson’s 1/3 rule' },
  ],
  params: () => ['a', 'b'],
  labels: { a: 'Lower limit a', b: 'Upper limit b' },
  click: () => null,

  info: (m) => m === 'trap'
    ? { rule: '∫ f ≈ h·[ f₀/2 + f₁ + … + fₙ₋₁ + fₙ/2 ],  h = (b − a)/n',
        blurb: 'Cut the area into n strips and join the tops with straight lines. Halving h cuts the error by about 4× (error ∝ h²).' }
    : { rule: '∫ f ≈ h/3·[ f₀ + 4f₁ + 2f₂ + 4f₃ + … + fₙ ],  n even',
        blurb: 'Fit a parabola through every three points (Lagrange interpolation) and integrate that. Halving h cuts the error by about 16× (error ∝ h⁴).' },

  legend: (m) => [['f(x)', '--curve'], [m === 'trap' ? 'trapezoids' : 'parabola pieces', '--approx']],
  columns: () => ['n', 'approx', 'error', 'ratio'],

  // One step per value of n
  build(ctx) {
    const { f, p, method: m } = ctx;
    const a = p.a, b = p.b;
    if (!(b > a)) throw new Error('Upper limit b must be bigger than a.');

    // "True" value: Simpson with a huge n (accurate to many digits for smooth f)
    const exact = simpson(f, a, b, 4000);
    if (!isFinite(exact)) throw new Error('f(x) is undefined somewhere in [a, b].');

    const ns = m === 'trap'
      ? Array.from({ length: 24 }, (_, i) => i + 1)        // 1, 2, 3 ... 24
      : Array.from({ length: 12 }, (_, i) => 2 * (i + 1)); // 2, 4, 6 ... 24
    const errs = {};
    const steps = [];

    ns.forEach((n) => {
      const A = m === 'trap' ? trapezoid(f, a, b, n) : simpson(f, a, b, n);
      const err = Math.abs(A - exact);
      errs[n] = err;
      const half = errs[n / 2];
      const ratio = half && err > 1e-15 ? half / err : null;

      let t = `n = ${n} strip${n > 1 ? 's' : ''}, h = (b − a)/n = ${N((b - a) / n)}. Approximation = <strong>${fmt(A)}</strong>; true value ≈ ${N(exact)}; error = ${N(err)}.`;
      if (ratio) t += ` Compared with n = ${n / 2}, the error shrank <strong>${ratio.toFixed(1)}×</strong> (theory: ${m === 'trap' ? '≈4×' : '≈16×'}).`;

      steps.push({ n, A, err, rows: [[n, A, err, ratio ? ratio.toFixed(1) + '×' : '—']], text: t });
    });
    return steps;
  },

  draw(plot, ctx, steps, k) {
    const s = steps[k], { f, p, method: m } = ctx;
    const a = p.a, b = p.b, n = s.n, h = (b - a) / n;
    const G = col('--approx');

    if (m === 'trap') {
      // One trapezoid per strip
      for (let i = 0; i < n; i++) {
        const x0 = a + i * h, x1 = x0 + h;
        plot.poly([[x0, 0], [x0, f(x0)], [x1, f(x1)], [x1, 0]], G, G, .22);
      }
    } else {
      // One parabola (Lagrange through 3 points) per pair of strips
      for (let i = 0; i < n; i += 2) {
        const x0 = a + i * h, x1 = x0 + h, x2 = x1 + h;
        const y0 = f(x0), y1 = f(x1), y2 = f(x2);
        const L = (x) =>
          y0 * (x - x1) * (x - x2) / ((x0 - x1) * (x0 - x2)) +
          y1 * (x - x0) * (x - x2) / ((x1 - x0) * (x1 - x2)) +
          y2 * (x - x0) * (x - x1) / ((x2 - x0) * (x2 - x1));
        const pts = [[x0, 0]];
        for (let j = 0; j <= 30; j++) { const x = x0 + (x2 - x0) * j / 30; pts.push([x, L(x)]); }
        pts.push([x2, 0]);
        plot.poly(pts, G, G, .22);
        plot.line(x1, 0, x1, y1, G, 1, [2, 3]);
      }
    }

    plot.curve(f, col('--curve'), 3);
    for (let i = 0; i <= n; i++) {
      const x = a + i * h;
      plot.dot(x, f(x), G, n > 12 ? 2.5 : 3.5);
    }
    plot.label(`≈ ${fmt(s.A)}`, (a + b) / 2, plot.v.y1, col('--ink'), 0, 22, 'center');
  },
};
