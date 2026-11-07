/* PFF shared charts: legends and interactions — candidate v1 (2026-11-07)
   Scoped, opt-in markup. Does not replace PFFCharts.setupLegend / setupDisplayLegend.
   Based on legend visual conventions in assets/pff_chart_core.js.
*/
(function (global) {
  'use strict';
  const namespace = global.PFFModules = global.PFFModules || {};
  const VERSION = '1.0.0-candidate.1';
  const STYLE_ID = 'pff-chart-legend-shared-style-v1';
  const CSS = `
  .pff-shared-legend{position:relative;width:100%;min-width:0;height:30px;overflow:hidden;font-family:Lato,Arial,sans-serif;--pff-legend-muted:var(--pff-muted,#69718a);--pff-legend-ink:var(--pff-ink,#151515)}
  .pff-shared-legend__viewport{display:flex;align-items:center;gap:10px;width:100%;height:100%;padding:1px 0 4px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;white-space:nowrap;scroll-behavior:smooth}
  .pff-shared-legend__viewport::-webkit-scrollbar{display:none}
  .pff-shared-legend__item{display:inline-flex;flex:0 0 auto;align-items:center;gap:5px;min-height:19px;margin:0;padding:0;color:var(--pff-legend-muted);background:transparent;border:0;font:700 10px/1 Lato,Arial,sans-serif;cursor:pointer;white-space:nowrap;opacity:1;transition:opacity 160ms ease,color 160ms ease}
  .pff-shared-legend__item:hover:not(:disabled){color:var(--pff-legend-ink)}
  .pff-shared-legend__item[data-visible="false"]{opacity:.36}
  .pff-shared-legend__item:disabled{cursor:default;opacity:1}
  .pff-shared-legend__item:focus-visible,.pff-shared-legend__arrow:focus-visible{outline:2px solid rgba(102,0,255,.30);outline-offset:2px;border-radius:3px}
  .pff-shared-legend__marker{display:inline-block;flex:0 0 auto;background:var(--marker,#69718a)}
  .pff-shared-legend__marker[data-shape="line"]{width:17px;height:3px;border-radius:2px}
  .pff-shared-legend__marker[data-shape="square"]{width:7px;height:7px;border:1px solid var(--marker,#69718a)}
  .pff-shared-legend__marker[data-shape="dot"]{width:10px;height:10px;border-radius:50%}
  .pff-shared-legend__marker[data-shape="dash"]{width:17px;height:0;border-top:2px dashed var(--marker,#69718a);background:transparent}
  .pff-shared-legend__arrow{position:absolute;z-index:2;top:4px;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;padding:0 0 2px;color:var(--pff-legend-muted);background:rgba(255,255,255,.90);border:1px solid rgba(232,234,240,.88);border-radius:50%;box-shadow:0 1px 3px rgba(21,21,21,.05);font:700 18px/1 Lato,Arial,sans-serif;cursor:pointer;opacity:.78;transition:opacity 160ms ease}
  .pff-shared-legend__arrow:hover{opacity:1}
  .pff-shared-legend__arrow[data-hidden="true"]{opacity:0;visibility:hidden;pointer-events:none}
  .pff-shared-legend__arrow[data-direction="left"]{left:0}
  .pff-shared-legend__arrow[data-direction="right"]{right:0}
  @media(max-width:430px){.pff-shared-legend__item{font-size:9px}}
  @media(prefers-reduced-motion:reduce){.pff-shared-legend__viewport{scroll-behavior:auto}.pff-shared-legend__item,.pff-shared-legend__arrow{transition:none}}
  `;
  function installStyles() {
    if (!global.document || document.getElementById(STYLE_ID)) return;
    const node = document.createElement('style');
    node.id = STYLE_ID;
    node.textContent = CSS;
    document.head.appendChild(node);
  }
  const normalise = (item, index) => ({
    id: String(item?.id ?? item?.datasetIndex ?? index),
    datasetIndex: Number.isInteger(item?.datasetIndex) ? item.datasetIndex : index,
    label: String(item?.label ?? `Series ${index + 1}`),
    colour: String(item?.colour ?? item?.color ?? '#69718a'),
    markerType: ['line','square','dot','dash'].includes(item?.markerType) ? item.markerType : 'line',
    visible: item?.visible !== false && item?.active !== false
  });
  function mount(options = {}) {
    const root = options.root;
    if (!root || !(root instanceof global.HTMLElement)) throw new Error('A legend root element is required.');
    if (root.__pffLegendController) root.__pffLegendController.destroy();
    installStyles();
    const readOnly = options.readOnly === true;
    const previousChildren = Array.from(root.childNodes);
    const priorClass = root.className;
    root.classList.add('pff-shared-legend');
    const viewport = document.createElement('div');
    viewport.className = 'pff-shared-legend__viewport';
    viewport.setAttribute('role', 'group');
    viewport.setAttribute('aria-label', options.label || 'Chart series legend');
    const makeArrow = (direction, glyph) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pff-shared-legend__arrow';
      button.dataset.direction = direction;
      button.dataset.hidden = 'true';
      button.setAttribute('aria-label', `Scroll legend ${direction}`);
      button.textContent = glyph;
      return button;
    };
    const left = makeArrow('left', '‹');
    const right = makeArrow('right', '›');
    root.replaceChildren(viewport, left, right);
    let entries = Array.from(options.items || []).map(normalise);
    let destroyed = false;
    let observer = null;
    let scheduled = 0;
    function updateArrows() {
      if (destroyed) return;
      const overflow = viewport.scrollWidth > viewport.clientWidth + 2;
      left.dataset.hidden = String(!overflow || viewport.scrollLeft <= 1);
      right.dataset.hidden = String(!overflow || viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 2);
    }
    function scheduleArrows() {
      if (scheduled) global.cancelAnimationFrame(scheduled);
      scheduled = global.requestAnimationFrame(() => { scheduled = 0; updateArrows(); });
    }
    function chart() { return typeof options.getChart === 'function' ? options.getChart() : options.chart; }
    function toggle(id) {
      const item = entries.find(entry => entry.id === String(id));
      if (!item || readOnly) return false;
      const before = item.visible;
      item.visible = !before;
      const instance = chart();
      if (instance && item.datasetIndex >= 0) {
        if (typeof instance.setDatasetVisibility === 'function') instance.setDatasetVisibility(item.datasetIndex, item.visible);
        else if (instance.data?.datasets?.[item.datasetIndex]) instance.data.datasets[item.datasetIndex].hidden = !item.visible;
        if (instance.data?.datasets?.[item.datasetIndex]) instance.data.datasets[item.datasetIndex]._activeSeries = item.visible;
        if (typeof instance.update === 'function') instance.update(options.updateMode);
      }
      options.onToggle?.({ ...item, previousVisible: before, chart: instance || null });
      render();
      return true;
    }
    function render() {
      if (destroyed) return;
      const previousScroll = viewport.scrollLeft;
      const fragment = document.createDocumentFragment();
      entries.forEach(item => {
        const el = document.createElement(readOnly ? 'span' : 'button');
        el.className = 'pff-shared-legend__item';
        el.dataset.id = item.id;
        el.dataset.visible = String(item.visible);
        if (!readOnly) {
          el.type = 'button';
          el.setAttribute('aria-pressed', String(item.visible));
          el.setAttribute('aria-label', `${item.visible ? 'Hide' : 'Show'} ${item.label}`);
          el.addEventListener('click', () => toggle(item.id));
        }
        const marker = document.createElement('span');
        marker.className = 'pff-shared-legend__marker';
        marker.dataset.shape = item.markerType;
        marker.style.setProperty('--marker', item.colour);
        marker.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.textContent = item.label;
        el.append(marker, label);
        fragment.appendChild(el);
      });
      viewport.replaceChildren(fragment);
      viewport.scrollLeft = previousScroll;
      scheduleArrows();
      options.onRender?.(entries.map(item => ({...item})));
    }
    function scroll(direction) {
      const delta = Math.max(100, Math.min(220, Math.round(viewport.clientWidth * .75)));
      viewport.scrollBy({left: direction * delta, behavior: global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth'});
      global.setTimeout(scheduleArrows, 250);
    }
    const scrollHandler = () => scheduleArrows();
    const leftHandler = () => scroll(-1);
    const rightHandler = () => scroll(1);
    left.addEventListener('click', leftHandler);
    right.addEventListener('click', rightHandler);
    viewport.addEventListener('scroll', scrollHandler, {passive: true});
    if (global.ResizeObserver) { observer = new ResizeObserver(scheduleArrows); observer.observe(root); observer.observe(viewport); }
    else global.addEventListener('resize', scheduleArrows);
    const api = {
      version: VERSION,
      getItems: () => entries.map(item => ({...item})),
      setItems(items) { entries = Array.from(items || []).map(normalise); render(); },
      toggle,
      refresh: render,
      updateArrows,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        if (scheduled) global.cancelAnimationFrame(scheduled);
        observer?.disconnect();
        if (!global.ResizeObserver) global.removeEventListener('resize', scheduleArrows);
        left.removeEventListener('click', leftHandler);
        right.removeEventListener('click', rightHandler);
        viewport.removeEventListener('scroll', scrollHandler);
        root.className = priorClass;
        root.replaceChildren(...previousChildren);
        if (root.__pffLegendController === api) delete root.__pffLegendController;
      }
    };
    root.__pffLegendController = api;
    render();
    return api;
  }
  namespace.chartLegends = Object.freeze({version: VERSION, mount, installStyles});
})(window);
