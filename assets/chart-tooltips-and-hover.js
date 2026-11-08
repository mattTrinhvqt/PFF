/* PFF charts: tooltips and hover, candidate v3, 2026-11-08.
 * Derived from the existing PFFCharts.tooltipOptions() / lineInteractionOptions()
 * and current graph-specific manual tooltip activation patterns.
 * Opt-in Chart.js configuration and interaction helpers. No global mutation,
 * data loading, chart rendering, or changes to existing production pages.
 */
(function (global) {
  'use strict';
  const modules = global.PFFModules || (global.PFFModules = {});
  const VERSION = '1.0.0-candidate.3';
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
  modules.chartTooltips = Object.freeze({
    version: VERSION, tokens: TOKENS, tooltipOptions, interactionOptions,
    chartOptions, subtleEmphasisOptions, preserveBarHoverAppearance, createHoverController
  });
})(typeof window !== 'undefined' ? window : globalThis);
