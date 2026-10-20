/*
 * colours-and-settings.js — State, rurality and employer colours; breakpoints and general configuration
 * Source: assets/pff_chart_core.js v1.2.20, with behaviour preserved.
 * Standalone classic script; does not load or alter the old PFF core.
 * Dedicated demo/checklist: ./0test.html
 */
(function (global) {
  'use strict';
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
  
    const STATE_COLOURS = Object.freeze({
      NSW: '#2db7f5',
      VIC: '#2d3a8c',
      QLD: '#7a0036',
      SA: '#f03a47',
      WA: '#000000',
      TAS: '#22a36b',
      NT: '#c25e00',
      ACT: '#7b61ff'
    });
  
    const MMM_COLOURS = Object.freeze({
      MM1: '#3f4851',
      MM2: '#4f1500',
      MM3: '#7e2800',
      MM4: '#a14216',
      MM5: '#c87452',
      MM6: '#e1b69a',
      MM7: '#f3e0d3'
    });
  const EMPLOYERS = Object.freeze([
    {
      key: 'toss',
      label: 'TOSS',
      fullName: 'The Optical Super Store',
      colour: '#ff2401',
      aliases: [
        'TOSS',
        'The Optical Superstore',
        'The Optical Super Store'
      ]
    },
  
    {
      key: 'th',
      label: 'TH',
      fullName: "Teacher's Health",
      colour: '#007781',
      aliases: [
        'TH',
        'THF',
        'Teachers Health',
        'Teachers Health Fund',
        "Teacher's Health",
        "Teacher's Health Fund",
        'Teacher’s Health Fund'
      ]
    },
  
    {
      key: 'costco',
      label: 'Costco',
      fullName: 'Costco Optical',
      colour: '#e32a36',
      aliases: [
        'Costco',
        'Costco Optical'
      ]
    },
  
    {
      key: 'ow',
      label: 'OW',
      fullName: 'Oscar Wylee',
      colour: '#f16c20',
      aliases: [
        'OW',
        'Oscar Wylee'
      ]
    },
  
    {
      key: 'bn',
      label: 'BN',
      fullName: 'Bailey Nelson',
      colour: '#002e5a',
      aliases: [
        'BN',
        'Bailey Nelson'
      ]
    },
  
    {
      key: '1001',
      label: '1001',
      fullName: '1001 Optometry',
      colour: '#000000',
      aliases: [
        '1001',
        '1001 Optometry'
      ]
    },
  
    {
      key: 'cw',
      label: 'CW',
      fullName: 'Chemist Warehouse Optometry',
      colour: '#ea0f0f',
      aliases: [
        'CW',
        'Chemist Warehouse',
        'Chemist Warehouse Optometry',
        'Chemist/Optometrist Warehouse'
      ]
    },
  
    {
      key: 'indie',
      label: 'Indie',
      fullName: 'Independent',
      colour: '#5a3be7',
      aliases: [
        'Indie',
        'Independent'
      ]
    },
  
    {
      key: 'hcf',
      label: 'HCF',
      fullName: 'HCF Eyecare',
      colour: '#da1c5c',
      aliases: [
        'HCF',
        'HCF Eyecare'
      ]
    },
  
    {
      key: 'ophthal',
      label: 'Ophthal',
      fullName: 'Ophthalmologist',
      colour: '#ffb000',
      aliases: [
        'Ophthal',
        'Ophthalmologist'
      ]
    },
  
    {
      key: 'toc',
      label: 'TOC',
      fullName: 'The Optical Company',
      colour: '#13543c',
      aliases: [
        'NIB',
        'TOC',
        'The Optical Company',
        'The Optical Company (incl. NIB)',
        'NIB (incl. the Optical Company)'
      ]
    },
  
    {
      key: 'ss',
      label: 'SS',
      fullName: 'Specsavers',
      colour: '#009552',
      aliases: [
        'SS',
        'Specsavers'
      ]
    },
  
    {
      key: 'bupa',
      label: 'Bupa',
      fullName: 'Bupa Optical',
      colour: '#0075c2',
      aliases: [
        'Bupa',
        'Bupa Optical'
      ]
    },
  
    {
      key: 'other',
      label: 'Other',
      fullName: 'Other',
      colour: '#bfc3c7',
      aliases: [
        'Other',
        'Other (e.g., uni, hospital, govt, not-for-profit)'
      ]
    },
  
    {
      key: 'opsm',
      label: 'OPSM',
      fullName: 'OPSM',
      colour: '#6fb0d4',
      aliases: [
        'OPSM',
        'OPSM (incl. L&P, EyeQ)'
      ]
    },
  
    {
      key: 'dresden',
      label: 'Dresden',
      fullName: 'Dresden Vision',
      colour: '#999999',
      aliases: [
        'Dresden',
        'Dresden Vision'
      ]
    },
  
    {
      key: 'obnp',
      label: 'ObNP',
      fullName: 'Optical by National Pharmacies',
      colour: '#2cb4a6',
      aliases: [
        'ObNP',
        'Optical by National Pharmacies'
      ]
    },
  
    {
      key: 'gm',
      label: 'G&M',
      fullName: 'George & Matilda Eyecare',
      colour: '#000000',
      aliases: [
        'G&M',
        'George & Matilda',
        'George & Matilda Eyecare'
      ]
    },
  
    {
      key: 'eyeconcepts',
      label: 'Eye Concepts',
      fullName: 'Eye Concepts',
      colour: '#434343',
      aliases: [
        'Eye Concepts',
        'EyeConcepts'
      ]
    },
  
    {
      key: 'icontact',
      label: 'iContact',
      fullName: 'iContact',
      colour: '#f78a22',
      aliases: [
        'iContact',
        'IContact',
        'i Contact'
      ]
    }
  ].map(employer =>
    Object.freeze({
      ...employer,
      aliases: Object.freeze(
        employer.aliases.slice()
      )
    })
  ));

  function cleanText(value) {
      return String(value ?? '').replace(/\s+/g, ' ').trim();
    }

  function normaliseText(value) {
      return cleanText(value)
        .replace(/[’‘]/g, "'")
        .toLowerCase();
    }

  function normaliseEmployerText(value) {
    return normaliseText(value)
      .replace(/[’']/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function resolveEmployer(value) {
    const normalised =
      normaliseEmployerText(value);
  
    if (!normalised) {
      return null;
    }
  
    const tokens =
      new Set(
        normalised.split(' ')
      );
  
    return (
      EMPLOYERS.find(employer =>
        employer.aliases.some(alias => {
          const candidate =
            normaliseEmployerText(alias);
  
          if (!candidate) {
            return false;
          }
  
          /*
           * Short aliases such as SS, OW and BN should
           * match whole tokens only. This prevents, for
           * example, "ss" matching an unrelated word.
           */
          if (candidate.length <= 3) {
            return (
              normalised === candidate ||
              tokens.has(candidate)
            );
          }
  
          return (
            normalised === candidate ||
            normalised.includes(candidate)
          );
        })
      ) ||
      null
    );
  }

  function getEmployerAppearance(
    value,
    options = {}
  ) {
    const matched =
      resolveEmployer(value);
  
    if (matched) {
      return {
        key: matched.key,
        label: matched.label,
        fullName: matched.fullName,
        colour: matched.colour,
        matched: true
      };
    }
  
    const fallbackLabel =
      cleanText(
        options.fallbackLabel ?? value
      ) ||
      'Other';
  
    return {
      key: 'unknown',
      label: fallbackLabel,
      fullName: fallbackLabel,
      colour:
        options.fallbackColour ||
        '#777777',
      matched: false
    };
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

  function reducedMotion() {
      return global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    }

  function mobileLayout() {
      return global.innerWidth <= DEFAULTS.mobileBreakpoint;
    }

  function smallLayout() {
      return global.innerWidth <= DEFAULTS.smallBreakpoint;
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
  const modules = global.PFFModules || (global.PFFModules = {});
  if (modules.settings) {
    console.warn('[PFF Modules] settings already loaded; replacing its namespace');
  }
  modules.settings = Object.freeze({
    version: '0.1.0',
    defaults: DEFAULTS,
    stateColours: STATE_COLOURS,
    mmmColours: MMM_COLOURS,
    employers: EMPLOYERS,
    resolveEmployer,
    getEmployerAppearance,
    cssVar,
    clamp,
    reducedMotion,
    mobileLayout,
    smallLayout,
    deepMerge,
    rgba,
  });
})(window);
