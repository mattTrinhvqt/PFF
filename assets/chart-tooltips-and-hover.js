/* PFF charts: tooltips and hover, candidate v4, 2026-11-08.
 * Derived from the existing PFFCharts.tooltipOptions() / lineInteractionOptions()
 * and current graph-specific manual tooltip activation patterns.
 * Opt-in Chart.js configuration and interaction helpers. No global mutation,
 * data loading, chart rendering, or changes to existing production pages.
 */
(function (global) {
  'use strict';
  const modules = global.PFFModules || (global.PFFModules = {});
  const VERSION = '1.0.0-candidate.4';
  const TOKENS = Object.freeze({
    surface: '#ffffff', ink: '#151515', muted: '#69718a', border: '#e8eaf0',
    font: 'Lato', titleSize: 12, bodySize: 11, padding: 9, radius: 4
  });
  function plain(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (!plain(value)) return value;
    const copy = {};
    for (const key of Object.keys(value)) copy[key] = clone(value[key]);
    return copy;
  }
  function merge(base, extra) {
    const out = clone(base);
    if (!plain(extra)) return out;
    for (const [key, value] of Object.entries(extra)) {
      out[key] = plain(value) && plain(out[key]) ? merge(out[key], value) : clone(value);
    }
    return out;
  }
  function isMobile() {
    if (typeof modules.settings?.mobileLayout === 'function') return modules.settings.mobileLayout();
    return typeof global.innerWidth === 'number' && global.innerWidth <= 430;
  }
  function tooltipOptions(overrides = {}) {
    const base = {
      enabled: true, mode: 'nearest', intersect: true, displayColors: false,
      backgroundColor: TOKENS.surface, titleColor: TOKENS.ink,
      bodyColor: TOKENS.muted, borderColor: TOKENS.border,
      borderWidth: 1, padding: TOKENS.padding, cornerRadius: TOKENS.radius,
      titleFont: {family: TOKENS.font, size: TOKENS.titleSize, weight: '700'},
      bodyFont: {family: TOKENS.font, size: TOKENS.bodySize, weight: '400'}
    };
    return merge(base, overrides);
  }
  // Profiles represent genuine app differences, not competing visual standards.
  function interactionOptions(profile = 'point', overrides = {}) {
    const profiles = {
      point: {mode: 'nearest', intersect: true, axis: 'xy'},
      line: {mode: 'nearest', intersect: isMobile(), axis: 'xy'},
      grouped: {mode: 'index', intersect: false, axis: 'y'},
      manual: {mode: 'nearest', intersect: true, axis: 'xy'}
    };
    const base = profiles[profile];
    if (!base) throw new Error(`Unknown PFF chart interaction profile: ${profile}`);
    return merge(base, overrides);
  }
  // Opt-in Chart.js element defaults: no dark bar outline, and only a
  // fine 1px point border on hover. App-specific dataset styles can override.
  function subtleEmphasisOptions(overrides = {}) {
    return merge({point: {hoverBorderWidth: 1}, bar: {hoverBorderWidth: 0}}, overrides);
  }
  // Opt-in dataset adapter. Reuse the mark's current fill/border on hover,
  // rather than introducing a temporary darker/lighter highlight colour.
  // This deliberately preserves any existing fine border instead of adding one.
  function preserveBarHoverAppearance(dataset = {}) {
    const next = clone(dataset);
    if (Object.hasOwn(next, 'backgroundColor'))
      next.hoverBackgroundColor = clone(next.backgroundColor);
    if (Object.hasOwn(next, 'borderColor'))
      next.hoverBorderColor = clone(next.borderColor);
    if (Object.hasOwn(next, 'borderWidth'))
      next.hoverBorderWidth = clone(next.borderWidth);
    else
      next.hoverBorderWidth = 0;
    return next;
  }
  function chartOptions(profile = 'point', options = {}) {
    const interaction = interactionOptions(profile, options.interaction || {});
    const tooltip = tooltipOptions({mode: interaction.mode, intersect: interaction.intersect,
      axis: interaction.axis, ...(options.tooltip || {})});
    if (profile === 'manual' && !Object.hasOwn(options.tooltip || {}, 'events')) tooltip.events = [];
    return {interaction, elements: subtleEmphasisOptions(options.elements || {}), plugins: {tooltip}};
  }
  function normaliseElements(elements) {
    return (Array.isArray(elements) ? elements : []).filter(item =>
      Number.isInteger(item?.datasetIndex) && item.datasetIndex >= 0 &&
      Number.isInteger(item?.index) && item.index >= 0
    ).map(item => ({datasetIndex: item.datasetIndex, index: item.index}));
  }
  function metaPosition(chart, entry) {
    const item = chart?.getDatasetMeta?.(entry.datasetIndex)?.data?.[entry.index];
    return {x: Number.isFinite(item?.x) ? item.x : 0,
      y: Number.isFinite(item?.y) ? item.y : 0};
  }
  function validElements(chart, elements) {
    return normaliseElements(elements).filter(item => {
      const dataset = chart?.data?.datasets?.[item.datasetIndex];
      if (!dataset || !Array.isArray(dataset.data) || item.index >= dataset.data.length) return false;
      if (typeof chart.isDatasetVisible === 'function' && !chart.isDatasetVisible(item.datasetIndex)) return false;
      return dataset.hidden !== true;
    });
  }
  // Explicit controller: does not replace application onHover/onClick callbacks.
  // Call sync() after a chart data update when a pinned tooltip should survive.
  function createHoverController(options = {}) {
    let elements = [];
    let pinned = false;
    let locked = false;
    let destroyed = false;
    const chart = () => typeof options.getChart === 'function' ? options.getChart() : options.chart;
    function apply(items, at, shouldUpdate = true) {
      const current = chart();
      if (!current?.tooltip?.setActiveElements) return false;
      const next = validElements(current, items);
      const position = (Number.isFinite(at?.x) && Number.isFinite(at?.y))
        ? {x: at.x, y: at.y} : (next.length ? metaPosition(current, next[0]) : {x: 0, y: 0});
      current.tooltip.setActiveElements(next, position);
      // A pinned tooltip should not automatically create a heavy mark outline.
      // Individual apps can opt into mark highlighting if appropriate.
      current.setActiveElements?.(options.highlightMarks === true ? next : []);
      if (shouldUpdate) current.update?.('none');
      elements = next;
      options.onChange?.({elements: getElements(), pinned, position});
      return true;
    }
    function getElements() { return elements.map(item => ({...item})); }
    const api = {
      version: VERSION,
      getElements,
      isPinned: () => pinned,
      isLocked: () => locked,
      setLocked(value) { locked = Boolean(value); if (locked) api.clear(true); return locked; },
      activate(items, position, {pin = false} = {}) {
        if (destroyed || locked || (pinned && !pin)) return false;
        const valid = validElements(chart(), items);
        pinned = Boolean(pin) && valid.length > 0;
        return apply(valid, position);
      },
      pin() { if (destroyed || locked || !elements.length) return false; pinned = true; return true; },
      unpin() { pinned = false; },
      clear(force = false) {
        if (destroyed || (!force && pinned)) return false;
        pinned = false;
        return apply([], {x: 0, y: 0});
      },
      sync() {
        if (destroyed || locked || !pinned) return false;
        const current = validElements(chart(), elements);
        if (!current.length) return api.clear(true);
        // Recompute pixel coordinates after animated scales or data changes.
        return apply(current);
      },
      destroy() { if (destroyed) return; api.clear(true); destroyed = true; elements = []; pinned = false; }
    };
    return api;
  }

  // Opt-in, reusable dismissal for Chart.js canvas tooltips, including pinned
  // tooltips. The next press on blank plot area OR outside the canvas closes
  // the tip. Pressing a different mark is left to Chart.js / the app's onClick.
  // Binding is per canvas, not global: unrelated charts are not modified.
  const dismissalBindings = new WeakMap();
  function bindDismissOnOutside(options = {}) {
    const canvas = options.canvas;
    const doc = options.document || global.document;
    if (!canvas?.addEventListener || !doc?.addEventListener)
      throw new Error('PFF chart tooltip dismissal requires a canvas and document');
    dismissalBindings.get(canvas)?.destroy();
    const getChart = () => typeof options.getChart === 'function'
      ? options.getChart() : options.chart;
    const controller = options.hoverController;
    let destroyed = false;
    const prevent = event => event.preventDefault();
    function eventPosition(event, chart) {
      const source = event?.touches?.[0] || event?.changedTouches?.[0] || event;
      const x = Number(source?.clientX), y = Number(source?.clientY);
      const rect = canvas.getBoundingClientRect?.();
      if (!rect?.width || !rect?.height || !Number.isFinite(x) || !Number.isFinite(y)) return null;
      return {x: (x - rect.left) * ((chart?.width || rect.width) / rect.width),
        y: (y - rect.top) * ((chart?.height || rect.height) / rect.height)};
    }
    function insideTooltip(event, chart) {
      const tooltip = chart?.tooltip;
      if (!tooltip || !(Number(tooltip.opacity) > 0)) return false;
      const at = eventPosition(event, chart);
      return Boolean(at && [tooltip.x, tooltip.y, tooltip.width, tooltip.height]
        .every(Number.isFinite) && at.x >= tooltip.x && at.x <= tooltip.x + tooltip.width &&
        at.y >= tooltip.y && at.y <= tooltip.y + tooltip.height);
    }
    function isDataPress(event, chart) {
      // Specialist charts can supply a custom hit test (e.g. a trend line).
      if (typeof options.isDataPress === 'function')
        return Boolean(options.isDataPress(event, chart));
      if (typeof chart?.getElementsAtEventForMode !== 'function') return false;
      try {
        return chart.getElementsAtEventForMode(event, 'nearest',
          {intersect: true, axis: 'xy', includeInvisible: false}, false).length > 0;
      } catch (_) { return false; }
    }
    function hasTooltip(chart) {
      if (controller?.isPinned?.()) return true;
      if (controller?.getElements?.().length) return true;
      const tip = chart?.tooltip;
      if (!tip) return false;
      return Boolean(tip.getActiveElements?.().length || tip._active?.length || tip.opacity > 0);
    }
    function clear() {
      if (destroyed) return false;
      const chart = getChart();
      if (!chart) return false;
      if (!hasTooltip(chart)) return false;
      // force=true dismisses an explicitly pinned tip as well.
      controller?.clear?.(true);
      chart.setActiveElements?.([]);
      chart.tooltip?.setActiveElements?.([], {x: 0, y: 0});
      chart.update?.('none');
      if (!chart.update) chart.draw?.();
      options.onDismiss?.(chart);
      return true;
    }
    function handlePress(event) {
      if (destroyed) return;
      const chart = getChart();
      if (!chart) return;
      const onCanvas = event.target === canvas || canvas.contains?.(event.target);
      // Keep tooltip-text taps working as in the existing PFF core.
      if (onCanvas && options.keepTooltipPress !== false && insideTooltip(event, chart)) return;
      if (onCanvas && isDataPress(event, chart)) return;
      clear();
    }
    function preserveTooltipPress(event) {
      const chart = getChart();
      if (!chart || options.keepTooltipPress === false ||
          typeof chart.options?.onClick === 'function' || !insideTooltip(event, chart)) return;
      if (event.cancelable) event.preventDefault();
      event.stopImmediatePropagation?.();
    }
    const handleEscape = event => { if (event.key === 'Escape') clear(); };
    // pointerdown covers mouse, pen, and touch. The click fallback also covers
    // keyboard/assistive-technology activation and late Chart.js click updates.
    doc.addEventListener('pointerdown', handlePress, true);
    doc.addEventListener('click', handlePress, false);
    doc.addEventListener('keydown', handleEscape, true);
    canvas.addEventListener('click', preserveTooltipPress, true);
    canvas.addEventListener('touchstart', preserveTooltipPress, {capture: true, passive: false});
    canvas.addEventListener('contextmenu', prevent);
    canvas.addEventListener('selectstart', prevent);
    const api = {
      clear,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        doc.removeEventListener('pointerdown', handlePress, true);
        doc.removeEventListener('click', handlePress, false);
        doc.removeEventListener('keydown', handleEscape, true);
        canvas.removeEventListener('click', preserveTooltipPress, true);
        canvas.removeEventListener('touchstart', preserveTooltipPress, true);
        canvas.removeEventListener('contextmenu', prevent);
        canvas.removeEventListener('selectstart', prevent);
        if (dismissalBindings.get(canvas) === api) dismissalBindings.delete(canvas);
      }
    };
    dismissalBindings.set(canvas, api);
    return api;
  }

  modules.chartTooltips = Object.freeze({
    version: VERSION, tokens: TOKENS, tooltipOptions, interactionOptions,
    chartOptions, subtleEmphasisOptions, preserveBarHoverAppearance, createHoverController, bindDismissOnOutside
  });
})(typeof window !== 'undefined' ? window : globalThis);
