/* =========================================================
   helpers.js — small tools shared by every topic
   ========================================================= */

// Every topic file adds itself to this object, e.g. TOPICS.roots = { ... }
window.TOPICS = {};

// Shortcut for document.querySelector
const $ = (selector) => document.querySelector(selector);

// Turn numbers into subscripts / superscripts:  sub(3) -> "₃",  sup(2) -> "²"
const SUB_DIGITS = '₀₁₂₃₄₅₆₇₈₉';
const SUP_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sub = (n) => String(n).split('').map((d) => SUB_DIGITS[d]).join('');
const sup = (n) => String(n).split('').map((d) => SUP_DIGITS[d]).join('');

// Format a number for display (8 significant digits, scientific for very big/small)
function fmt(v) {
  if (typeof v !== 'number') return v;
  if (!isFinite(v)) return isNaN(v) ? 'NaN' : (v > 0 ? '∞' : '−∞');
  if (v === 0) return '0';
  const a = Math.abs(v);
  const s = (a >= 1e6 || a < 1e-4) ? v.toExponential(3) : String(parseFloat(v.toPrecision(8)));
  return s.replace('-', '−');
}

// A formatted number wrapped in a monospace span, for the explanation text
const N = (v) => `<span class="n">${fmt(v)}</span>`;

// Read a colour token from the CSS, e.g. col('--accent')
const col = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/*
  compile("x^3 - x - 2") gives back:
    f    -> a JavaScript function you can call: f(2) = 4
    df   -> its derivative f'(x)   (math.js works this out symbolically)
    d2f  -> its second derivative f''(x)
    node -> the parsed expression (Taylor needs it for higher derivatives)
*/
const ALLOWED_SYMBOLS = new Set(['x', 'pi', 'e', 'PI', 'E']);

function compile(expr) {
  if (!expr.trim()) throw new Error('Type a function of x, for example x^3 - x - 2.');

  let node;
  try {
    node = math.parse(expr);
  } catch (e) {
    throw new Error('Could not read f(x). Check brackets and operators (use * for multiply, ^ for powers).');
  }

  // Only allow the variable x and constants (stops typos like "y" silently giving NaN)
  node.traverse((n, path, parent) => {
    const isFunctionName = parent && parent.isFunctionNode && path === 'fn';
    if (n.isSymbolNode && !isFunctionName && !ALLOWED_SYMBOLS.has(n.name)) {
      throw new Error(`Unknown symbol “${n.name}”. Use x as the variable.`);
    }
  });

  // Wrap a compiled expression so it always returns a plain number (or NaN)
  const toFunction = (compiled) => (x) => {
    try {
      const v = compiled.evaluate({ x });
      return typeof v === 'number' ? v : NaN;
    } catch (e) {
      return NaN;
    }
  };

  const f = toFunction(node.compile());

  // Derivatives: symbolic if possible, otherwise a central-difference fallback
  let dNode = null, df, d2f;
  try {
    dNode = math.derivative(node, 'x');
    df = toFunction(dNode.compile());
  } catch (e) {
    df = (x) => (f(x + 1e-5) - f(x - 1e-5)) / 2e-5;
  }
  try {
    d2f = toFunction(math.derivative(dNode, 'x').compile());
  } catch (e) {
    d2f = (x) => (df(x + 1e-5) - df(x - 1e-5)) / 2e-5;
  }

  return { node, f, df, d2f, dstr: dNode ? dNode.toString() : null };
}

// Read a number from an input box. Allows things like "pi/2" or "sqrt(2)".
function num(text, label) {
  let v;
  try { v = math.evaluate(String(text)); } catch (e) { v = NaN; }
  if (typeof v !== 'number' || !isFinite(v)) {
    throw new Error(`“${label}” needs a number (got “${text}”).`);
  }
  return v;
}
