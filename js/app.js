/* =========================================================
   app.js — connects the page to the topics
   Runs last. Builds the tabs, reads the inputs, runs the
   chosen topic's build(), then shows one step at a time.
   ========================================================= */

(function () {
  if (typeof math === 'undefined') {
    $('#say').textContent = 'Could not load math.js. Check your internet connection and reload the page.';
    return;
  }

  // Tabs appear in the same order the topic <script> tags are listed in index.html
  const ORDER = Object.keys(TOPICS);

  /* ---------- State: everything the page needs to remember ---------- */
  const S = {
    topic: 'roots',   // which tab is open
    method: {},       // chosen method per topic
    preset: {},       // chosen example per topic
    expr: {},         // f(x) text per topic
    range: {},        // visible x-range per topic
    p: {},            // parameter values per topic (x0, a, b, ...)
    steps: [],        // the list of iterations for the current run
    k: 0,             // which step is showing
    ctx: null,        // compiled function + numbers for the current run
    timer: null,      // Play timer
  };

  function applyPreset(id, i) {
    const pr = TOPICS[id].presets[i];
    S.preset[id] = i;
    S.expr[id] = pr.f;
    S.range[id] = pr.range.slice();
    S.p[id] = Object.assign({}, S.p[id] || {}, pr.p);
  }

  ORDER.forEach((id) => {
    // Root finding opens on Newton (the most visual one); other topics open on their first method
    S.method[id] = id === 'roots' ? 'newton' : TOPICS[id].methods[0].id;
    applyPreset(id, 0);
  });
  if (!TOPICS[S.topic]) S.topic = ORDER[0];

  const plot = new Plot($('#cv'));

  const el = {
    tabs: $('#tabs'), fx: $('#fx'), preset: $('#preset'), deriv: $('#deriv'),
    methods: $('#methods'), params: $('#params'), vx0: $('#vx0'), vx1: $('#vx1'), err: $('#err'),
    tbl: $('#tbl'), tw: $('#tblwrap'), say: $('#say'), rule: $('#rule'), blurb: $('#blurb'),
    counter: $('#counter'), legend: $('#legend'), hint: $('#hint'),
    play: $('#bPlay'), next: $('#bNext'), back: $('#bBack'), reset: $('#bReset'), speed: $('#speed'),
  };

  /* ---------- Build the tabs ---------- */
  function buildTabs() {
    el.tabs.innerHTML = '';
    ORDER.forEach((id) => {
      const b = document.createElement('button');
      b.className = 'tab';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', id === S.topic);
      b.innerHTML = `<small>${TOPICS[id].week}</small><b>${TOPICS[id].name}</b>`;
      b.onclick = () => { S.topic = id; buildTabs(); buildPanel(); rebuild(0); };
      el.tabs.appendChild(b);
    });
  }

  /* ---------- Build the right-hand panel for the current topic ---------- */
  function buildPanel() {
    const T = TOPICS[S.topic], id = S.topic, meth = S.method[id];

    el.fx.value = S.expr[id];

    el.preset.innerHTML = '<option value="">Examples…</option>' +
      T.presets.map((p, i) => `<option value="${i}">${p.label}</option>`).join('');
    el.preset.value = S.expr[id] === T.presets[S.preset[id]].f ? String(S.preset[id]) : '';

    // Method buttons
    el.methods.innerHTML = '';
    T.methods.forEach((mm) => {
      const b = document.createElement('button');
      b.textContent = mm.label;
      b.setAttribute('aria-pressed', mm.id === meth);
      b.onclick = () => { S.method[id] = mm.id; buildPanel(); rebuild(0); };
      el.methods.appendChild(b);
    });

    // Parameter boxes (x0, a, b, η ...)
    el.params.innerHTML = '';
    T.params(meth).forEach((key) => {
      const d = document.createElement('div');
      d.className = 'fld';
      d.innerHTML = `<label for="p-${key}">${T.labels[key]}</label><input id="p-${key}" inputmode="decimal" spellcheck="false" autocomplete="off">`;
      const inp = d.querySelector('input');
      inp.value = S.p[id][key] ?? '';
      inp.addEventListener('input', () => { S.p[id][key] = inp.value; debounce(() => rebuild(0)); });
      el.params.appendChild(d);
    });

    el.vx0.value = S.range[id][0];
    el.vx1.value = S.range[id][1];

    const info = T.info(meth);
    el.rule.textContent = info.rule;
    el.blurb.textContent = info.blurb;

    el.legend.innerHTML = T.legend(meth)
      .map(([text, token]) => `<span><i style="background:var(${token})"></i>${text}</span>`).join('');

    const clickKey = T.click(meth);
    el.hint.textContent = clickKey ? `Click the graph to set ${T.labels[clickKey].toLowerCase()}` : '';
    el.hint.hidden = !clickKey;
    $('#cv').style.cursor = clickKey ? 'crosshair' : 'default';
  }

  // Wait until the user stops typing for 300 ms before recalculating
  let debounceTimer = null;
  const debounce = (fn) => { clearTimeout(debounceTimer); debounceTimer = setTimeout(fn, 300); };

  el.fx.addEventListener('input', () => { S.expr[S.topic] = el.fx.value; el.preset.value = ''; debounce(() => rebuild(0)); });
  el.preset.addEventListener('change', () => {
    if (el.preset.value === '') return;
    applyPreset(S.topic, +el.preset.value);
    buildPanel();
    rebuild(0);
  });
  el.vx0.addEventListener('input', () => { S.range[S.topic][0] = el.vx0.value; debounce(() => rebuild(S.k)); });
  el.vx1.addEventListener('input', () => { S.range[S.topic][1] = el.vx1.value; debounce(() => rebuild(S.k)); });

  /* ---------- Run the method: read inputs -> build all steps ---------- */
  function rebuild(k) {
    stop();
    el.err.hidden = true;
    const T = TOPICS[S.topic], id = S.topic, meth = S.method[id];

    try {
      const F = compile(S.expr[id]);

      const x0 = num(S.range[id][0], 'View x from');
      const x1 = num(S.range[id][1], 'View x to');
      if (!(x1 > x0)) throw new Error('“View x to” must be bigger than “View x from”.');
      plot.v = { x0, x1, ...plot.fitY(F.f, x0, x1) };

      el.deriv.textContent = F.dstr ? `f′(x) = ${F.dstr}` : '';

      const p = {};
      T.params(meth).forEach((key) => { p[key] = num(S.p[id][key], T.labels[key]); });

      const ctx = { ...F, p, method: meth, view: plot.v };
      const steps = T.build(ctx);

      S.ctx = ctx;
      S.steps = steps;
      S.k = Math.max(0, Math.min(k, steps.length - 1));
    } catch (e) {
      el.err.textContent = e.message;
      el.err.hidden = false;
      S.steps = [];
      S.ctx = null;
    }
    render();
  }

  /* ---------- Show step S.k: graph, explanation, table ---------- */
  function render() {
    plot.size();
    plot.grid();
    const T = TOPICS[S.topic];

    if (!S.steps.length) {
      el.say.textContent = 'Fix the input above to see the method run.';
      el.counter.textContent = '';
      el.tbl.innerHTML = '';
      updateButtons();
      return;
    }

    try { T.draw(plot, S.ctx, S.steps, S.k); } catch (e) { console.error(e); }

    const s = S.steps[S.k];
    el.say.innerHTML = s.text;
    el.counter.textContent = `step ${S.k} / ${S.steps.length - 1}`;

    // Table: every row up to the current step
    const cols = T.columns(S.method[S.topic]);
    let html = '<thead><tr>' + cols.map((c) => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
    for (let i = 0; i <= S.k; i++) {
      const st = S.steps[i];
      (st.rows || [st.row]).forEach((r) => {
        html += `<tr class="${i === S.k ? 'cur' : ''}">` + r.map((v) => `<td>${fmt(v)}</td>`).join('') + '</tr>';
      });
    }
    el.tbl.innerHTML = html + '</tbody>';
    el.tw.scrollTop = el.tw.scrollHeight;
    updateButtons();
  }

  /* ---------- Play / Next / Back ---------- */
  function updateButtons() {
    const n = S.steps.length;
    el.back.disabled = S.k <= 0;
    el.reset.disabled = S.k <= 0;
    el.next.disabled = !n || S.k >= n - 1;
    el.play.disabled = n < 2;
    el.play.textContent = S.timer ? '❚❚ Pause' : (n && S.k >= n - 1 ? '▶ Replay' : '▶ Play');
  }
  function go(k) { S.k = Math.max(0, Math.min(k, S.steps.length - 1)); render(); }
  function stop() { if (S.timer) { clearInterval(S.timer); S.timer = null; } }
  function play() {
    if (S.timer) { stop(); updateButtons(); return; }
    if (S.k >= S.steps.length - 1) S.k = 0;
    S.timer = setInterval(() => {
      if (S.k >= S.steps.length - 1) { stop(); updateButtons(); return; }
      go(S.k + 1);
    }, +el.speed.value);
    render();
  }

  el.play.onclick = play;
  el.next.onclick = () => { stop(); go(S.k + 1); };
  el.back.onclick = () => { stop(); go(S.k - 1); };
  el.reset.onclick = () => { stop(); go(0); };
  el.speed.onchange = () => { if (S.timer) { stop(); play(); } };

  // Keyboard: ← → and Space (ignored while typing in a box)
  document.addEventListener('keydown', (e) => {
    if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); stop(); go(S.k + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); go(S.k - 1); }
    else if (e.key === ' ') { e.preventDefault(); play(); }
  });

  // Click the graph to set the starting point
  $('#cv').addEventListener('click', (e) => {
    const T = TOPICS[S.topic], key = T.click(S.method[S.topic]);
    if (!key || !S.ctx) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = plot.ix(e.clientX - r.left);
    const v = String(parseFloat(x.toPrecision(3)));
    S.p[S.topic][key] = v;
    const inp = document.getElementById('p-' + key);
    if (inp) inp.value = v;
    rebuild(0);
  });

  // Redraw when the window resizes or dark mode changes
  new ResizeObserver(() => render()).observe($('.canvas-wrap'));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', render);

  /* ---------- Start ---------- */
  buildTabs();
  buildPanel();
  rebuild(2);
})();
