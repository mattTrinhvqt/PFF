/* PFF Chart Trends & Labels v1 — visual-only helpers.
 * Source patterns: existing PFF trend pills + 3.6px regression/trend lines.
 * No regression calculations, data transforms, loaders or global Chart defaults.
 */
(function (global) {
  'use strict';
  const root = global.PFFModules = global.PFFModules || {};
  const GOLD = '#f1c232', INK = '#151515', MUTED = '#69718a';
  const defaults = Object.freeze({
    lineWidth: 3.6, aggregateRegressionColour: GOLD,
    trendLabelFont: '700 9.1px Lato, sans-serif',
    mobileTrendLabelFont: '700 8.2px Lato, sans-serif',
    labelHeight: 15, mobileLabelHeight: 14,
    labelGap: 5, labelBorderWidth: 0.65, connectorWidth: 0.8,
    trendThreshold: 0.05
  });
  const finite = n => n !== null && n !== undefined && n !== '' && Number.isFinite(Number(n));
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const colourOf = (value, fallback = MUTED) => typeof value === 'string' && value.trim() ? value : fallback;

  function lineStyle({ role = 'trend', colour, grouped = false, width, regressionType } = {}) {
    const regression = role === 'regression';
    const ink = colourOf(colour, regression && !grouped ? GOLD : MUTED);
    const thick = finite(width) && Number(width) > 0 ? Number(width) : defaults.lineWidth;
    return {
      type: 'line', borderColor: ink, backgroundColor: ink,
      borderWidth: thick, borderCapStyle: 'round', borderJoinStyle: 'round',
      borderDash: [], pointRadius: 0, pointHoverRadius: 0,
      fill: false, showLine: true,
      tension: regression && regressionType === 'logarithmic' ? 0.12 : 0
    };
  }

  function trendLabel(value, options = {}) {
    if (!finite(value)) return null;
    const n = Number(value), threshold = finite(options.threshold) ? Math.abs(Number(options.threshold)) : defaults.trendThreshold;
    const decimals = clamp(Math.round(Number(options.decimals ?? 1)), 0, 3);
    const arrow = n > threshold ? '↑' : n < -threshold ? '↓' : '';
    const suffix = options.suffix === undefined ? '% p.a.' : String(options.suffix);
    const amount = Math.abs(n).toFixed(decimals) + suffix;
    return { arrow, amount, label: arrow ? arrow + ' ' + amount : amount,
      direction: arrow === '↑' ? 'up' : arrow === '↓' ? 'down' : 'flat', value: n };
  }

  function rgba(hex, alpha = 1) {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || ''));
    if (!m) return `rgba(105,113,138,${alpha})`;
    let t = m[1]; if (t.length === 3) t = t.split('').map(x=>x+x).join('');
    const c = parseInt(t,16);
    return `rgba(${(c>>16)&255},${(c>>8)&255},${c&255},${alpha})`;
  }

  function rectOverlap(a,b,gap=5) {
    return !(a.right+gap<=b.left || a.left>=b.right+gap || a.bottom+gap<=b.top || a.top>=b.bottom+gap);
  }

  // Use only enough rows to fit, and omit excess labels instead of placing them on top of one another.
  function placeLabels(items, area, options = {}) {
    if (!Array.isArray(items) || !area || !finite(area.left) || !finite(area.right)) return [];
    const mobile = !!options.mobile, height = mobile ? 14 : 15;
    const spacing = Math.max(1, Number(options.gap ?? 5));
    const widthMax = Math.max(0, area.right-area.left-8);
    const existing = Array.isArray(options.blockers) ? options.blockers.slice() : [];
    const placed = [];
    const offsetsX = options.endpoint ? [-10,-24,-42,-64,-88,-112,-144] : [0,-34,-68,-102,-136,-170];
    const offsetsY = [0,-height-2,height+2,-2*(height+2),2*(height+2),-3*(height+2),3*(height+2)];
    [...items].sort((a,b)=>(Number(a.anchorY)||0)-(Number(b.anchorY)||0)).forEach(item=>{
      const w = Number(item.width);
      if (!finite(w) || w <= 0 || w > widthMax || !finite(item.anchorY)) return;
      const ax = finite(item.anchorX) ? Number(item.anchorX) : area.right;
      let selected = null;
      const naturalRight = options.endpoint ? ax-9 : area.right-4;
      for (const dx of offsetsX) {
        for (const dy of offsetsY) {
          const right = clamp(naturalRight+dx,area.left+w+4,area.right-4);
          const y = clamp(Number(item.anchorY)+dy,area.top+height/2+2,area.bottom-height/2-2);
          const box = {left:right-w,right,top:y-height/2,bottom:y+height/2,y};
          if (!existing.some(b=>rectOverlap(box,b,spacing))) { selected=box;break; }
        }
        if (selected) break;
      }
      if (!selected) return;
      existing.push(selected);
      placed.push({...item,...selected});
    });
    return placed;
  }

  function drawPills(ctx, positions, options = {}) {
    if (!ctx || !Array.isArray(positions)) return;
    const mobile = !!options.mobile, h = mobile ? 14 : 15, pad = mobile ? 4 : 5;
    ctx.save(); ctx.font = mobile ? defaults.mobileTrendLabelFont : defaults.trendLabelFont;
    ctx.textBaseline='middle';
    for (const p of positions) {
      const ink=colourOf(p.colour); const arrow=String(p.arrow||'');
      const arrowColour = p.direction==='up' ? '#14823b' : p.direction==='down' ? '#b42318' : MUTED;
      const displacement = Math.abs(Number(p.anchorY)-p.y)>3 || Math.abs(Number(p.anchorX)-p.right)>10;
      if (displacement && finite(p.anchorX)) {
        const targetX=clamp(Number(p.anchorX),p.left,p.right);
        ctx.beginPath();ctx.moveTo(Number(p.anchorX), Number(p.anchorY));ctx.lineTo(targetX,p.y);
        ctx.strokeStyle='rgba(105,113,138,0.58)';ctx.lineWidth=defaults.connectorWidth;ctx.stroke();
      }
      ctx.beginPath();
      if (typeof ctx.roundRect==='function') ctx.roundRect(p.left,p.y-h/2,p.right-p.left,h,3);
      else ctx.rect(p.left,p.y-h/2,p.right-p.left,h);
      ctx.fillStyle=rgba(ink,0.15);ctx.fill();ctx.strokeStyle=rgba(ink,0.42);
      ctx.lineWidth=defaults.labelBorderWidth;ctx.stroke();
      ctx.textAlign='left'; ctx.fillStyle=arrowColour;
      let tx=p.left+pad;
      if (arrow) { ctx.fillText(arrow,tx,p.y);tx+=ctx.measureText(arrow).width+(mobile?2.5:3); }
      ctx.fillText(String(p.amount||''),tx,p.y);
    }
    ctx.restore();
  }

  // Adapter for existing Chart.js charts. No auto-registration: each page opts in during migration.
  function createTrendPillsPlugin(options = {}) {
    return {
      id: options.id || 'pffSharedTrendPills',
      afterDatasetsDraw(chart) {
        if (!chart?.chartArea || (options.enabled && !options.enabled(chart))) return;
        const ctx=chart.ctx, mobile = options.isMobile ? !!options.isMobile(chart) : chart.width < 440;
        const pad=mobile?4:5, arrowGap=mobile?2.5:3;
        const items=[];
        ctx.save();ctx.font=mobile?defaults.mobileTrendLabelFont:defaults.trendLabelFont;
        (chart.data?.datasets || []).forEach((dataset,i)=>{
          const meta=chart.getDatasetMeta(i);
          if (!meta || meta.hidden || dataset._activeSeries===false ||
              (options.isActive && !options.isActive({chart,dataset,datasetIndex:i,meta}))) return;
          const n=options.getTrendValue ? options.getTrendValue({chart,dataset,datasetIndex:i,meta}) : dataset._pffTrendValue;
          const label=trendLabel(n,{decimals:options.decimals}); if (!label) return;
          let point;
          for(let j=(meta.data||[]).length-1;j>=0;j--) {
            const x=meta.data[j]?.x,y=meta.data[j]?.y;
            if(finite(x)&&finite(y) && finite(dataset.data?.[j]?.y??dataset.data?.[j])) {point={x,y};break;}
          }
          if(!point)return;
          const textWidth=ctx.measureText(label.amount).width;
          const arrowWidth=label.arrow?ctx.measureText(label.arrow).width+arrowGap:0;
          items.push({...label,anchorX:point.x,anchorY:point.y,
            width:2*pad+textWidth+arrowWidth,
            colour:colourOf(options.getSeriesColour?.({chart,dataset,datasetIndex:i})||dataset.borderColor)});
        });
        ctx.restore();
        const placed=placeLabels(items,chart.chartArea,{mobile,blockers:options.getBlockers?.(chart)});
        drawPills(ctx,placed,{mobile});
        chart.$pffSharedTrendPillRects=placed.map(p=>({left:p.left,right:p.right,top:p.top,bottom:p.bottom}));
      }
    };
  }

  // Only for charts that explicitly want persistent endpoint labels. Not enabled by default.
  function createEndpointLabelsPlugin(options = {}) {
    return {
      id:options.id||'pffSharedEndpointLabels',
      afterDatasetsDraw(chart) {
        if(!chart?.chartArea || (options.enabled && !options.enabled(chart)))return;
        const ctx=chart.ctx, mobile=chart.width<440;const items=[];
        ctx.save();ctx.font=`600 ${mobile?9:10}px Lato, sans-serif`;
        (chart.data?.datasets||[]).forEach((dataset,i)=>{
          if (!(options.showFor?.({chart,dataset,datasetIndex:i}) ?? dataset._pffShowEndpointLabel)) return;
          const meta=chart.getDatasetMeta(i);if(!meta ||meta.hidden) return;
          for(let j=(meta.data||[]).length-1;j>=0;j--){
            const point=meta.data[j], raw=dataset.data?.[j],v=raw?.y??raw;
            if(!finite(v)||!finite(point?.x)||!finite(point?.y))continue;
            const text=options.formatValue ? String(options.formatValue(v,{chart,dataset,datasetIndex:i,index:j})) : String(v);
            items.push({anchorX:point.x,anchorY:point.y,width:ctx.measureText(text).width+10,
              amount:text,colour:colourOf(dataset.borderColor,INK)});break;
          }
        });
        ctx.restore();
        const placed=placeLabels(items,chart.chartArea,{mobile,endpoint:true,blockers:chart.$pffSharedTrendPillRects||[]});
        ctx.save();ctx.font=`600 ${mobile?9:10}px Lato, sans-serif`;ctx.textBaseline='middle';ctx.textAlign='left';
        placed.forEach(p=>{ctx.fillStyle=p.colour;ctx.fillText(p.amount,p.left+5,p.y);});ctx.restore();
      }
    };
  }

  root.chartTrends = Object.freeze({version:'1.0.0-review',defaults,lineStyle,trendLabel,rgba,
    placeLabels,drawPills,createTrendPillsPlugin,createEndpointLabelsPlugin});
})(typeof window !== 'undefined' ? window : globalThis);
