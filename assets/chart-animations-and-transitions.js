/*
 * PFF chart animations & transitions — v2.1.0-candidate.1
 * An opt-in coordinator for chart DATA, value-axis limits, and moving ticks.
 * Based on the existing PFF keyed morph / practice_landscape tick handoff.
 * Approved foundations remain unchanged: chart styling, chart axes, UI counters.
 *
 * One 600 ms ease-in-out-cubic timeline for concordant data AND axes.
 * Stable spine/plot geometry is the responsibility of the chart renderer.
 * No global Chart.js changes, no DOM style injection, no data loading.
 *
 * API: PFFModules.chartAnimations
 *   animate(target, model, {initial, render(frame, meta), reducedMotion})
 *   sample(fromModel, toModel, rawProgress)
 *   withChartJsTiming(chartOptions)
 *   morphTypes(target, toTypeModel, {initial, plot, render, reducedMotion})
 *   sampleTypeMorph(fromTypeModel, toTypeModel, progress, plot)
 *   sampleCategories(fromEntries, toEntries, rawProgress, {zeroBase?})
 *   animateCategories(target, toEntries, {initial?, zeroBase?, render(items, meta), reducedMotion?})
 *   cancel(target)
 *
 * Model: {axes:{x?:{min,max,step?},y?:{min,max,step?}},
 *         datasets:[{id,points:[{id,value,opacity?}]}]}
 * IDs must be stable between compatible datasets. The renderer updates data
 * marks and ticks ONLY; leave spines, padding, data sources and filters alone.
 */
