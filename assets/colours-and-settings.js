/*
 * colours-and-settings.js — State, rurality and employer colours; breakpoints and general configuration
 * Source: assets/pff_chart_core.js v1.2.20, extended with PFF data-source labels.
 * All original colour assignments preserved; new groups use neutral pending approval.
 * Standalone classic script; does not load or alter the old PFF core.
 * Dedicated demo/checklist: ../0test.html
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
        'The Optical Super Store',
        'Optical Superstore',
        'Optical Super Store'
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
        'Teacher’s Health Fund',
        'Teachers Health Group',
        'Teachers Health Centre'
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
        'HCF Eyecare',
        'HCF Eyecare Centres'
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
        'NIB (incl. the Optical Company)',
        'nib Eye Care Centre',
        'nib Eyecare',
        'The Optical Co',
        'Kevin Paisley Optometrists',
        'Stacey & Stacey Optometrists',
        'Kosmac & Clemens Optometrists',
        'Shire Optometrists'
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
      parentGroup: 'EssilorLuxottica',
      label: 'OPSM',
      fullName: 'OPSM',
      colour: '#6fb0d4',
      aliases: [
        'OPSM',
        'OPSM (incl. L&P, EyeQ)',
        'EssilorLuxottica',
        'Essilor Luxottica',
        'Essilor-Luxottica',
        'Luxottica',
        'Luxottica Retail Australia',
        'Lux',
        'L&P',
        'Laubman & Pank',
        'Laubman and Pank',
        'Laubman&Pank',
        'Laubman Pank',
        'EyeQ',
        'Eye Q',
        'EyeQ Optometrists'
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
        'Optical by National Pharmacies',
        'National Pharmacies'
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
        'i Contact',
        'iContact Optometrists'
      ]
    },

    {
      key: "provision",
      label: "ProVision",
      fullName: "ProVision",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Independent network",
      aliases: ["ProVision", "Pro Vision"]
    },

    {
      key: "eyecareplus",
      label: "Eyecare Plus",
      fullName: "Eyecare Plus",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Independent network",
      aliases: ["Eyecare Plus", "Eye Care Plus"]
    },

    {
      key: "options",
      label: "Options Optometrists",
      fullName: "Options Optometrists",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["Options Optometrists", "Options Optical"]
    },

    {
      key: "quinn",
      label: "Quinn & Co. Eyecare",
      fullName: "Quinn & Co. Eyecare",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["Quinn & Co. Eyecare", "Quinn and Co Eyecare"]
    },

    {
      key: "visionaustralia",
      label: "Vision Australia",
      fullName: "Vision Australia",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Community provider",
      aliases: ["Vision Australia"]
    },

    {
      key: "totaleyecare",
      label: "Total Eyecare",
      fullName: "Total Eyecare",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["Total Eyecare"]
    },

    {
      key: "specsplus",
      label: "SpecsPlus",
      fullName: "SpecsPlus",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["SpecsPlus", "Specs Plus"]
    },

    {
      key: "healthpartners",
      label: "Health Partners",
      fullName: "Health Partners",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Health fund/service",
      aliases: ["Health Partners", "Health Partners Optical"]
    },

    {
      key: "eyesandvision",
      label: "Eyes & Vision",
      fullName: "Eyes & Vision",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["Eyes & Vision", "Eyes and Vision"]
    },

    {
      key: "aco",
      label: "Australian College of Optometry",
      fullName: "Australian College of Optometry",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Community provider",
      aliases: ["Australian College of Optometry", "ACO Eye Health", "ACO Optometry"]
    },

    {
      key: "zoomoptics",
      label: "Zoom Optics",
      fullName: "Zoom Optics",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["Zoom Optics"]
    },

    {
      key: "acuity",
      label: "Acuity Eyecare",
      fullName: "Acuity Eyecare",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["Acuity Eyecare", "Acuity Eye Care"]
    },

    {
      key: "bluefrog",
      label: "Blue Frog Optics",
      fullName: "Blue Frog Optics",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["Blue Frog Optics"]
    },

    {
      key: "westfund",
      label: "Westfund",
      fullName: "Westfund",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Health fund/service",
      aliases: ["Westfund", "Westfund Health Insurance"]
    },

    {
      key: "cityoptics",
      label: "City Optics",
      fullName: "City Optics",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["City Optics"]
    },

    {
      key: "abernethy",
      label: "Abernethy Owens",
      fullName: "Abernethy Owens",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["Abernethy Owens", "Abernethy & Owens"]
    },

    {
      key: "evolve",
      label: "Evolve Optometry",
      fullName: "Evolve Optometry",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["Evolve Optometry"]
    },

    {
      key: "spectaclehub",
      label: "Spectacle Hub",
      fullName: "Spectacle Hub",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["Spectacle Hub"]
    },

    {
      key: "eyetrend",
      label: "Eye Trend",
      fullName: "Eye Trend",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["Eye Trend", "Eyetrend"]
    },

    {
      key: "gmhba",
      label: "GMHBA",
      fullName: "GMHBA",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Health fund/service",
      aliases: ["GMHBA", "GMHBA Optical"]
    },

    {
      key: "owndays",
      label: "OWNDAYS",
      fullName: "OWNDAYS",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["OWNDAYS", "Own Days"]
    },

    {
      key: "parismiki",
      label: "Paris Miki",
      fullName: "Paris Miki",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["Paris Miki"]
    },

    {
      key: "modernspecs",
      label: "Modernspecs",
      fullName: "Modernspecs",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["Modernspecs", "Modern Specs"]
    },

    {
      key: "visionsplendid",
      label: "Vision Splendid",
      fullName: "Vision Splendid",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["Vision Splendid", "Vision Splendid Optometrist"]
    },

    {
      key: "hunterdiscount",
      label: "Hunter Discount Specs",
      fullName: "Hunter Discount Specs",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["Hunter Discount Specs"]
    },

    {
      key: "dryeyesolution",
      label: "Dry Eye Solution",
      fullName: "Dry Eye Solution",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["Dry Eye Solution"]
    },

    {
      key: "darin",
      label: "Da Rin Optometrist",
      fullName: "Da Rin Optometrist",
      colour: '#777777', // Provisional neutral. Do not silently introduce a new colour palette.
      kind: "Source-labelled group",
      aliases: ["Da Rin Optometrist"]
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
          // 'Lux' alone is valid, but 'Lux Optical' is not safe to infer as
          // EssilorLuxottica from an ambiguous abbreviation.
          if (candidate === 'lux') {
            return normalised === candidate;
          }

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
    version: '0.2.0',
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
