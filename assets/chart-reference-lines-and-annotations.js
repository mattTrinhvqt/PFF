/* PFF Chart Reference Lines & Annotations — v1 candidate.
 * Visual-only Chart.js-compatible drawing helpers, opt-in per chart.
 * Derived from PFF coverage benchmark, zero/balance, oversupply and
 * job-source milestone plugins. Values, thresholds and calculations
 * remain the responsibility of each application.
 * Does NOT modify Chart.defaults, spines, gridlines, axes, chart data,
 * loaders, tooltips, legends, animations or other PFF modules.
 *
 * Example:
 * const plugin = PFFModules.chartAnnotations.createPlugin({
 *   id: 'myReferencePlugin',
 *   getItems: () => [
 *     {axis:'y',value:10000,preset:'sufficient'},
 *     {axis:'y',value:5000,preset:'saturated'},
 *     {axis:'x',value:Date.UTC(2026,6,1),preset:'event',label:'Indeed jobs added'}
 *   ]
 * });
 * // Add plugin to that specific chart's plugins array.
 * // For PFFCharts.createUnifiedYAxis() charts, specify getPixel(chart)
 * // to use the custom axis' current interpolated valueToRatio().
 */
(function(global) {
  'use strict';
  const root = global.PFFModules || (global.PFFModules = {});
  const VERSION = '1.0.0-candidate.1';
  const STYLES = Object.freeze({
    sufficient: Object.freeze({colour:'#20c9d7', width:2.2, dash:[1,4], cap:'round', opacity:1}),
    saturated:  Object.freeze({colour:'#ff00ff', width:2.2, dash:[1,4], cap:'round', opacity:1}),
    zero:       Object.freeze({colour:'#151515', width:1, dash:[], cap:'butt', opacity:0.72}),
    excess:     Object.freeze({colour:'#6600ff', width:2.2, dash:[1,4], cap:'round', opacity:1}),
    event:      Object.freeze({colour:'rgba(105,113,138,0.26)', width:1, dash:[4,4], cap:'butt', opacity:1,
      labelColour:'rgba(105,113,138,0.76)', font:'400 9px Lato, sans-serif', labelMode:'vertical'})
  });
  const DEFAULT = Object.freeze({colour:'#69718a', width:1, dash:[], cap:'butt', opacity:1});
  function finite(value) { return typeof value === 'number' && Number.isFinite(value); }
  function clamp(v,min,max) { return Math.min(max,Math.max(min,v)); }
  function areaOf(chart) {
    const a = chart?.chartArea;
    if (!a || ![a.left,a.right,a.top,a.bottom].every(finite)) return null;
    if (a.right <= a.left || a.bottom <= a.top) return null;
    return a;
  }
  function getItems(source, chart) {
    try { const items = typeof source === 'function' ? source(chart) : source;
      return Array.isArray(items) ? items.filter(x => x && typeof x === 'object') : [];
    } catch(e) { return []; }
  }
  function styleFor(item = {}) {
    const base = STYLES[item.preset] || DEFAULT;
    const style = {...base};
    if (typeof item.colour === 'string' && item.colour) style.colour = item.colour;
    if (finite(item.width) && item.width > 0) style.width = item.width;
    if (Array.isArray(item.dash) && item.dash.every(x => finite(x) && x >= 0)) style.dash = item.dash.slice();
    if (finite(item.opacity)) style.opacity = clamp(item.opacity,0,1);
    if (item.cap === 'round' || item.cap === 'butt' || item.cap === 'square') style.cap = item.cap;
    if (typeof item.labelColour === 'string') style.labelColour = item.labelColour;
    if (typeof item.font === 'string') style.font = item.font;
    if (item.labelMode === 'vertical' || item.labelMode === 'end') style.labelMode = item.labelMode;
    return style;
  }
  function pixelFor(chart,item) {
    if (typeof item.getPixel === 'function') {
      try { const p = item.getPixel(chart,item); return finite(p) ? p : null; }
      catch(e) { return null; }
    }
    const axis = item.axis === 'x' ? 'x' : item.axis === 'y' ? 'y' : null;
    if (!axis) return null;
    const scale = chart.scales?.[item.scaleId || axis];
    if (!scale || typeof scale.getPixelForValue !== 'function') return null;
    // Dates and timestamps are accepted, but strings are NOT implicitly parsed.
    const raw = item.value instanceof Date ? item.value.getTime() : item.value;
    const v = typeof raw === 'number' ? raw : NaN;
    if (!finite(v)) return null;
    try { const p = scale.getPixelForValue(v); return finite(p) ? p : null; }
    catch(e) { return null; }
  }
  function segmentFor(chart,item) {
    const area = areaOf(chart);
    if (!area || !item || (item.axis !== 'x' && item.axis !== 'y')) return null;
    const pixel = pixelFor(chart,item);
    if (!finite(pixel)) return null;
    // Out-of-range marks are omitted, not clamped to the plot border.
    if (item.axis === 'x') {
      if (pixel < area.left - 0.5 || pixel > area.right + 0.5) return null;
      return {x1:pixel,y1:area.top,x2:pixel,y2:area.bottom,pixel,axis:'x',area};
    }
    if (pixel < area.top - 0.5 || pixel > area.bottom + 0.5) return null;
    return {x1:area.left,y1:pixel,x2:area.right,y2:pixel,pixel,axis:'y',area};
  }
  function drawLines(chart,source) {
    const items = getItems(source,chart);
    const ctx = chart?.ctx;
    const area = areaOf(chart);
    if (!ctx || !area) return 0;
    let count = 0;
    ctx.save();
    ctx.beginPath(); ctx.rect(area.left,area.top,area.right-area.left,area.bottom-area.top); ctx.clip();
    items.forEach(item => {
      if (item.hidden === true) return;
      const seg = segmentFor(chart,item);
      if (!seg) return;
      const s = styleFor(item);
      ctx.save();
      ctx.strokeStyle = s.colour;
      ctx.lineWidth = s.width;
      ctx.lineCap = s.cap;
      ctx.globalAlpha = s.opacity;
      ctx.setLineDash(s.dash);
      ctx.beginPath();
      // Native-looking 1px hairlines align to half-pixels at DPR 1.
      const pixelAligned = s.width === 1 && s.dash.length === 0 ? Math.round(seg.pixel)+0.5 : seg.pixel;
      if (seg.axis === 'x') {ctx.moveTo(pixelAligned,seg.y1);ctx.lineTo(pixelAligned,seg.y2);}
      else {ctx.moveTo(seg.x1,pixelAligned);ctx.lineTo(seg.x2,pixelAligned);}
      ctx.stroke();ctx.restore();count++;
    });
    ctx.restore();
    return count;
  }
  function boxesOverlap(a,b,gap=4) {
    return a.x < b.x+b.w+gap && a.x+a.w+gap > b.x && a.y < b.y+b.h+gap && a.y+a.h+gap > b.y;
  }
  function drawLabels(chart,source) {
    const items = getItems(source,chart);
    const ctx = chart?.ctx;
    const area = areaOf(chart);
    if (!ctx || !area) return 0;
    let count = 0;
    const occupied = [];
    items.forEach(item => {
      if (item.hidden === true || typeof item.label !== 'string' || !item.label.trim()) return;
      const seg = segmentFor(chart,item);if (!seg) return;
      const style = styleFor(item), label = item.label.trim();
      const font = style.font || '700 9px Lato, sans-serif';
      ctx.save();ctx.font = font;
      const fullWidth = ctx.measureText(label).width;
      const useVertical = (style.labelMode || (seg.axis === 'x' ? 'vertical' : 'end')) === 'vertical' && seg.axis === 'x';
      const ink = style.labelColour || style.colour;
      ctx.fillStyle = ink;
      ctx.textBaseline = 'middle';
      if (useVertical) {
        // Keep rotated text inside plot; elide when there is not enough height.
        const maxLen = Math.max(0,area.bottom-area.top-24);
        if (maxLen < 22) {ctx.restore();return;}
        let t = label;
        while (t.length > 2 && ctx.measureText(t).width > maxLen) t=t.slice(0,-2);
        if (t !== label) t = t.replace(/\s+$/,'') + '…';
        const w = Math.min(maxLen,ctx.measureText(t).width);
        const x = clamp(seg.pixel+5,area.left+3,area.right-8);
        const y = area.top+10+w;
        const box = {x:x-5,y:y-w-5,w:12,h:w+10};
        if (occupied.some(b=>boxesOverlap(b,box))) {ctx.restore();return;}
        occupied.push(box);
        ctx.translate(x,y);ctx.rotate(-Math.PI/2);
        ctx.textAlign='left';ctx.fillText(t,0,0);
      } else {
        const textWidth = fullWidth;
        const x = clamp(seg.axis === 'x' ? seg.pixel+5 : area.right-textWidth-7,
          area.left+3, Math.max(area.left+3,area.right-textWidth-3));
        const y = clamp(seg.axis === 'x' ? area.top+12 : seg.pixel-9,area.top+9,area.bottom-9);
        const box = {x:x-2,y:y-9,w:textWidth+4,h:18};
        if (textWidth > area.right-area.left-10 || occupied.some(b=>boxesOverlap(b,box))) {ctx.restore();return;}
        occupied.push(box);ctx.textAlign='left';ctx.fillText(label,x,y);
      }
      ctx.restore();count++;
    });
    return count;
  }
  function createPlugin(options = {}) {
    const id = String(options.id || 'pffReferenceLinesAndAnnotations');
    // getItems is re-evaluated on every draw, so live thresholds, Chart.js
    // animated scales and current filter selection are always respected.
    const source = options.getItems || options.items || [];
    const plugin = {
      id,
      beforeDatasetsDraw(chart) {drawLines(chart,source);},
      afterDatasetsDraw(chart) {drawLabels(chart,source);}
    };
    return plugin;
  }
  root.chartAnnotations = Object.freeze({
    version:VERSION, styles:STYLES, styleFor, segmentFor,
    drawLines, drawLabels, createPlugin
  });
})(typeof window !== 'undefined' ? window : globalThis);
