/*
 * PFF chart axes and ticks — v2.1.0-candidate.1
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
  const VERSION = '2.1.0-candidate.1';
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
    tickLength: 6,
    minorTickLength: 2,
    tickWidth: 1,
    minorTickWidth: 0.7,
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
    if (options.xTicks === true) {
      scales.x = withXAxisTickMarks(scales.x, {yearMode: options.yearMode || 'even', isMajor: options.isMajor});
    }
    if (options.yTicks === true) {
      scales.y = withYAxisTickMarks(scales.y, {isMajor: options.yIsMajor});
    }
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
  // Real PFF precedent: practice_landscape.html (numeric X axis),
  // permanent_uncompensated_graph.html and job-tracker graphs use visible
  // major/minor tick marks. A 6 px / 2 px convention also appears repeatedly.
  function tickMarkStyle(major = true) {
    return {
      length: major ? DEFAULTS.tickLength : DEFAULTS.minorTickLength,
      width: major ? DEFAULTS.tickWidth : DEFAULTS.minorTickWidth,
      color: DEFAULTS.ink
    };
  }
  function yearTickDefinitions(years = [], options = {}) {
    const mode = options.mode || 'even';
    const labels = yearLabels(years, {mode});
    return years.map((raw, index) => {
      const year = Number(raw);
      const major = Boolean(labels[index]);
      return {
        year, index, major, label: labels[index] || '',
        ratio: years.length > 1 ? index / (years.length - 1) : 0,
        ...tickMarkStyle(major)
      };
    });
  }
  // A labelled tick is a major tick, regardless of its index, year parity
  // or the tick-generation cadence. Blank/missing labels are minor ticks.
  // Chart.js supplies the final rendered label at context.tick.label.
  function hasVisibleLabel(label) {
    if (Array.isArray(label)) return label.some(hasVisibleLabel);
    return label != null && String(label).trim().length > 0;
  }
  function isMajorTick(context, options = {}, sourceScale = {}) {
    if (typeof options.isMajor === 'function') return options.isMajor(context) !== false;
    const tick = context?.tick;
    if (context?.scale?.options?.ticks?.display === false) return false;
    if (tick && Object.prototype.hasOwnProperty.call(tick, 'label')) {
      return hasVisibleLabel(tick.label);
    }
    // Fallback for pre-render Chart.js contexts, tests or custom scale
    // integrations that have not yet populated tick.label.
    const scale = context?.scale;
    const callback = scale?.options?.ticks?.callback || sourceScale?.ticks?.callback;
    if (typeof callback === 'function') {
      try {
        return hasVisibleLabel(callback.call(scale || sourceScale,
          tick?.value, context?.index ?? 0, scale?.ticks || []));
      } catch (_) { /* Defer to explicit tick metadata or legacy fallback. */ }
    }
    if (typeof tick?.minor === 'boolean') return !tick.minor;
    if (typeof tick?.major === 'boolean') return tick.major;
    // Retain the existing year fallback only when the actual display label
    // and callback are unavailable; never override an explicit blank label.
    if (options.yearMode === 'even') {
      const raw = typeof scale?.getLabelForValue === 'function'
        ? scale.getLabelForValue(tick?.value) : tick?.value;
      if (/^\d{4}$/.test(String(raw))) return Number(raw) % 2 === 0;
    }
    return true;
  }
  // Opt-in tick-mark helper for either axis. Does not alter displayed labels,
  // callbacks, scale limits, gridline colours or chart animation timing.
  // Avoid applying it alongside a plugin that already draws axis tick marks.
  function withLabelDrivenTickMarks(scale = {}, options = {}) {
    const next = clone(plain(scale) ? scale : {});
    const priorGrid = next.grid || {};
    function markStyle(context) {
      return tickMarkStyle(isMajorTick(context, options, scale));
    }
    next.grid = {...priorGrid, drawTicks: true,
      tickLength(context) { return markStyle(context).length; },
      tickWidth(context) { return markStyle(context).width; },
      tickColor: DEFAULTS.ink
    };
    return next;
  }
  function withXAxisTickMarks(scale = {}, options = {}) {
    return withLabelDrivenTickMarks(scale, options);
  }
  function withYAxisTickMarks(scale = {}, options = {}) {
    return withLabelDrivenTickMarks(scale, options);
  }
  function easeInOutCubic(progress) {
    const t = clamp(finite(progress, 0), 0, 1);
    return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function niceMajorStep(roughStep) {
    const value = Math.max(finite(roughStep, 1), 1e-9);
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const candidates = [1, 2, 5, 10].map(factor => factor * magnitude);
    return candidates.reduce((best, candidate) =>
      Math.abs(Math.log(candidate / value)) < Math.abs(Math.log(best / value))
        ? candidate : best, candidates[0]);
  }
  function adaptiveMajorStep(maximum) {
    return niceMajorStep(Math.max(finite(maximum, 1), 1e-9) / 5);
  }
  function majorStepWithHysteresis(maximum, currentStep) {
    const max = Math.max(finite(maximum, 1), 1e-9);
    const step = Math.max(finite(currentStep, adaptiveMajorStep(max)), 1e-9);
    const divisions = max / step;
    return divisions >= 3.5 && divisions <= 6.5 ? step : adaptiveMajorStep(max);
  }
  function tickStepHandoffProgress(progress, expanding) {
    const p = clamp(finite(progress, 0), 0, 1);
    // practice_landscape.html brings the coarser labels in earlier when
    // expanding, and retains them longer when contracting.
    const local = expanding ? clamp(p / .34, 0, 1)
      : clamp((p - .58) / .42, 0, 1);
    return easeInOutCubic(local);
  }
  // Axis-frame coordinates stay fixed. Numeric X ticks can translate as the
  // displayed maximum interpolates; when the major step changes, old and
  // new tick paths overlap with alpha handoff so the X axis never blanks.
  // Return data only: renderer decides whether to draw SVG/Canvas/Chart.js.
  function animatedNumericTicks(fromMaximum, toMaximum, progress, options = {}) {
    const fromMax = Math.max(finite(fromMaximum, 1), 1e-9);
    const toMax = Math.max(finite(toMaximum, 1), 1e-9);
    const p = clamp(finite(progress, 0), 0, 1);
    const displayedMaximum = fromMax + (toMax - fromMax) * easeInOutCubic(p);
    const fromStep = Math.max(finite(options.fromStep, adaptiveMajorStep(fromMax)), 1e-9);
    const toStep = Math.max(finite(options.toStep, majorStepWithHysteresis(toMax, fromStep)), 1e-9);
    const stepsDiffer = Math.abs(fromStep - toStep) > Math.max(fromStep, toStep) * 1e-9;
    const overlap = stepsDiffer ? tickStepHandoffProgress(p, toMax > fromMax) : 1;
    const layers = stepsDiffer ? [
      {step: fromStep, maximum: fromMax, alpha: 1 - overlap},
      {step: toStep, maximum: toMax, alpha: overlap}
    ] : [{step: fromStep, maximum: Math.max(fromMax, toMax), alpha: 1}];
    const marks = new Map();
    for (const layer of layers) {
      if (layer.alpha <= 1e-4) continue;
      const step = layer.step / 2;
      const last = Math.min(layer.maximum, displayedMaximum);
      const count = Math.min(200, Math.floor((last + step * 1e-7) / step));
      for (let index = 0; index <= count; index++) {
        const value = Number((index * step).toPrecision(12));
        const major = index % 2 === 0;
        const key = value.toPrecision(12);
        const prior = marks.get(key) || {value, alpha: 0, majorAlpha: 0, minorAlpha: 0, labelAlpha: 0};
        prior.alpha = Math.min(1, prior.alpha + layer.alpha);
        if (major) {
          prior.majorAlpha += layer.alpha;
          prior.labelAlpha = Math.min(1, prior.labelAlpha + layer.alpha);
        } else prior.minorAlpha += layer.alpha;
        marks.set(key, prior);
      }
    }
    const ticks = [...marks.values()].sort((a, b) => a.value - b.value).map(tick => {
      const strength = tick.majorAlpha / Math.max(1e-9, tick.majorAlpha + tick.minorAlpha);
      return {...tick, ratio: tick.value / displayedMaximum,
        majorStrength: strength,
        length: DEFAULTS.minorTickLength +
          (DEFAULTS.tickLength - DEFAULTS.minorTickLength) * strength,
        width: DEFAULTS.minorTickWidth +
          (DEFAULTS.tickWidth - DEFAULTS.minorTickWidth) * strength};
    });
    return {displayedMaximum, fromStep, toStep, overlap, ticks};
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
    axisOptions, avoidDuplicateGrid, tickMarkStyle, yearTickDefinitions,
    hasVisibleLabel, isMajorTick, withLabelDrivenTickMarks,
    withXAxisTickMarks, withYAxisTickMarks, easeInOutCubic, niceMajorStep, adaptiveMajorStep,
    majorStepWithHysteresis, tickStepHandoffProgress, animatedNumericTicks
  });
})(typeof window !== 'undefined' ? window : globalThis);
