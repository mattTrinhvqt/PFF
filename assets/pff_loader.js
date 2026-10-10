
/*
 * PFF Loader v1.1.0 — independent loading animations for PFF web apps.
 *
 * Change DEFAULT_LOADER_STYLE below, then update ONLY this file to experiment.
 *   1 = original S/M/L cone triangles
 *   2 = continuous spectral sensitivity curve
 *
 * Usage now (no HTML changes): core.js automatically loads this file.
 * Usage later (explicit): include <script src="./assets/pff_loader.js"></script>
 * BEFORE pff_chart_core.js. Keep core.js for its chart/data functions.
 *
 * Exposes window.PFFLoader.init/sync/getLoaderStyle/setLoaderStyle.
 * The loader independently handles completion timing by observing is-loading.
 * No changes to pff_chart_core.js are required.
 */
(function (global) {
  'use strict';
  if (global.PFFLoader) return; // idempotent if included both ways

  const DEFAULT_LOADER_STYLE = 2; // <-- CHANGE THIS NUMBER to select animation
  let activeLoaderStyle = [1, 2].includes(Number(global.PFF_LOADER_STYLE))
    ? Number(global.PFF_LOADER_STYLE)
    : DEFAULT_LOADER_STYLE;
  let spectralLoaderSequence = 0;
  const spectralTextStates = new WeakMap();
  const rootStates = new Map();
  const SPECTRAL_CYCLE_MS = 3350;

  const BASE_CSS = String.raw`
/* Standalone base styles; only injected when core.js is absent. */
.app-loading { font-family: 'Lato', system-ui, sans-serif; }
#app, .pff-app { position: relative; }
#app.is-loading > :not(.app-loading), .pff-app.is-loading > :not(.app-loading) { visibility: hidden; }
#app:not(.is-loading):not(.pff-reveal-pending) .app-loading,
.pff-app:not(.is-loading):not(.pff-reveal-pending) .app-loading { display: none; }
.app-loading {
  position: absolute;
  inset: 0;
  z-index: 100;
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--pff-white, #fff);
}

`;

  const CONE_CSS = String.raw`
/* All visual rules for the original full-page and miniature S/M/L cone loaders. */
.cone-loader {
  position: relative;
  width: 176px;
  height: 78px;
  margin: 0 auto;
  overflow: visible;
  isolation: isolate;
}

.cone {
  position: absolute;
  bottom: 8px;
  width: 58px;
  height: 68px;
  opacity: 0;
  clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
  -webkit-clip-path: polygon(50% 0%, 100% 100%, 0% 100%);
  mix-blend-mode: normal;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translateZ(0);
  will-change: opacity;
}

.cone.blue {
  left: 33px;
  background: var(--pff-blue-cone, rgba(74, 86, 255, 0.82));
  animation: pffBlueConeCycle 2.7s infinite cubic-bezier(0.45, 0, 0.25, 1);
}

.cone.green {
  left: 69px;
  background: var(--pff-green-cone, rgba(36, 210, 116, 0.78));
  animation: pffGreenConeCycle 2.7s infinite cubic-bezier(0.45, 0, 0.25, 1);
}

.cone.red {
  left: 85px;
  background: var(--pff-red-cone, rgba(255, 92, 48, 0.76));
  animation: pffRedConeCycle 2.7s infinite cubic-bezier(0.45, 0, 0.25, 1);
}

.loader-text {
  margin: 2px 0 0;
  color: var(--pff-muted, #69718a);
  font-size: 11px;
  line-height: 1.35;
  text-align: center;
  animation: pffLoadingTextPulse 2.7s infinite cubic-bezier(0.45, 0, 0.25, 1);
}


.pff-value-loader {
  position: relative;
  display: block;
  width: 64px;
  height: 28px;
  margin: 0 auto;
  overflow: visible;
  isolation: isolate;
  flex: 0 0 64px;
}

.pff-value-loader .cone {
  bottom: 3px;
  width: 21px;
  height: 24px;
}

.pff-value-loader .cone.blue {
  left: 12px;
}

.pff-value-loader .cone.green {
  left: 25px;
}

.pff-value-loader .cone.red {
  left: 31px;
}


@keyframes pffBlueConeCycle {
  0% { opacity: 0; }
  12% { opacity: 1; }
  76% { opacity: 1; }
  87% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes pffGreenConeCycle {
  0% { opacity: 0; }
  20% { opacity: 0; }
  32% { opacity: 1; }
  76% { opacity: 1; }
  87% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes pffRedConeCycle {
  0% { opacity: 0; }
  40% { opacity: 0; }
  52% { opacity: 1; }
  76% { opacity: 1; }
  87% { opacity: 0; }
  100% { opacity: 0; }
}

@keyframes pffLoadingTextPulse {
  0% { opacity: 0.45; }
  52% { opacity: 0.78; }
  76% { opacity: 0.78; }
  87% { opacity: 0.45; }
  100% { opacity: 0.45; }
}


`;
  const SPECTRAL_CSS = String.raw`
/*
 * Loader style 2: single UNBROKEN SVG envelope, revealed by clipping.
 * Original .cone / pff*ConeCycle animations above stay untouched for style 1.
 * Only full-page .app-loading cones are upgraded: miniature metric loaders remain intact.
 */
.app-loading > .cone-loader.pff-spectral-loader {
  width: 176px;
  height: 83px;
  margin: 0 auto;
}
.app-loading > .cone-loader.pff-spectral-loader > .cone {
  display: none;
}
.app-loading > .cone-loader.pff-spectral-loader > .pff-spectral-svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.cone-loader > .pff-spectral-svg {
  display: none;
}
.pff-spectral-svg .pff-spectral-trace {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2px;
  vector-effect: non-scaling-stroke;
  shape-rendering: geometricPrecision;
  filter: none;
  animation: pffSpectralFinish 3.35s linear infinite;
}
/* NEVER use stroke-dasharray for this path: clip reveal keeps it one line. */
.pff-spectral-svg .pff-spectral-reveal {
  transform-box: fill-box;
  transform-origin: left center;
  animation: pffSpectralReveal 3.35s cubic-bezier(.42, 0, .22, 1) infinite;
}
/* Keep the curve fully visible at the end of the current cycle.
   No opacity fade-out or separate glow/blur layer. */
.pff-spectral-svg .pff-spectral-group {
  opacity: 1;
}
.cone-loader.pff-spectral-complete .pff-spectral-reveal {
  animation: none !important;
  transform: scaleX(1) !important;
}
.cone-loader.pff-spectral-complete .pff-spectral-trace {
  animation: none !important;
  stroke-width: 2px !important;
}

/* IMPORTANT: independent completion handoff. The unmodified core already
   removes .is-loading before it removes .pff-reveal-pending. This class
   keeps the opaque loader visible until the current spectral cycle ends. */
#app.pff-loader-cycle-hold > .app-loading,
.pff-app.pff-loader-cycle-hold > .app-loading {
  display: flex !important;
  position: absolute !important;
  inset: 0 !important;
  z-index: 100 !important;
  width: 100% !important;
  height: 100% !important;
  min-height: 0 !important;
  background: var(--pff-white, #fff) !important;
}
.app-loading.pff-spectral-active > .loader-text {
  margin: 13px 0 0;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.35;
  animation: pffSpectralTextEnter .25s ease-out both;
}
/* Preserve the existing non-animated error message styling when startup fails. */
.app-loading.is-startup-error.pff-spectral-active > .loader-text {
  font-weight: 700;
  animation: none;
}
.pff-spectral-active .pff-loader-dots {
  display: inline-flex;
  justify-content: flex-start;
  width: 1.15em;
  white-space: nowrap;
}
.pff-spectral-active .pff-loader-dots > span {
  opacity: 0;
  animation: pffSpectralDots1 1.2s linear infinite;
}
.pff-spectral-active .pff-loader-dots > span:nth-child(2) { animation-name: pffSpectralDots2; }
.pff-spectral-active .pff-loader-dots > span:nth-child(3) { animation-name: pffSpectralDots3; }

@keyframes pffSpectralReveal {
  /* Immediate first pixels, then progressive continuous reveal. */
  0% { transform: scaleX(.09); }
  76%, 100% { transform: scaleX(1); }
}
@keyframes pffSpectralFinish {
  /* A crisp ~150 ms finishing pulse: no glow, blur or opacity change. */
  0%, 76% { stroke-width: 2px; }
  78.2% { stroke-width: 2.4px; }
  80.5%, 100% { stroke-width: 2px; }
}
@keyframes pffSpectralTextEnter {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes pffSpectralDots1 {
  0%, 4.9%, 75%, 100% { opacity: 0; }
  5%, 74.9% { opacity: 1; }
}
@keyframes pffSpectralDots2 {
  0%, 29.9%, 75%, 100% { opacity: 0; }
  30%, 74.9% { opacity: 1; }
}
@keyframes pffSpectralDots3 {
  0%, 54.9%, 75%, 100% { opacity: 0; }
  55%, 74.9% { opacity: 1; }
}

@media (max-width: 430px) {
  .cone-loader { width: 160px; height: 70px; }
  .cone { width: 52px; height: 61px; }
  .cone.blue { left: 30px; }
  .cone.green { left: 64px; }
  .cone.red { left: 78px; }
  .loader-text { font-size: 10px; }
  .app-loading > .cone-loader.pff-spectral-loader { width: 160px; height: 76px; }
  .app-loading.pff-spectral-active > .loader-text { font-size: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  .cone.blue, .cone.green, .cone.red { animation: none; opacity: 1; }
  .loader-text { animation: none; opacity: .72; }
  .pff-spectral-svg .pff-spectral-reveal,
  .pff-spectral-svg .pff-spectral-group,
  .pff-spectral-svg .pff-spectral-trace,
  .pff-spectral-active .pff-loader-dots > span {
    animation: none !important; transform: none !important; opacity: 1 !important;
  }
  .app-loading.pff-spectral-active > .loader-text {
    animation: none !important; transform: none !important; opacity: 1 !important;
  }
}
`;

  function injectStyles() {
    if (document.getElementById('pff-loader-styles')) return;
    const style = document.createElement('style');
    style.id = 'pff-loader-styles';
    // The core owns the app's loading-state lifecycle, but not loader visuals.
    // Always load BOTH visual styles, regardless of whether core.js is present.
    style.textContent = (global.PFF ? '' : BASE_CSS) + CONE_CSS + SPECTRAL_CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  // Full-page cone loader upgrader. Leaves the original triangles in the DOM
  // so style 1 always restores the original effect with no HTML edits.
  const SPECTRAL_PATH = 'M 24 136 C 46 136 60 99 76 89 C 84 83 90 83 96 89 C 107 103 117 109 130 108 C 152 105 173 65 192 55 C 198 51 202 54 205 59 C 209 65 211 65 214 60 C 217 55 218 34 226 27 C 236 19 244 28 252 39 C 278 77 297 116 314 136';

  function makeSpectralSvg() {
    // Each SVG gets distinct gradient and clipping IDs for multi-loader pages.
    const id = ++spectralLoaderSequence;
    const grad = `pff-spectrum-${id}`;
    const clip = `pff-spectrum-clip-${id}`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'pff-spectral-svg');
    svg.setAttribute('viewBox', '0 0 340 160');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    // Single continuous path, NOT three separately drawn curves and NOT dashes.
    svg.innerHTML = `
      <defs>
        <linearGradient id="${grad}" x1="24" y1="0" x2="314" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#4a56ff" />
          <stop offset="19%" stop-color="#4a56ff" />
          <stop offset="25%" stop-color="#4a56ff" />
          <stop offset="41%" stop-color="#4b9de4" />
          <stop offset="56%" stop-color="#24d274" />
          <stop offset="62%" stop-color="#24d274" />
          <stop offset="66%" stop-color="#93cb57" />
          <stop offset="69%" stop-color="#ecaa45" />
          <stop offset="72%" stop-color="#ff5c30" />
          <stop offset="100%" stop-color="#ff5c30" />
        </linearGradient>
        <clipPath id="${clip}" clipPathUnits="userSpaceOnUse">
          <rect class="pff-spectral-reveal" x="0" y="0" width="340" height="160" />
        </clipPath>
      </defs>
      <g class="pff-spectral-group" clip-path="url(#${clip})">
        <path class="pff-spectral-trace" d="${SPECTRAL_PATH}" stroke="url(#${grad})" />
      </g>`;
    return svg;
  }

  function syncSpectralText(loader, useSpectral) {
    const text = Array.from(loader.children).find(child => child.classList.contains('loader-text'));
    if (!text) return;
    let state = spectralTextStates.get(text);

    if (!useSpectral) {
      if (!state) return;
      state.observer.disconnect();
      // Preserve the latest message, including its original trailing ellipsis.
      if (text.querySelector('.pff-loader-dots')) text.textContent = state.original;
      spectralTextStates.delete(text);
      return;
    }

    if (!state) {
      state = { original: text.textContent, observer: null };
      const observer = new MutationObserver(() => {
        // Preserve original startup error messages; they must not acquire
        // animated dots suggesting that an errored request is still loading.
        if (loader.classList.contains('is-startup-error')) {
          if (text.querySelector('.pff-loader-dots')) {
            text.textContent = state.original;
          } else {
            state.original = text.textContent;
          }
          return;
        }
        // Apps may update loaderText.textContent while loading. Reapply the dots
        // without discarding their new message or disconnecting live updates.
        if (!text.querySelector('.pff-loader-dots')) {
          state.original = text.textContent;
          formatSpectralText(text, state.original);
        }
      });
      state.observer = observer;
      spectralTextStates.set(text, state);
      if (!loader.classList.contains('is-startup-error')) {
        formatSpectralText(text, state.original);
      }
      observer.observe(text, { childList: true, characterData: true, subtree: true });
      observer.observe(loader, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function formatSpectralText(text, original) {
    const content = String(original || '').trim().replace(/(?:\.{2,3}|…)\s*$/, '');
    const label = document.createElement('span');
    label.className = 'pff-loading-label';
    label.textContent = content;
    const dots = document.createElement('span');
    dots.className = 'pff-loader-dots';
    dots.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.textContent = '.';
      dots.appendChild(dot);
    }
    text.replaceChildren(label, dots);
  }

  /*
   * FINISH HANDOFF (independent of pff_chart_core.js)
   *
   * Core v1.2.18 removes .is-loading when data is ready and retains its
   * own overlay for two paint frames. Observe that change in a microtask,
   * BEFORE a frame is painted, and extend the same opaque overlay until
   * the spectral SVG's current 3.35 s cycle reaches its end.
   *
   * The generation/token checks prevent a previous wait from freezing
   * or dismissing a newer loading operation.
   */

  function getSpectralLoader(app) {
    return Array.from(app.children)
      .find(child => child.classList.contains('app-loading'))
      ?.querySelector(':scope > .cone-loader.pff-spectral-loader') || null;
  }

  function cancelPending(entry) {
    if (!entry.pending) return;
    const pending = entry.pending;
    entry.pending = null;
    if (pending.timer !== null) global.clearTimeout(pending.timer);
    if (pending.reveal && pending.listener) {
      pending.reveal.removeEventListener('animationiteration', pending.listener);
    }
  }

  function releaseHeldLoader(entry) {
    cancelPending(entry);
    entry.app.classList.remove('pff-loader-cycle-hold');
  }

  function restartSpectralCycle(app) {
    const loader = getSpectralLoader(app);
    if (!loader) return;
    loader.classList.remove('pff-spectral-complete');
    const svg = loader.querySelector('.pff-spectral-svg');
    if (!svg) return;
    const animations = svg.getAnimations?.({ subtree: true }) || [];
    for (const animation of animations) {
      try {
        animation.cancel();
        animation.play();
      } catch (_) { /* Animation API not supported; ordinary CSS still runs. */ }
    }
  }

  function completeHeldLoader(entry, pending) {
    if (entry.pending !== pending) return;
    cancelPending(entry);
    const { app } = entry;
    if (app.classList.contains('is-loading')) {
      app.classList.remove('pff-loader-cycle-hold');
      return;
    }
    const loader = getSpectralLoader(app);
    if (loader && activeLoaderStyle === 2) {
      loader.classList.add('pff-spectral-complete');
    }
    // Allow the finished chart layout a paint opportunity underneath.
    const release = () => {
      if (entry.generation !== pending.generation) return;
      if (app.classList.contains('is-loading')) return;
      app.classList.remove('pff-loader-cycle-hold');
    };
    if (typeof global.requestAnimationFrame === 'function') {
      global.requestAnimationFrame(release);
    } else {
      release();
    }
  }

  function holdUntilSpectralCycleEnds(entry) {
    const { app } = entry;
    if (activeLoaderStyle !== 2 ||
        document.visibilityState === 'hidden' ||
        global.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const loader = getSpectralLoader(app);
    if (!loader || loader.parentElement.classList.contains('is-startup-error')) {
      return;
    }
    const reveal = loader.querySelector('.pff-spectral-reveal');
    if (!reveal || loader.classList.contains('pff-spectral-complete')) return;
    // Apply the hold BEFORE reading computed animation state. This works even
    // when an app removes .is-loading directly without using the core's
    // intermediate .pff-reveal-pending class.
    app.classList.add('pff-loader-cycle-hold');
    const animation = reveal.getAnimations?.()
      .find(a => a.playState === 'running' && a.animationName === 'pffSpectralReveal');
    if (!animation) {
      app.classList.remove('pff-loader-cycle-hold');
      return; // No animation available: never block the application.
    }

    cancelPending(entry);
    const durationCandidate = Number(animation.effect?.getComputedTiming?.().duration);
    const duration = Number.isFinite(durationCandidate) && durationCandidate > 0
      ? durationCandidate : SPECTRAL_CYCLE_MS;
    const elapsed = Number(animation.currentTime);
    const position = Number.isFinite(elapsed)
      ? ((elapsed % duration) + duration) % duration : 0;
    const remaining = position < 1 ? duration : duration - position;
    const pending = {
      generation: entry.generation,
      reveal,
      listener: null,
      timer: null
    };
    entry.pending = pending;

    const done = () => completeHeldLoader(entry, pending);
    pending.listener = event => {
      if (event.animationName === 'pffSpectralReveal') done();
    };
    reveal.addEventListener('animationiteration', pending.listener);
    // Safety fallback for throttled background tabs or missing iteration events.
    pending.timer = global.setTimeout(done, Math.min(duration + 350, remaining + 350));
  }

  function observeApp(app) {
    if (!app || rootStates.has(app)) return;
    const entry = {
      app,
      wasLoading: app.classList.contains('is-loading'),
      generation: 0,
      pending: null
    };
    rootStates.set(app, entry);
    const observer = new MutationObserver(() => {
      const nowLoading = app.classList.contains('is-loading');
      if (nowLoading === entry.wasLoading) return;
      entry.wasLoading = nowLoading;
      entry.generation++;
      if (nowLoading) {
        releaseHeldLoader(entry);
        restartSpectralCycle(app);
      } else {
        holdUntilSpectralCycleEnds(entry);
      }
    });
    observer.observe(app, { attributes: true, attributeFilter: ['class'] });
  }

  function syncLoaderStyles() {
    // Only full-page loaders; preserve the small in-value cone spinners.
    document.querySelectorAll('.app-loading > .cone-loader').forEach(loader => {
      const spectral = activeLoaderStyle === 2;
      observeApp(loader.parentElement.parentElement);
      if (spectral && !loader.querySelector('.pff-spectral-svg')) {
        loader.appendChild(makeSpectralSvg());
      }
      loader.classList.toggle('pff-spectral-loader', spectral);
      loader.parentElement.classList.toggle('pff-spectral-active', spectral);
      syncSpectralText(loader.parentElement, spectral);
    });
  }

  function getLoaderStyle() {
    return activeLoaderStyle;
  }

  function setLoaderStyle(style) {
    const value = Number(style);
    if (value !== 1 && value !== 2) {
      throw new RangeError('Loader style must be 1 (original cones) or 2 (continuous spectral curve)');
    }
    activeLoaderStyle = value;
    if (value === 1) {
      for (const entry of rootStates.values()) {
        entry.generation++;
        releaseHeldLoader(entry);
      }
    }
    syncLoaderStyles();
    return activeLoaderStyle;
  }


  function init() {
    injectStyles();
    syncLoaderStyles();
  }

  const publicAPI = Object.freeze({
    version: '1.1.0',
    init,
    sync: syncLoaderStyles,
    getLoaderStyle,
    setLoaderStyle
  });
  global.PFFLoader = publicAPI;

  // Early rendering: handles loaders added later as the parser progresses.
  init();
  if (document.readyState === 'loading') {
    const earlyObserver = new MutationObserver(() => syncLoaderStyles());
    earlyObserver.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', () => {
      earlyObserver.disconnect();
      syncLoaderStyles();
    }, { once: true });
  }
})(window);
