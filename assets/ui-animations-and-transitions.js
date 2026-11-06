/*
 * ui-animations-and-transitions.js — PFF visual motion primitives (v2 review)
 * Revision based on existing PFF patterns:
 * - Matched/keyed values MORPH in place, with persistent visual framing.
 * - Numbers COUNT from their visible values; no default text crossfade.
 * - Entry and micro-feedback methods retained from approved v1.
 *
 * Chart.js-specific axis/spine/scale transitions remain in the existing apps/core;
 * morphSeries is an opt-in DOM/SVG value interpolator, not a Chart.js plugin.
 * No changes to loader, data source logic, production apps or global CSS.
 * API: window.PFFModules.motion
 */
(function (global) {
  'use strict';

  const modules = global.PFFModules || (global.PFFModules = {});
  const settings = modules.settings || null;
  const fallbackTimings = Object.freeze({
    viewTransitionMs: 900,
    hoverAnimationMs: 170,
    tabTransitionMs: 300,
    microTransitionMs: 180
  });
  const active = new WeakMap();
  const morphStates = new WeakMap();
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

  function safeMs(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(10000, n)) : fallback;
  }

  function getTimings() {
    const d = settings?.defaults || fallbackTimings;
    return Object.freeze({
      view: safeMs(d.viewTransitionMs, 900),
      hover: safeMs(d.hoverAnimationMs, 170),
      tab: safeMs(d.tabTransitionMs, 300),
      micro: safeMs(d.microTransitionMs, 180),
      textFadeOut: 170,  // legacy reference; no longer standard for numeric changes
      textFadeIn: 260,
      enter: 220,
      trackerCounter: 520, // job_tracker_1.html, job_tracker_2.html
      calculatorCount: 1700, // permanent_calculator.html, locum_calculator.html
      fastNumberToggle: 240 // permanent_calculator.html
    });
  }

  function reducedMotion(options = {}) {
    if (typeof options.reducedMotion === 'boolean') return options.reducedMotion;
    if (typeof settings?.reducedMotion === 'function') return settings.reducedMotion();
    return global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  }

  function durationMs(value, fallback, options) {
    return reducedMotion(options) ? 0 : safeMs(value ?? fallback, fallback);
  }

  function assertElement(element) {
    if (!element || element.nodeType !== 1) {
      throw new TypeError('[PFF motion] Expected a DOM element.');
    }
  }

  function begin(element) {
    const old = active.get(element);
    if (old) {
      old.cancelled = true;
      if (old.raf !== null) global.cancelAnimationFrame?.(old.raf);
      try { old.animation?.cancel(); } catch (_) { /* noop */ }
      old.resolve?.(false);
    }
    const session = { cancelled: false, animation: null, raf: null, resolve: null };
    active.set(element, session);
    return session;
  }

  function current(element, session) {
    return !session.cancelled && active.get(element) === session;
  }

  function settle(element, session) {
    if (active.get(element) === session) active.delete(element);
  }

  async function phase(element, session, keyframes, duration, easing = EASE) {
    if (!current(element, session)) return false;
    if (duration <= 0 || typeof element.animate !== 'function') return current(element, session);
    let animation;
    try {
      animation = element.animate(keyframes, { duration, easing, fill: 'both' });
      session.animation = animation;
      await animation.finished;
      return current(element, session);
    } catch (_) { return false; }
    finally {
      if (session.animation === animation) session.animation = null;
      try { animation?.cancel(); } catch (_) { /* noop */ }
    }
  }

  /**
   * Smoothly interpolate matching data items by stable `id` (or `key`).
   * Pass render(frame) to update only the data marks, NOT the chart frame/spines.
   * `frame` items have {id, value, opacity}. Newly arriving/departing items
   * fade, while concordant items always move/resize in place.
   *
   * Usage: morphSeries(svgOrPanel, [{id:'NSW',value:42}, ...], {
   *   initialData: [...],
   *   render: frame => updateDataMarks(frame), // leave spines alone
   *   duration: 900
   * });
   * Rapid successive calls start from the CURRENT interpolated frame.
   */
  function morphSeries(element, nextData, options = {}) {
    assertElement(element);
    if (typeof options.render !== 'function') {
      throw new TypeError('[PFF motion] morphSeries requires a render callback.');
    }
    const to = normalizeData(nextData);
    const initial = morphStates.get(element) || normalizeData(options.initialData || to);
    const fromMap = new Map(initial.map(item => [item.id, item]));
    const toMap = new Map(to.map(item => [item.id, item]));
    const ids = [...new Set([...toMap.keys(), ...fromMap.keys()])];
    const tracks = ids.map(id => {
      const from = fromMap.get(id);
      const destination = toMap.get(id);
      return {
        id,
        fromValue: from?.value ?? destination.value,
        toValue: destination?.value ?? from.value,
        fromOpacity: from?.opacity ?? 0,
        toOpacity: destination?.opacity ?? 0
      };
    });
    const interpolate = progress => tracks.map(track => ({
      id: track.id,
      value: track.fromValue + (track.toValue - track.fromValue) * progress,
      opacity: track.fromOpacity + (track.toOpacity - track.fromOpacity) * progress
    }));
    const session = begin(element);
    const duration = durationMs(options.duration, getTimings().view, options);
    const easing = typeof options.easing === 'function' ? options.easing : easeInOutCubic;
    function draw(progress) {
      if (!current(element, session)) return;
      const frame = interpolate(progress);
      morphStates.set(element, frame);
      options.render(frame, progress);
    }
    if (duration <= 0 || typeof global.requestAnimationFrame !== 'function') {
      draw(1);
      morphStates.set(element, to);
      settle(element, session);
      return Promise.resolve(true);
    }
    return new Promise(resolve => {
      session.resolve = resolve;
      const start = global.performance.now();
      const tick = now => {
        if (!current(element, session)) return;
        const t = Math.min(1, Math.max(0, (now - start) / duration));
        try { draw(easing(t)); }
        catch (error) { settle(element, session); resolve(false); global.console?.error(error); return; }
        if (t < 1) {
          session.raf = global.requestAnimationFrame(tick);
        } else {
          morphStates.set(element, to);
          settle(element, session);
          resolve(true);
        }
      };
      session.raf = global.requestAnimationFrame(tick);
    });
  }

  function normalizeData(data) {
    if (!Array.isArray(data)) throw new TypeError('[PFF motion] Expected an array of keyed data items.');
    const seen = new Set();
    return data.map(item => {
      const id = String(item?.id ?? item?.key ?? '').trim();
      const value = Number(item?.value);
      if (!id || seen.has(id) || !Number.isFinite(value)) {
        throw new TypeError('[PFF motion] Data items require unique nonempty ids and finite values.');
      }
      seen.add(id);
      const opacity = Number(item.opacity ?? 1);
      return {id, value, opacity: Math.min(1, Math.max(0, Number.isFinite(opacity) ? opacity : 1))};
    });
  }

  function easeInOutCubic(p) {
    return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  }
  function easeOutCubic(p) {
    return 1 - Math.pow(1 - p, 3);
  }

  /**
   * Count between the CURRENT visible number and a numeric target.
   * Mirrors the existing PFF numericValue+easeOutCubic pattern.
   * Existing applications can retain their own durations/formatters.
   */
  function animateNumber(element, targetValue, options = {}) {
    assertElement(element);
    const target = Number(targetValue);
    if (!Number.isFinite(target)) throw new TypeError('[PFF motion] Target must be a finite number.');
    const format = typeof options.format === 'function'
      ? options.format
      : value => new Intl.NumberFormat('en-AU', {
          minimumFractionDigits: Math.max(0, Math.min(6, Number(options.decimals) || 0)),
          maximumFractionDigits: Math.max(0, Math.min(6, Number(options.decimals) || 0))
        }).format(value);
    const read = value => {
      const candidate = Number(String(value ?? '').replace(/[^0-9.\-]/g, ''));
      return Number.isFinite(candidate) && String(value ?? '').trim() !== '' ? candidate : NaN;
    };
    const startStored = read(element.dataset.numericValue);
    const startDisplay = read(element.textContent);
    const start = Number.isFinite(startStored) ? startStored : Number.isFinite(startDisplay)
      ? startDisplay : (Number.isFinite(Number(options.initialValue)) ? Number(options.initialValue) : 0);
    const session = begin(element);
    const duration = durationMs(options.duration, getTimings().trackerCounter, options);
    const easing = typeof options.easing === 'function' ? options.easing : easeOutCubic;
    const draw = value => {
      element.textContent = String(format(value));
      element.dataset.numericValue = String(value);
    };
    if (duration <= 0 || start === target || typeof global.requestAnimationFrame !== 'function') {
      draw(target);
      settle(element, session);
      return Promise.resolve(true);
    }
    return new Promise(resolve => {
      session.resolve = resolve;
      const startTime = global.performance.now();
      const tick = now => {
        if (!current(element, session)) return;
        const t = Math.min(1, Math.max(0, (now - startTime) / duration));
        try { draw(start + (target - start) * easing(t)); }
        catch (error) { settle(element, session); resolve(false); global.console?.error(error); return; }
        if (t < 1) session.raf = global.requestAnimationFrame(tick);
        else { draw(target); settle(element, session); resolve(true); }
      };
      session.raf = global.requestAnimationFrame(tick);
    });
  }

  /** Integer counter convenience wrapper; 520ms is the job-tracker reference. */
  function animateCount(element, targetValue, options = {}) {
    const formatter = options.format || (value =>
      new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 }).format(Math.round(value)));
    return animateNumber(element, targetValue, {...options, format: formatter});
  }

  /**
   * Reveal an already-visible DOM element. No layout, display or hidden
   * attributes are modified; the calling app decides when it should appear.
   * variant: 'rise' (default) or 'fade'.
   */
  async function enter(element, options = {}) {
    assertElement(element);
    const session = begin(element);
    const ms = durationMs(options.duration, getTimings().enter, options);
    const distance = Math.min(20, Math.max(0, Number(options.distance ?? 7) || 0));
    const from = options.variant === 'fade'
      ? { opacity: 0 }
      : { opacity: 0, transform: `translateY(${distance}px)` };
    const to = options.variant === 'fade'
      ? { opacity: 1 }
      : { opacity: 1, transform: 'translateY(0px)' };
    try {
      return await phase(element, session, [from, to], ms, options.easing || EASE);
    } finally {
      settle(element, session);
    }
  }

  /**
   * Brief non-layout-affecting emphasis for a button, chip or status indicator.
   * Uses the approved 180ms micro-transition duration by default.
   */
  async function feedback(element, options = {}) {
    assertElement(element);
    const session = begin(element);
    const ms = durationMs(options.duration, getTimings().micro, options);
    const scale = Math.min(1.06, Math.max(1, Number(options.scale ?? 1.035) || 1));
    try {
      return await phase(element, session, [
        { transform: 'scale(1)', offset: 0 },
        { transform: `scale(${scale})`, offset: 0.45 },
        { transform: 'scale(1)', offset: 1 }
      ], ms, options.easing || 'ease-in-out');
    } finally {
      settle(element, session);
    }
  }

  /** Cancel a running motion on one element; subsequent calls still work. */
  function cancel(element) {
    if (!element || !active.has(element)) return false;
    const session = active.get(element);
    session.cancelled = true;
    if (session.raf !== null) global.cancelAnimationFrame?.(session.raf);
    try { session.animation?.cancel(); } catch (_) { /* noop */ }
    session.resolve?.(false);
    active.delete(element);
    return true;
  }

  if (modules.motion) {
    console.warn('[PFF Modules] motion namespace already exists; replacing it.');
  }
  modules.motion = Object.freeze({
    version: '0.2.0-candidate.2',
    getTimings,
    reducedMotion,
    morphSeries,
    animateNumber,
    animateCount,
    enter,
    feedback,
    cancel
  });
})(window);
