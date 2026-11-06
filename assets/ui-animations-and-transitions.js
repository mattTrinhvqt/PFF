/*
 * ui-animations-and-transitions.js — PFF visual motion primitives (v3 count revision)
 * Revision based on existing PFF patterns:
 * - Matched/keyed values MORPH in place, with persistent visual framing.
 * - One fast count speed; integer/decimal digit-budget protection.
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
      enter: 220,
      count: 400 // one approved-candidate counter speed across contexts
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

  /* Counter values use the same quick timing, regardless of calling app. */
  const COUNT_MS = 400;
  const FRACTIONS_FROM = 0.85; // new decimal digits appear in the final 15%
  const numberFormatter = new Intl.NumberFormat('en-AU', {maximumFractionDigits: 0});
  const compactFormatter = new Intl.NumberFormat('en-AU', {
    notation: 'compact', maximumFractionDigits: 0
  });

  function numberFromText(text) {
    const raw = String(text ?? '');
    if (!raw.trim()) return NaN;
    const numeric = Number(raw.replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(numeric) ? numeric : NaN;
  }

  function decimalDigits(target, options) {
    if (options.decimals !== undefined) {
      return Math.max(0, Math.min(6, Math.floor(Number(options.decimals) || 0)));
    }
    const written = String(target);
    return Math.min(6, (written.split('.')[1] || '').length);
  }

  function formatParts(formatted) {
    // An Australian number with optional prefix/suffix (e.g. '$', ' / hr').
    const text = String(formatted);
    const match = text.match(/^(.*?)(-?(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d+)?)([^\d]*)$/);
    if (!match) return null;
    return {prefix: match[1], suffix: match[3]};
  }

  function textWidth(element, text) {
    // Real glyph widths matter too: a seven-character string can be narrower
    // than a six-character string in proportional fonts.
    const doc = element.ownerDocument;
    const ctx = doc?.createElement('canvas')?.getContext('2d');
    if (!ctx || typeof global.getComputedStyle !== 'function') return text.length;
    const style = global.getComputedStyle(element);
    ctx.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = style.letterSpacing;
    return ctx.measureText(text).width;
  }

  /**
   * Fast counting number animation (400 ms), designed for narrow dashboards.
   * - Intermediate integer formatting is used until the LAST 15% when adding
   *   decimal places. When removing decimals they disappear on the first tick.
   * - No intermediate display is wider (in characters OR font pixels) than the
   *   final formatted display. Oversized source values use compact Australian
   *   notation (e.g. '$95K') while travelling to a smaller target ('$48.75').
   * - If even compact notation cannot fit the final string, display that final
   *   string rather than overflowing the allotted digits.
   * - Already-rendered source text may initially be wider than the destination;
   *   this function can only constrain frames from the FIRST animation update.
   * - Consecutive calls continue from the live numeric value; old frames stop.
   *
   * Options: decimals (0..6), prefix/suffix, format(value),
   *   formatInteger(value), formatCompact(value), reducedMotion, duration.
   * A `duration:0` override is for tests/instant transitions; all PFF apps
   * should otherwise use the 400 ms default.
   */
  function animateNumber(element, targetValue, options = {}) {
    assertElement(element);
    const target = Number(targetValue);
    if (!Number.isFinite(target)) throw new TypeError('[PFF motion] Target must be a finite number.');
    const digits = decimalDigits(target, options);
    const prefix = String(options.prefix ?? '');
    const suffix = String(options.suffix ?? '');
    const exact = typeof options.format === 'function'
      ? options.format
      : value => prefix + new Intl.NumberFormat('en-AU', {
          minimumFractionDigits: digits, maximumFractionDigits: digits
        }).format(value) + suffix;
    const finalText = String(exact(target));
    const parts = formatParts(finalText);
    const integer = typeof options.formatInteger === 'function'
      ? options.formatInteger
      : value => parts
        ? parts.prefix + numberFormatter.format(Math.round(value)) + parts.suffix
        : String(exact(Math.round(value))).replace(/\.\d+(?=[^\d]*$)/, '');
    const compact = typeof options.formatCompact === 'function'
      ? options.formatCompact
      : value => parts
        ? parts.prefix + compactFormatter.format(value) + parts.suffix
        : String(integer(value));
    const maxWidth = textWidth(element, finalText) + 0.1;
    const fits = label => label.length <= finalText.length &&
      textWidth(element, label) <= maxWidth;
    const stored = numberFromText(element.dataset.numericValue);
    const visible = numberFromText(element.textContent);
    const initial = Number(options.initialValue);
    const from = Number.isFinite(stored) ? stored : Number.isFinite(visible) ? visible
      : (options.initialValue != null && Number.isFinite(initial) ? initial : 0);
    const session = begin(element);
    // One speed for every app; only 0 ms (tests/instant) can override it.
    const ms = durationMs(options.duration === 0 ? 0 : COUNT_MS, COUNT_MS, options);
    const easing = typeof options.easing === 'function' ? options.easing : easeOutCubic;
    const expandingDigits = digits > 0 && !/\.\d+/.test(String(element.textContent));
    // Strictly reserve the target's display width on every animated frame.
    // The exact ending string always wins; custom formatters must be stable.
    const draw = (value, progress) => {
      let label;
      if (progress >= 1) label = finalText;
      else if (expandingDigits && progress >= FRACTIONS_FROM) label = String(exact(value));
      else label = String(integer(value));
      if (!fits(label)) label = String(compact(value));
      if (!fits(label)) label = finalText;
      element.textContent = label;
      element.dataset.numericValue = String(value);
      if (typeof options.onFrame === 'function') options.onFrame({progress, value, label});
    };
    if (ms <= 0 || from === target || typeof global.requestAnimationFrame !== 'function') {
      draw(target, 1);
      settle(element, session);
      return Promise.resolve(true);
    }
    return new Promise(resolve => {
      session.resolve = resolve;
      const startTime = global.performance.now();
      const tick = now => {
        if (!current(element, session)) return;
        const progress = Math.min(1, Math.max(0, (now - startTime) / ms));
        try { draw(from + (target - from) * easing(progress), progress); }
        catch (error) {
          settle(element, session);
          resolve(false);
          global.console?.error(error);
          return;
        }
        if (progress < 1) session.raf = global.requestAnimationFrame(tick);
        else { settle(element, session); resolve(true); }
      };
      session.raf = global.requestAnimationFrame(tick);
    });
  }

  function animateCount(element, targetValue, options = {}) {
    return animateNumber(element, targetValue, {...options, decimals: 0});
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
    version: '0.3.0-candidate.3',
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
