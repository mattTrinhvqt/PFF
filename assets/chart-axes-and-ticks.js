/*
 * PFF chart axes and ticks — v1.0.0-candidate.1
 * Shared opt-in presentation helpers. No automatic global Chart.js changes.
 * Extracted from PFF core's stable axis fitting, year cadence and tick ratios.
 * Leaves data bounds, Chart.js built-in ticks, custom axis-drawing plugins,
 * major/minor gridlines, hover, animations, loader and data sources untouched.
 * A chart that uses PFFCharts.createUnifiedYAxis() must keep its native
 * axis ticks/grid hidden to avoid duplicate labels and gridlines.
 */
(function (global) {
  'use strict';
  const root = global.PFFModules || (global.PFFModules = {});
  const VERSION = '1.0.0-candidate.1';
  const DEFAULTS = Object.freeze({
    mobileBreakpoint: 430,
    seriesGutterDesktop: 69,
    seriesGutterMobile: 61,
    categoryGutterDesktop: 112,
    categoryGutterMobile: 94,
    axisLabelDesktop: 12,
    axisLabelMobile: 11,
    yearDesktop: 10,
    yearMobile: 9,
    yearTitleDesktop: 13,
    yearTitleMobile: 12,
    majorIntervals: 4,
    tickLength: 5,
    tickTextGap: 8,
    ink: '#151515',
    muted: '#69718a',
    font: 'Lato'
  });
  function plain(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (!plain(value)) return value;
    const out = {};
    for (const key of Object.keys(value)) out[key] = clone(value[key]);
    return out;
  }
  function merge(a, b) {
    const out = clone(plain(a) ? a : {});
    if (!plain(b)) return out;
    for (const [key, value] of Object.entries(b)) {
      out[key] = plain(value) && plain(out[key]) ? merge(out[key], value) : clone(value);
    }
    return out;
  }
  function finite(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  function clamp(x, a, b) { return Math.min(Math.max(x, a), b); }
  function mobileLayout(override) {
    if (typeof override === 'boolean') return override;
    if (root.settings?.mobileLayout) return !!root.settings.mobileLayout();
    return finite(global.innerWidth, 1024) <= DEFAULTS.mobileBreakpoint;
  }
  function font(kind = 'tick', options = {}) {
    const mobile = mobileLayout(options.mobile);
    const size = kind === 'year' ? (mobile ? DEFAULTS.yearMobile : DEFAULTS.yearDesktop)
      : kind === 'title' ? (mobile ? DEFAULTS.yearTitleMobile : DEFAULTS.yearTitleDesktop)
      : (mobile ? DEFAULTS.axisLabelMobile : DEFAULTS.axisLabelDesktop);
    return { family: DEFAULTS.font, size, weight: kind === 'title' ? '700' : '400' };
  }
  function gutter(options = {}) {
    const mobile = mobileLayout(options.mobile);
    if (options.width != null) return Math.max(0, finite(options.width, 0));
    const category = options.kind === 'category';
    return category
      ? (mobile ? DEFAULTS.categoryGutterMobile : DEFAULTS.categoryGutterDesktop)
      : (mobile ? DEFAULTS.seriesGutterMobile : DEFAULTS.seriesGutterDesktop);
  }
  function lockAxisWidth(existingAfterFit, options = {}) {
    const fixed = gutter(options);
    return function stableAxisAfterFit(axis) {
      if (typeof existingAfterFit === 'function') existingAfterFit.call(this, axis);
      if (axis && typeof axis === 'object') {
        if (options.axis === 'x' || options.dimension === 'height') axis.height = fixed;
        else axis.width = fixed;
      }
    };
  }
  function withStableAxis(scale = {}, options = {}) {
    const out = clone(plain(scale) ? scale : {});
    const prior = scale.afterFit;
    out.afterFit = lockAxisWidth(prior, options);
    return out;
  }
  // Value-axis custom drawing uses user-provided bounds; do not round or coerce
  // those bounds to "nice" numbers or change zero baselines.
  function normaliseScale(scale = {}) {
    const min = finite(scale.min, 0);
    const candidate = finite(scale.max, min + 1);
    const max = candidate > min ? candidate : min + 1;
    const intervals = clamp(Math.round(finite(scale.intervals, DEFAULTS.majorIntervals)), 1, 25);
    return {min, max, intervals, step: (max - min) / intervals};
  }
  function tickDefinitions(scale, kind = 'major') {
    const s = normaliseScale(scale);
    if (kind === 'minor') return Array.from({length: s.intervals}, (_, index) => ({
      value: s.min + (index + .5) * s.step,
      ratio: (index + .5) / s.intervals,
      kind: 'minor'
    }));
    return Array.from({length: s.intervals + 1}, (_, index) => ({
      value: s.min + index * s.step,
      ratio: index / s.intervals,
      kind: 'major'
    }));
  }
  function ratio(value, scale) {
    const s = normaliseScale(scale);
    return (finite(value, s.min) - s.min) / (s.max - s.min);
  }
  function formatValue(value, options = {}) {
    const digits = clamp(Math.round(finite(options.decimals, 0)), 0, 8);
    const scale = options.scale === 'K' ? 1000 : options.scale === 'M' ? 1e6 : 1;
    const prefix = String(options.prefix ?? '');
    const suffix = String(options.suffix ?? (scale === 1000 ? 'K' : scale === 1e6 ? 'M' : ''));
    const n = finite(value, NaN);
    if (!Number.isFinite(n)) return String(options.fallback ?? '–');
    const scaled = Object.is(n, -0) || Math.abs(n) < 0.5 * Math.pow(10, -digits) * scale ? 0 : n / scale;
    const text = scaled.toLocaleString('en-AU', {minimumFractionDigits: digits, maximumFractionDigits: digits});
    return prefix + text + suffix;
  }
  function yearLabels(years = [], options = {}) {
    const mode = options.mode || 'even'; // Existing PFF time-series default
    const clean = [...years].map(v => Number(v)).filter(Number.isInteger);
    if (!clean.length) return [];
    const first = clean[0], last = clean[clean.length - 1];
    return clean.map(y => {
      if (mode === 'all') return String(y);
      if (mode === 'endpoints') return y === first || y === last ? String(y) : '';
      if (mode === 'auto') return clean.length <= 6 || y % 2 === 0 ? String(y) : '';
      return y % 2 === 0 ? String(y) : '';
    });
  }
  function axisOptions(options = {}) {
    const yearMode = options.yearMode || 'even';
    const horizontal = options.horizontal === true;
    const valueId = options.valueId || (horizontal ? 'x' : 'y');
    const categoryId = options.categoryId || (horizontal ? 'y' : 'x');
    const scales = clone(options.scales || {});
    // Opt-in preservation of current afterFit callbacks; don't touch category
    // labels, bounds, callbacks, or the separately approved gridline styling.
    if (!scales[valueId]) scales[valueId] = {};
    if (!scales[categoryId]) scales[categoryId] = {};
    const target = horizontal ? categoryId : valueId;
    scales[target] = withStableAxis(scales[target], {
      axis: target,
      width: options.width,
      kind: horizontal ? 'category' : 'series',
      mobile: options.mobile
    });
    if (options.addYearLabels && !horizontal) {
      const x = scales[categoryId];
      const original = x.ticks?.callback;
      x.ticks = merge(x.ticks || {}, {
        maxRotation: 0,
        minRotation: 0,
        autoSkip: false,
        font: font('year', options),
        callback(value, index, ticks) {
          if (typeof original === 'function' && options.preserveTickCallback !== false) {
            return original.call(this, value, index, ticks);
          }
          const label = typeof this?.getLabelForValue === 'function'
            ? this.getLabelForValue(value) : String(value);
          const year = Number(label);
          if (yearMode === 'endpoints') {
            const all = typeof this?.getLabels === 'function' ? this.getLabels().map(Number) : [];
            return yearLabels(all, {mode: 'endpoints'})[Number(value)] || '';
          }
          return yearLabels([year], {mode: yearMode})[0] || '';
        }
      });
    }
    return scales;
  }
  function isGridFromCustomAxis(config) {
    return config?.customAxisDrawsGrid === true;
  }
  function avoidDuplicateGrid(scales = {}, options = {}) {
    // Charts using PFFCharts.createUnifiedYAxis already draw their own faint
    // major/minor gridlines. Don't overlay Chart.js grid a second time.
    const out = clone(scales);
    if (isGridFromCustomAxis(options)) {
      const id = options.valueId || (options.horizontal ? 'x' : 'y');
      out[id] = out[id] || {};
      out[id].grid = merge(out[id].grid || {}, {
        display: false, drawOnChartArea: false
      });
    }
    return out;
  }
  root.chartAxes = Object.freeze({
    version: VERSION,
    defaults: DEFAULTS,
    mobileLayout, font, gutter, lockAxisWidth, withStableAxis,
    normaliseScale, tickDefinitions, ratio, formatValue, yearLabels,
    axisOptions, avoidDuplicateGrid
  });
})(typeof window !== 'undefined' ? window : globalThis);
