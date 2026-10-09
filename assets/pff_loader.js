/*
 * PFF Loader v1.0.0 — independent loading animations for PFF web apps.
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
 * This file does not call or require window.PFF.
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
  stroke-width: 3.6;
  shape-rendering: geometricPrecision;
}
/* NEVER use stroke-dasharray for this path: clip reveal keeps it one line. */
.pff-spectral-svg .pff-spectral-reveal {
  transform-box: fill-box;
  transform-origin: left center;
  animation: pffSpectralReveal 3.35s cubic-bezier(.42, 0, .22, 1) infinite;
}
.pff-spectral-svg .pff-spectral-group {
  animation: pffSpectralVisibility 3.35s linear infinite;
}
.app-loading.pff-spectral-active > .loader-text {
  margin: 13px 0 0;
  font-size: 13px;
  font-weight: 500;
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
  /* Show the first few pixels immediately; the path begins at x=24 of 340. */
  0% { transform: scaleX(.09); }
  71%, 81%, 100% { transform: scaleX(1); }
}
@keyframes pffSpectralVisibility {
  0%, 81% { opacity: 1; }
  94%, 100% { opacity: 0; }
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
    // When core is present it already owns the original cone fallback.
    // Avoid duplicating those base rules after app-specific CSS.
    style.textContent = (global.PFF ? '' : BASE_CSS) + SPECTRAL_CSS;
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

  function syncLoaderStyles() {
    // Only full-page loaders; preserve the small in-value cone spinners.
    document.querySelectorAll('.app-loading > .cone-loader').forEach(loader => {
      const spectral = activeLoaderStyle === 2;
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
    syncLoaderStyles();
    return activeLoaderStyle;
  }


  function init() {
    injectStyles();
    syncLoaderStyles();
  }

  const publicAPI = Object.freeze({
    version: '1.0.0',
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
