/*
 * ui-animations-and-transitions.js — PFF visual motion primitives (v4 unit-aware counting review)
 * Revision based on existing PFF patterns:
 * - Matched/keyed values MORPH in place, with persistent visual framing.
 * - One quick count speed; late unit/decimal formatting without automatic K/M short forms.
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
  const unitFades = new WeakMap();
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

  /* A single count speed. The caller can select formatting, not speed. */
  const COUNT_MS = 400;
  const DECIMALS_FROM = 0.85;
  const FORMAT_FLIP_AT = 0.94;
  const magnitude = Object.freeze({ K: 1e3, M: 1e6, B: 1e9 });

  function extractValue(value) {
    const text = String(value ?? '').trim();
    if (!text) return NaN;
    const match = text.replace(/,/g, '').match(/\(?\s*-?\s*\$?\s*([0-9]+(?:\.[0-9]+)?)\s*([KMB])?/i);
    if (!match) return NaN;
    const sign = /-/.test(text.slice(0, match.index + match[0].length)) || text.startsWith('(') ? -1 : 1;
    return sign * Number(match[1]) * (magnitude[(match[2] || '').toUpperCase()] || 1);
  }

  function unitOf(text) {
    // E.g. "$8.2K", "1.2M people", with no accidental match from suffix words.
    const match = String(text).replace(/,/g, '').match(/\d(?:\.\d+)?\s*([KMB])(?=$|\s|[^a-z])/i);
    return match ? match[1].toUpperCase() : '';
  }

  function digitsOf(value, options, notation) {
    if (options.decimals != null) return Math.max(0, Math.min(6, Math.floor(Number(options.decimals) || 0)));
    return notation === 'compact' ? 1 : Math.min(6, (String(value).split('.')[1] || '').length);
  }

  function unitFor(value) {
    const abs = Math.abs(value);
    return abs >= 1e9 ? 'B' : abs >= 1e6 ? 'M' : abs >= 1e3 ? 'K' : '';
  }

  function labelWidth(element, label) {
    const doc = element.ownerDocument;
    const ctx = doc?.createElement('canvas')?.getContext('2d');
    if (!ctx || typeof global.getComputedStyle !== 'function') return label.length;
    const style = global.getComputedStyle(element);
    ctx.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = style.letterSpacing;
    return ctx.measureText(label).width;
  }

  function formatNumber(value, digits, unit, prefix, suffix) {
    const divider = magnitude[unit] || 1;
    return prefix + new Intl.NumberFormat('en-AU', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value / divider) + unit + suffix;
  }

  /**
   * Animate numeric text over 400ms without introducing a K/M abbreviation
   * merely to shorten intermediate frames.
   *
   * - Default notation is standard; use {notation:'compact'} ONLY for a
   *   statistic/axis that already uses K/M/B formatting.
   * - Matching compact units (e.g. 8.2K → 9.5K) remain stable throughout.
   * - A unit change (950 → 1.2K) counts in regular numbers and flips to
   *   compact notation at the end. In narrow slots, the last fitting number
   *   holds briefly instead of exceeding the final text width.
   * - Decimals appear in the final 15% when introduced, or are removed
   *   on the first frame when disappearing.
   * - If the old value is too wide for the new destination (annual salary
   *   → hourly rate), count from zero in the destination context; never
   *   invent a transient $95K abbreviation for a $48.75 destination.
   * - Intermediate text never exceeds the destination's character count
   *   or measured glyph width (the pre-existing old label may be wider).
   * - Rapid updates continue from the interpolated value when width permits.
   *
   * Options: prefix, suffix, decimals (0..6), notation: standard|compact,
   *   format(value) (custom final format), initialValue, onFrame, reducedMotion.
   * A duration of 0 is supported for tests; nonzero speeds are standardized.
   */
  function animateNumber(element, targetValue, options = {}) {
    assertElement(element);
    const target = Number(targetValue);
    if (!Number.isFinite(target)) throw new TypeError('[PFF motion] Target must be finite.');
    const notation = options.notation === 'compact' ? 'compact' : 'standard';
    const digits = digitsOf(target, options, notation);
    const prefix = String(options.prefix ?? '');
    const suffix = String(options.suffix ?? '');
    const destinationUnit = notation === 'compact' ? unitFor(target) : '';
    const exact = typeof options.format === 'function' ? options.format
      : value => formatNumber(value, digits, destinationUnit, prefix, suffix);
    const finalText = String(exact(target));
    const finalWidth = labelWidth(element, finalText) + 0.1;
    const fits = label => label.length <= finalText.length && labelWidth(element, label) <= finalWidth;
    const oldText = element.textContent || '';
    const oldUnit = unitOf(oldText);
    const oldValue = extractValue(oldText);
    const savedValue = extractValue(element.dataset.numericValue);
    const provided = Number(options.initialValue);
    const initial = Number.isFinite(savedValue) ? savedValue : Number.isFinite(oldValue) ? oldValue
      : options.initialValue != null && Number.isFinite(provided) ? provided : 0;
    // Keep a K or M suffix only if both old and new presentations use that unit.
    const sameCompact = !!destinationUnit && oldUnit === destinationUnit;
    // If the destination is narrower than the currently visible number,
    // begin a fresh count from zero rather than showing an oversized value.
    const restart = !fits(oldText);
    const from = restart ? 0 : initial;
    const initialHasDecimal = /\d\.\d/.test(oldText);
    const revealDecimal = digits > 0 && !initialHasDecimal;
    const endFormatChange = !!destinationUnit && !sameCompact;
    // If crossing into a new compact unit, animate normal values smoothly
    // to the largest fitting value of the old unit, then flip formatting.
    const interimUnit = endFormatChange && oldUnit ? oldUnit : '';
    const threshold = magnitude[destinationUnit] || 0;
    const oldMagnitude = magnitude[interimUnit] || 1;
    const crossesUp = endFormatChange && initial >= 0 && target >= threshold &&
      initial < threshold && (interimUnit === '' || oldMagnitude < threshold);
    const cap = threshold - oldMagnitude;
    try { unitFades.get(element)?.cancel(); } catch (_) { /* no-op */ }
    unitFades.delete(element);
    const session = begin(element);
    const ms = durationMs(options.duration === 0 ? 0 : COUNT_MS, COUNT_MS, options);
    const easing = typeof options.easing === 'function' ? options.easing : easeOutCubic;
    const integerLabel = value => formatNumber(Math.round(value), 0, '', prefix, suffix);
    const scaledLabel = (value, decimalPlaces) => formatNumber(value, decimalPlaces, destinationUnit, prefix, suffix);
    let lastFitting = fits(oldText) ? String(oldText) : integerLabel(0);
    let formatFlipped = false;
    if (!fits(lastFitting)) lastFitting = finalText;
    // When the original display is wider, make the first displayed frame fit
    // immediately, rather than leaving a wide source label until the first RAF.
    if (restart && ms > 0) element.textContent = lastFitting;
    const draw = (value, progress) => {
      const end = progress >= 1;
      const showUnit = sameCompact || (endFormatChange && progress >= FORMAT_FLIP_AT) || end;
      let label;
      if (end) label = finalText;
      else if (showUnit) {
        const showDecimals = !revealDecimal || progress >= DECIMALS_FROM;
        label = scaledLabel(value, showDecimals ? digits : 0);
      } else {
        const shownValue = crossesUp && progress < FORMAT_FLIP_AT
          ? from + (cap - from) * easeOutCubic(Math.min(1, progress / FORMAT_FLIP_AT))
          : value;
        const showDecimals = !revealDecimal && digits > 0 && !endFormatChange
          ? true : revealDecimal && progress >= DECIMALS_FROM && !endFormatChange;
        label = formatNumber(shownValue, showDecimals ? digits : 0,
          interimUnit, prefix, suffix);
      }
      // Leave units unchanged until the short ending transition. If a
      // traditional number cannot fit, retain the last natural value rather
      // than manufacturing K/M or showing an overlong intermediate label.
      if (!end && !fits(label)) label = lastFitting;
      else lastFitting = label;
      element.textContent = label;
      // Brief final notation fade. Uses the Web Animations API so it does not
      // alter layout, text width or persistent inline styles.
      if (endFormatChange && showUnit && !formatFlipped && !end &&
          typeof element.animate === 'function' && !reducedMotion(options)) {
        formatFlipped = true;
        try {
          const fx = element.animate([{opacity: .72}, {opacity: 1}],
            {duration: 75, easing: 'ease-out'});
          unitFades.set(element, fx);
          fx.onfinish = () => { if (unitFades.get(element) === fx) unitFades.delete(element); };
          fx.oncancel = () => { if (unitFades.get(element) === fx) unitFades.delete(element); };
        } catch (_) { /* presentation remains valid without fade */ }
      }
      element.dataset.numericValue = String(value);
      if (typeof options.onFrame === 'function') options.onFrame({progress, value, label, unit: showUnit ? destinationUnit : '', restarted: restart});
    };
    if (ms <= 0 || from === target || typeof global.requestAnimationFrame !== 'function') {
      draw(target, 1); settle(element, session); return Promise.resolve(true);
    }
    return new Promise(resolve => {
      session.resolve = resolve;
      const startTime = global.performance.now();
      const tick = now => {
        if (!current(element, session)) return;
        const progress = Math.min(1, Math.max(0, (now - startTime) / ms));
        try { draw(from + (target - from) * easing(progress), progress); }
        catch (error) { settle(element, session); resolve(false); global.console?.error(error); return; }
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
    try { unitFades.get(element)?.cancel(); } catch (_) { /* no-op */ }
    unitFades.delete(element);
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
    version: '0.4.0-candidate.4',
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
