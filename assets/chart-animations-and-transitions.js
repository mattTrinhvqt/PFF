/*
 * PFF chart animations & transitions — v1.0.0-candidate.1
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
 *   handoff(target, render({phase, opacity, progress}), options)
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
  const VERSION = '1.0.0-candidate.1';
  const DEFAULTS = Object.freeze({
    chartMs: 600, typeHandoffMs: 190, hoverMs: 170,
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
  function handoff(target, render, options = {}) {
    assertTarget(target);
    if (typeof render !== 'function') throw new TypeError('handoff requires render callback.');
    const duration = isReducedMotion(options) ? 0 : DEFAULTS.typeHandoffMs;
    // Only marks should crossfade. The spine and axis DOM never fade.
    return drive(target, duration, raw => render({
      phase: raw < 0.5 ? 'out' : 'in',
      opacity: raw < 0.5 ? 1 - easeInOutCubic(raw * 2)
        : easeInOutCubic((raw - 0.5) * 2),
      progress: raw
    }));
  }
  root.chartAnimations = Object.freeze({
    version: VERSION, defaults: DEFAULTS, easeInOutCubic,
    sample, normalize, animate, cancel, handoff, withChartJsTiming,
    isReducedMotion
  });
})(typeof window !== 'undefined' ? window : globalThis);
