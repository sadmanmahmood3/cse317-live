/* =========================================================
   TEMPLATE — copy this file to start a new topic.
   (This file is NOT loaded by index.html.)

   To add a topic:
   1. Copy this file, e.g. js/topics/differences.js
   2. Change "mytopic" below to a short id
   3. Add <script src="js/topics/differences.js"></script>
      in index.html, BEFORE js/app.js
   A new tab appears automatically.
   ========================================================= */

TOPICS.mytopic = {
  name: 'My topic',      // tab title
  week: 'Week ?',        // small text above the tab title

  // Examples shown in the "Examples…" dropdown. The first one loads by default.
  presets: [
    { label: 'x² − 2', f: 'x^2 - 2', range: ['-3', '3'], p: { x0: '1' } },
  ],

  // Method buttons. Use ctx.method inside build() to know which one is picked.
  methods: [{ id: 'main', label: 'Main method' }],

  // Which input boxes to show for a method, and their labels
  params: (method) => ['x0'],
  labels: { x0: 'Start x₀' },

  // Which parameter a click on the graph sets (or null for none)
  click: (method) => 'x0',

  // The formula shown in the orange box + one-line explanation
  info: (method) => ({ rule: 'xₙ₊₁ = …', blurb: 'What this method does, in plain words.' }),

  // Legend items: [text, colour token]
  legend: (method) => [['f(x)', '--curve'], ['current point', '--accent']],

  // Column headings for the iteration table
  columns: (method) => ['n', 'xₙ', 'f(xₙ)'],

  /*
    build(ctx) runs the whole algorithm ONCE and returns a list of steps.
    ctx contains:
      ctx.f, ctx.df, ctx.d2f  -> f(x), f'(x), f''(x) as functions
      ctx.p                    -> the numbers from the input boxes, e.g. ctx.p.x0
      ctx.method               -> which method button is selected
      ctx.view                 -> visible window {x0, x1, y0, y1}
    Each step needs:
      text -> explanation (HTML allowed; N(value) formats a number)
      rows -> table rows for this step, e.g. [[n, x, f(x)]]
    Add any other data draw() needs.
    Throw new Error('message') to show a red error box instead.
  */
  build(ctx) {
    const { f, p } = ctx;
    const steps = [];
    let x = p.x0;
    for (let n = 0; n < 5; n++) {
      steps.push({ x, rows: [[n, x, f(x)]], text: `Step ${n}: x = ${N(x)}` });
      x = x / 2; // replace with the real update rule
    }
    return steps;
  },

  /*
    draw(plot, ctx, steps, k) draws step number k.
    Useful plot methods (all take maths coordinates):
      plot.curve(fn, colour)              plot.line(x1, y1, x2, y2, colour)
      plot.slopeLine(x, y, m, colour)     plot.dot(x, y, colour)
      plot.label(text, x, y, colour)      plot.band(a, b, colour)
      plot.poly([[x, y], ...], colour)    plot.arrow(x1, y1, x2, y2, colour)
    Colours: col('--curve'), col('--accent'), col('--approx'), col('--ghost')
  */
  draw(plot, ctx, steps, k) {
    const s = steps[k];
    plot.curve(ctx.f, col('--curve'), 3);
    plot.dot(s.x, ctx.f(s.x), col('--accent'), 6);
  },
};