(function(global) {
  'use strict';
  const root = global.PFFModules || (global.PFFModules = {});
  const VERSION = '2.1.0-candidate.1';
  const DEFAULTS = Object.freeze({
    chartMs: 600, hoverMs: 170,
    chartEasing: 'easeInOutCubic', majorTickPx: 6, minorTickPx: 2
  });
  const running = new WeakMap();
  const displayed = new WeakMap();
  const clamp = v => Math.min(1, Math.max(0, v));
  function easeInOutCubic(v) {
    const t = clamp(Number(v) || 0);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function lerp(a, b, progress) { return a + (b - a) * progress; }
  function isReducedMotion(overrides = {}) {
    if (typeof overrides.reducedMotion === 'boolean') return overrides.reducedMotion;
    if (typeof root.settings?.reducedMotion === 'function') return root.settings.reducedMotion();
    return global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  }
  function assertTarget(target) {
    if (!target || (typeof target !== 'object' && typeof target !== 'function')) {
      throw new TypeError('[PFF chartAnimations] Expected an object or element as target.');
    }
  }
  function axis(spec) {
    if (!spec || typeof spec !== 'object') return null;
    const min = Number(spec.min ?? 0), max = Number(spec.max);
    const step = spec.step == null ? null : Number(spec.step);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min ||
        (step !== null && (!Number.isFinite(step) || step <= 0))) {
      throw new TypeError('[PFF chartAnimations] Axis needs finite min < max and positive step.');
    }
    return {min, max, step};
  }
  function point(raw) {
    const id = String(raw?.id ?? raw?.key ?? '').trim();
    const value = Number(raw?.value);
    const opacity = Number(raw?.opacity ?? 1);
    if (!id || !Number.isFinite(value) || !Number.isFinite(opacity)) {
      throw new TypeError('[PFF chartAnimations] Points need an id and finite value.');
    }
    return {id, value, opacity: clamp(opacity)};
  }
  function normalize(model) {
    if (!model || typeof model !== 'object' || !Array.isArray(model.datasets)) {
      throw new TypeError('[PFF chartAnimations] Model must contain datasets array.');
    }
    const ids = new Set();
    const datasets = model.datasets.map(raw => {
      const id = String(raw?.id ?? '').trim();
      if (!id || ids.has(id) || !Array.isArray(raw.points)) {
        throw new TypeError('[PFF chartAnimations] Datasets need unique ids and points arrays.');
      }
      ids.add(id);
      const points = raw.points.map(point);
      if (new Set(points.map(p => p.id)).size !== points.length) {
        throw new TypeError('[PFF chartAnimations] Point ids must be unique per dataset.');
      }
      return {id, points};
    });
    return {
      axes: {x: axis(model.axes?.x), y: axis(model.axes?.y)},
      datasets
    };
  }
  function datasetMap(data) { return new Map(data.map(d => [d.id, d])); }
  function fallbackTicks(bounds, major = true) {
    const step = bounds.step || (bounds.max - bounds.min) / 4;
    const count = Math.min(100, Math.floor((bounds.max - bounds.min) / step + 1e-9));
    return Array.from({length: count + 1}, (_, i) => ({
      value: bounds.min + i * step, ratio: (i * step) / (bounds.max - bounds.min),
      alpha: 1, labelAlpha: 1, majorStrength: major ? 1 : 0,
      length: major ? DEFAULTS.majorTickPx : DEFAULTS.minorTickPx
    }));
  }
  function animatedAxis(from, to, raw) {
    if (!from && !to) return null;
    const first = from || to, last = to || from;
    const eased = easeInOutCubic(raw);
    const min = lerp(first.min, last.min, eased);
    const max = lerp(first.max, last.max, eased);
    // Reuse the approved axis module for moving ticks and major-step handoff.
    // Its implementation interpolates the maximum itself using cubic easing.
    const axes = root.chartAxes;
    let ticks;
    if (first.min === 0 && last.min === 0 && first.max > 0 && last.max > 0 &&
        typeof axes?.animatedNumericTicks === 'function') {
      ticks = axes.animatedNumericTicks(first.max, last.max, raw, {
        ...(first.step == null ? {} : {fromStep: first.step}),
        ...(last.step == null ? {} : {toStep: last.step})
      }).ticks;
    } else {
      ticks = fallbackTicks({min, max, step: last.step || first.step});
    }
    return {min, max, step: last.step, ticks};
  }
  function normalizedSample(start, finish, rawProgress) {
    const raw = clamp(Number(rawProgress) || 0);
    const p = easeInOutCubic(raw);
    const before = datasetMap(start.datasets), after = datasetMap(finish.datasets);
    const ids = [...new Set([...after.keys(), ...before.keys()])];
    const datasets = ids.map(id => {
      const source = before.get(id), dest = after.get(id);
      const a = new Map(source?.points.map(point => [point.id, point]) || []);
      const b = new Map(dest?.points.map(point => [point.id, point]) || []);
      const pointIds = [...new Set([...b.keys(), ...a.keys()])];
      return {id, points: pointIds.map(key => {
        const initial = a.get(key), final = b.get(key);
        // Entering/exiting concordant positions fade, not fly across axes.
        const fromValue = initial?.value ?? final.value;
        const toValue = final?.value ?? initial.value;
        return {id: key, value: lerp(fromValue, toValue, p),
          opacity: lerp(initial?.opacity ?? 0, final?.opacity ?? 0, p)};
      })};
    });
    return {axes: {
      x: animatedAxis(start.axes.x, finish.axes.x, raw),
      y: animatedAxis(start.axes.y, finish.axes.y, raw)
    }, datasets, progress: p, rawProgress: raw};
  }
  function sample(fromModel, toModel, rawProgress) {
    return normalizedSample(normalize(fromModel), normalize(toModel), rawProgress);
  }
  function interrupt(target) {
    const active = running.get(target);
    if (!active) return;
    running.delete(target);
    active.cancelled = true;
    if (active.handle != null) global.cancelAnimationFrame?.(active.handle);
    active.finish(false);
  }
  function cancel(target) {
    assertTarget(target);
    interrupt(target);
  }
  function drive(target, duration, onFrame) {
    interrupt(target);
    const canAnimate = duration > 0 && typeof global.requestAnimationFrame === 'function';
    if (!canAnimate) {
      onFrame(1);
      return Promise.resolve(true);
    }
    return new Promise(resolve => {
      const state = {cancelled: false, handle: null, finish: resolve};
      running.set(target, state);
      let started = null;
      const tick = now => {
        if (state.cancelled || running.get(target) !== state) return;
        if (started === null) started = now;
        const raw = clamp((now - started) / duration);
        try { onFrame(raw); }
        catch (error) {
          running.delete(target);
          resolve(false);
          global.console?.error?.('[PFF chartAnimations] Render error', error);
          return;
        }
        if (raw < 1) state.handle = global.requestAnimationFrame(tick);
        else {
          running.delete(target);
          resolve(true);
        }
      };
      state.handle = global.requestAnimationFrame(tick);
    });
  }
  function frameAsModel(frame) {
    return {axes: {x: frame.axes.x && {min: frame.axes.x.min, max: frame.axes.x.max,
      step: frame.axes.x.step}, y: frame.axes.y && {min: frame.axes.y.min, max: frame.axes.y.max,
      step: frame.axes.y.step}}, datasets: frame.datasets};
  }
  function animate(target, toModel, options = {}) {
    assertTarget(target);
    if (typeof options.render !== 'function') {
      throw new TypeError('[PFF chartAnimations] animate requires render(frame, meta).');
    }
    const to = normalize(toModel);
    // On interruptions, displayed values become the next starting values.
    const from = displayed.get(target) || normalize(options.initial || toModel);
    const duration = isReducedMotion(options) ? 0 : DEFAULTS.chartMs;
    return drive(target, duration, raw => {
      const frame = normalizedSample(from, to, raw);
      displayed.set(target, raw >= 1 ? to : normalize(frameAsModel(frame)));
      options.render(frame, {duration, complete: raw >= 1});
    });
  }
  function withChartJsTiming(options = {}) {
    // Opt in when creating Chart.js charts. Does not change global defaults.
    // This handles regular Chart.js dataset transitions; for custom axis
    // interpolation, use animate() and chart.update('none') per frame.
    const animation = options.animation === false ? false : {
      ...(options.animation || {}),
      duration: DEFAULTS.chartMs, easing: DEFAULTS.chartEasing
    };
    const prior = options.transitions || {};
    return {...options, animation, transitions: {
      ...prior,
      active: {...prior.active, animation: {
        ...(prior.active?.animation || {}), duration: DEFAULTS.hoverMs
      }},
      resize: {...prior.resize, animation: {
        ...(prior.resize?.animation || {}), duration: 0
      }}
    }};
  }
  // Optional categorical COLUMN ↔ LINE morph. This represents each bar and
  // point as one rounded rectangle, so shape and value change continuously.
  // Connecting segments draw/undraw between the matched point anchors.
  // The chart renderer owns spines/grid/ticks; this never animates those.
  const typeDisplayed = new WeakMap();
  function morphPlot(raw = {}) {
    const plot = {left: 48, right: 335, top: 18, bottom: 178,
      min: 0, max: 80, columnWidth: 20, pointRadius: 4, ...raw};
    for (const [key, value] of Object.entries(plot)) {
      if (!Number.isFinite(value)) throw new TypeError('[PFF chartAnimations] Invalid morph plot: ' + key);
    }
    if (plot.left >= plot.right || plot.top >= plot.bottom ||
        plot.min >= plot.max || plot.columnWidth <= 0 || plot.pointRadius <= 0) {
      throw new TypeError('[PFF chartAnimations] Invalid morph plot bounds.');
    }
    return plot;
  }
  function typeShapes(spec, plot) {
    if (!spec || !['columns', 'line'].includes(spec.type) ||
        !Array.isArray(spec.points) || spec.points.length < 2) {
      throw new TypeError('[PFF chartAnimations] Type model needs columns/line and 2+ keyed points.');
    }
    const points = spec.points.map(point), keys = points.map(p => p.id);
    if (new Set(keys).size !== keys.length) {
      throw new TypeError('[PFF chartAnimations] Duplicate type-morph point ids.');
    }
    const width = plot.right - plot.left;
    const marks = points.map((p, i) => {
      const cx = plot.left + (i + .5) * width / points.length;
      const cy = plot.bottom - (p.value - plot.min) / (plot.max - plot.min) * (plot.bottom - plot.top);
      const column = spec.type === 'columns';
      const w = column ? plot.columnWidth : 2 * plot.pointRadius;
      const h = column ? Math.max(0, plot.bottom - cy) : 2 * plot.pointRadius;
      return {id: p.id, x: cx - w / 2, y: cy - (column ? 0 : plot.pointRadius),
        width: w, height: h, radius: column ? 2 : plot.pointRadius,
        anchorX: cx, anchorY: cy};
    });
    return {marks, connect: spec.type === 'line' ? 1 : 0};
  }
  function morphShapes(from, to, rawProgress) {
    const p = easeInOutCubic(rawProgress);
    const source = new Map(from.marks.map(m => [m.id, m]));
    if (from.marks.length !== to.marks.length ||
        to.marks.some(m => !source.has(m.id))) {
      throw new TypeError('[PFF chartAnimations] Type morph requires matching point IDs.');
    }
    const fields = ['x', 'y', 'width', 'height', 'radius', 'anchorX', 'anchorY'];
    const marks = to.marks.map(dest => {
      const initial = source.get(dest.id), mark = {id: dest.id};
      for (const field of fields) mark[field] = lerp(initial[field], dest[field], p);
      return mark;
    });
    const connect = lerp(from.connect, to.connect, p);
    const segments = marks.slice(1).map((mark, i) => ({
      from: marks[i].id, to: mark.id,
      x1: marks[i].anchorX, y1: marks[i].anchorY,
      x2: lerp(marks[i].anchorX, mark.anchorX, connect),
      y2: lerp(marks[i].anchorY, mark.anchorY, connect)
    }));
    return {marks, segments, connect, progress: p};
  }
  function sampleTypeMorph(fromSpec, toSpec, rawProgress, plotOptions) {
    const plot = morphPlot(plotOptions);
    return morphShapes(typeShapes(fromSpec, plot), typeShapes(toSpec, plot), rawProgress);
  }
  function morphTypes(target, toSpec, options = {}) {
    assertTarget(target);
    if (typeof options.render !== 'function') {
      throw new TypeError('[PFF chartAnimations] morphTypes requires render(frame, meta).');
    }
    const plot = morphPlot(options.plot);
    const to = typeShapes(toSpec, plot);
    const from = typeDisplayed.get(target) || typeShapes(options.initial || toSpec, plot);
    // Validate matching keys before interrupting an existing animation.
    morphShapes(from, to, 0);
    const duration = isReducedMotion(options) ? 0 : DEFAULTS.chartMs;
    return drive(target, duration, raw => {
      const frame = morphShapes(from, to, raw);
      typeDisplayed.set(target, raw >= 1 ? to : {marks: frame.marks, connect: frame.connect});
      options.render(frame, {duration, complete: raw >= 1});
    });
  }
  // Keyed categorical transitions (approved Clinician Balance MM1–MM7 behaviour).
  // Only coordinates, geometry, value and opacity are interpolated. The caller
  // keeps chart spines/grid fixed and renders bars, labels and ticks together.
  // IDs survive filtering/reordering; names, colours and calculations belong
  // to the application. No Chart.js internals are required by this helper.
  const categoryDisplayed = new WeakMap();
  function normalizeCategories(entries) {
    if (!Array.isArray(entries)) {
      throw new TypeError('[PFF chartAnimations] Categories must be an array.');
    }
    const seen = new Set();
    return entries.map((raw, index) => {
      const id = String(raw?.id ?? raw?.key ?? raw?.mmm ?? '').trim();
      const x = Number(raw?.x), base = Number(raw?.base), y = Number(raw?.y);
      const height = Number(raw?.height), value = Number(raw?.value ?? 0);
      const opacity = Number(raw?.opacity ?? raw?.alpha ?? 1);
      const parsedMM = /^MM(\d+)$/i.exec(id);
      const order = Number(raw?.order ?? raw?.mmm ?? (parsedMM ? parsedMM[1] : index));
      if (!id || seen.has(id) || ![x, base, y, height, value, opacity, order]
        .every(Number.isFinite) || height < 0) {
        throw new TypeError('[PFF chartAnimations] Categories require unique ids and finite geometry.');
      }
      seen.add(id);
      return {
        id, x, base, y, height, value, order, opacity: clamp(opacity),
        label: String(raw.label ?? id),
        colour: String(raw.colour ?? raw.color ?? '#69718a')
      };
    });
  }
  function nearestCategoryY(item, candidates, fallback) {
    if (!candidates.length) return fallback;
    return candidates.reduce((best, row) =>
      Math.abs(row.order - item.order) < Math.abs(best.order - item.order) ? row : best
    ).y;
  }
  function sampledCategories(start, finish, rawProgress, options = {}) {
    const raw = clamp(Number(rawProgress) || 0);
    const p = easeInOutCubic(raw);
    const before = new Map(start.map(item => [item.id, item]));
    const after = new Map(finish.map(item => [item.id, item]));
    const keys = [...new Set([...finish.map(item => item.id), ...start.map(item => item.id)])];
    const zero = options.zeroBase == null ? null : Number(options.zeroBase);
    if (zero != null && !Number.isFinite(zero)) {
      throw new TypeError('[PFF chartAnimations] zeroBase must be finite.');
    }
    const items = keys.map(id => {
      const current = before.get(id), dest = after.get(id);
      const guide = dest || current;
      const baseline = zero ?? guide.base;
      const initial = current || {
        ...guide, x: baseline, base: baseline,
        y: nearestCategoryY(guide, start, guide.y),
        height: Math.max(1, guide.height * 0.65), value: 0, opacity: 0
      };
      const final = dest || {
        ...guide, x: baseline, base: baseline,
        y: nearestCategoryY(guide, finish, guide.y),
        height: Math.max(1, guide.height * 0.65), value: 0, opacity: 0
      };
      const opacity = lerp(initial.opacity, final.opacity, p);
      return {
        id, label: guide.label, colour: guide.colour, order: guide.order,
        x: lerp(initial.x, final.x, p), base: lerp(initial.base, final.base, p),
        y: lerp(initial.y, final.y, p), height: lerp(initial.height, final.height, p),
        value: lerp(initial.value, final.value, p), opacity, alpha: opacity,
        entering: !current, exiting: !dest
      };
    }).sort((a, b) => a.order - b.order);
    return {items, progress: p, rawProgress: raw};
  }
  function sampleCategories(fromEntries, toEntries, rawProgress, options = {}) {
    return sampledCategories(normalizeCategories(fromEntries),
      normalizeCategories(toEntries), rawProgress, options);
  }
  function animateCategories(target, toEntries, options = {}) {
    assertTarget(target);
    if (typeof options.render !== 'function') {
      throw new TypeError('[PFF chartAnimations] animateCategories requires render(items, meta).');
    }
    const to = normalizeCategories(toEntries);
    const from = categoryDisplayed.get(target) || normalizeCategories(options.initial ?? toEntries);
    const duration = isReducedMotion(options) || options.instant === true ? 0 : DEFAULTS.chartMs;
    // The existing coordinator cancels an in-flight animation for the same target.
    // Its last rendered coordinates are retained, so rapid state changes retarget
    // smoothly instead of snapping back to a stale dataset.
    return drive(target, duration, raw => {
      const frame = sampledCategories(from, to, raw, options);
      categoryDisplayed.set(target, raw >= 1 ? to : normalizeCategories(frame.items));
      options.render(frame.items, {
        duration, complete: raw >= 1, progress: frame.progress,
        rawProgress: frame.rawProgress
      });
    });
  }
  root.chartAnimations = Object.freeze({
    version: VERSION, defaults: DEFAULTS, easeInOutCubic,
    sample, normalize, animate, cancel,
    sampleTypeMorph, morphTypes, withChartJsTiming,
    normalizeCategories, sampleCategories, animateCategories,
    isReducedMotion
  });
})(typeof window !== 'undefined' ? window : globalThis);
