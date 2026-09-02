/*
 * PFF Core v1.1.0
 * Shared design + behaviour for Phoropter Free Fridays web apps.
 *
 * For Chart.js apps, load AFTER Chart.js and BEFORE any app-specific
 * <style> or app script:
 *
 *   <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script>
 *   <script src="./assets/pff_chart_core.js"></script>
 *
 * App-specific data, parsing, calculations, series, colours, scales,
 * tooltip content and genuinely unique behaviour remain in each HTML file.
 */
(function (global) {
  'use strict';

  const VERSION = '1.1.0';

  const DEFAULTS = Object.freeze({
    mobileBreakpoint: 430,
    smallBreakpoint: 350,
    viewTransitionMs: 900,
    hoverAnimationMs: 170,
    tabTransitionMs: 300,
    microTransitionMs: 180,
    maxDevicePixelRatio: 3,
    chartMaxWidth: 520,
    yAxisDesktopWidth: 69,
    yAxisMobileWidth: 61,
    trendModes: Object.freeze(['3yr', '10yr', 'off'])
  });

  const CSS = String.raw`
:root {
  --pff-purple: #6600ff;
  --pff-ink: #151515;
  --pff-muted: #69718a;
  --pff-track: #e8eaf0;
  --pff-error: #b42318;
  --pff-live-red: #e53935;
  --pff-cached-amber: #c27c00;
  --pff-positive: #14823b;
  --pff-negative: #b42318;
  --pff-white: #ffffff;
  --pff-blue-cone: rgba(74, 86, 255, 0.82);
  --pff-green-cone: rgba(36, 210, 116, 0.78);
  --pff-red-cone: rgba(255, 92, 48, 0.76);
  --pff-motion-ease: cubic-bezier(0.22, 1, 0.36, 1);
  --pff-chart-max-width: 520px;
  --pff-metric-columns: 2;
  --pff-metric-width: 132px;
  --pff-metric-width-mobile: 124px;
  --pff-metric-width-small: 116px;
}

*, *::before, *::after {
  box-sizing: border-box;
}

html {
  width: 100%;
  height: 100%;
  min-height: 100%;
  margin: 0;
  padding: 0;
  background: var(--pff-white);
  -webkit-tap-highlight-color: transparent;
}

body {
  width: 100%;
  min-height: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  color: var(--pff-ink);
  background: var(--pff-white);
  font-family: 'Lato', sans-serif;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
}

button {
  font: inherit;
  -webkit-tap-highlight-color: transparent;
}

#fit,
.pff-fit {
  display: flex;
  width: 100%;
  min-height: 100%;
  align-items: flex-start;
  justify-content: center;
}

#app,
.pff-app {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 100%;
  margin-inline: auto;
  flex-direction: column;
  background: var(--pff-white);
}

body.pff-chart-app {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

body.pff-chart-app #fit,
body.pff-chart-app .pff-fit {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

body.pff-chart-app #app,
body.pff-chart-app .pff-app {
  width: min(calc(100% - 12px), var(--pff-chart-max-width));
  height: 100%;
  min-height: 0;
  padding: 0 4px;
  overflow: hidden;
}

#app.is-loading > :not(.app-loading),
.pff-app.is-loading > :not(.app-loading) {
  visibility: hidden;
}

#app:not(.is-loading) .app-loading,
.pff-app:not(.is-loading) .app-loading {
  display: none;
}

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
  background: var(--pff-white);
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
  background: var(--pff-blue-cone);
  animation: pffBlueConeCycle 2.7s infinite cubic-bezier(0.45, 0, 0.25, 1);
}

.cone.green {
  left: 69px;
  background: var(--pff-green-cone);
  animation: pffGreenConeCycle 2.7s infinite cubic-bezier(0.45, 0, 0.25, 1);
}

.cone.red {
  left: 85px;
  background: var(--pff-red-cone);
  animation: pffRedConeCycle 2.7s infinite cubic-bezier(0.45, 0, 0.25, 1);
}

.loader-text {
  margin: 2px 0 0;
  color: var(--pff-muted);
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

.module-top {
  display: flex;
  width: 100%;
  min-width: 0;
  flex: 0 0 auto;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  margin: 0 0 4px;
  border-bottom: 1px solid var(--pff-track);
}

.tab-scroll-shell,
.heading-scroll-shell {
  position: relative;
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.tab-list,
.heading-scroll-viewport {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.tab-list {
  position: relative;
  display: flex;
  align-items: flex-end;
}

.tab-list::-webkit-scrollbar,
.heading-scroll-viewport::-webkit-scrollbar,
.chart-legend::-webkit-scrollbar {
  display: none;
}

.tab-list::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 2;
  width: var(--tab-indicator-width, 0px);
  height: 2px;
  background: var(--pff-purple);
  pointer-events: none;
  transform: translate3d(var(--tab-indicator-x, 0px), 0, 0);
  transition: transform 300ms var(--pff-motion-ease), width 300ms var(--pff-motion-ease);
  will-change: transform, width;
}

.tab-list.is-positioning::after {
  transition: none;
}

.chart-tab {
  flex: 0 0 auto;
  min-height: 29px;
  margin: 0;
  padding: 0 9px 6px;
  color: var(--pff-muted);
  background: var(--pff-white);
  border: 0;
  border-bottom: 2px solid transparent;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: color 180ms ease;
}

.chart-tab.is-active,
.chart-tab[aria-selected='true'] {
  color: var(--pff-purple);
  cursor: default;
}

.chart-tab:focus-visible,
.metric-button:focus-visible,
.yoy-trend-toggle:focus-visible,
.legend-item:focus-visible,
.tab-scroll-button:focus-visible,
.heading-scroll-button:focus-visible,
.legend-scroll-button:focus-visible {
  outline: 2px solid rgba(102, 0, 255, 0.22);
  outline-offset: 2px;
}

.tab-scroll-button,
.heading-scroll-button,
.legend-scroll-button {
  position: absolute;
  z-index: 4;
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding: 0 0 2px;
  color: var(--pff-muted);
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(232, 234, 240, 0.74);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(21, 21, 21, 0.05);
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  opacity: 0.68;
  backdrop-filter: blur(1px);
  -webkit-backdrop-filter: blur(1px);
  transition: opacity 160ms ease, background 160ms ease;
}

.tab-scroll-button { top: 3px; }
.heading-scroll-button { top: 4px; }
.legend-scroll-button { top: 3px; z-index: 3; }

.tab-scroll-button:hover,
.heading-scroll-button:hover,
.legend-scroll-button:hover {
  opacity: 0.96;
  background: rgba(255, 255, 255, 0.90);
}

.tab-scroll-button.is-hidden,
.heading-scroll-button.is-hidden,
.legend-scroll-button.is-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.tab-scroll-left,
.heading-scroll-left,
.legend-scroll-left { left: 0; }

.tab-scroll-right,
.heading-scroll-right,
.legend-scroll-right { right: 0; }

.live-data {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  margin: 0 1px 8px 0;
  color: var(--pff-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.05em;
  line-height: 1;
  white-space: nowrap;
}

.live-data-dot {
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: var(--pff-live-red);
  transition: background-color 220ms ease;
}

.live-data.is-cached .live-data-dot {
  background: var(--pff-cached-amber);
}

#status,
.pff-status {
  position: absolute;
  inset: 0;
  z-index: 101;
  display: flex;
  width: 100%;
  margin: 0;
  padding: 0 8px;
  align-items: center;
  justify-content: center;
  color: var(--pff-error);
  background: var(--pff-white);
  font-size: 12px;
  line-height: 1.35;
  text-align: center;
}

#status:empty,
.pff-status:empty { display: none; }

.chart-heading-row {
  position: relative;
  z-index: 30;
  display: flex;
  width: 100%;
  height: 30px;
  min-width: 0;
  min-height: 30px;
  flex: 0 0 auto;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  margin: 0;
}

.chart-heading {
  display: inline-flex;
  width: max-content;
  min-width: max-content;
  flex: 0 0 auto;
  align-items: baseline;
  margin: 0;
  padding: 4px 0 0;
  overflow: visible;
  color: var(--pff-ink);
  font-size: 15px;
  font-weight: 700;
  line-height: 22px;
  text-align: left;
  white-space: nowrap;
}

.chart-heading-fixed,
.chart-heading-detail { will-change: opacity; }

.heading-controls {
  display: flex;
  min-width: 0;
  flex: 0 0 auto;
  align-items: flex-start;
  gap: 4px;
}

.yoy-trend-toggle {
  display: grid;
  width: 64px;
  height: 27px;
  flex: 0 0 64px;
  grid-template-columns: 15px 1fr;
  align-items: center;
  gap: 3px;
  margin-top: 0;
  padding: 0 5px;
  color: var(--pff-ink);
  background: var(--pff-white);
  border: 1px solid var(--pff-track);
  border-radius: 4px;
  box-shadow: none;
  font-family: inherit;
  font-size: 8.5px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  touch-action: manipulation;
  transition: border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
}

.yoy-trend-toggle > * { pointer-events: none; }
.yoy-trend-toggle:hover { box-shadow: inset 0 0 0 1px rgba(21, 21, 21, 0.12); }
.yoy-trend-toggle.is-on { border-color: var(--pff-purple); }

.yoy-binary-indicator {
  position: relative;
  width: 15px;
  height: 15px;
  min-width: 15px;
  max-width: 15px;
  border: 1px solid var(--pff-muted);
  border-radius: 2px;
  background: var(--pff-white);
}

.yoy-trend-toggle.is-on .yoy-binary-indicator {
  border-color: var(--pff-purple);
  background: var(--pff-purple);
}

.yoy-trend-toggle.is-on .yoy-binary-indicator::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 4px;
  width: 4px;
  height: 7px;
  border-right: 2px solid var(--pff-white);
  border-bottom: 2px solid var(--pff-white);
  transform: rotate(45deg);
}

.yoy-toggle-label {
  min-width: 0;
  color: var(--pff-ink);
  font-size: 7.5px;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
}

.metric-switch {
  position: relative;
  display: grid;
  width: var(--pff-metric-width);
  height: 27px;
  flex: 0 0 auto;
  grid-template-columns: repeat(var(--pff-metric-columns), minmax(0, 1fr));
  align-items: center;
  margin-top: 0;
  padding: 1px;
  overflow: hidden;
  background: rgba(232, 234, 240, 0.55);
  border-radius: 4px;
  isolation: isolate;
}

.metric-switch.is-hidden { display: none; }

.metric-switch::before {
  content: '';
  position: absolute;
  top: 1px;
  bottom: 1px;
  left: 1px;
  z-index: 0;
  width: calc((100% - 2px) / var(--pff-metric-columns));
  background: var(--pff-white);
  border-radius: 3px;
  box-shadow: 0 1px 3px rgba(21, 21, 21, 0.08);
  transform: translateX(calc(var(--pff-metric-index, 0) * 100%));
  transition: transform 300ms var(--pff-motion-ease);
}

/* Compatibility with the class names already used by current PFF apps. */
.metric-switch.is-hours-selected::before { transform: translateX(100%); }
.metric-switch.is-clinicalshare-selected::before { transform: translateX(200%); }

.metric-button {
  position: relative;
  z-index: 1;
  min-width: 0;
  min-height: 25px;
  padding: 0 4px;
  color: var(--pff-muted);
  background: transparent;
  border: 0;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: color 220ms ease, transform 300ms var(--pff-motion-ease);
}

.metric-button:hover:not(.is-active) { color: var(--pff-ink); }
.metric-button.is-active { color: var(--pff-purple); }

.legend-nav {
  position: relative;
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
  height: 28px;
  overflow: hidden;
}

.legend-viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.chart-legend {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 28px;
  align-items: center;
  gap: 10px;
  padding: 1px 0 4px;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  scrollbar-width: none;
  white-space: nowrap;
}

.legend-item {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  margin: 0;
  padding: 0;
  color: var(--pff-muted);
  background: transparent;
  border: 0;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  opacity: 1;
  transition: opacity 160ms ease, color 160ms ease;
}

.legend-item:hover { color: var(--pff-ink); }
.legend-item.is-hidden-series { opacity: 0.36; }

.legend-line {
  width: 17px;
  height: 3px;
  flex: 0 0 17px;
  border-radius: 2px;
  background: var(--legend-colour);
}

.chart-shell {
  position: relative;
  flex: 1 1 0;
  width: 100%;
  min-width: 0;
  min-height: 0;
  margin: -3px 0 0;
  overflow: hidden;
  contain: layout paint;
  isolation: isolate;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.chart-shell canvas,
#workforceChart,
#coverageChart {
  position: absolute;
  inset: 0;
  display: block;
  width: 100% !important;
  height: 100% !important;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  outline: none;
}

.pff-visually-hidden {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
/* ============================================================
 * UNIVERSAL PFF APP COMPONENTS
 * ============================================================ */

.pff-card {
  width: 100%;
  min-width: 0;
  padding: 12px;
  background: var(--pff-white);
  border: 1px solid var(--pff-track);
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(21, 21, 21, 0.04);
}

.pff-card + .pff-card {
  margin-top: 8px;
}

.pff-field {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 5px;
  margin: 0 0 10px;
}

.pff-field-label,
.pff-label {
  color: var(--pff-ink);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
}

.pff-input,
.pff-select,
.pff-textarea {
  width: 100%;
  min-width: 0;
  min-height: 34px;
  padding: 7px 9px;
  color: var(--pff-ink);
  background: var(--pff-white);
  border: 1px solid var(--pff-track);
  border-radius: 4px;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.25;
  outline: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
}

.pff-textarea {
  min-height: 72px;
  resize: vertical;
}

.pff-input:hover,
.pff-select:hover,
.pff-textarea:hover {
  border-color: rgba(105, 113, 138, 0.52);
}

.pff-input:focus-visible,
.pff-select:focus-visible,
.pff-textarea:focus-visible {
  border-color: var(--pff-purple);
  box-shadow: 0 0 0 2px rgba(102, 0, 255, 0.12);
}

.pff-input:disabled,
.pff-select:disabled,
.pff-textarea:disabled {
  color: var(--pff-muted);
  background: rgba(232, 234, 240, 0.36);
  cursor: not-allowed;
  opacity: 0.74;
}

.pff-field-help,
.pff-help-text {
  color: var(--pff-muted);
  font-size: 10px;
  line-height: 1.35;
}

.pff-field-error,
.pff-error-text {
  color: var(--pff-error);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.35;
}

.pff-check,
.pff-radio {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  color: var(--pff-ink);
  font-size: 11px;
  line-height: 1.25;
  cursor: pointer;
}

.pff-check input,
.pff-radio input {
  width: 15px;
  height: 15px;
  margin: 0;
  accent-color: var(--pff-purple);
}

.pff-button {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 11px;
  color: var(--pff-white);
  background: var(--pff-purple);
  border: 1px solid var(--pff-purple);
  border-radius: 4px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  touch-action: manipulation;
  transition:
    transform 140ms ease,
    box-shadow 160ms ease,
    opacity 160ms ease,
    background 160ms ease;
}

.pff-button:hover:not(:disabled) {
  box-shadow: 0 2px 6px rgba(102, 0, 255, 0.18);
}

.pff-button:active:not(:disabled) {
  transform: translateY(1px);
}

.pff-button:focus-visible {
  outline: 2px solid rgba(102, 0, 255, 0.22);
  outline-offset: 2px;
}

.pff-button.is-secondary,
.pff-button-secondary,
.pff-reset-button,
.pff-recalculate-button {
  color: var(--pff-ink);
  background: var(--pff-white);
  border-color: var(--pff-track);
}

.pff-button.is-secondary:hover:not(:disabled),
.pff-button-secondary:hover:not(:disabled),
.pff-reset-button:hover:not(:disabled),
.pff-recalculate-button:hover:not(:disabled) {
  border-color: rgba(105, 113, 138, 0.48);
  box-shadow: 0 1px 4px rgba(21, 21, 21, 0.08);
}

.pff-button:disabled,
.pff-reset-button:disabled,
.pff-recalculate-button:disabled {
  cursor: not-allowed;
  opacity: 0.46;
  box-shadow: none;
}

.pff-reset-button,
.pff-recalculate-button {
  display: inline-flex;
  min-height: 29px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 0 9px;
  border-style: solid;
  border-width: 1px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    opacity 160ms ease,
    transform 140ms ease;
}

.pff-menu {
  position: relative;
  display: inline-block;
  min-width: 0;
}

.pff-menu-button {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  justify-content: space-between;
  gap: 7px;
  padding: 0 9px;
  color: var(--pff-ink);
  background: var(--pff-white);
  border: 1px solid var(--pff-track);
  border-radius: 4px;
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.pff-menu-button::after {
  content: '';
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-right: 1.5px solid var(--pff-muted);
  border-bottom: 1.5px solid var(--pff-muted);
  transform: translateY(-2px) rotate(45deg);
  transition: transform 180ms var(--pff-motion-ease);
}

.pff-menu.is-open .pff-menu-button::after,
.pff-menu-button[aria-expanded='true']::after {
  transform: translateY(1px) rotate(225deg);
}

.pff-menu-button:focus-visible,
.pff-menu-item:focus-visible {
  outline: 2px solid rgba(102, 0, 255, 0.22);
  outline-offset: 2px;
}

.pff-menu-panel {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 80;
  display: none;
  min-width: 150px;
  max-width: min(280px, calc(100vw - 16px));
  padding: 4px;
  overflow: hidden;
  background: var(--pff-white);
  border: 1px solid var(--pff-track);
  border-radius: 5px;
  box-shadow: 0 7px 20px rgba(21, 21, 21, 0.12);
}

.pff-menu.is-open .pff-menu-panel,
.pff-menu-panel.is-open {
  display: grid;
}

.pff-menu-item {
  width: 100%;
  min-height: 30px;
  padding: 0 8px;
  color: var(--pff-ink);
  background: transparent;
  border: 0;
  border-radius: 3px;
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  text-align: left;
  cursor: pointer;
}

.pff-menu-item:hover,
.pff-menu-item.is-selected,
.pff-menu-item[aria-selected='true'] {
  color: var(--pff-purple);
  background: rgba(102, 0, 255, 0.055);
}

.pff-result,
.pff-response-summary {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 3px;
}

.pff-result-label,
.pff-response-label {
  color: var(--pff-muted);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.25;
}

.pff-result-value,
.pff-response-value {
  color: var(--pff-ink);
  font-size: 24px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.pff-result-detail,
.pff-response-detail {
  color: var(--pff-muted);
  font-size: 10px;
  line-height: 1.35;
}

.pff-stepper {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 10px;
}

.pff-stepper-progress {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 4px;
}

.pff-stepper-dot {
  height: 3px;
  flex: 1 1 0;
  overflow: hidden;
  background: var(--pff-track);
  border-radius: 2px;
  transition:
    background 220ms ease,
    opacity 220ms ease;
}

.pff-stepper-dot.is-complete,
.pff-stepper-dot.is-active {
  background: var(--pff-purple);
}

.pff-stepper-dot.is-active {
  opacity: 0.72;
}

.pff-step {
  display: none;
  width: 100%;
  min-width: 0;
}

.pff-step.is-active {
  display: block;
}

.pff-stepper-actions {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pff-fade-enter {
  animation: pffFadeEnter 220ms ease both;
}

@keyframes pffFadeEnter {
  from { opacity: 0; }
  to { opacity: 1; }
}
@media (max-width: 430px) {
  body.pff-chart-app #app,
  body.pff-chart-app .pff-app {
    width: calc(100% - 6px);
    padding: 0 3px;
  }

  .cone-loader { width: 160px; height: 70px; }
  .cone { width: 52px; height: 61px; }
  .cone.blue { left: 30px; }
  .cone.green { left: 64px; }
  .cone.red { left: 78px; }
  .loader-text { font-size: 10px; }
  .chart-tab { padding-right: 7px; padding-left: 7px; font-size: 12px; }
  .live-data { margin-right: 3px; font-size: 8px; }
  .chart-heading-row { height: 29px; min-height: 29px; gap: 4px; }
  .chart-heading { padding-top: 4px; font-size: 14px; line-height: 21px; }
  .heading-controls { gap: 3px; }
  .yoy-trend-toggle {
    width: 61px;
    flex-basis: 61px;
    grid-template-columns: 15px 1fr;
    gap: 2px;
    padding-right: 4px;
    padding-left: 4px;
  }
  .yoy-toggle-label { font-size: 7px; }
  .metric-switch { width: var(--pff-metric-width-mobile); height: 26px; }
  .metric-button { min-height: 24px; padding-right: 3px; padding-left: 3px; font-size: 8.5px; }
  .legend-item { font-size: 9px; }
}

@media (max-width: 350px) {
  .chart-heading { font-size: 13px; }
  .heading-controls { gap: 2px; }
  .yoy-trend-toggle {
    width: 60px;
    flex-basis: 60px;
    padding-right: 3px;
    padding-left: 3px;
  }
  .metric-switch { width: var(--pff-metric-width-small); }
  .metric-button { font-size: 8px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }

  .cone.blue,
  .cone.green,
  .cone.red {
    animation: none;
    opacity: 1;
  }

  .loader-text {
    animation: none;
    opacity: 0.72;
  }
}
`;

  function ensureFont() {
    if (
      document.getElementById('pff-core-font') ||
      document.querySelector?.('link[href*="fonts.googleapis.com"][href*="Lato"]')
    ) {
      return;
    }

    const link = document.createElement('link');
    link.id = 'pff-core-font';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap';
    document.head.appendChild(link);
  }

  function injectStyles() {
    if (document.getElementById('pff-core-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'pff-core-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function cssVar(name, fallback) {
    try {
      const value = global.getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim();
      return value || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function easeInOutCubic(value) {
    const p = clamp(Number(value) || 0, 0, 1);
    return p < 0.5
      ? 4 * p * p * p
      : 1 - Math.pow(-2 * p + 2, 3) / 2;
  }

  function easeOutCubic(value) {
    const p = clamp(Number(value) || 0, 0, 1);
    return 1 - Math.pow(1 - p, 3);
  }

  function reducedMotion() {
    return global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  }

  function mobileLayout() {
    return global.innerWidth <= DEFAULTS.mobileBreakpoint;
  }

  function smallLayout() {
    return global.innerWidth <= DEFAULTS.smallBreakpoint;
  }

  function chartAnimationDuration() {
    return reducedMotion() ? 0 : DEFAULTS.viewTransitionMs;
  }

  function deepMerge(target, ...sources) {
    const output = target && typeof target === 'object' && !Array.isArray(target)
      ? { ...target }
      : {};

    for (const source of sources) {
      if (!source || typeof source !== 'object' || Array.isArray(source)) {
        continue;
      }

      for (const [key, value] of Object.entries(source)) {
        if (
          value &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          output[key] &&
          typeof output[key] === 'object' &&
          !Array.isArray(output[key])
        ) {
          output[key] = deepMerge(output[key], value);
        } else if (Array.isArray(value)) {
          output[key] = [...value];
        } else {
          output[key] = value;
        }
      }
    }

    return output;
  }

   function rgba(hex, alpha = 1) {
    const cleaned = String(hex || '#69718a').replace('#', '').trim();
    if (!/^[0-9a-f]{6}$/i.test(cleaned)) {
      return `rgba(105, 113, 138, ${alpha})`;
    }

    const value = Number.parseInt(cleaned, 16);
    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  function seriesTint(hex, strength = 0.20, alpha = 0.84) {
    const cleaned = String(hex || '#69718a').replace('#', '').trim();
    if (!/^[0-9a-f]{6}$/i.test(cleaned)) {
      return `rgba(232, 234, 240, ${alpha})`;
    }

    const red = Number.parseInt(cleaned.slice(0, 2), 16);
    const green = Number.parseInt(cleaned.slice(2, 4), 16);
    const blue = Number.parseInt(cleaned.slice(4, 6), 16);
    const mix = channel => Math.round(channel + (255 - channel) * (1 - strength));
    return `rgba(${mix(red)}, ${mix(green)}, ${mix(blue)}, ${alpha})`;
  }

  function formatAxisValue(value, decimals = 0) {
    if (!Number.isFinite(Number(value))) {
      return '';
    }

    const places = Math.max(0, Math.round(Number(decimals) || 0));
    return new Intl.NumberFormat('en-AU', {
      minimumFractionDigits: places,
      maximumFractionDigits: places
    }).format(Number(value));
  }

  function formatTrendValue(value) {
    return Number.isFinite(Number(value))
      ? `${Math.abs(Number(value)).toFixed(1)}% p.a.`
      : '';
  }

  function applyChartDefaults() {
    if (!global.Chart) {
      return false;
    }

    global.Chart.defaults.font.family = "'Lato', sans-serif";
    global.Chart.defaults.color = cssVar('--pff-ink', '#151515');
    return true;
  }

  function tooltipOptions(overrides = {}) {
    return deepMerge({
      enabled: true,
      mode: 'nearest',
      intersect: true,
      displayColors: false,
      backgroundColor: '#ffffff',
      titleColor: '#151515',
      bodyColor: '#69718a',
      borderColor: '#e8eaf0',
      borderWidth: 1,
      padding: 9,
      cornerRadius: 4,
      titleFont: {
        family: 'Lato',
        size: 12,
        weight: '700'
      },
      bodyFont: {
        family: 'Lato',
        size: 11,
        weight: '400'
      }
    }, overrides);
  }

  function lineInteractionOptions() {
    return {
      mode: 'nearest',
      intersect: mobileLayout(),
      axis: 'xy'
    };
  }

  function baseChartOptions(overrides = {}) {
    const mobile = mobileLayout();
    const duration = chartAnimationDuration();

    return deepMerge({
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 0,
      devicePixelRatio: Math.min(global.devicePixelRatio || 1, DEFAULTS.maxDevicePixelRatio),
      animation: {
        duration,
        easing: 'easeInOutCubic'
      },
      animations: {
        x: {
          duration,
          easing: 'easeInOutCubic'
        },
        y: {
          duration,
          easing: 'easeInOutCubic'
        },
        colors: {
          type: 'color',
          properties: ['borderColor', 'backgroundColor', 'pointBackgroundColor'],
          duration: 0
        }
      },
      transitions: {
        active: {
          animation: {
            duration: reducedMotion() ? 0 : DEFAULTS.hoverAnimationMs,
            easing: 'easeOutCubic'
          }
        },
        resize: {
          animation: { duration: 0 }
        }
      },
      interaction: lineInteractionOptions(),
      layout: {
        autoPadding: false,
        padding: {
          top: mobile ? 8 : 9,
          right: 4,
          bottom: 0,
          left: 0
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: tooltipOptions()
      }
    }, overrides);
  }

  function xYearScaleOptions(overrides = {}) {
    const mobile = mobileLayout();
    return deepMerge({
      type: 'category',
      offset: false,
      grid: {
        drawOnChartArea: false,
        drawTicks: false
      },
      border: { display: false },
      ticks: {
        color: '#151515',
        padding: 7,
        maxRotation: 0,
        minRotation: 0,
        autoSkip: false,
        font: {
          family: 'Lato',
          size: mobile ? 9 : 10,
          weight: '400'
        },
        callback(value) {
          const label = this.getLabelForValue(value);
          const year = Number(label);
          return Number.isFinite(year) && year % 2 === 0 ? String(year) : '';
        }
      },
      title: {
        display: true,
        text: 'Year',
        color: '#151515',
        padding: { top: 3 },
        font: {
          family: 'Lato',
          size: mobile ? 12 : 13,
          weight: '700'
        }
      }
    }, overrides);
  }

  function yScaleOptions(scale, overrides = {}) {
    const mobile = mobileLayout();
    const current = copyScale(scale);

    return deepMerge({
      min: current.min,
      max: current.max,
      afterFit(axis) {
        axis.width = mobile ? DEFAULTS.yAxisMobileWidth : DEFAULTS.yAxisDesktopWidth;
      },
      grid: {
        display: false,
        drawOnChartArea: false,
        drawTicks: false
      },
      border: { display: false },
      ticks: { display: false },
      title: { display: false }
    }, overrides);
  }

  function applyResponsiveChartOptions(chart) {
    if (!chart?.options) {
      return;
    }

    const mobile = mobileLayout();
    chart.options.interaction = deepMerge(chart.options.interaction || {}, lineInteractionOptions());

    if (chart.options.layout?.padding) {
      chart.options.layout.padding.top = mobile ? 8 : 9;
    }

    if (chart.options.scales?.x?.ticks?.font) {
      chart.options.scales.x.ticks.font.size = mobile ? 9 : 10;
    }

    if (chart.options.scales?.x?.title?.font) {
      chart.options.scales.x.title.font.size = mobile ? 12 : 13;
    }

    if (chart.options.scales?.y) {
      chart.options.scales.y.afterFit = axis => {
        axis.width = mobile ? DEFAULTS.yAxisMobileWidth : DEFAULTS.yAxisDesktopWidth;
      };
    }

    chart.data?.datasets?.forEach(dataset => {
      if ('pointHitRadius' in dataset || dataset.type === 'line' || chart.config?.type === 'line') {
        dataset.pointHitRadius = mobile ? 9 : 5;
      }
    });
  }

  function hideLoadingState(app = document.getElementById('app')) {
    if (!app) {
      return;
    }
    app.classList.remove('is-loading');
    app.setAttribute('aria-busy', 'false');
  }

  function showLoadingState(app = document.getElementById('app')) {
    if (!app) {
      return;
    }
    app.classList.add('is-loading');
    app.setAttribute('aria-busy', 'true');
  }

  function setDataSourceIndicator(source, options = {}) {
    const indicator = options.indicator || document.getElementById('dataSourceIndicator');
    const text = options.text || document.getElementById('dataSourceText');
    const cached = String(source).toLowerCase() !== 'live';

    indicator?.classList.toggle('is-cached', cached);
    indicator?.setAttribute('aria-label', cached ? 'Cached data' : 'Live data');

    if (text) {
      text.textContent = cached ? 'CACHED data' : 'LIVE data';
    }
  }

  function setStatus(message, element = document.getElementById('status')) {
    if (!element) {
      return;
    }
    element.textContent = String(message || '').replace(/\.+$/, '');
  }

  function ensureChartSummary(options = {}) {
    const id = options.id || 'pffChartSummary';
    let element = document.getElementById(id);

    if (!element) {
      element = document.createElement('div');
      element.id = id;
      element.className = 'pff-visually-hidden';
      element.setAttribute('aria-live', options.live || 'polite');
      (options.parent || document.getElementById('app') || document.body).appendChild(element);
    }

    return element;
  }

  function updateChartSummary(text, element = ensureChartSummary()) {
    if (element) {
      element.textContent = String(text || '');
    }
  }

  function scrollByAmount(scroller, direction, options = {}) {
    if (!scroller) {
      return;
    }

    const amount = Math.max(
      Number(options.minimum) || 110,
      scroller.clientWidth * (Number(options.fraction) || 0.72)
    );

    scroller.scrollBy({
      left: (direction < 0 ? -1 : 1) * amount,
      behavior: reducedMotion() ? 'auto' : 'smooth'
    });
  }

  function updateOverflowButtons(scroller, leftButton, rightButton, tolerance = 2) {
    if (!scroller) {
      return;
    }

    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const hasOverflow = maxScroll > tolerance;
    const atStart = scroller.scrollLeft <= tolerance;
    const atEnd = scroller.scrollLeft >= maxScroll - tolerance;

    leftButton?.classList.toggle('is-hidden', !hasOverflow || atStart);
    rightButton?.classList.toggle('is-hidden', !hasOverflow || atEnd);
  }

  function setupScrollableRegion(options = {}) {
    const scroller = options.scroller;
    const leftButton = options.leftButton || null;
    const rightButton = options.rightButton || null;

    if (!scroller) {
      return { update() {}, destroy() {} };
    }

    const update = () => updateOverflowButtons(scroller, leftButton, rightButton, options.tolerance);
    const onLeft = event => {
      event?.stopPropagation?.();
      scrollByAmount(scroller, -1, options);
    };
    const onRight = event => {
      event?.stopPropagation?.();
      scrollByAmount(scroller, 1, options);
    };

    leftButton?.addEventListener('click', onLeft);
    rightButton?.addEventListener('click', onRight);
    scroller.addEventListener('scroll', update, { passive: true });

    let observer = null;
    if ('ResizeObserver' in global) {
      observer = new ResizeObserver(update);
      observer.observe(scroller);
    }

    global.addEventListener('resize', update, { passive: true });
    global.visualViewport?.addEventListener('resize', update, { passive: true });
    requestAnimationFrame(update);

    return {
      update,
      destroy() {
        leftButton?.removeEventListener('click', onLeft);
        rightButton?.removeEventListener('click', onRight);
        scroller.removeEventListener('scroll', update);
        global.removeEventListener('resize', update);
        global.visualViewport?.removeEventListener('resize', update);
        observer?.disconnect();
      }
    };
  }

  function positionTabIndicator(tabList, activeTab, animate = true) {
    if (!tabList || !activeTab) {
      return;
    }

    if (!animate) {
      tabList.classList.add('is-positioning');
    }

    tabList.style.setProperty('--tab-indicator-x', `${activeTab.offsetLeft}px`);
    tabList.style.setProperty('--tab-indicator-width', `${activeTab.offsetWidth}px`);

    if (!animate) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => tabList.classList.remove('is-positioning'));
      });
    }
  }

  function setupTabs(options = {}) {
    const tabList = options.tabList;
    const tabs = Array.from(options.tabs || tabList?.querySelectorAll?.('[role="tab"], .chart-tab') || []);
    const valueAttribute = options.valueAttribute || 'group';
    const activeClass = options.activeClass || 'is-active';
    let activeValue = options.initialValue ?? tabs.find(tab => tab.classList.contains(activeClass))?.dataset?.[valueAttribute];
    let scrollController = null;

    tabList?.setAttribute('role', 'tablist');
    tabs.forEach(tab => tab.setAttribute('role', 'tab'));

    if (options.scroller || tabList) {
      scrollController = setupScrollableRegion({
        scroller: options.scroller || tabList,
        leftButton: options.leftButton,
        rightButton: options.rightButton
      });
    }

    function valueOf(tab) {
      return tab?.dataset?.[valueAttribute] ?? tab?.getAttribute?.('data-value') ?? '';
    }

    function apply(value, config = {}) {
      activeValue = value;
      let activeTab = null;

      tabs.forEach(tab => {
        const active = valueOf(tab) === activeValue;
        tab.classList.toggle(activeClass, active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active) {
          activeTab = tab;
        }
      });

      positionTabIndicator(tabList, activeTab, config.animate !== false);
      requestAnimationFrame(() => scrollController?.update());

      if (config.focus && activeTab) {
        activeTab.focus({ preventScroll: true });
      }

      if (config.notify !== false) {
        options.onChange?.(activeValue, activeTab);
      }

      return activeTab;
    }

    const clickHandlers = new Map();
    const keyHandlers = new Map();

    tabs.forEach((tab, index) => {
      const clickHandler = () => apply(valueOf(tab));
      const keyHandler = event => {
        let nextIndex = null;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;

        if (nextIndex === null) {
          return;
        }

        event.preventDefault();
        apply(valueOf(tabs[nextIndex]), { focus: true });
      };

      tab.addEventListener('click', clickHandler);
      tab.addEventListener('keydown', keyHandler);
      clickHandlers.set(tab, clickHandler);
      keyHandlers.set(tab, keyHandler);
    });

    if (activeValue === undefined && tabs.length) {
      activeValue = valueOf(tabs[0]);
    }

    apply(activeValue, { animate: false, notify: false });

    return {
      get value() { return activeValue; },
      set(value, config = {}) { return apply(value, config); },
      update() {
        const tab = tabs.find(item => valueOf(item) === activeValue);
        positionTabIndicator(tabList, tab, false);
        scrollController?.update();
      },
      destroy() {
        tabs.forEach(tab => {
          tab.removeEventListener('click', clickHandlers.get(tab));
          tab.removeEventListener('keydown', keyHandlers.get(tab));
        });
        scrollController?.destroy();
      }
    };
  }

  function setupTrendToggle(options = {}) {
    const button = options.button || document.getElementById('yoyTrendToggle');
    const labelElement = options.label || button?.querySelector?.('.yoy-toggle-label');
    let mode = DEFAULTS.trendModes.includes(options.initialMode) ? options.initialMode : '3yr';

    function nextMode(current) {
      return current === '3yr' ? '10yr' : current === '10yr' ? 'off' : '3yr';
    }

    function textFor(current) {
      return current === '3yr' ? '3yr Trend' : current === '10yr' ? '10yr Trend' : 'Trend';
    }

    function longFor(current) {
      return current === '3yr' ? '3-year trend' : current === '10yr' ? '10-year trend' : 'Trend off';
    }

    function update(notify = false) {
      const on = mode !== 'off';
      button?.classList.toggle('is-on', on);
      button?.setAttribute('aria-pressed', String(on));
      if (labelElement) {
        labelElement.textContent = textFor(mode);
      }
      button?.setAttribute('aria-label', `${longFor(mode)}. Press to switch to ${longFor(nextMode(mode)).toLowerCase()}.`);
      if (notify) {
        options.onChange?.(mode);
      }
    }

    const clickHandler = () => {
      mode = nextMode(mode);
      update(true);
    };

    button?.addEventListener('click', clickHandler);
    update(false);

    return {
      get mode() { return mode; },
      get windowSize() { return mode === '3yr' ? 3 : mode === '10yr' ? 10 : 0; },
      set(value, notify = true) {
        if (!DEFAULTS.trendModes.includes(value)) {
          return;
        }
        mode = value;
        update(notify);
      },
      destroy() { button?.removeEventListener('click', clickHandler); }
    };
  }

  function linearSlope(points) {
    const valid = Array.from(points || []).filter(point => Number.isFinite(point?.x) && Number.isFinite(point?.y));
    if (valid.length < 2) {
      return NaN;
    }

    const meanX = valid.reduce((sum, point) => sum + point.x, 0) / valid.length;
    const meanY = valid.reduce((sum, point) => sum + point.y, 0) / valid.length;
    let numerator = 0;
    let denominator = 0;

    valid.forEach(point => {
      const dx = point.x - meanX;
      numerator += dx * (point.y - meanY);
      denominator += dx * dx;
    });

    return denominator > 0 ? numerator / denominator : NaN;
  }

  function latestConsecutiveTrend(rows, valueGetter, windowSize) {
    const requested = Math.max(2, Math.round(Number(windowSize) || 0));
    const source = Array.from(rows || [])
      .map((row, index) => ({ row, index, year: Number(row?.year) }))
      .filter(item => Number.isFinite(item.year))
      .sort((a, b) => a.year - b.year);

    if (source.length < requested) {
      return NaN;
    }

    const latestYear = source[source.length - 1].year;
    const byYear = new Map(source.map(item => [item.year, item]));
    const points = [];

    for (let offset = requested - 1; offset >= 0; offset -= 1) {
      const year = latestYear - offset;
      const item = byYear.get(year);
      if (!item) {
        return NaN;
      }

      const value = Number(valueGetter(item.row, item.index));
      if (!Number.isFinite(value) || value <= 0) {
        return NaN;
      }

      points.push({ x: year, y: Math.log(value) });
    }

    const firstYear = points[0].x;
    const slope = linearSlope(points.map(point => ({ x: point.x - firstYear, y: point.y })));
    return Number.isFinite(slope) ? Math.expm1(slope) * 100 : NaN;
  }

  function createTrendLabelsPlugin(options = {}) {
    const pluginId = options.id || `pffTrendLabels_${Math.random().toString(36).slice(2)}`;

    return {
      id: pluginId,
      afterDatasetsDraw(chart) {
        if (options.enabled && !options.enabled(chart)) {
          return;
        }

        const { ctx, chartArea } = chart;
        if (!chartArea) {
          return;
        }

        const mobile = mobileLayout();
        const fontSize = mobile ? 8.2 : 9.1;
        const labelHeight = mobile ? 14 : 15;
        const paddingX = mobile ? 4 : 5;
        const arrowGap = mobile ? 2.5 : 3;
        const items = [];

        ctx.save();
        ctx.font = `700 ${fontSize}px Lato, sans-serif`;
        ctx.textBaseline = 'middle';

        chart.data.datasets.forEach((dataset, datasetIndex) => {
          const meta = chart.getDatasetMeta(datasetIndex);
          const active = options.isActive
            ? options.isActive({ chart, dataset, datasetIndex, meta })
            : dataset._activeSeries !== false;

          if (!active || !meta || meta.hidden || !meta.data?.length) {
            return;
          }

          const trend = Number(options.getTrendValue?.({ chart, dataset, datasetIndex, meta }) ?? dataset._pffTrendValue);
          if (!Number.isFinite(trend)) {
            return;
          }

          let anchorIndex = -1;
          for (let index = dataset.data.length - 1; index >= 0; index -= 1) {
            if (
              Number.isFinite(Number(dataset.data[index])) &&
              Number.isFinite(meta.data[index]?.x) &&
              Number.isFinite(meta.data[index]?.y)
            ) {
              anchorIndex = index;
              break;
            }
          }

          if (anchorIndex < 0) {
            return;
          }

          const point = meta.data[anchorIndex];
          const isIncrease = trend > 0.05;
          const isDecrease = trend < -0.05;
          const arrow = isIncrease ? '↑' : isDecrease ? '↓' : '';
          const valueText = options.formatValue?.(trend) || formatTrendValue(trend);
          const arrowWidth = arrow ? ctx.measureText(arrow).width : 0;
          const valueWidth = ctx.measureText(valueText).width;
          const labelWidth = paddingX * 2 + arrowWidth + (arrow ? arrowGap : 0) + valueWidth;
          const seriesColour = options.getSeriesColour?.({ chart, dataset, datasetIndex }) || dataset.borderColor || '#69718a';

          items.push({
            seriesColour,
            isIncrease,
            isDecrease,
            arrow,
            valueText,
            arrowWidth,
            labelWidth,
            anchorX: point.x,
            anchorY: point.y
          });
        });

        if (!items.length) {
          ctx.restore();
          return;
        }

        const placed = [];
        const overlaps = rectangle => {
          const padding = 5;
          return placed.some(existing => !(
            rectangle.right + padding < existing.left ||
            rectangle.left - padding > existing.right ||
            rectangle.bottom + padding < existing.top ||
            rectangle.top - padding > existing.bottom
          ));
        };

        items
          .sort((a, b) => a.anchorY - b.anchorY)
          .forEach((item, itemIndex) => {
            const horizontalOffsets = [0, -68, -136, -34, -102, -170];
            const verticalOffsets = [0, -2, 2, -4, 4, -6, 6, -8, 8];
            let chosen = null;

            for (const horizontalOffset of horizontalOffsets) {
              for (const verticalOffset of verticalOffsets) {
                const proposedRight = clamp(
                  chartArea.right - 4 + horizontalOffset,
                  chartArea.left + item.labelWidth + 5,
                  chartArea.right - 4
                );
                const proposedLeft = proposedRight - item.labelWidth;
                const proposedY = clamp(
                  item.anchorY + verticalOffset,
                  chartArea.top + labelHeight / 2,
                  chartArea.bottom - labelHeight / 2
                );
                const rectangle = {
                  left: proposedLeft,
                  right: proposedRight,
                  top: proposedY - labelHeight / 2,
                  bottom: proposedY + labelHeight / 2,
                  y: proposedY
                };

                if (!overlaps(rectangle)) {
                  chosen = rectangle;
                  break;
                }
              }
              if (chosen) break;
            }

            if (!chosen) {
              const right = clamp(
                chartArea.right - 4 - (itemIndex % 3) * 68,
                chartArea.left + item.labelWidth + 5,
                chartArea.right - 4
              );
              const y = clamp(
                item.anchorY + (itemIndex % 2 === 0 ? -6 : 6),
                chartArea.top + labelHeight / 2,
                chartArea.bottom - labelHeight / 2
              );
              chosen = {
                left: right - item.labelWidth,
                right,
                top: y - labelHeight / 2,
                bottom: y + labelHeight / 2,
                y
              };
            }

            item.labelLeft = chosen.left;
            item.labelRight = chosen.right;
            item.labelY = chosen.y;
            placed.push(chosen);
          });

        items.forEach(item => {
          const targetX = item.anchorX < item.labelLeft
            ? item.labelLeft
            : item.anchorX > item.labelRight
              ? item.labelRight
              : clamp(item.anchorX, item.labelLeft, item.labelRight);

          const displaced =
            Math.abs(targetX - item.anchorX) > 7 ||
            Math.abs(item.labelY - item.anchorY) > 2 ||
            item.labelLeft < item.anchorX - 4;

          if (!displaced) return;

          ctx.beginPath();
          ctx.moveTo(item.anchorX, item.anchorY);
          ctx.lineTo(targetX, item.labelY);
          ctx.strokeStyle = 'rgba(105, 113, 138, 0.58)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        });

        items.forEach(item => {
          const fillColour = seriesTint(item.seriesColour, 0.20, 0.84);
          const directionColour = item.isIncrease
            ? cssVar('--pff-positive', '#14823b')
            : item.isDecrease
              ? cssVar('--pff-negative', '#b42318')
              : cssVar('--pff-muted', '#69718a');
          const radius = 3;
          const top = item.labelY - labelHeight / 2;
          const bottom = item.labelY + labelHeight / 2;

          ctx.beginPath();
          ctx.moveTo(item.labelLeft + radius, top);
          ctx.lineTo(item.labelRight - radius, top);
          ctx.quadraticCurveTo(item.labelRight, top, item.labelRight, top + radius);
          ctx.lineTo(item.labelRight, bottom - radius);
          ctx.quadraticCurveTo(item.labelRight, bottom, item.labelRight - radius, bottom);
          ctx.lineTo(item.labelLeft + radius, bottom);
          ctx.quadraticCurveTo(item.labelLeft, bottom, item.labelLeft, bottom - radius);

          ctx.lineTo(item.labelLeft, top + radius);
          ctx.quadraticCurveTo(item.labelLeft, top, item.labelLeft + radius, top);
          ctx.closePath();
          ctx.fillStyle = fillColour;
          ctx.fill();
          ctx.strokeStyle = rgba(item.seriesColour, 0.42);
          ctx.lineWidth = 0.65;
          ctx.stroke();

          let textX = item.labelLeft + paddingX;
          ctx.textAlign = 'left';
          ctx.fillStyle = directionColour;

          if (item.arrow) {
            ctx.fillText(item.arrow, textX, item.labelY - 0.2);
            textX += item.arrowWidth + arrowGap;
          }

          ctx.fillText(item.valueText, textX, item.labelY);
        });

        ctx.restore();
      }
    };
  }

  function copyScale(scale) {
    const intervals = Math.max(1, Math.round(Number(scale?.intervals) || 1));
    const minimum = Number(scale?.min);
    const maximum = Number(scale?.max);
    const min = Number.isFinite(minimum) ? minimum : 0;
    const max = Number.isFinite(maximum) && maximum > min ? maximum : min + 1;
    return {
      min,
      max,
      intervals,
      step: (max - min) / intervals
    };
  }

  function scalesNearlyEqual(first, second, tolerance = 1e-9) {
    if (!first || !second) return false;
    return (
      Math.abs(Number(first.min) - Number(second.min)) <= tolerance &&
      Math.abs(Number(first.max) - Number(second.max)) <= tolerance &&
      Math.round(Number(first.intervals)) === Math.round(Number(second.intervals))
    );
  }

  function majorTickDefinitions(scale) {
    const current = copyScale(scale);
    return Array.from({ length: current.intervals + 1 }, (_, index) => ({
      value: current.min + current.step * index,
      ratio: index / current.intervals
    }));
  }

  function minorTickDefinitions(scale) {
    const current = copyScale(scale);
    return Array.from({ length: current.intervals }, (_, index) => ({
      value: current.min + current.step * (index + 0.5),
      ratio: (index + 0.5) / current.intervals
    }));
  }

  function nearestDefinition(definitions, ratio) {
    if (!definitions.length) return { value: 0, ratio: 0 };
    let best = definitions[0];
    let bestDistance = Math.abs(best.ratio - ratio);

    for (let index = 1; index < definitions.length; index += 1) {
      const candidate = definitions[index];
      const distance = Math.abs(candidate.ratio - ratio);
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }

    return best;
  }

  function buildAxisTracks(fromDefinitions, toDefinitions) {
    const from = [...fromDefinitions];
    const to = [...toDefinitions];
    if (!from.length && !to.length) return [];

    if (!from.length) {
      return to.map(target => ({
        fromValue: target.value,
        toValue: target.value,
        fromRatio: target.ratio,
        toRatio: target.ratio,
        fromAlpha: 0,
        toAlpha: 1
      }));
    }

    if (!to.length) {
      return from.map(source => ({
        fromValue: source.value,
        toValue: source.value,
        fromRatio: source.ratio,
        toRatio: source.ratio,
        fromAlpha: 1,
        toAlpha: 0
      }));
    }

    const pairedCount = Math.min(from.length, to.length);
    const usedFrom = new Set();
    const usedTo = new Set();
    const tracks = [];

    for (let pairIndex = 0; pairIndex < pairedCount; pairIndex += 1) {
      const fromIndex = pairedCount === 1
        ? 0
        : Math.round(pairIndex * (from.length - 1) / (pairedCount - 1));
      const toIndex = pairedCount === 1
        ? 0
        : Math.round(pairIndex * (to.length - 1) / (pairedCount - 1));

      if (usedFrom.has(fromIndex) || usedTo.has(toIndex)) continue;
      const source = from[fromIndex];
      const target = to[toIndex];
      usedFrom.add(fromIndex);
      usedTo.add(toIndex);
      tracks.push({
        fromValue: source.value,
        toValue: target.value,
        fromRatio: source.ratio,
        toRatio: target.ratio,
        fromAlpha: 1,
        toAlpha: 1
      });
    }

    from.forEach((source, index) => {
      if (usedFrom.has(index)) return;
      const target = nearestDefinition(to, source.ratio);
      tracks.push({
        fromValue: source.value,
        toValue: target.value,
        fromRatio: source.ratio,
        toRatio: target.ratio,
        fromAlpha: 1,
        toAlpha: 0
      });
    });

    to.forEach((target, index) => {
      if (usedTo.has(index)) return;
      const source = nearestDefinition(from, target.ratio);
      tracks.push({
        fromValue: source.value,
        toValue: target.value,
        fromRatio: source.ratio,
        toRatio: target.ratio,
        fromAlpha: 0,
        toAlpha: 1
      });
    });

    return tracks.sort((a, b) => a.toRatio - b.toRatio);
  }

  function interpolateAxisTrack(track, progress) {
    return {
      value: track.fromValue + (track.toValue - track.fromValue) * progress,
      ratio: track.fromRatio + (track.toRatio - track.fromRatio) * progress,
      alpha: track.fromAlpha + (track.toAlpha - track.fromAlpha) * progress
    };
  }

  function createUnifiedYAxis(options = {}) {
    const id = options.id || `pffUnifiedYAxis_${Math.random().toString(36).slice(2)}`;
    const state = {
      raf: null,
      token: 0,
      progress: 1,
      fromScale: null,
      toScale: null,
      currentScale: null,
      fromDecimals: 0,
      toDecimals: 0,
      majorTracks: [],
      minorTracks: [],
      title: {
        raf: null,
        token: 0,
        progress: 1,
        from: '',
        to: ''
      }
    };

    const getChart = () => options.getChart?.() || null;
    const getScale = () => copyScale(options.getScale?.() || { min: 0, max: 1, intervals: 4 });
    const getDecimals = () => Math.max(0, Math.round(Number(options.getDecimals?.()) || 0));
    const getTitle = () => String(options.getTitle?.() || '');

    function cancel() {
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = null;
      state.token += 1;
    }

    function cancelTitle() {
      if (state.title.raf) cancelAnimationFrame(state.title.raf);
      state.title.raf = null;
      state.title.token += 1;
    }

    function setImmediately(scale = getScale(), decimals = getDecimals()) {
      cancel();
      const current = copyScale(scale);
      const places = Math.max(0, Math.round(Number(decimals) || 0));
      state.progress = 1;
      state.fromScale = current;
      state.toScale = current;
      state.currentScale = current;
      state.fromDecimals = places;
      state.toDecimals = places;
      state.majorTracks = buildAxisTracks(majorTickDefinitions(current), majorTickDefinitions(current));
      state.minorTracks = buildAxisTracks(minorTickDefinitions(current), minorTickDefinitions(current));
    }

    function setTitleImmediately(text = getTitle()) {
      cancelTitle();
      const value = String(text || '');
      state.title.progress = 1;
      state.title.from = value;
      state.title.to = value;
    }

    function currentScale() {
      return copyScale(state.currentScale || getScale());
    }

    function currentDecimals() {
      const p = clamp(state.progress, 0, 1);
      return p < 0.5 ? state.fromDecimals : state.toDecimals;
    }

    function currentTracks(kind) {
      const p = clamp(state.progress, 0, 1);
      const definitions = kind === 'major' ? majorTickDefinitions : minorTickDefinitions;
      const tracks = kind === 'major' ? state.majorTracks : state.minorTracks;
      const source = tracks.length
        ? tracks
        : buildAxisTracks(definitions(getScale()), definitions(getScale()));
      return source.map(track => interpolateAxisTrack(track, p));
    }

    function animate(fromScale, toScale, config = {}) {
      cancel();
      const from = copyScale(fromScale || currentScale());
      const to = copyScale(toScale || getScale());
      const duration = Number(config.duration ?? DEFAULTS.viewTransitionMs);
      const fromDecimals = Math.max(0, Math.round(Number(config.fromDecimals ?? currentDecimals()) || 0));
      const toDecimals = Math.max(0, Math.round(Number(config.toDecimals ?? getDecimals()) || 0));

      if (reducedMotion() || duration <= 0 || scalesNearlyEqual(from, to)) {
        setImmediately(to, toDecimals);
        getChart()?.draw();
        return;
      }

      const token = ++state.token;
      state.progress = 0;
      state.fromScale = from;
      state.toScale = to;
      state.currentScale = from;
      state.fromDecimals = fromDecimals;
      state.toDecimals = toDecimals;
      state.majorTracks = buildAxisTracks(majorTickDefinitions(from), majorTickDefinitions(to));
      state.minorTracks = buildAxisTracks(minorTickDefinitions(from), minorTickDefinitions(to));
      const startedAt = performance.now();

      const frame = now => {
        if (token !== state.token) return;
        const raw = clamp((now - startedAt) / duration, 0, 1);
        const p = easeInOutCubic(raw);
        const min = from.min + (to.min - from.min) * p;
        const max = from.max + (to.max - from.max) * p;
        const intervals = p < 0.5 ? from.intervals : to.intervals;
        state.progress = p;
        state.currentScale = {
          min,
          max,
          intervals,
          step: (max - min) / Math.max(1, intervals)
        };
        getChart()?.draw();

        if (raw < 1) {
          state.raf = requestAnimationFrame(frame);
        } else {
          state.raf = null;
          setImmediately(to, toDecimals);
          getChart()?.draw();
        }
      };

      state.raf = requestAnimationFrame(frame);
    }

    function animateTitle(fromText, toText, duration = DEFAULTS.viewTransitionMs) {
      cancelTitle();
      const from = String(fromText ?? state.title.to ?? '');
      const to = String(toText ?? getTitle());

      if (reducedMotion() || duration <= 0 || from === to) {
        setTitleImmediately(to);
        getChart()?.draw();
        return;
      }

      const token = ++state.title.token;
      state.title.from = from;
      state.title.to = to;
      state.title.progress = 0;
      const startedAt = performance.now();

      const frame = now => {
        if (token !== state.title.token) return;
        const raw = clamp((now - startedAt) / duration, 0, 1);
        state.title.progress = easeInOutCubic(raw);
        getChart()?.draw();
        if (raw < 1) {
          state.title.raf = requestAnimationFrame(frame);
        } else {
          state.title.raf = null;
          setTitleImmediately(to);
          getChart()?.draw();
        }
      };

      state.title.raf = requestAnimationFrame(frame);
    }

    function drawTitle(ctx, chartArea) {
      const p = clamp(state.title.progress, 0, 1);
      const fontSize = mobileLayout() ? 12 : 13;
      const x = chartArea.left - (mobileLayout() ? 47 : 54);
      const y = chartArea.top + chartArea.height / 2;

      const draw = (text, alpha) => {
        if (!text || alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = cssVar('--pff-ink', '#151515');
        ctx.font = `700 ${fontSize}px Lato, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0);
        ctx.restore();
      };

      if (state.title.from === state.title.to || p >= 1) {
        draw(state.title.to || getTitle(), 1);
        return;
      }

      draw(state.title.from, clamp(1 - p * 2.2, 0, 1));
      draw(state.title.to, clamp((p - 0.32) / 0.68, 0, 1));
    }

    const plugin = {
      id,
      beforeDatasetsDraw(chart) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        const majorTracks = currentTracks('major');
        const minorTracks = currentTracks('minor');
        ctx.save();

        majorTracks.forEach(track => {
          if (track.alpha <= 0.001 || track.ratio <= 0.001) return;
          const y = chartArea.bottom - chartArea.height * track.ratio;
          ctx.beginPath();
          ctx.moveTo(chartArea.left, Math.round(y) + 0.5);
          ctx.lineTo(chartArea.right, Math.round(y) + 0.5);
          ctx.globalAlpha = clamp(track.alpha, 0, 1);
          ctx.strokeStyle = 'rgba(105, 113, 138, 0.075)';
          ctx.lineWidth = 1;
          ctx.stroke();
        });

        minorTracks.forEach(track => {
          if (track.alpha <= 0.001) return;
          const y = chartArea.bottom - chartArea.height * track.ratio;
          ctx.beginPath();
          ctx.moveTo(chartArea.left, Math.round(y) + 0.5);
          ctx.lineTo(chartArea.right, Math.round(y) + 0.5);
          ctx.globalAlpha = clamp(track.alpha, 0, 1);
          ctx.strokeStyle = 'rgba(105, 113, 138, 0.035)';
          ctx.lineWidth = 0.7;                      

          ctx.stroke();
        });

        ctx.restore();
      },
      afterDraw(chart) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        const majorTracks = currentTracks('major');
        const minorTracks = currentTracks('minor');
        ctx.save();
        ctx.lineCap = 'butt';
        ctx.strokeStyle = cssVar('--pff-ink', '#151515');
        ctx.fillStyle = cssVar('--pff-ink', '#151515');
        ctx.lineWidth = 1;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.font = '12px Lato, sans-serif';

        majorTracks.forEach(track => {
          if (track.alpha <= 0.001) return;
          const y = chartArea.bottom - chartArea.height * track.ratio;
          const baseAlpha = clamp(track.alpha, 0, 1);
          ctx.globalAlpha = baseAlpha;
          ctx.beginPath();
          ctx.moveTo(chartArea.left, Math.round(y) + 0.5);
          ctx.lineTo(chartArea.left - 5, Math.round(y) + 0.5);
          ctx.stroke();

          if (state.fromDecimals === state.toDecimals || state.progress >= 1) {
            ctx.globalAlpha = baseAlpha;
            ctx.fillText(formatAxisValue(track.value, state.toDecimals), chartArea.left - 8, y);
          } else {
            const p = clamp(state.progress, 0, 1);
            const outgoing = clamp(1 - p * 2.2, 0, 1);
            const incoming = clamp((p - 0.32) / 0.68, 0, 1);
            if (outgoing > 0) {
              ctx.globalAlpha = baseAlpha * outgoing;
              ctx.fillText(formatAxisValue(track.value, state.fromDecimals), chartArea.left - 8, y);
            }
            if (incoming > 0) {
              ctx.globalAlpha = baseAlpha * incoming;
              ctx.fillText(formatAxisValue(track.value, state.toDecimals), chartArea.left - 8, y);
            }
          }
        });

        ctx.strokeStyle = cssVar('--pff-muted', '#69718a');
        ctx.lineWidth = 0.7;
        minorTracks.forEach(track => {
          if (track.alpha <= 0.001) return;
          const y = chartArea.bottom - chartArea.height * track.ratio;
          ctx.globalAlpha = 0.60 * clamp(track.alpha, 0, 1);
          ctx.beginPath();
          ctx.moveTo(chartArea.left, Math.round(y) + 0.5);
          ctx.lineTo(chartArea.left - 2, Math.round(y) + 0.5);
          ctx.stroke();
        });

        ctx.globalAlpha = 1;
        ctx.strokeStyle = cssVar('--pff-ink', '#151515');
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(Math.round(chartArea.left) + 0.5, chartArea.top);
        ctx.lineTo(Math.round(chartArea.left) + 0.5, chartArea.bottom);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(chartArea.left, Math.round(chartArea.bottom) + 0.5);
        ctx.lineTo(chartArea.right, Math.round(chartArea.bottom) + 0.5);
        ctx.stroke();
        ctx.restore();

        drawTitle(ctx, chartArea);
      }
    };

    setImmediately(getScale(), getDecimals());
    setTitleImmediately(getTitle());

    return {
      plugin,
      state,
      setImmediately,
      setTitleImmediately,
      animate,
      animateTitle,
      currentScale,
      currentDecimals,
      majorTracks: () => currentTracks('major'),
      minorTracks: () => currentTracks('minor'),
      valueToRatio(value) {
        const scale = currentScale();
        return (Number(value) - scale.min) / (scale.max - scale.min);
      },
      valueToY(chartArea, value) {
        const ratio = this.valueToRatio(value);
        return chartArea.bottom - chartArea.height * ratio;
      },
      destroy() {
        cancel();
        cancelTitle();
      }
    };
  }

  function createYearTickMarksPlugin(options = {}) {
    const id = options.id || `pffYearTicks_${Math.random().toString(36).slice(2)}`;
    return {
      id,
      afterDraw(chart) {
        const { ctx, chartArea, scales } = chart;
        const xScale = scales?.x;
        if (!chartArea || !xScale) return;

        ctx.save();
        const count = xScale.ticks?.length || chart.data?.labels?.length || 0;
        for (let index = 0; index < count; index += 1) {
          const raw = options.getValue
            ? options.getValue({ chart, index, xScale })
            : xScale.getLabelForValue(index);
          const year = Number(raw);
          const x = xScale.getPixelForTick(index);
          if (!Number.isFinite(x)) continue;
          const major = options.isMajor
            ? Boolean(options.isMajor(raw, index))
            : Number.isFinite(year) && year % 2 === 0;

          ctx.strokeStyle = major
            ? cssVar('--pff-ink', '#151515')
            : cssVar('--pff-muted', '#69718a');
          ctx.globalAlpha = major ? 1 : 0.60;
          ctx.lineWidth = major ? 1 : 0.7;
          ctx.beginPath();
          ctx.moveTo(Math.round(x) + 0.5, chartArea.bottom);
          ctx.lineTo(Math.round(x) + 0.5, chartArea.bottom + (major ? 5 : 2));
          ctx.stroke();
        }
        ctx.restore();
      }
    };
  }

  function createAxisSpinesPlugin(options = {}) {
    const id = options.id || `pffAxisSpines_${Math.random().toString(36).slice(2)}`;
    return {
      id,
      afterDraw(chart) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;
        ctx.save();
        ctx.strokeStyle = options.colour || cssVar('--pff-ink', '#151515');
        ctx.lineWidth = Number(options.lineWidth) || 1.1;

        if (options.y !== false) {
          ctx.beginPath();
          ctx.moveTo(Math.round(chartArea.left) + 0.5, chartArea.top);
          ctx.lineTo(Math.round(chartArea.left) + 0.5, chartArea.bottom);
          ctx.stroke();
        }

        if (options.x !== false) {
          ctx.beginPath();
          ctx.moveTo(chartArea.left, Math.round(chartArea.bottom) + 0.5);
          ctx.lineTo(chartArea.right, Math.round(chartArea.bottom) + 0.5);
          ctx.stroke();
        }

        ctx.restore();
      }
    };
  }

  function numericCell(cell) {
    const value = Number(cell?.v ?? cell?.f);
    return Number.isFinite(value) ? value : NaN;
  }

  function cleanText(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function loadGVizSheet(options = {}) {
    const sheetId = options.sheetId;
    const sheetName = options.sheetName;
    const range = options.range;
    const timeoutMs = Number(options.timeoutMs) || 15000;
    const headers = String(options.headers ?? '1');

    if (!sheetId || !sheetName || !range) {
      return Promise.reject(new Error('PFFCharts.loadGVizSheet requires sheetId, sheetName and range.'));
    }

    return new Promise((resolve, reject) => {
      const callbackName = `__pff_gviz_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      let completed = false;

      const cleanup = () => {
        script.remove();
        try {
          delete global[callbackName];
        } catch (_) {
          global[callbackName] = undefined;
        }
      };

      const finish = callback => value => {
        if (completed) return;
        completed = true;
        global.clearTimeout(timer);
        cleanup();
        callback(value);
      };

      const timer = global.setTimeout(
        () => finish(reject)(new Error(`Timed out loading ${sheetName}.`)),
        timeoutMs
      );

      global[callbackName] = response => {
        if (completed) return;
        if (!response || response.status === 'error') {
          const message =
            response?.errors?.[0]?.detailed_message ||
            response?.errors?.[0]?.message ||
            `Could not load ${sheetName}.`;
          finish(reject)(new Error(message));
          return;
        }
        finish(resolve)(response.table);
      };

      script.onerror = () => finish(reject)(new Error(`Could not connect to ${sheetName}.`));

      const params = new URLSearchParams({
        sheet: sheetName,
        range,
        headers,
        tqx: `out:json;responseHandler:${callbackName}`
      });

      if (options.query) {
        params.set('tq', options.query);
      }

      script.src = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?${params.toString()}`;
      script.async = true;
      document.head.appendChild(script);
    });
  }

  function saveLocalCache(key, rows, metadata = {}) {
    try {
      localStorage.setItem(key, JSON.stringify({
        savedAt: new Date().toISOString(),
        rows,
        ...metadata
      }));
      return true;
    } catch (_) {
      return false;
    }
  }

  function loadLocalCache(key, options = {}) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const rows = parsed?.rows;
      const minRows = Math.max(0, Math.round(Number(options.minRows) || 0));
      if (!Array.isArray(rows) || rows.length < minRows) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  async function loadLiveCacheFallback(options = {}) {
    try {
      const liveRaw = await options.loadLive();
      const rows = await options.parseLive(liveRaw);
      if (!Array.isArray(rows) || rows.length < (options.minRows || 1)) {
        throw new Error('Live data did not contain enough usable rows.');
      }
      if (options.cacheKey) {
        saveLocalCache(options.cacheKey, rows);
      }
      options.onSource?.('live');
      return { rows, source: 'live' };
    } catch (liveError) {
      options.onLiveError?.(liveError);
      const cached = options.cacheKey ? loadLocalCache(options.cacheKey, { minRows: options.minRows || 1 }) : null;
      if (cached?.rows) {
        options.onSource?.('cached');
        return { rows: cached.rows, source: 'cached', savedAt: cached.savedAt || null };
      }

      if (Array.isArray(options.fallback) && options.fallback.length) {
        options.onSource?.('cached');
        return { rows: options.fallback, source: 'cached', fallback: true };
      }

      throw liveError;
    }
  }

  function setMetricSwitchIndex(element, index) {
    element?.style.setProperty('--pff-metric-index', String(Math.max(0, Math.round(Number(index) || 0))));
  }

  function createResponsiveController(options = {}) {
    let raf = null;
    let observer = null;

    const refresh = () => {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = null;
        const chart = options.getChart?.();
        if (chart) {
          applyResponsiveChartOptions(chart);
          options.beforeResize?.(chart);
          chart.resize();
          options.afterResize?.(chart);
        }
        options.onRefresh?.();
      });
    };

    if ('ResizeObserver' in global) {
      observer = new ResizeObserver(entries => {
        const usable = entries.some(entry => entry.contentRect.width > 1 && entry.contentRect.height > 1);
        if (usable) refresh();
      });
      (options.observe || []).filter(Boolean).forEach(element => observer.observe(element));
    }

    global.addEventListener('resize', refresh, { passive: true });
    global.visualViewport?.addEventListener('resize', refresh, { passive: true });
    global.addEventListener('pageshow', refresh);
    document.fonts?.ready?.then(refresh);

    return {
      refresh,
      destroy() {
        if (raf !== null) cancelAnimationFrame(raf);
        observer?.disconnect();
        global.removeEventListener('resize', refresh);
        global.visualViewport?.removeEventListener('resize', refresh);
        global.removeEventListener('pageshow', refresh);
      }
    };
  }
  function lineDataset(options = {}) {
    const mobile = mobileLayout();
    const colour =
      options.borderColor ||
      options.colour ||
      '#69718a';

    return deepMerge({
      type: 'line',
      label: '',
      data: [],
      borderColor: colour,
      backgroundColor: colour,
      pointBackgroundColor: colour,
      borderWidth: 3,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHitRadius: mobile ? 9 : 5,
      pointBorderWidth: 0,
      tension: 0.28,
      fill: false,
      spanGaps: false
    }, options);
  }

  function arraysMatch(first, second) {
    return Boolean(
      Array.isArray(first) &&
      Array.isArray(second) &&
      first.length === second.length &&
      first.every(
        (value, index) =>
          value === second[index]
      )
    );
  }

  function scalesMatch(first, second) {
    return Boolean(
      first &&
      second &&
      Number(first.min) ===
        Number(second.min) &&
      Number(first.max) ===
        Number(second.max) &&
      Number(first.step) ===
        Number(second.step) &&
      Number(first.intervals) ===
        Number(second.intervals)
    );
  }

  function cloneViewConfig(config = {}) {
    return {
      ...config,
      labels:
        Array.isArray(config.labels)
          ? [...config.labels]
          : config.labels,
      colours:
        Array.isArray(config.colours)
          ? [...config.colours]
          : config.colours,
      scale:
        config.scale
          ? {...config.scale}
          : config.scale
    };
  }

  function seriesVisibilityTransitionOptions(
    duration = 240
  ) {
    const transitionDuration =
      reducedMotion()
        ? 0
        : Math.max(
            0,
            Number(duration) || 0
          );

    return {
      hide: {
        animations: {
          colors: {
            duration:
              transitionDuration,
            easing:
              'easeOutCubic'
          }
        }
      },

      show: {
        animations: {
          colors: {
            duration:
              transitionDuration,
            easing:
              'easeOutCubic'
          }
        }
      }
    };
  }

  function setupLegend(options = {}) {
    const chartLegend =
      options.legend ||
      document.getElementById(
        'chartLegend'
      );

    const leftButton =
      options.leftButton ||
      document.getElementById(
        'legendScrollLeft'
      );

    const rightButton =
      options.rightButton ||
      document.getElementById(
        'legendScrollRight'
      );

    const getChart = () =>
      options.getChart?.() || null;

    const getItems = () => {
      if (
        typeof options.getItems ===
        'function'
      ) {
        return Array.from(
          options.getItems() || []
        );
      }

      const chart =
        getChart();

      return Array.from(
        chart?.data?.datasets || []
      ).map(
        (
          dataset,
          datasetIndex
        ) => ({
          datasetIndex,
          label:
            dataset._seriesLabel ||
            dataset.label ||
            `Series ${datasetIndex + 1}`,
          colour:
            dataset.borderColor ||
            dataset.backgroundColor ||
            '#69718a',
          active:
            dataset._activeSeries !==
            false
        })
      );
    };

    if (!chartLegend) {
      return {
        render() {},
        update() {},
        destroy() {}
      };
    }

    const scroller =
      setupScrollableRegion({
        scroller:
          chartLegend,
        leftButton,
        rightButton
      });

    function toggleItem(item) {
      const chart =
        getChart();

      if (!chart) {
        return;
      }

      const datasetIndex =
        Number(
          item.datasetIndex
        );

      const dataset =
        chart.data?.datasets?.[
          datasetIndex
        ];

      if (!dataset) {
        return;
      }

      const currentlyVisible =
        chart.isDatasetVisible
          ? chart.isDatasetVisible(
              datasetIndex
            )
          : dataset.hidden !== true;

      const nextVisible =
        !currentlyVisible;

      if (
        typeof chart.setDatasetVisibility ===
        'function'
      ) {
        chart.setDatasetVisibility(
          datasetIndex,
          nextVisible
        );
      } else {
        dataset.hidden =
          !nextVisible;
      }

      dataset._activeSeries =
        nextVisible;

      options.onToggle?.({
        chart,
        dataset,
        datasetIndex,
        visible:
          nextVisible,
        item
      });

      chart.update(
        options.updateMode ||
        undefined
      );

      render();
    }

    function render() {
      const items =
        getItems();

      chartLegend.replaceChildren();

      items.forEach(
        (
          item,
          fallbackIndex
        ) => {
          const datasetIndex =
            Number.isFinite(
              Number(
                item.datasetIndex
              )
            )
              ? Number(
                  item.datasetIndex
                )
              : fallbackIndex;

          const chart =
            getChart();

          const visible =
            item.active !== undefined
              ? Boolean(
                  item.active
                )
              : chart?.isDatasetVisible
                ? chart.isDatasetVisible(
                    datasetIndex
                  )
                : chart
                    ?.data
                    ?.datasets?.[
                      datasetIndex
                    ]
                    ?.hidden !==
                  true;

          const button =
            document.createElement(
              'button'
            );

          button.type =
            'button';

          button.className =
            'legend-item';

          button.classList.toggle(
            'is-hidden-series',
            !visible
          );

          button.dataset.datasetIndex =
            String(
              datasetIndex
            );

          button.setAttribute(
            'aria-pressed',
            String(visible)
          );

          button.setAttribute(
            'aria-label',
            `${visible ? 'Hide' : 'Show'} ${item.label}`
          );

          const line =
            document.createElement(
              'span'
            );

          line.className =
            'legend-line';

          line.setAttribute(
            'aria-hidden',
            'true'
          );

          line.style.setProperty(
            '--legend-colour',
            item.colour ||
              '#69718a'
          );

          const label =
            document.createElement(
              'span'
            );

          label.textContent =
            item.label ||
            `Series ${datasetIndex + 1}`;

          button.append(
            line,
            label
          );

          button.addEventListener(
            'click',
            () =>
              toggleItem({
                ...item,
                datasetIndex
              })
          );

          chartLegend.appendChild(
            button
          );
        }
      );

      requestAnimationFrame(
        scroller.update
      );

      options.onRender?.(
        items
      );
    }

    requestAnimationFrame(
      render
    );

    return {
      render,
      update:
        render,

      destroy() {
        scroller.destroy();
        chartLegend.replaceChildren();
      }
    };
  }

  function setupMetricSwitch(
    options = {}
  ) {
    const element =
      options.element ||
      document.getElementById(
        'metricSwitch'
      );

    const buttons =
      Array.from(
        options.buttons ||
        element?.querySelectorAll?.(
          '.metric-button'
        ) ||
        []
      );

    const valueAttribute =
      options.valueAttribute ||
      'metric';

    let value =
      options.initialValue ??
      buttons.find(
        button =>
          button.classList.contains(
            'is-active'
          )
      )?.dataset?.[
        valueAttribute
      ];

    function valueOf(button) {
      return (
        button?.dataset?.[
          valueAttribute
        ] ??
        button?.getAttribute?.(
          'data-value'
        ) ??
        ''
      );
    }

    function apply(
      nextValue,
      notify = true
    ) {
      value =
        nextValue;

      let activeIndex = 0;

      buttons.forEach(
        (
          button,
          index
        ) => {
          const active =
            valueOf(button) ===
            value;

          button.classList.toggle(
            'is-active',
            active
          );

          button.setAttribute(
            'aria-pressed',
            String(active)
          );

          button.tabIndex =
            active ? 0 : -1;

          if (active) {
            activeIndex =
              index;
          }
        }
      );

      if (element) {
        element.style.setProperty(
          '--pff-metric-columns',
          String(
            Math.max(
              1,
              buttons.length
            )
          )
        );

        setMetricSwitchIndex(
          element,
          activeIndex
        );
      }

      if (notify) {
        options.onChange?.(
          value,
          activeIndex
        );
      }
    }

    const keyHandlers =
      new Map();

    function advanceMetric() {
      if (!buttons.length) {
        return;
      }

      const activeIndex =
        Math.max(
          0,
          buttons.findIndex(
            button =>
              valueOf(button) ===
              value
          )
        );

      const nextIndex =
        (
          activeIndex +
          1
        ) %
        buttons.length;

      apply(
        valueOf(
          buttons[
            nextIndex
          ]
        )
      );
    }

    const switchClickHandler =
      () => {
        advanceMetric();
      };

    element?.addEventListener(
      'click',
      switchClickHandler
    );

    buttons.forEach(
      (
        button,
        index
      ) => {
        const keyHandler =
          event => {
            let nextIndex =
              null;

            if (
              event.key ===
              'ArrowRight'
            ) {
              nextIndex =
                (
                  index +
                  1
                ) %
                buttons.length;
            }

            if (
              event.key ===
              'ArrowLeft'
            ) {
              nextIndex =
                (
                  index -
                  1 +
                  buttons.length
                ) %
                buttons.length;
            }

            if (
              event.key ===
              'Home'
            ) {
              nextIndex = 0;
            }

            if (
              event.key ===
              'End'
            ) {
              nextIndex =
                buttons.length -
                1;
            }

            if (
              nextIndex ===
              null
            ) {
              return;
            }

            event.preventDefault();

            buttons[
              nextIndex
            ].focus({
              preventScroll:
                true
            });

            apply(
              valueOf(
                buttons[
                  nextIndex
                ]
              )
            );
          };

        button.addEventListener(
          'keydown',
          keyHandler
        );

        keyHandlers.set(
          button,
          keyHandler
        );
      }
    );

    if (
      value === undefined &&
      buttons.length
    ) {
      value =
        valueOf(
          buttons[0]
        );
    }

    apply(
      value,
      false
    );

    return {
      get value() {
        return value;
      },

      set(
        nextValue,
        notify = true
      ) {
        apply(
          nextValue,
          notify
        );
      },

      destroy() {
        element?.removeEventListener(
          'click',
          switchClickHandler
        );

        buttons.forEach(
          button => {
            const keyHandler =
              keyHandlers.get(
                button
              );

            button.removeEventListener(
              'keydown',
              keyHandler
            );
          }
        );
      }
    };
  }

  function animateHeading(
    options = {}
  ) {
    const fixed =
      options.fixed ||
      document.getElementById(
        'chartHeadingFixed'
      );

    const detail =
      options.detail ||
      document.getElementById(
        'chartHeadingDetail'
      );

    const nextFixed =
      options.fixedText ??
      fixed?.textContent ??
      '';

    const nextDetail =
      options.detailText ??
      detail?.textContent ??
      '';

    const duration =
      reducedMotion()
        ? 0
        : Math.max(
            0,
            Number(
              options.duration ??
              DEFAULTS.viewTransitionMs
            )
          );

    const elements =
      [
        fixed,
        detail
      ].filter(Boolean);

    if (!elements.length) {
      return Promise.resolve();
    }

    if (duration <= 0) {
      if (fixed) {
        fixed.textContent =
          nextFixed;
      }

      if (detail) {
        detail.textContent =
          nextDetail;
      }

      options.onComplete?.();

      return Promise.resolve();
    }

    return new Promise(
      resolve => {
        elements.forEach(
          element => {
            element.style.transition =
              `opacity ${Math.round(
                duration * 0.45
              )}ms ease`;

            element.style.opacity =
              '0';
          }
        );

        global.setTimeout(
          () => {
            if (fixed) {
              fixed.textContent =
                nextFixed;
            }

            if (detail) {
              detail.textContent =
                nextDetail;
            }

            requestAnimationFrame(
              () => {
                elements.forEach(
                  element => {
                    element.style.transition =
                      `opacity ${Math.round(
                        duration *
                        0.55
                      )}ms ease`;

                    element.style.opacity =
                      '1';
                  }
                );
              }
            );

            global.setTimeout(
              () => {
                elements.forEach(
                  element => {
                    element.style.removeProperty(
                      'transition'
                    );

                    element.style.removeProperty(
                      'opacity'
                    );
                  }
                );

                options.onComplete?.();

                resolve();
              },
              Math.round(
                duration * 0.60
              )
            );
          },
          Math.round(
            duration * 0.45
          )
        );
      }
    );
  }

  function setupChartInteractions(
    options = {}
  ) {
    const canvas =
      options.canvas;

    const getChart = () =>
      options.getChart?.() ||
      null;

    if (!canvas) {
      return {
        destroy() {}
      };
    }

    const prevent =
      event =>
        event.preventDefault();

    const clearOutside =
      event => {
        if (
          event.target.closest?.(
            `#${canvas.id}`
          ) ||
          canvas.contains(
            event.target
          )
        ) {
          return;
        }

        const chart =
          getChart();

        if (!chart?.tooltip) {
          return;
        }

        chart.tooltip.setActiveElements(
          [],
          {
            x: 0,
            y: 0
          }
        );

        chart.update(
          'none'
        );
      };

    canvas.addEventListener(
      'contextmenu',
      prevent
    );

    canvas.addEventListener(
      'selectstart',
      prevent
    );

    document.addEventListener(
      'pointerdown',
      clearOutside
    );

    return {
      destroy() {
        canvas.removeEventListener(
          'contextmenu',
          prevent
        );

        canvas.removeEventListener(
          'selectstart',
          prevent
        );

        document.removeEventListener(
          'pointerdown',
          clearOutside
        );
      }
    };
  }

  function setupMenu(
    options = {}
  ) {
    const menu =
      options.menu;

    const button =
      options.button ||
      menu?.querySelector?.(
        '.pff-menu-button'
      );

    const panel =
      options.panel ||
      menu?.querySelector?.(
        '.pff-menu-panel'
      );

    const items =
      Array.from(
        options.items ||
        panel?.querySelectorAll?.(
          '.pff-menu-item'
        ) ||
        []
      );

    let open = false;

    function setOpen(
      nextOpen,
      focus = false
    ) {
      open =
        Boolean(
          nextOpen
        );

      menu?.classList.toggle(
        'is-open',
        open
      );

      panel?.classList.toggle(
        'is-open',
        open
      );

      button?.setAttribute(
        'aria-expanded',
        String(open)
      );

      if (
        open &&
        focus
      ) {
        items[0]?.focus?.({
          preventScroll:
            true
        });
      }

      options.onOpenChange?.(
        open
      );
    }

    const buttonHandler =
      event => {
        event.stopPropagation();

        setOpen(
          !open,
          !open
        );
      };

    const outsideHandler =
      event => {
        if (
          !menu?.contains(
            event.target
          )
        ) {
          setOpen(false);
        }
      };

    const keyHandler =
      event => {
        if (
          event.key ===
          'Escape'
        ) {
          setOpen(false);

          button?.focus?.({
            preventScroll:
              true
          });
        }
      };

    button?.addEventListener(
      'click',
      buttonHandler
    );

    document.addEventListener(
      'pointerdown',
      outsideHandler
    );

    menu?.addEventListener(
      'keydown',
      keyHandler
    );

    return {
      get open() {
        return open;
      },

      openMenu() {
        setOpen(
          true,
          true
        );
      },

      closeMenu() {
        setOpen(false);
      },

      toggle() {
        setOpen(
          !open,
          !open
        );
      },

      destroy() {
        button?.removeEventListener(
          'click',
          buttonHandler
        );

        document.removeEventListener(
          'pointerdown',
          outsideHandler
        );

        menu?.removeEventListener(
          'keydown',
          keyHandler
        );
      }
    };
  }

  function setupStepper(
    options = {}
  ) {
    const root =
      options.root;

    const steps =
      Array.from(
        options.steps ||
        root?.querySelectorAll?.(
          '.pff-step'
        ) ||
        []
      );

    const dots =
      Array.from(
        options.dots ||
        root?.querySelectorAll?.(
          '.pff-stepper-dot'
        ) ||
        []
      );

    const backButton =
      options.backButton ||
      root?.querySelector?.(
        '[data-step-back]'
      );

    const nextButton =
      options.nextButton ||
      root?.querySelector?.(
        '[data-step-next]'
      );

    let index =
      clamp(
        Math.round(
          Number(
            options.initialIndex
          ) || 0
        ),
        0,
        Math.max(
          0,
          steps.length - 1
        )
      );

    function render(
      notify = false
    ) {
      steps.forEach(
        (
          step,
          stepIndex
        ) => {
          const active =
            stepIndex ===
            index;

          step.classList.toggle(
            'is-active',
            active
          );

          step.setAttribute(
            'aria-hidden',
            String(!active)
          );
        }
      );

      dots.forEach(
        (
          dot,
          dotIndex
        ) => {
          dot.classList.toggle(
            'is-active',
            dotIndex ===
              index
          );

          dot.classList.toggle(
            'is-complete',
            dotIndex <
              index
          );
        }
      );

      if (backButton) {
        backButton.disabled =
          index <= 0;
      }

      if (nextButton) {
        nextButton.disabled =
          index >=
          steps.length - 1;
      }

      root?.style.setProperty(
        '--pff-step-index',
        String(index)
      );

      if (notify) {
        options.onChange?.(
          index,
          steps[index]
        );
      }
    }

    const go =
      nextIndex => {
        const target =
          clamp(
            Math.round(
              Number(
                nextIndex
              ) || 0
            ),
            0,
            Math.max(
              0,
              steps.length -
              1
            )
          );

        if (
          target ===
          index
        ) {
          return;
        }

        if (
          target >
            index &&
          options.canAdvance &&
          options.canAdvance(
            index,
            steps[index]
          ) === false
        ) {
          return;
        }

        index =
          target;

        render(true);

        options.onStep?.(
          index,
          steps[index]
        );
      };

    const backHandler =
      () =>
        go(
          index - 1
        );

    const nextHandler =
      () =>
        go(
          index + 1
        );

    backButton?.addEventListener(
      'click',
      backHandler
    );

    nextButton?.addEventListener(
      'click',
      nextHandler
    );

    render(false);

    return {
      get index() {
        return index;
      },

      get count() {
        return steps.length;
      },

      go,

      next() {
        go(
          index + 1
        );
      },

      back() {
        go(
          index - 1
        );
      },

      reset() {
        index = 0;
        render(true);
      },

      destroy() {
        backButton?.removeEventListener(
          'click',
          backHandler
        );

        nextButton?.removeEventListener(
          'click',
          nextHandler
        );
      }
    };
  }

  function formatInteger(value) {
    const number =
      Number(value);

    return Number.isFinite(
      number
    )
      ? Math.round(
          number
        ).toLocaleString(
          'en-AU'
        )
      : '—';
  }

  function formatOneDecimal(value) {
    const number =
      Number(value);

    return Number.isFinite(
      number
    )
      ? number.toLocaleString(
          'en-AU',
          {
            minimumFractionDigits:
              0,
            maximumFractionDigits:
              1
          }
        )
      : '—';
  }

  function formatPercent(
    value,
    decimals = 1
  ) {
    const number =
      Number(value);

    if (
      !Number.isFinite(
        number
      )
    ) {
      return '—';
    }

    const places =
      Math.max(
        0,
        Math.round(
          Number(decimals) ||
          0
        )
      );

    return `${number.toLocaleString(
      'en-AU',
      {
        minimumFractionDigits:
          places,
        maximumFractionDigits:
          places
      }
    )}%`;
  }

  function formatCurrency(
    value,
    options = {}
  ) {
    const number =
      Number(value);

    if (
      !Number.isFinite(
        number
      )
    ) {
      return '—';
    }

    return new Intl.NumberFormat(
      'en-AU',
      {
        style:
          'currency',
        currency:
          options.currency ||
          'AUD',
        minimumFractionDigits:
          options.minimumFractionDigits ??
          0,
        maximumFractionDigits:
          options.maximumFractionDigits ??
          0
      }
    ).format(number);
  }

  function formatHours(
    value,
    decimals = 1
  ) {
    const number =
      Number(value);

    if (
      !Number.isFinite(
        number
      )
    ) {
      return '—';
    }

    const places =
      Math.max(
        0,
        Math.round(
          Number(decimals) ||
          0
        )
      );

    return `${number.toLocaleString(
      'en-AU',
      {
        minimumFractionDigits:
          places,
        maximumFractionDigits:
          places
      }
    )} hrs`;
  }

  function formatDate(
    value,
    options = {}
  ) {
    const date =
      value instanceof Date
        ? value
        : new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '—';
    }

    return new Intl.DateTimeFormat(
      'en-AU',
      {
        day:
          options.day ||
          'numeric',
        month:
          options.month ||
          'short',
        year:
          options.year ===
          false
            ? undefined
            : (
                options.year ||
                'numeric'
              )
      }
    ).format(date);
  }

  async function initialiseApp(
    options = {}
  ) {
    const app =
      options.app ||
      document.getElementById(
        'app'
      );

    const status =
      options.status ||
      document.getElementById(
        'status'
      );

    showLoadingState(app);

    setStatus(
      '',
      status
    );

    try {
      const loaded =
        options.load
          ? await options.load()
          : await loadLiveCacheFallback({
              loadLive:
                options.loadLive,
              parseLive:
                options.parseLive,
              cacheKey:
                options.cacheKey,
              fallback:
                options.fallback,
              minRows:
                options.minRows,
              onLiveError:
                options.onLiveError,

              onSource:
                source =>
                  setDataSourceIndicator(
                    source,
                    options.dataSourceOptions
                  )
            });

      const result =
        await options.render?.(
          loaded
        );

      hideLoadingState(
        app
      );

      options.onReady?.(
        loaded,
        result
      );

      return {
        loaded,
        result
      };
    } catch (error) {
      console.error(
        error
      );

      setStatus(
        options.errorMessage ||
        error?.message ||
        'Unable to load this PFF app',
        status
      );

      hideLoadingState(
        app
      );

      options.onError?.(
        error
      );

      return {
        error
      };
    }
  }
  ensureFont();
  injectStyles();
  applyChartDefaults();

  const universalAPI =
    Object.freeze({
      version:
        VERSION,

      defaults:
        DEFAULTS,

      cssVar,
      clamp,
      rgba,
      reducedMotion,
      mobileLayout,
      smallLayout,
      deepMerge,
      cleanText,

      formatInteger,
      formatOneDecimal,
      formatPercent,
      formatCurrency,
      formatHours,
      formatDate,

      showLoadingState,
      hideLoadingState,
      setDataSourceIndicator,
      setStatus,

      setupScrollableRegion,
      setupTabs,
      setupMetricSwitch,
      setupMenu,
      setupStepper,
      animateHeading,
      initialiseApp
    });

  global.PFF =
    universalAPI;

  global.PFFCharts =
    Object.freeze({
      ...universalAPI,

      ensureFont,
      injectStyles,

      seriesTint,
      easeInOutCubic,
      easeOutCubic,
      chartAnimationDuration,

      formatAxisValue,
      formatTrendValue,

      applyChartDefaults,
      tooltipOptions,
      lineInteractionOptions,
      baseChartOptions,
      xYearScaleOptions,
      yScaleOptions,
      applyResponsiveChartOptions,
      createResponsiveController,

      ensureChartSummary,
      updateChartSummary,

      scrollByAmount,
      updateOverflowButtons,
      positionTabIndicator,

      setupTrendToggle,

      linearSlope,
      latestConsecutiveTrend,
      createTrendLabelsPlugin,

      lineDataset,
      arraysMatch,
      scalesMatch,
      cloneViewConfig,

      seriesVisibilityTransitionOptions,
      setupLegend,
      setupChartInteractions,

      copyScale,
      scalesNearlyEqual,
      createUnifiedYAxis,
      createYearTickMarksPlugin,
      createAxisSpinesPlugin,

      numericCell,

      loadGVizSheet,
      saveLocalCache,
      loadLocalCache,
      loadLiveCacheFallback,

      setMetricSwitchIndex
    });
})(window);                            
