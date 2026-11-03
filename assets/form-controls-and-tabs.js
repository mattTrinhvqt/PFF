/*
 * form-controls-and-tabs.js — Shared visual controls for PFF apps
 * Extracted from the current assets/pff_chart_core.js visual patterns.
 * Scope: scrollable tabs, segmented switches and compact binary toggle buttons.
 * Does NOT load data, cache data, alter pff_loader.js, or modify production pages.
 * Revision candidate: tabs and compact toggles already approved; segmented-switch click behaviour revised for approval.
 */
(function (global) {
  'use strict';

  const modules = global.PFFModules || (global.PFFModules = {});
  const settings = modules.settings || null;
  const DEFAULTS = settings?.defaults || {
    tabTransitionMs: 300,
    microTransitionMs: 180
  };

  const STYLE_ID = 'pff-form-controls-and-tabs-styles';

  function reducedMotion() {
    if (typeof settings?.reducedMotion === 'function') {
      return settings.reducedMotion();
    }
    return global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  }

  function injectStyles() {
    if (!global.document || document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
/* ---------- Scrollable tabs ---------- */
.pff-tab-scroll-shell,
.tab-scroll-shell {
  position: relative;
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.pff-tab-list,
.tab-list {
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: flex-end;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.pff-tab-list::-webkit-scrollbar,
.tab-list::-webkit-scrollbar { display: none; }

.pff-tab-list::after,
.tab-list::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 2;
  width: var(--tab-indicator-width, 0px);
  height: 2px;
  background: var(--pff-purple, #6600ff);
  pointer-events: none;
  transform: translate3d(var(--tab-indicator-x, 0px), 0, 0);
  transition:
    transform ${Number(DEFAULTS.tabTransitionMs) || 300}ms var(--pff-motion-ease, cubic-bezier(.2,.8,.2,1)),
    width ${Number(DEFAULTS.tabTransitionMs) || 300}ms var(--pff-motion-ease, cubic-bezier(.2,.8,.2,1));
  will-change: transform, width;
}

.pff-tab-list.is-positioning::after,
.tab-list.is-positioning::after { transition: none; }

.pff-chart-tab,
.chart-tab {
  flex: 0 0 auto;
  min-height: 29px;
  margin: 0;
  padding: 0 9px 6px;
  color: var(--pff-muted, #69718a);
  background: var(--pff-white, #fff);
  border: 0;
  border-bottom: 2px solid transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: color ${Number(DEFAULTS.microTransitionMs) || 180}ms ease;
}

.pff-chart-tab:hover:not(.is-active),
.chart-tab:hover:not(.is-active) { color: var(--pff-ink, #151515); }

.pff-chart-tab.is-active,
.pff-chart-tab[aria-selected='true'],
.chart-tab.is-active,
.chart-tab[aria-selected='true'] {
  color: var(--pff-purple, #6600ff);
  cursor: default;
}

.pff-tab-scroll-button,
.tab-scroll-button {
  position: absolute;
  top: 3px;
  z-index: 4;
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding: 0 0 2px;
  color: var(--pff-muted, #69718a);
  background: rgba(255,255,255,.78);
  border: 1px solid rgba(232,234,240,.74);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(21,21,21,.05);
  font: inherit;
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  opacity: .68;
  backdrop-filter: blur(1px);
  -webkit-backdrop-filter: blur(1px);
  transition: opacity 160ms ease, background 160ms ease;
}

.pff-tab-scroll-button:hover,
.tab-scroll-button:hover {
  opacity: .96;
  background: rgba(255,255,255,.90);
}

.pff-tab-scroll-button.is-hidden,
.tab-scroll-button.is-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.pff-tab-scroll-left,
.tab-scroll-left { left: 0; }
.pff-tab-scroll-right,
.tab-scroll-right { right: 0; }

/* ---------- Segmented switches ---------- */
.pff-segmented,
.metric-switch {
  --pff-segment-columns: var(--pff-metric-columns, 2);
  --pff-segment-index: var(--pff-metric-index, 0);
  position: relative;
  display: grid;
  width: var(--pff-segment-width, var(--pff-metric-width, 116px));
  height: 27px;
  flex: 0 0 auto;
  grid-template-columns: repeat(var(--pff-segment-columns), minmax(0,1fr));
  align-items: center;
  padding: 1px;
  overflow: hidden;
  background: rgba(232,234,240,.55);
  border-radius: 4px;
  isolation: isolate;
}

.pff-segmented::before,
.metric-switch::before {
  content: '';
  position: absolute;
  top: 1px;
  bottom: 1px;
  left: 1px;
  z-index: 0;
  width: calc((100% - 2px) / var(--pff-segment-columns));
  background: var(--pff-white, #fff);
  border-radius: 3px;
  box-shadow: 0 1px 3px rgba(21,21,21,.08);
  transform: translateX(calc(var(--pff-segment-index) * 100%));
  transition: transform ${Number(DEFAULTS.tabTransitionMs) || 300}ms var(--pff-motion-ease, cubic-bezier(.2,.8,.2,1));
}

.pff-segment-button,
.metric-button {
  position: relative;
  z-index: 1;
  min-width: 0;
  min-height: 25px;
  padding: 0 4px;
  overflow: hidden;
  color: var(--pff-muted, #69718a);
  background: transparent;
  border: 0;
  border-radius: 3px;
  font: inherit;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition: color 220ms ease;
}

.pff-segment-button:hover:not(.is-active),
.metric-button:hover:not(.is-active) { color: var(--pff-ink, #151515); }

.pff-segment-button.is-active,
.metric-button.is-active { color: var(--pff-purple, #6600ff); }

/* ---------- Compact binary toggle ---------- */
.pff-toggle-button,
.pff-chart-toggle-button {
  display: inline-grid;
  grid-template-columns: 15px max-content;
  min-height: 30px;
  align-items: center;
  gap: 5px;
  padding: 0 6px;
  color: var(--pff-ink, #151515);
  background: var(--pff-white, #fff);
  border: 1px solid var(--pff-track, #e8eaf0);
  border-radius: 4px;
  box-shadow: none;
  font: inherit;
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    background 140ms ease,
    box-shadow 140ms ease,
    opacity 140ms ease;
}

.pff-toggle-button:hover:not(:disabled),
.pff-chart-toggle-button:hover:not(:disabled) {
  box-shadow: inset 0 0 0 1px rgba(21,21,21,.12);
}

.pff-toggle-button.is-active,
.pff-chart-toggle-button.is-active { border-color: var(--pff-purple, #6600ff); }

.pff-toggle-button:disabled,
.pff-chart-toggle-button:disabled { opacity: .48; cursor: default; }

.pff-toggle-indicator,
.pff-chart-toggle-indicator {
  position: relative;
  width: 15px;
  height: 15px;
  min-width: 15px;
  border: 1px solid var(--pff-muted, #69718a);
  border-radius: 2px;
  background: var(--pff-white, #fff);
}

.pff-toggle-button.is-active .pff-toggle-indicator,
.pff-chart-toggle-button.is-active .pff-chart-toggle-indicator {
  border-color: var(--pff-purple, #6600ff);
  background: var(--pff-purple, #6600ff);
}

.pff-toggle-button.is-active .pff-toggle-indicator::after,
.pff-chart-toggle-button.is-active .pff-chart-toggle-indicator::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 4px;
  width: 4px;
  height: 7px;
  border-right: 2px solid var(--pff-white, #fff);
  border-bottom: 2px solid var(--pff-white, #fff);
  transform: rotate(45deg);
}

.pff-toggle-label,
.pff-chart-toggle-label { font-size: 11px; line-height: 1.05; }

/* ---------- Shared keyboard focus ---------- */
.pff-chart-tab:focus-visible,
.chart-tab:focus-visible,
.pff-tab-scroll-button:focus-visible,
.tab-scroll-button:focus-visible,
.pff-segment-button:focus-visible,
.metric-button:focus-visible,
.pff-toggle-button:focus-visible,
.pff-chart-toggle-button:focus-visible {
  outline: 2px solid rgba(102,0,255,.22);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .pff-tab-list::after,
  .tab-list::after,
  .pff-segmented::before,
  .metric-switch::before,
  .pff-chart-tab,
  .chart-tab,
  .pff-segment-button,
  .metric-button,
  .pff-toggle-button,
  .pff-chart-toggle-button { transition: none !important; }
}
`;
    document.head.appendChild(style);
  }

  function scrollByAmount(scroller, direction, options = {}) {
    if (!scroller) return;
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
    if (!scroller) return;
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
    if (!scroller) return { update() {}, destroy() {} };

    const update = () => updateOverflowButtons(scroller, leftButton, rightButton, options.tolerance);
    const onLeft = event => { event?.stopPropagation?.(); scrollByAmount(scroller, -1, options); };
    const onRight = event => { event?.stopPropagation?.(); scrollByAmount(scroller, 1, options); };

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
    if (!tabList || !activeTab) return;
    if (!animate) tabList.classList.add('is-positioning');
    tabList.style.setProperty('--tab-indicator-x', `${activeTab.offsetLeft}px`);
    tabList.style.setProperty('--tab-indicator-width', `${activeTab.offsetWidth}px`);
    if (!animate) {
      requestAnimationFrame(() => requestAnimationFrame(() => tabList.classList.remove('is-positioning')));
    }
  }

  function setupTabs(options = {}) {
    const tabList = options.tabList;
    const tabs = Array.from(options.tabs || tabList?.querySelectorAll?.('[role="tab"], .chart-tab, .pff-chart-tab') || []);
    const valueAttribute = options.valueAttribute || 'view';
    const activeClass = options.activeClass || 'is-active';
    let activeValue = options.initialValue ?? tabs.find(tab => tab.classList.contains(activeClass))?.dataset?.[valueAttribute];
    const controlled = options.controlled === true;
    let scrollController = null;

    tabList?.setAttribute('role', 'tablist');
    tabs.forEach(tab => tab.setAttribute('role', 'tab'));

    if (options.scroller || tabList) {
      scrollController = setupScrollableRegion({
        scroller: options.scroller || tabList,
        leftButton: options.leftButton,
        rightButton: options.rightButton,
        minimum: options.minimum,
        fraction: options.fraction
      });
    }

    const valueOf = tab => tab?.dataset?.[valueAttribute] ?? tab?.getAttribute?.('data-value') ?? '';

    function apply(value, config = {}) {
      activeValue = value;
      let activeTab = null;
      tabs.forEach(tab => {
        const active = valueOf(tab) === activeValue;
        tab.classList.toggle(activeClass, active);
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active) activeTab = tab;
      });
      positionTabIndicator(tabList, activeTab, config.animate !== false);
      requestAnimationFrame(() => scrollController?.update());
      if (config.focus && activeTab) activeTab.focus({ preventScroll: true });
      if (config.notify !== false) options.onChange?.(activeValue, activeTab);
      return activeTab;
    }

    const clickHandlers = new Map();
    const keyHandlers = new Map();
    tabs.forEach((tab, index) => {
      const clickHandler = () => {
        const value = valueOf(tab);
        if (controlled) return options.onRequest?.(value, tab);
        apply(value);
      };
      const keyHandler = event => {
        let nextIndex = null;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        const nextTab = tabs[nextIndex];
        const nextValue = valueOf(nextTab);
        if (controlled) {
          nextTab?.focus({ preventScroll: true });
          return options.onRequest?.(nextValue, nextTab);
        }
        apply(nextValue, { focus: true });
      };
      tab.addEventListener('click', clickHandler);
      tab.addEventListener('keydown', keyHandler);
      clickHandlers.set(tab, clickHandler);
      keyHandlers.set(tab, keyHandler);
    });

    if (activeValue === undefined && tabs.length) activeValue = valueOf(tabs[0]);
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

  function setupSegmentedControl(options = {}) {
    const container = options.container;
    const buttons = Array.from(options.buttons || container?.querySelectorAll?.('.pff-segment-button, .metric-button, button') || []);
    const valueAttribute = options.valueAttribute || 'value';
    const activeClass = options.activeClass || 'is-active';
    let activeValue = options.initialValue ?? buttons.find(button => button.classList.contains(activeClass))?.dataset?.[valueAttribute];

    const valueOf = button => button?.dataset?.[valueAttribute] ?? button?.getAttribute?.('data-value') ?? '';

    function apply(value, config = {}) {
      activeValue = value;
      let activeButton = null;
      let activeIndex = 0;
      buttons.forEach((button, index) => {
        const active = valueOf(button) === activeValue;
        button.classList.toggle(activeClass, active);
        button.setAttribute('aria-pressed', String(active));
        button.tabIndex = active ? 0 : -1;
        if (active) { activeButton = button; activeIndex = index; }
      });
      container?.style.setProperty('--pff-segment-columns', String(Math.max(1, buttons.length)));
      container?.style.setProperty('--pff-segment-index', String(activeIndex));
      container?.style.setProperty('--pff-metric-columns', String(Math.max(1, buttons.length)));
      container?.style.setProperty('--pff-metric-index', String(activeIndex));
      if (config.focus && activeButton) activeButton.focus({ preventScroll: true });
      if (config.notify !== false) options.onChange?.(activeValue, activeButton);
      return activeButton;
    }

    const clickHandlers = new Map();
    const keyHandlers = new Map();
    buttons.forEach((button, index) => {
      const clickHandler = () => {
        const clickedValue = valueOf(button);
        const clickedIsActive = clickedValue === activeValue;
        if (clickedIsActive && buttons.length > 1) {
          const nextIndex = (index + 1) % buttons.length;
          return apply(valueOf(buttons[nextIndex]));
        }
        return apply(clickedValue);
      };
      const keyHandler = event => {
        let nextIndex = null;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % buttons.length;
        if (event.key === 'ArrowLeft') nextIndex = (index - 1 + buttons.length) % buttons.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = buttons.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        apply(valueOf(buttons[nextIndex]), { focus: true });
      };
      button.addEventListener('click', clickHandler);
      button.addEventListener('keydown', keyHandler);
      clickHandlers.set(button, clickHandler);
      keyHandlers.set(button, keyHandler);
    });

    if (activeValue === undefined && buttons.length) activeValue = valueOf(buttons[0]);
    apply(activeValue, { notify: false });

    return {
      get value() { return activeValue; },
      set(value, config = {}) { return apply(value, config); },
      destroy() {
        buttons.forEach(button => {
          button.removeEventListener('click', clickHandlers.get(button));
          button.removeEventListener('keydown', keyHandlers.get(button));
        });
      }
    };
  }

  function setupToggleButton(options = {}) {
    const button = options.button;
    const activeClass = options.activeClass || 'is-active';
    let active = options.initialValue !== undefined ? Boolean(options.initialValue) : button?.classList.contains(activeClass) === true;

    function apply(value, notify = false) {
      active = Boolean(value);
      button?.classList.toggle(activeClass, active);
      button?.setAttribute('aria-pressed', String(active));
      if (notify) options.onChange?.(active, button);
      return active;
    }

    const clickHandler = () => {
      if (button?.disabled) return;
      apply(!active, true);
    };

    button?.addEventListener('click', clickHandler);
    apply(active, false);

    return {
      get value() { return active; },
      set(value, notify = true) { return apply(value, notify); },
      destroy() { button?.removeEventListener('click', clickHandler); }
    };
  }

  injectStyles();

  if (modules.controls) {
    console.warn('[PFF Modules] controls already loaded; replacing its namespace');
  }

  modules.controls = Object.freeze({
    version: '0.1.0-candidate.2',
    injectStyles,
    positionTabIndicator,
    scrollByAmount,
    updateOverflowButtons,
    setupScrollableRegion,
    setupTabs,
    setupSegmentedControl,
    setupToggleButton
  });
})(window);
