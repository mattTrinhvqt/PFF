/*
 * ui-animations-and-transitions.js — PFF visual motion primitives (candidate v1)
 *
 * Purpose: reusable DOM-only visual transitions for ordinary page content.
 * Based on the existing PFF core's fade/text and view-transition conventions.
 *
 * DOES NOT modify the existing PFF core, pff_loader.js, Chart.js animation,
 * data fetching, Apps Script, JSON, caching, production HTML, or CSS globally.
 *
 * Classic script: load after assets/colours-and-settings.js where possible.
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
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

  function getTimings() {
    const d = settings?.defaults || fallbackTimings;
    return Object.freeze({
      view: safeMs(d.viewTransitionMs, 900),
      hover: safeMs(d.hoverAnimationMs, 170),
      tab: safeMs(d.tabTransitionMs, 300),
      micro: safeMs(d.microTransitionMs, 180),
      textFadeOut: 170,  // existing PFF.animateTextChange convention
      textFadeIn: 260,   // existing PFF.animateTextChange convention
      enter: 220         // existing .pff-fade-enter convention
    });
  }

  function safeMs(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(10000, n)) : fallback;
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
      try { old.animation?.cancel(); } catch (_) { /* no-op */ }
    }
    const session = { cancelled: false, animation: null };
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
      animation = element.animate(keyframes, {
        duration,
        easing,
        fill: 'both'
      });
      session.animation = animation;
      await animation.finished;
      return current(element, session);
    } catch (_) {
      // Cancellation is expected when a newer interaction replaces this one.
      return false;
    } finally {
      if (session.animation === animation) session.animation = null;
      try { animation?.cancel(); } catch (_) { /* no-op */ }
    }
  }

  function canAnimate(element, ms) {
    return ms > 0 && typeof element.animate === 'function';
  }

  /**
   * Fade/slide a content panel out, synchronously update its contents, then
   * fade/slide it in. A newer call supersedes an in-flight call.
   *
   * update MUST be synchronous and should only update content inside element.
   * Returns Promise<boolean>: true if completed, false if superseded.
   */
  async function transitionPanel(element, update, options = {}) {
    assertElement(element);
    if (typeof update !== 'function') throw new TypeError('[PFF motion] update must be a function.');
    const session = begin(element);
    const ms = durationMs(options.duration, getTimings().view, options);
    if (!canAnimate(element, ms)) {
      try { update(); return true; }
      finally { settle(element, session); }
    }

    const outMs = Math.round(ms * 0.45);
    const inMs = ms - outMs;
    const distance = Math.min(20, Math.max(0, Number(options.distance ?? 5) || 0));
    try {
      if (!await phase(element, session, [
        { opacity: 1, transform: 'translateY(0px)' },
        { opacity: 0, transform: `translateY(-${distance}px)` }
      ], outMs, options.easing || EASE)) return false;
      if (!current(element, session)) return false;
      update();
      if (!current(element, session)) return false;
      return await phase(element, session, [
        { opacity: 0, transform: `translateY(${distance}px)` },
        { opacity: 1, transform: 'translateY(0px)' }
      ], inMs, options.easing || EASE);
    } finally {
      settle(element, session);
    }
  }

  /**
   * Crossfade the textContent of one heading, value, or status label.
   * Default 170ms out + 260ms in mirrors existing PFF text-change behaviour.
   * Set options.duration to override the combined duration (e.g. 900ms title).
   * A newer update always wins, including when the old animation is mid-flight.
   */
  async function transitionText(element, nextText, options = {}) {
    assertElement(element);
    const text = String(nextText ?? '');
    if (element.textContent === text && !active.has(element)) return true;
    const session = begin(element);
    const t = getTimings();
    const total = options.duration === undefined
      ? t.textFadeOut + t.textFadeIn
      : safeMs(options.duration, t.textFadeOut + t.textFadeIn);
    const outMs = options.duration === undefined ? t.textFadeOut : Math.round(total * (170 / 430));
    const inMs = options.duration === undefined ? t.textFadeIn : total - outMs;
    const out = durationMs(options.fadeOutMs, outMs, options);
    const into = durationMs(options.fadeInMs, inMs, options);
    if (!canAnimate(element, out + into)) {
      try { element.textContent = text; return true; }
      finally { settle(element, session); }
    }
    try {
      if (!await phase(element, session, [
        { opacity: 1 }, { opacity: 0 }
      ], out, options.fadeOutEasing || 'ease-out')) return false;
      if (!current(element, session)) return false;
      element.textContent = text;
      if (!current(element, session)) return false;
      return await phase(element, session, [
        { opacity: 0 }, { opacity: 1 }
      ], into, options.fadeInEasing || EASE);
    } finally {
      settle(element, session);
    }
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
    try { session.animation?.cancel(); } catch (_) { /* no-op */ }
    active.delete(element);
    return true;
  }

  if (modules.motion) {
    console.warn('[PFF Modules] motion namespace already exists; replacing it.');
  }
  modules.motion = Object.freeze({
    version: '0.1.0-candidate.1',
    getTimings,
    reducedMotion,
    transitionPanel,
    transitionText,
    enter,
    feedback,
    cancel
  });
})(window);
