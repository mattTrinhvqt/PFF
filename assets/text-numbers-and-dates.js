/**
 * PFF Module 2 — Text, numbers and dates
 * Extracted from assets/pff_chart_core.js (current repository baseline, 2026-11-03).
 *
 * Public API: window.PFFModules.text
 *
 * Deliberate candidate correction for approval:
 * - parseDateUtc() recognises a 4-digit Australian year before a 2-digit year.
 *   This fixes the current core behaviour where 03/11/2026 is read as 03/11/2020.
 */
(function (global) {
  'use strict';

  const root = global.PFFModules = global.PFFModules || {};
  const settings = root.settings || {};

  function cleanText(value) {
    if (typeof settings.cleanText === 'function') {
      return settings.cleanText(value);
    }
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function normaliseText(value) {
    if (typeof settings.normaliseText === 'function') {
      return settings.normaliseText(value);
    }
    return cleanText(value)
      .replace(/[’‘]/g, "'")
      .toLowerCase();
  }

  function clamp(value, minimum, maximum) {
    if (typeof settings.clamp === 'function') {
      return settings.clamp(value, minimum, maximum);
    }
    return Math.min(maximum, Math.max(minimum, value));
  }

  function toNumber(value) {
    const cleaned = cleanText(value)
      .replace(/[^\d.-]/g, '');

    if (!cleaned || !/\d/.test(cleaned)) {
      return NaN;
    }

    const number = Number(cleaned);
    return Number.isFinite(number) ? number : NaN;
  }

  function numericCell(cell) {
    if (!cell || cell.v === null || cell.v === undefined || cell.v === '') {
      return NaN;
    }

    if (typeof cell.v === 'number' && Number.isFinite(cell.v)) {
      return cell.v;
    }

    const cleaned = cleanText(cell.f ?? cell.v)
      .replace(/,/g, '')
      .replace(/[^\d.-]/g, '');

    if (!cleaned || !/\d/.test(cleaned)) {
      return NaN;
    }

    const value = Number(cleaned);
    return Number.isFinite(value) ? value : NaN;
  }

  function cellValue(cell) {
    return cell?.v ?? cell?.f ?? '';
  }

  function cellDisplayValue(cell) {
    return String(cell?.f ?? cell?.v ?? '').trim();
  }

  function parsePercentCell(cell) {
    const formatted = cleanText(cell?.f);

    if (formatted.includes('%')) {
      const number = toNumber(formatted);
      return Number.isFinite(number) ? clamp(number, 0, 100) : NaN;
    }

    const number = toNumber(cell?.v ?? cell?.f);
    if (!Number.isFinite(number)) {
      return NaN;
    }

    const percentage = number > 0 && number < 1 ? number * 100 : number;
    return clamp(percentage, 0, 100);
  }

  function parseDateUtc(value) {
    const dayMs = 86400000;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
    }

    if (typeof value === 'number' && value > 20000 && value < 80000) {
      return Date.UTC(1899, 11, 30) + value * dayMs;
    }

    const text = cleanText(value);
    if (!text) {
      return null;
    }

    const googleDate = text.match(/^Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})/);
    if (googleDate) {
      return Date.UTC(Number(googleDate[1]), Number(googleDate[2]), Number(googleDate[3]));
    }

    // Candidate correction for Module 2 approval:
    // four digits must be attempted before two digits.
    const auDate = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4}|\d{2})/);
    if (auDate) {
      let year = Number(auDate[3]);
      if (year < 100) {
        year += 2000;
      }
      return Date.UTC(year, Number(auDate[2]) - 1, Number(auDate[1]));
    }

    const isoDate = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoDate) {
      return Date.UTC(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime())
      ? null
      : Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  function formatFinancialYear(startYear) {
    const year = Number(startYear);
    if (!Number.isInteger(year)) {
      return '';
    }
    return `FY${year}–${String(year + 1).slice(-2)}`;
  }

  function getCurrentFinancialYearWindow(options = {}) {
    const timeZone = options.timeZone || 'Australia/Sydney';
    const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());

    const parts = new Intl.DateTimeFormat('en-AU', {
      timeZone,
      year: 'numeric',
      month: 'numeric'
    }).formatToParts(now);

    const year = Number(parts.find(part => part.type === 'year')?.value);
    const month = Number(parts.find(part => part.type === 'month')?.value);
    const startYear = month >= 7 ? year : year - 1;

    return {
      startYear,
      start: Date.UTC(startYear, 6, 1),
      end: Date.UTC(startYear + 1, 6, 1),
      label: formatFinancialYear(startYear)
    };
  }

  function formatInteger(value) {
    const number = Number(value);
    return Number.isFinite(number)
      ? Math.round(number).toLocaleString('en-AU')
      : '—';
  }

  function formatOneDecimal(value) {
    const number = Number(value);
    return Number.isFinite(number)
      ? number.toLocaleString('en-AU', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 1
        })
      : '—';
  }

  function formatNumber(value, maximumFractionDigits = 1) {
    const number = Number(value);
    return Number.isFinite(number)
      ? new Intl.NumberFormat('en-AU', {
          maximumFractionDigits: Math.max(0, Math.round(Number(maximumFractionDigits) || 0))
        }).format(number)
      : '—';
  }

  function formatCompactNumber(value, options = {}) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return options.invalid ?? '—';
    }

    const absolute = Math.abs(number);
    const millionThreshold = Number(options.millionThreshold ?? 1000000);
    const thousandThreshold = Number(options.thousandThreshold ?? 1000);
    const millionDecimals = Math.max(0, Math.round(Number(options.millionDecimals ?? 1) || 0));
    const thousandDecimals = Math.max(0, Math.round(Number(options.thousandDecimals ?? 1) || 0));

    if (absolute >= millionThreshold) {
      return `${formatNumber(number / 1000000, millionDecimals)}m`;
    }
    if (absolute >= thousandThreshold) {
      return `${formatNumber(number / 1000, thousandDecimals)}k`;
    }
    return formatNumber(number, Math.max(0, Math.round(Number(options.decimals ?? 0) || 0)));
  }

  function formatPercent(value, decimals = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return '—';
    }

    const places = Math.max(0, Math.round(Number(decimals) || 0));
    return `${number.toLocaleString('en-AU', {
      minimumFractionDigits: places,
      maximumFractionDigits: places
    })}%`;
  }

  function formatCurrency(value, options = {}) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return '—';
    }

    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: options.currency || 'AUD',
      minimumFractionDigits: options.minimumFractionDigits ?? 0,
      maximumFractionDigits: options.maximumFractionDigits ?? 0
    }).format(number);
  }

  function formatHours(value, decimals = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return '—';
    }

    const places = Math.max(0, Math.round(Number(decimals) || 0));
    return `${number.toLocaleString('en-AU', {
      minimumFractionDigits: places,
      maximumFractionDigits: places
    })} hrs`;
  }

  function formatDate(value, options = {}) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('en-AU', {
      day: options.day || 'numeric',
      month: options.month || 'short',
      year: options.year === false ? undefined : (options.year || 'numeric'),
      timeZone: options.timeZone || undefined
    }).format(date);
  }

  function formatQuarterTick(timestamp) {
    const date = new Date(Number(timestamp));
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const month = date.getUTCMonth();
    return [0, 3, 6, 9].includes(month)
      ? `${String(month + 1).padStart(2, '0')}/${date.getUTCFullYear()}`
      : '';
  }

  function formatExperienceBand(value) {
    const experience = Number(value);
    if (!Number.isFinite(experience) || experience < 0) {
      return 'Unspecified';
    }
    if (experience >= 20) {
      return '20+ years';
    }

    const lower = Math.floor(experience / 5) * 5;
    const upper = lower + 4;
    return `${lower}–${upper} years`;
  }

  root.text = Object.freeze({
    version: '2.0.0-candidate.1',
    cleanText,
    normaliseText,
    toNumber,
    numericCell,
    cellValue,
    cellDisplayValue,
    parsePercentCell,
    parseDateUtc,
    formatFinancialYear,
    getCurrentFinancialYearWindow,
    formatInteger,
    formatOneDecimal,
    formatNumber,
    formatCompactNumber,
    formatPercent,
    formatCurrency,
    formatHours,
    formatDate,
    formatQuarterTick,
    formatExperienceBand
  });
})(window);
