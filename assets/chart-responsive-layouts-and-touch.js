/*
 * PFF visual module — chart-responsive-layouts-and-touch.js
 * Version 1.0.0-candidate.1 — opt-in shared layout/interaction helpers.
 * Baseline: PFF chart core (430/350 px breakpoints, 69/61 px gutters,
 * 10/9 px tick fonts, 13/12 px title fonts, 5/9 px pointer hit radii).
 *
 * Does NOT modify Chart.defaults, existing charts, data, custom axes,
 * chart spines, animation, tooltips, pff_loader.js or data loading.
 * Does NOT impose the optional 520px chart maximum on wide graphs.
 * To adopt: use getChartOptionsPatch/getLayout in one app at a time.
 */
(function (global) {
  'use strict';
  const modules = global.PFFModules || (global.PFFModules = {});
  const VERSION = '1.0.0-candidate.1';
  const DEFAULTS = Object.freeze({
    mobileBreakpoint: 430,
    smallBreakpoint: 350,
    yGutterDesktop: 69,
    yGutterMobile: 61,
    tickFontDesktop: 10,
    tickFontMobile: 9,
    titleFontDesktop: 13,
    titleFontMobile: 12,
    topPaddingDesktop: 9,
    topPaddingMobile: 8,
    hitRadiusDesktop: 5,
    hitRadiusMobile: 9,
    maxDevicePixelRatio: 3
  });

  function finitePositive(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function getLayout(options = {}) {
    const viewportWidth = finitePositive(options.viewportWidth, global.innerWidth || 1024);
    const containerWidth = finitePositive(options.containerWidth, viewportWidth);
    const maximumWidth = finitePositive(options.maxWidth, Infinity);
    const mobile = viewportWidth <= DEFAULTS.mobileBreakpoint;
    const small = viewportWidth <= DEFAULTS.smallBreakpoint;
    const dpr = finitePositive(options.devicePixelRatio, global.devicePixelRatio || 1);
    return Object.freeze({
      mobile,
      small,
      viewportWidth,
      containerWidth,
      chartWidth: Math.min(containerWidth, maximumWidth),
      yGutter: mobile ? DEFAULTS.yGutterMobile : DEFAULTS.yGutterDesktop,
      tickFontSize: mobile ? DEFAULTS.tickFontMobile : DEFAULTS.tickFontDesktop,
      titleFontSize: mobile ? DEFAULTS.titleFontMobile : DEFAULTS.titleFontDesktop,
      topPadding: mobile ? DEFAULTS.topPaddingMobile : DEFAULTS.topPaddingDesktop,
      pointHitRadius: mobile ? DEFAULTS.hitRadiusMobile : DEFAULTS.hitRadiusDesktop,
      devicePixelRatio: Math.min(dpr, DEFAULTS.maxDevicePixelRatio)
    });
  }

  // Only returns a patch. The caller chooses whether and where to apply it.
  // Specialist chart scales, custom axes, plugins and tooltip interactions
  // remain owned by the individual chart and its existing shared modules.
  function getChartOptionsPatch(options = {}) {
    const layout = getLayout(options);
    return {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 0,
      devicePixelRatio: layout.devicePixelRatio,
      layout: { padding: { top: layout.topPadding } },
      interaction: {
        mode: 'nearest',
        intersect: layout.mobile,
        axis: 'xy'
      }
    };
  }

  function getPointHitRadius(options = {}) {
    return getLayout(options).pointHitRadius;
  }

  function getAxisPresentation(options = {}) {
    const layout = getLayout(options);
    return {
      gutter: layout.yGutter,
      tickFontSize: layout.tickFontSize,
      titleFontSize: layout.titleFontSize,
      topPadding: layout.topPadding
    };
  }

  // Suppress mobile browser's blue tap highlight without changing mark colour,
  // cursor, chart hover styling, selection logic or keyboard focus rings.
  // By default, do not override touch-action (some apps handle gestures).
  function suppressTapFlash(element, options = {}) {
    if (!element || !element.style) return () => {};
    const original = element.style.webkitTapHighlightColor;
    const originalTouchAction = element.style.touchAction;
    element.style.webkitTapHighlightColor = 'transparent';
    if (options.touchAction) element.style.touchAction = options.touchAction;
    return () => {
      element.style.webkitTapHighlightColor = original;
      if (options.touchAction) element.style.touchAction = originalTouchAction;
    };
  }

  // Responsive measurements coalesced to one animation frame, with a disposer.
  // The observer never calls chart.update() or reinitialises the chart.
  function observeChartContainer(element, callback, options = {}) {
    if (!element || typeof callback !== 'function') return () => {};
    let disposed = false;
    let frame = 0;
    let lastWidth = -1;
    let lastHeight = -1;
    const measure = () => {
      frame = 0;
      if (disposed) return;
      const rect = element.getBoundingClientRect?.() || {};
      const width = Number(rect.width) || element.clientWidth || 0;
      const height = Number(rect.height) || element.clientHeight || 0;
      if (width === lastWidth && height === lastHeight) return;
      lastWidth = width;
      lastHeight = height;
      callback({width, height, layout: getLayout({
        viewportWidth: typeof options.viewportWidth === 'function'
          ? options.viewportWidth() : options.viewportWidth,
        containerWidth: width || undefined
      })});
    };
    const schedule = () => {
      if (disposed || frame) return;
      if (typeof global.requestAnimationFrame === 'function') {
        frame = global.requestAnimationFrame(measure);
      } else {
        measure();
      }
    };
    let observer = null;
    if (typeof global.ResizeObserver === 'function') {
      observer = new global.ResizeObserver(schedule);
      observer.observe(element);
    } else {
      global.addEventListener?.('resize', schedule, {passive: true});
    }
    if (options.immediate !== false) schedule();
    return () => {
      disposed = true;
      observer?.disconnect();
      global.removeEventListener?.('resize', schedule);
      if (frame && typeof global.cancelAnimationFrame === 'function') {
        global.cancelAnimationFrame(frame);
      }
    };
  }

  modules.chartResponsive = Object.freeze({
    version: VERSION,
    defaults: DEFAULTS,
    getLayout,
    getChartOptionsPatch,
    getPointHitRadius,
    getAxisPresentation,
    suppressTapFlash,
    observeChartContainer
  });
})(typeof window !== 'undefined' ? window : globalThis);
