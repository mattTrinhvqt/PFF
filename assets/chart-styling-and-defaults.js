/*
 * PFF visual module: chart-styling-and-defaults.js
 * Version: 1.0.0-candidate.1 — approval demo, no production migrations.
 * Baseline: the existing PFF Lato/ink/neutral palette and the faint major/minor
 * Chart.js gridlines in job-tracker graphs. User chose consistent grid treatment.
 *
 * Scoping:
 * - Chart.js 4 Cartesian chart *configuration* helpers, opt-in only.
 * - Does not change existing charts or Chart.defaults just by loading.
 * - Never changes axis bounds, ticks, tick callbacks, axis width, data,
 *   chart plugins, tooltip/legend, spine plugins or animations.
 * - No dependencies on pff_loader.js, data fetching or caching.
 */
(function (global) {
  'use strict';
  const root = global.PFFModules || (global.PFFModules = {});
  const settings = root.settings || null;
  const PALETTE = Object.freeze({
    ink: '#151515', secondary: '#69718a', gridMajor: 'rgba(105, 113, 138, 0.075)',
    gridMinor: 'rgba(105, 113, 138, 0.035)', border: '#e8eaf0',
    surface: '#ffffff', purple: '#6600ff'
  });
  const TYPOGRAPHY = Object.freeze({
    family: 'Lato, Arial, sans-serif',
    axisLabel: Object.freeze({desktop: 10, mobile: 9, weight: '400'}),
    axisTitle: Object.freeze({desktop: 13, mobile: 12, weight: '700'})
  });
  const VERSION = '1.0.0-candidate.1';

  function isPlainObject(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
  }
  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (!isPlainObject(value)) return value;
    const out = {};
    for (const key of Object.keys(value)) out[key] = clone(value[key]);
    return out;
  }
  function merge(base, additions) {
    const out = clone(base);
    if (!isPlainObject(additions)) return out;
    for (const [key, value] of Object.entries(additions)) {
      out[key] = isPlainObject(value) && isPlainObject(out[key])
        ? merge(out[key], value) : clone(value);
    }
    return out;
  }
  function isMobile() {
    if (typeof settings?.mobileLayout === 'function') return settings.mobileLayout();
    const breakpoint = settings?.defaults?.mobileBreakpoint ?? 430;
    return typeof global.innerWidth === 'number' && global.innerWidth <= breakpoint;
  }
  function font(size, weight) {
    return {family: TYPOGRAPHY.family, size, weight};
  }
  function getTokens() {
    return {palette: {...PALETTE}, typography: clone(TYPOGRAPHY), mobile: isMobile()};
  }
  function gridColor(context) {
    return context?.tick?.minor === true ? PALETTE.gridMinor : PALETTE.gridMajor;
  }
  function gridLineWidth(context) {
    return context?.tick?.minor === true ? 0.7 : 1;
  }
  // Value-axis gridlines only: y on vertical charts, x on horizontal bars.
  // This is a consistent rule across cartesian charts, avoiding crosshatching.
  function standardGrid(axisIsPrimaryValue) {
    return axisIsPrimaryValue ? {
      display: true, drawOnChartArea: true,
      color: gridColor, lineWidth: gridLineWidth
    } : {drawOnChartArea: false};
  }
  function getAxisTypography(title = false) {
    const mobile = isMobile();
    const specimen = title ? TYPOGRAPHY.axisTitle : TYPOGRAPHY.axisLabel;
    return font(mobile ? specimen.mobile : specimen.desktop, specimen.weight);
  }
  function getChartBaseOptions(overrides = {}) {
    const mobile = isMobile();
    const base = {
      responsive: true, maintainAspectRatio: false,
      layout: {padding: {top: mobile ? 8 : 9, right: 4, bottom: 0, left: 0}}
    };
    // No changes to animation durations, axes, labels, legend or tooltip.
    return merge(base, overrides);
  }
  function primaryAxisIds(scales, valueAxis) {
    // Prefer an exact "x"/"y" scale, then the first non-hidden matching axis.
    // Secondary axes must not draw duplicate chart-area gridlines.
    const ids = Object.keys(scales).filter(id => {
      const s = scales[id];
      const axis = s?.axis || (id[0] === 'x' ? 'x' : id[0] === 'y' ? 'y' : '');
      return axis === valueAxis && s?.display !== false;
    });
    return [ids.includes(valueAxis) ? valueAxis : ids[0] || null];
  }
  function withUnifiedCartesianGrid(scales = {}, options = {}) {
    const horizontal = options.horizontal === true;
    const valueAxis = horizontal ? 'x' : 'y';
    const next = clone(isPlainObject(scales) ? scales : {});
    if (!Object.keys(next).length) {
      next.x = {}; next.y = {};
    } else {
      if (!Object.keys(next).some(id => (next[id]?.axis || id[0]) === 'x')) next.x = {};
      if (!Object.keys(next).some(id => (next[id]?.axis || id[0]) === 'y')) next.y = {};
    }
    const [primary] = primaryAxisIds(next, valueAxis);
    for (const [id, scale] of Object.entries(next)) {
      const axis = scale.axis || (id[0] === 'x' ? 'x' : id[0] === 'y' ? 'y' : '');
      if (axis !== 'x' && axis !== 'y') continue;
      const isValue = id === primary && axis === valueAxis;
      const grid = merge(scale.grid || {}, standardGrid(isValue));
      // Existing tick marks (drawTicks/tickLength) and border/spines remain.
      const ticks = merge({color: PALETTE.ink, font: getAxisTypography()}, scale.ticks || {});
      const title = scale.title ? merge({color: PALETTE.ink, font: getAxisTypography(true)}, scale.title) : undefined;
      next[id] = {...scale, grid, ticks};
      if (title) next[id].title = title;
    }
    return next;
  }
  const CARTESIAN_TYPES = new Set(['bar', 'line', 'scatter', 'bubble']);
  function styleChartConfig(input = {}, opts = {}) {
    const result = clone(input);
    const type = String(result.type || '').toLowerCase();
    if (!CARTESIAN_TYPES.has(type) && opts.forceCartesian !== true) return result;
    result.options = merge(getChartBaseOptions(), result.options || {});
    const horizontal = result.options.indexAxis === 'y' || opts.horizontal === true;
    result.options.scales = withUnifiedCartesianGrid(result.options.scales, {horizontal});
    return result;
  }
  // Opt-in shared line and bar appearances. Never overwrite dataset specifics.
  function getLineStyle(overrides = {}) {
    return merge({borderWidth: 2.7, pointRadius: 2.7,
      pointHoverRadius: 4.4, tension: 0.16, fill: false}, overrides);
  }
  function getBarStyle(overrides = {}) {
    return merge({borderRadius: 3, borderSkipped: 'start', borderWidth: 0}, overrides);
  }
  function applyGlobalFontDefaults(ChartLib = global.Chart) {
    if (!ChartLib?.defaults) return false;
    if (!ChartLib.defaults.font) ChartLib.defaults.font = {};
    ChartLib.defaults.font.family = TYPOGRAPHY.family;
    ChartLib.defaults.color = PALETTE.ink;
    return true;
  }
  root.chartStyling = Object.freeze({
    version: VERSION,
    palette: PALETTE,
    typography: TYPOGRAPHY,
    getTokens,
    getAxisTypography,
    getChartBaseOptions,
    withUnifiedCartesianGrid,
    styleChartConfig,
    getLineStyle,
    getBarStyle,
    applyGlobalFontDefaults
  });
})(typeof window !== 'undefined' ? window : globalThis);
