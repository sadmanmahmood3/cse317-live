# CSE 317 Live Lab

An interactive visualizer for **CSE 317 Numerical Methods** (IUB, Autumn 2026).
Type any function, pick a method, and step through it one iteration at a time.
The graph, the explanation and the iteration table update at every step.

## Topics

| Tab | Methods | Course week |
|---|---|---|
| Taylor series | Taylor polynomial, error at a point | 1 |
| Root finding | Bisection, False position, Secant, Newton–Raphson | 2–3 |
| Optimization | Gradient descent, Newton's method | 4–5 |
| Integration | Trapezoidal rule, Simpson's 1/3 rule | 4–5 |

Planned: finite differences, Lagrange / Vandermonde interpolation, Gaussian elimination and LU decomposition.

## Run it on your computer

1. Open this folder in **VS Code**.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right-click `index.html` → **Open with Live Server**.
4. Edit any file and save. The page reloads by itself.

An internet connection is needed the first time, because math.js and the fonts load from the web.

## How it works

```
index.html            page layout and buttons
css/style.css         all styling (light + dark mode)
js/helpers.js         number formatting, reading f(x) with math.js
js/plot.js            drawing on the <canvas>
js/topics/*.js        one file per topic
js/app.js             tabs, inputs, Play / Next / Back
```

Each topic file has two main parts:

- `build(ctx)` runs the whole algorithm once and returns a list of steps.
- `draw(plot, ctx, steps, k)` draws step number `k`.

Play, Next and Back only change `k`. To add a topic, copy `js/topics/_template.js`
and add a `<script>` tag for it in `index.html` before `js/app.js`.

## Built with

- Plain HTML, CSS and JavaScript (no framework)
- [math.js](https://mathjs.org/) for reading formulas and taking derivatives
