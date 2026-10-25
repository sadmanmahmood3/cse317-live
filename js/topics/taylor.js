/* =========================================================
   Topic: Taylor polynomial approximation  (Week 1)
   ========================================================= */

TOPICS.taylor = {
  name: 'Taylor series',
  week: 'Week 1',

  presets: [
    { label: 'sin x about 0', f: 'sin(x)', range: ['-9', '9'], p: { a: '0', check: '3' } },
    { label: 'eˣ about 0', f: 'exp(x)', range: ['-4', '3'], p: { a: '0', check: '2' } },
    { label: 'ln(1 + x) about 0  (watch it fail past x = 1)', f: 'log(1+x)', range: ['-1.2', '3'], p: { a: '0', check: '1.6' } },
    { label: 'cos x about π/2', f: 'cos(x)', range: ['-4', '7.5'], p: { a: 'pi/2', check: '4' } },
  ],

  methods: [{ id: 'taylor', label: 'Taylor polynomial' }],
  params: () => ['a', 'check'],
  labels: { a: 'Center a', check: 'Check error at x' },
  click: () => 'a', // clicking the graph moves the center

  info: () => ({
    rule: 'Pₙ(x) = Σ f⁽ᵏ⁾(a)/k! · (x − a)ᵏ',
    blurb: 'Build a polynomial that matches f and its derivatives at one point. Each extra degree bends the polynomial to follow f a little further from the center.',
  }),
  legend: () => [['f(x)', '--curve'], ['Pₙ(x)', '--approx'], ['Pₙ₋₁(x)', '--ghost'], ['error at x', '--accent']],
  columns: () => ['n', 'cₙ', 'Pₙ(x*)', '|f − Pₙ|'],

  // One step per degree n = 0, 1, 2, ... 10
  build(ctx) {
    const { node, f, p } = ctx;
    const a = p.a, xc = p.check;
    const steps = [];
    const coefs = [];
    let d = node;      // current derivative expression
    let fact = 1;      // n!

    for (let n = 0; n <= 10; n++) {
      if (n > 0) {
        try { d = math.derivative(d, 'x'); } catch (e) { break; }
        fact *= n;
      }
      let dv;
      try { dv = d.compile().evaluate({ x: a }); } catch (e) { dv = NaN; }
      if (typeof dv !== 'number' || !isFinite(dv)) {
        if (n === 0) throw new Error('f(a) is undefined at this center. Move a.');
        break;
      }

      const c = dv / fact;           // coefficient f⁽ⁿ⁾(a) / n!
      coefs.push(c);
      const cs = coefs.slice();
      const P = (x) => {             // evaluate the polynomial
        let s = 0, t = 1;
        for (let k = 0; k < cs.length; k++) { s += cs[k] * t; t *= (x - a); }
        return s;
      };

      const err = Math.abs(f(xc) - P(xc));
      const prev = steps[steps.length - 1];
      const xa = a === 0 ? 'x' : `(x − ${fmt(a)})`;

      let txt;
      if (n === 0) txt = `Degree 0 is just the constant f(a) = ${N(c)}. A flat line through the center.`;
      else if (c === 0) txt = `Degree ${n}: the ${n}th derivative at a is 0, so this term is zero and the polynomial doesn't change.`;
      else txt = `Degree ${n}: add the term ${N(c)}·${xa}${sup(n)}. The polynomial now matches f and its first ${n} derivative${n > 1 ? 's' : ''} at x = ${N(a)}.`;
      txt += ` At x* = ${N(xc)} the error is <strong>${fmt(err)}</strong>.`;
      if (prev && n >= 4 && err > prev.err * 1.05 && c !== 0) {
        txt += ' The error went <strong>up</strong>: x* is outside the region where this series converges, so more terms make it worse.';
      }

      steps.push({ n, P, err, c, row: [n, c, P(xc), err], text: txt });
    }
    steps.forEach((s, i) => { s.prevP = i ? steps[i - 1].P : null; });
    return steps;
  },

  draw(plot, ctx, steps, k) {
    const s = steps[k], { f, p } = ctx;
    plot.curve(f, col('--curve'), 3);
    if (s.prevP) plot.curve(s.prevP, col('--ghost'), 1.75, [6, 5]);
    plot.curve(s.P, col('--approx'), 2.75);

    plot.dot(p.a, f(p.a), col('--ink'), 5);
    plot.label('a', p.a, f(p.a), col('--ink'), -8, -12, 'right');

    // Vertical error bar at x*
    const fy = f(p.check), py = s.P(p.check);
    plot.line(p.check, plot.v.y0, p.check, plot.v.y1, col('--ghost'), 1, [3, 4]);
    if (isFinite(fy) && isFinite(py)) {
      plot.line(p.check, fy, p.check, py, col('--accent'), 3);
      plot.dot(p.check, fy, col('--curve'), 4);
      plot.dot(p.check, py, col('--approx'), 4);
    }
    const lx = plot.v.x0 + (plot.v.x1 - plot.v.x0) * .04;
    plot.label(`P${sub(s.n)}`, lx, s.P(lx), col('--approx'), 0, -10);
    plot.label('x*', p.check, plot.v.y0, col('--muted'), 6, -8);
  },
};
