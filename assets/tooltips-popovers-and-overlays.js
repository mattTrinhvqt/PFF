/*
 * tooltips-popovers-and-overlays.js — Shared visual overlays for PFF apps
 * Scope: DOM text/help tooltips, full-text popovers, and content/status overlays.
 * Does NOT include Chart.js tooltips, data loading, caching, pff_loader.js, or app-specific content.
 * Candidate visual module for approval.
 */
(function (global) {
  'use strict';

  const modules = global.PFFModules || (global.PFFModules = {});
  const settings = modules.settings || null;
  const DEFAULTS = settings?.defaults || {
    hoverAnimationMs: 170,
    microTransitionMs: 180
  };

  const STYLE_ID = 'pff-tooltips-popovers-overlays-styles';

  function clamp(value, min, max) {
    if (typeof settings?.clamp === 'function') return settings.clamp(value, min, max);
    return Math.min(max, Math.max(min, value));
  }

  function reducedMotion() {
    if (typeof settings?.reducedMotion === 'function') return settings.reducedMotion();
    return global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  }

  function injectStyles() {
    if (!global.document || document.getElementById(STYLE_ID)) return;

    const hoverMs = reducedMotion() ? 0 : (Number(DEFAULTS.hoverAnimationMs) || 170);
    const microMs = reducedMotion() ? 0 : (Number(DEFAULTS.microTransitionMs) || 180);
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
/* ---------- Shared text tooltip ---------- */
.pff-text-tooltip {
  position: fixed;
  z-index: 9999;
  width: max-content;
  max-width: min(300px, calc(100vw - 20px));
  padding: 9px;
  color: var(--pff-muted, #69718a);
  background: var(--pff-white, #fff);
  border: 1px solid var(--pff-track, #e8eaf0);
  border-radius: 4px;
  box-shadow: none;
  font-family: inherit;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.35;
  text-align: left;
  white-space: normal;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translateY(2px);
  transition:
    opacity ${hoverMs}ms ease,
    transform ${hoverMs}ms ease,
    visibility ${hoverMs}ms ease;
}

.pff-text-tooltip.is-visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

/* ---------- Explanatory help tooltip ---------- */
.pff-help-tooltip-wrap {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
}

.pff-help-tooltip-button {
  display: inline-flex;
  width: 16px;
  height: 16px;
  padding: 0;
  align-items: center;
  justify-content: center;
  color: var(--pff-muted, #69718a);
  background: transparent;
  border: 1px solid var(--pff-muted, #69718a);
  border-radius: 50%;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition:
    color ${hoverMs}ms ease,
    border-color ${hoverMs}ms ease,
    background ${hoverMs}ms ease;
}

.pff-help-tooltip-button:hover,
.pff-help-tooltip-button:focus-visible,
.pff-help-tooltip-button[aria-expanded='true'] {
  color: var(--pff-ink, #151515);
  border-color: var(--pff-ink, #151515);
  outline: none;
}

.pff-help-tooltip {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 9999;
  width: max-content;
  max-width: min(300px, calc(100vw - 24px));
  padding: 8px 10px;
  color: #fff;
  background: var(--pff-ink, #151515);
  border: 0;
  border-radius: 4px;
  box-shadow: 0 5px 14px rgba(21, 21, 21, .15);
  font-family: inherit;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.35;
  text-align: left;
  white-space: normal;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translateY(2px);
  transition:
    opacity ${hoverMs}ms ease,
    transform ${hoverMs}ms ease,
    visibility ${hoverMs}ms ease;
}

.pff-help-tooltip.is-visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

/* ---------- Full-text popover ---------- */
.pff-has-full-text {
  cursor: help;
}

.pff-has-full-text:focus-visible {
  outline: 2px solid rgba(102, 0, 255, .22);
  outline-offset: -2px;
}

.pff-full-text-popover {
  position: fixed;
  z-index: 9998;
  display: block;
  max-width: min(320px, calc(100vw - 16px));
  padding: 7px 9px;
  color: var(--pff-ink, #151515);
  background: var(--pff-white, #fff);
  border: 1px solid var(--pff-track, #e8eaf0);
  border-radius: 4px;
  box-shadow: 0 7px 20px rgba(21, 21, 21, .16);
  font-family: inherit;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.35;
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translateY(2px);
  transition:
    opacity ${hoverMs}ms ease,
    transform ${hoverMs}ms ease,
    visibility ${hoverMs}ms ease;
}

.pff-full-text-popover.is-visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

/* ---------- Content/status overlay ---------- */
.pff-content-overlay-host {
  position: relative;
  isolation: isolate;
}

.pff-content-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: var(--pff-muted, #69718a);
  background: rgba(255, 255, 255, .94);
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
  opacity: 1;
  visibility: visible;
  transition:
    opacity ${microMs}ms ease,
    visibility ${microMs}ms ease;
}

.pff-content-overlay[hidden],
.pff-content-overlay.is-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
`;
    document.head.appendChild(style);
  }

  function ensureElement(options, className, role) {
    if (options?.element) return options.element;
    if (!global.document) return null;
    const element = document.createElement('div');
    element.className = className;
    if (role) element.setAttribute('role', role);
    element.setAttribute('aria-hidden', 'true');
    document.body.appendChild(element);
    return element;
  }

  function positionAboveOrBelow(anchor, floating, options = {}) {
    if (!anchor || !floating) return;
    const margin = Math.max(0, Number(options.margin ?? 8));
    const gap = Math.max(0, Number(options.gap ?? 7));
    const align = options.align || 'center';
    const anchorRect = anchor.getBoundingClientRect();
    const floatingRect = floating.getBoundingClientRect();

    let left;
    if (align === 'start') left = anchorRect.left;
    else if (align === 'end') left = anchorRect.right - floatingRect.width;
    else left = anchorRect.left + anchorRect.width / 2 - floatingRect.width / 2;

    left = clamp(left, margin, Math.max(margin, global.innerWidth - floatingRect.width - margin));

    let top = anchorRect.top - floatingRect.height - gap;
    if (top < margin) top = anchorRect.bottom + gap;
    top = clamp(top, margin, Math.max(margin, global.innerHeight - floatingRect.height - margin));

    floating.style.left = `${Math.round(left)}px`;
    floating.style.top = `${Math.round(top)}px`;
  }

  function setupTextTooltip(options = {}) {
    injectStyles();
    const root = options.root || document;
    const tooltip = ensureElement(options, 'pff-text-tooltip', 'tooltip');
    const selector = options.selector || '[data-pff-tooltip]';
    const visibleClass = options.visibleClass || 'is-visible';
    const openClass = options.openClass || 'is-open';
    let activeTrigger = null;

    if (!tooltip) return { show() {}, hide() {}, reposition() {}, destroy() {}, get activeTrigger() { return null; } };

    function getText(trigger) {
      return String(options.getText?.(trigger) ?? trigger?.dataset?.pffTooltip ?? trigger?.dataset?.tooltip ?? '').trim();
    }

    function reposition() {
      if (activeTrigger) positionAboveOrBelow(activeTrigger, tooltip, options);
    }

    function show(trigger) {
      const text = getText(trigger);
      if (!trigger || !text) return;
      if (activeTrigger && activeTrigger !== trigger) activeTrigger.classList.remove(openClass);
      activeTrigger = trigger;
      trigger.classList.add(openClass);
      tooltip.textContent = text;
      tooltip.classList.add(visibleClass);
      tooltip.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(reposition);
    }

    function hide() {
      activeTrigger?.classList.remove(openClass);
      activeTrigger = null;
      tooltip.classList.remove(visibleClass);
      tooltip.setAttribute('aria-hidden', 'true');
    }

    const closest = event => event.target?.closest?.(selector) || null;
    const pointerOver = event => { if (event.pointerType !== 'touch') { const t = closest(event); if (t) show(t); } };
    const pointerOut = event => { if (event.pointerType !== 'touch') { const t = closest(event); if (t && !t.contains(event.relatedTarget)) hide(); } };
    const focusIn = event => { const t = closest(event); if (t) show(t); };
    const focusOut = event => { if (closest(event)) hide(); };
    const click = event => {
      const t = closest(event);
      if (!t) { hide(); return; }
      if (activeTrigger === t && tooltip.classList.contains(visibleClass)) hide();
      else show(t);
    };
    const keydown = event => { if (event.key === 'Escape') hide(); };

    root.addEventListener('pointerover', pointerOver);
    root.addEventListener('pointerout', pointerOut);
    root.addEventListener('focusin', focusIn);
    root.addEventListener('focusout', focusOut);
    root.addEventListener('click', click);
    document.addEventListener('keydown', keydown);
    global.addEventListener('resize', reposition, { passive: true });
    global.addEventListener('scroll', reposition, true);

    return {
      show, hide, reposition,
      destroy() {
        root.removeEventListener('pointerover', pointerOver);
        root.removeEventListener('pointerout', pointerOut);
        root.removeEventListener('focusin', focusIn);
        root.removeEventListener('focusout', focusOut);
        root.removeEventListener('click', click);
        document.removeEventListener('keydown', keydown);
        global.removeEventListener('resize', reposition);
        global.removeEventListener('scroll', reposition, true);
        hide();
      },
      get activeTrigger() { return activeTrigger; },
      element: tooltip
    };
  }

  function setupHelpTooltips(options = {}) {
    injectStyles();
    const root = options.root || document;
    const buttonSelector = options.buttonSelector || '.pff-help-tooltip-button';
    const visibleClass = options.visibleClass || 'is-visible';
    const bindings = [];
    let pinnedButton = null;

    function tooltipFor(button) {
      if (typeof options.getTooltip === 'function') return options.getTooltip(button);
      const id = button?.getAttribute?.('aria-controls');
      return id ? document.getElementById(id) : button?.parentElement?.querySelector?.('.pff-help-tooltip');
    }

    function setVisible(button, tooltip, visible) {
      if (!button || !tooltip) return;
      tooltip.classList.toggle(visibleClass, Boolean(visible));
      tooltip.setAttribute('aria-hidden', String(!visible));
      button.setAttribute('aria-expanded', String(Boolean(visible)));
      if (visible) requestAnimationFrame(() => positionAboveOrBelow(button, tooltip, options));
    }

    function closePinned() {
      if (!pinnedButton) return;
      const tooltip = tooltipFor(pinnedButton);
      pinnedButton.dataset.pffTooltipPinned = 'false';
      setVisible(pinnedButton, tooltip, false);
      pinnedButton = null;
    }

    function wire(button) {
      if (!button || button.dataset.pffHelpBound === 'true') return;
      const tooltip = tooltipFor(button);
      if (!tooltip) return;
      button.dataset.pffHelpBound = 'true';
      tooltip.setAttribute('aria-hidden', 'true');
      button.setAttribute('aria-expanded', 'false');

      const transientShow = () => {
        if (button.dataset.pffTooltipPinned === 'true') return;
        setVisible(button, tooltip, true);
      };
      const transientHide = () => {
        if (button.dataset.pffTooltipPinned === 'true') return;
        setVisible(button, tooltip, false);
      };
      const click = event => {
        event.preventDefault();
        event.stopPropagation();
        const shouldPin = button.dataset.pffTooltipPinned !== 'true';
        if (pinnedButton && pinnedButton !== button) closePinned();
        button.dataset.pffTooltipPinned = String(shouldPin);
        pinnedButton = shouldPin ? button : null;
        setVisible(button, tooltip, shouldPin);
      };

      button.addEventListener('mouseenter', transientShow);
      button.addEventListener('mouseleave', transientHide);
      button.addEventListener('focus', transientShow);
      button.addEventListener('blur', transientHide);
      button.addEventListener('click', click);
      bindings.push({ button, tooltip, transientShow, transientHide, click });
    }

    root.querySelectorAll(buttonSelector).forEach(wire);

    const outside = event => {
      if (!pinnedButton) return;
      if (event.target?.closest?.(buttonSelector) === pinnedButton) return;
      closePinned();
    };
    const escape = event => { if (event.key === 'Escape') closePinned(); };
    const reposition = () => {
      if (!pinnedButton) return;
      const tooltip = tooltipFor(pinnedButton);
      if (tooltip?.classList.contains(visibleClass)) positionAboveOrBelow(pinnedButton, tooltip, options);
    };

    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    global.addEventListener('resize', reposition, { passive: true });
    global.addEventListener('scroll', reposition, true);

    return {
      wire,
      close: closePinned,
      destroy() {
        bindings.forEach(({button, transientShow, transientHide, click}) => {
          button.removeEventListener('mouseenter', transientShow);
          button.removeEventListener('mouseleave', transientHide);
          button.removeEventListener('focus', transientShow);
          button.removeEventListener('blur', transientHide);
          button.removeEventListener('click', click);
          delete button.dataset.pffHelpBound;
        });
        document.removeEventListener('pointerdown', outside);
        document.removeEventListener('keydown', escape);
        global.removeEventListener('resize', reposition);
        global.removeEventListener('scroll', reposition, true);
        closePinned();
      },
      get pinnedButton() { return pinnedButton; }
    };
  }

  function setupTextPopover(options = {}) {
    injectStyles();
    const root = options.root || document;
    const popover = ensureElement(options, 'pff-full-text-popover', 'tooltip');
    const triggerSelector = options.triggerSelector || '.pff-has-full-text';
    const ignoredSelector = options.ignoredSelector || 'a';
    const visibleClass = options.visibleClass || 'is-visible';
    const closeOnScrollTargets = Array.from(options.closeOnScrollTargets || []);
    let activeTrigger = null;

    if (!popover) return { show() {}, close() {}, destroy() {}, get activeTrigger() { return null; } };

    function close() {
      popover.classList.remove(visibleClass);
      popover.setAttribute('aria-hidden', 'true');
      activeTrigger = null;
    }

    function show(trigger) {
      const text = String(options.getText?.(trigger) ?? trigger?.dataset?.fullText ?? '').trim();
      if (!trigger || !text) return;
      if (activeTrigger === trigger && popover.classList.contains(visibleClass)) { close(); return; }
      activeTrigger = trigger;
      popover.textContent = text;
      popover.classList.add(visibleClass);
      popover.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => positionAboveOrBelow(trigger, popover, { ...options, align: options.align || 'start', gap: options.gap ?? 5 }));
    }

    const closest = event => {
      const trigger = event.target?.closest?.(triggerSelector) || null;
      if (!trigger) return null;
      if (root !== document && typeof root.contains === 'function' && !root.contains(trigger)) return null;
      return trigger;
    };
    const click = event => {
      const trigger = closest(event);
      if (!trigger || (ignoredSelector && event.target?.closest?.(ignoredSelector))) return;
      event.preventDefault();
      event.stopPropagation();
      show(trigger);
    };
    const keydown = event => {
      if (event.key === 'Escape') { close(); return; }
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const trigger = closest(event);
      if (!trigger) return;
      event.preventDefault();
      show(trigger);
    };
    const outside = event => {
      if (popover.classList.contains(visibleClass) && !event.target?.closest?.(triggerSelector)) close();
    };
    const scroll = () => close();

    root.addEventListener('click', click);
    root.addEventListener('keydown', keydown);
    document.addEventListener('pointerdown', outside);
    closeOnScrollTargets.forEach(target => target?.addEventListener?.('scroll', scroll, { passive: true }));
    if (options.closeOnWindowScroll !== false) global.addEventListener('scroll', scroll, { passive: true });
    if (options.closeOnResize !== false) global.addEventListener('resize', scroll, { passive: true });

    return {
      show, close,
      destroy() {
        root.removeEventListener('click', click);
        root.removeEventListener('keydown', keydown);
        document.removeEventListener('pointerdown', outside);
        closeOnScrollTargets.forEach(target => target?.removeEventListener?.('scroll', scroll));
        global.removeEventListener('scroll', scroll);
        global.removeEventListener('resize', scroll);
        close();
      },
      get activeTrigger() { return activeTrigger; },
      element: popover
    };
  }

  function setContentOverlay(element, message = '', options = {}) {
    injectStyles();
    if (!element) return false;
    const text = String(message ?? '');
    if (text) {
      element.textContent = text;
      element.hidden = false;
      element.classList.remove('is-hidden');
      element.setAttribute('aria-hidden', 'false');
      if (options.busyTarget) options.busyTarget.setAttribute('aria-busy', 'true');
    } else {
      element.classList.add('is-hidden');
      element.setAttribute('aria-hidden', 'true');
      if (options.busyTarget) options.busyTarget.setAttribute('aria-busy', 'false');
      const finish = () => { if (element.classList.contains('is-hidden')) element.hidden = true; };
      if (reducedMotion()) finish();
      else global.setTimeout(finish, Number(DEFAULTS.microTransitionMs) || 180);
    }
    return true;
  }

  injectStyles();

  modules.overlays = Object.freeze({
    injectStyles,
    positionAboveOrBelow,
    setupTextTooltip,
    setupHelpTooltips,
    setupTextPopover,
    setContentOverlay
  });
})(window);
