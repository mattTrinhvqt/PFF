/*
 * PFF Chart Value & Category Labels — v1 (opt-in visual helpers).
 * Existing PFF patterns: practice_landscape bar-end values;
 * maldistribution positive/negative labels; rurality/practice segment labels.
 * No data transforms, global Chart defaults, scripts, axes or animation changes.
 * Endpoint labels and annual-trend pills remain in chart-trends-and-labels.js.
 */
(function (global) {
  'use strict';
  const root = global.PFFModules || (global.PFFModules = {});
  const INK = '#151515', MUTED = '#69718a';
  const defaults = Object.freeze({
    fontDesktop: '700 10px Lato, sans-serif',
    fontMobile: '700 9px Lato, sans-serif',
    segmentFontDesktop: '700 10px Lato, sans-serif',
    segmentFontMobile: '700 9px Lato, sans-serif',
    gapDesktop: 5, gapMobile: 4,
    segmentPadding: 8, segmentMinWidth: 30,
    categoryMaxWidthDesktop: 146, categoryMaxWidthMobile: 98,
    categoryEllipsis: '…'
  });
  const finite = v => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const visible = (meta, chart, i) => !!meta && !meta.hidden && (typeof chart.isDatasetVisible !== 'function' || chart.isDatasetVisible(i));
  const intersects = (a,b,pad=2) => a.left < b.right+pad && a.right+pad > b.left && a.top < b.bottom+pad && a.bottom+pad > b.top;
  const within = (x,y,a) => finite(x) && finite(y) && x>=a.left && x<=a.right && y>=a.top && y<=a.bottom;

  function contrastText(colour, fallback = '#ffffff') {
    if (typeof colour !== 'string') return fallback;
    let m = colour.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i), rgb;
    if (m) {
      let h=m[1]; if(h.length===3)h=h.split('').map(c=>c+c).join('');
      const n=parseInt(h,16);rgb=[(n>>16)&255,(n>>8)&255,n&255];
    } else {
      m=colour.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
      if(!m)return fallback;
      rgb=[Number(m[1]),Number(m[2]),Number(m[3])];
    }
    const luminance=rgb.map(v=>{const c=clamp(v/255,0,1);return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;});
    return (0.2126*luminance[0]+0.7152*luminance[1]+0.0722*luminance[2])>0.19?INK:'#ffffff';
  }

  function fitCategoryLabel(ctx, value, maxWidth, options={}) {
    const fullText=String(value??'');
    const ellipsis=String(options.ellipsis??defaults.categoryEllipsis);
    const measure=t=>ctx?.measureText?ctx.measureText(t).width:t.length*6;
    const width=Number(maxWidth);
    if (!Number.isFinite(width) || width<=0) return {text:'',fullText,truncated:!!fullText,width:0};
    if (measure(fullText)<=width) return {text:fullText,fullText,truncated:false,width:measure(fullText)};
    if (measure(ellipsis)>width) return {text:'',fullText,truncated:true,width:0};
    const letters=Array.from(fullText);let lo=0,hi=letters.length;
    while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(measure(letters.slice(0,mid).join('')+ellipsis)<=width)lo=mid;else hi=mid-1;}
    const text=letters.slice(0,lo).join('').trimEnd()+ellipsis;
    return {text,fullText,truncated:true,width:measure(text)};
  }

  function getBarEndPlacement({area, orientation='horizontal', x, y, base, value, textWidth,
                               fontSize=10, gap=5, outsideColour=MUTED, insideColour='#ffffff'}={}) {
    if(!area || !within(x,y,area) || !finite(base) || !finite(value) || !finite(textWidth))return null;
    const sign=Number(value)<0?-1:1, w=Math.max(0,Number(textWidth));
    if(orientation==='vertical'){
      const above=sign>=0, targetY=y+(above?-gap:gap);
      if((above?targetY-fontSize>=area.top:targetY+fontSize<=area.bottom))
        return {x,y:targetY,textAlign:'center',textBaseline:above?'bottom':'top',colour:outsideColour,inside:false};
      if(Math.abs(base-y)>=fontSize+gap*2)
        return {x,y:y+(above?gap:-gap),textAlign:'center',textBaseline:above?'top':'bottom',colour:insideColour,inside:true};
      return null;
    }
    const proposed=x+sign*gap;
    if(sign>0?proposed+w<=area.right-2:proposed-w>=area.left+2)
      return {x:proposed,y,textAlign:sign>0?'left':'right',textBaseline:'middle',colour:outsideColour,inside:false};
    // Only move inside when there is space for the full label; never paint across an axis.
    if(Math.abs(x-base)>=w+2*gap)
      return {x:x-sign*gap,y,textAlign:sign>0?'right':'left',textBaseline:'middle',colour:insideColour,inside:true};
    return null;
  }

  function getSegmentPlacement({area,left,right,y,height=16,textWidth,colour,minimumWidth=defaults.segmentMinWidth,padding=defaults.segmentPadding}={}) {
    if(!area || ![left,right,y,textWidth].every(finite))return null;
    const a=Math.max(Number(area.left),Math.min(Number(left),Number(right)));
    const b=Math.min(Number(area.right),Math.max(Number(left),Number(right)));
    if(b-a<Math.max(Number(minimumWidth),Number(textWidth)+Number(padding)) ||
       y-height/2<area.top || y+height/2>area.bottom)return null;
    return {x:(a+b)/2,y,textAlign:'center',textBaseline:'middle',colour:contrastText(colour),inside:true};
  }

  function renderedValue(chart, props, orientation, fallback) {
    const scale=chart.scales?.[orientation==='horizontal'?'x':'y'];
    if (scale?.getValueForPixel && finite(props.base)) {
      const tip=scale.getValueForPixel(orientation==='horizontal'?props.x:props.y);
      const base=scale.getValueForPixel(props.base);
      if(finite(tip)&&finite(base))return Math.abs(tip-base)<1e-7?0:tip-base;
    }
    return Number(fallback);
  }
  function rawNumber(raw, orientation) {return raw && typeof raw==='object' ? raw[orientation==='horizontal'?'x':'y'] : raw;}
  const basicNumber = n => Number.isFinite(n) ? new Intl.NumberFormat('en-AU',{maximumFractionDigits:1}).format(n) : '';

  // By default, no chart or dataset receives labels. Explicitly opt in on each page.
  function createBarValueLabelsPlugin(options={}) {
    return {id:options.id||'pffBarValueLabels', afterDatasetsDraw(chart) {
      if(!chart?.chartArea || !chart.ctx)return;
      const ctx=chart.ctx, area=chart.chartArea, mobile=chart.width<=430;
      const orientation=options.orientation||((chart.options?.indexAxis)==='y'?'horizontal':'vertical');
      const gap=mobile?defaults.gapMobile:defaults.gapDesktop, boxes=[];
      ctx.save();ctx.font=mobile?defaults.fontMobile:defaults.fontDesktop;
      chart.data?.datasets?.forEach((dataset,i)=>{
        const meta=chart.getDatasetMeta(i);
        if(!visible(meta,chart,i) || !(options.showFor?.({chart,dataset,datasetIndex:i})??dataset._pffShowBarValueLabels))return;
        meta.data?.forEach((element,j)=>{
          if(!element?.getProps)return;
          const p=element.getProps(['x','y','base'],false);
          const raw=rawNumber(dataset.data?.[j],orientation);
          const v=renderedValue(chart,p,orientation,raw);
          if(!finite(v))return;
          const text=String(options.formatValue?.(v,{chart,dataset,datasetIndex:i,index:j})??basicNumber(v));
          if(!text)return;
          const w=ctx.measureText(text).width;
          const size=mobile?9:10;
          const bg=Array.isArray(dataset.backgroundColor)?dataset.backgroundColor[j]:dataset.backgroundColor;
          const placement=getBarEndPlacement({area,orientation,x:p.x,y:p.y,base:p.base,value:v,
            textWidth:w,fontSize:size,gap,outsideColour:options.getTextColour?.({chart,dataset,index:j,value:v})||MUTED,
            insideColour:contrastText(bg)});
          if(!placement)return;
          const h=size+4;
          const left=placement.textAlign==='right'?placement.x-w:placement.textAlign==='center'?placement.x-w/2:placement.x;
          const top=placement.textBaseline==='bottom'?placement.y-h:placement.textBaseline==='top'?placement.y:placement.y-h/2;
          const rect={left,right:left+w,top,bottom:top+h};
          if(boxes.some(b=>intersects(b,rect)))return;
          boxes.push(rect);ctx.textAlign=placement.textAlign;ctx.textBaseline=placement.textBaseline;
          ctx.fillStyle=placement.colour;ctx.fillText(text,placement.x,placement.y);
        });
      });ctx.restore();
    }};
  }

  function createSegmentLabelsPlugin(options={}) {
    return {id:options.id||'pffSegmentValueLabels',afterDatasetsDraw(chart){
      if(!chart?.chartArea || !chart.ctx)return;
      const ctx=chart.ctx, area=chart.chartArea,mobile=chart.width<=430;
      ctx.save();ctx.font=mobile?defaults.segmentFontMobile:defaults.segmentFontDesktop;
      chart.data?.datasets?.forEach((dataset,i)=>{
        const meta=chart.getDatasetMeta(i);
        if(!visible(meta,chart,i) || !(options.showFor?.({chart,dataset,datasetIndex:i})??dataset._pffShowSegmentLabels))return;
        meta.data?.forEach((element,j)=>{
          if(!element?.getProps)return;
          const p=element.getProps(['x','y','base','height'],false);
          if(![p.x,p.y,p.base].every(finite))return;
          const raw=rawNumber(dataset.data?.[j],'horizontal');
          const value=renderedValue(chart,p,'horizontal',raw);
          const text=String(options.formatValue?.(value,{chart,dataset,datasetIndex:i,index:j})??basicNumber(value));
          if(!text)return;
          const bg=Array.isArray(dataset.backgroundColor)?dataset.backgroundColor[j]:dataset.backgroundColor;
          const placement=getSegmentPlacement({area,left:p.base,right:p.x,y:p.y,height:p.height||16,
            textWidth:ctx.measureText(text).width,colour:bg,
            minimumWidth:options.minimumWidth??defaults.segmentMinWidth});
          if(!placement)return;
          ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=placement.colour;
          ctx.fillText(text,placement.x,placement.y);
        });
      });ctx.restore();
    }};
  }

  // Tick text is only shortened when the existing axis has insufficient space.
  // The full string is returned by fitCategoryLabel for app-specific accessibility/tooltip use.
  function createCategoryTickCallback({ctx,maxWidth,labels,ellipsis}={}) {
    return function (value) {
      const full=typeof this?.getLabelForValue==='function'?this.getLabelForValue(value):
        (Array.isArray(labels)?labels[value]??value:value);
      return fitCategoryLabel(ctx,full,typeof maxWidth==='function'?maxWidth():maxWidth,{ellipsis}).text;
    };
  }

  root.chartValueLabels=Object.freeze({version:'1.0.0-review',defaults,contrastText,fitCategoryLabel,
    getBarEndPlacement,getSegmentPlacement,createBarValueLabelsPlugin,
    createSegmentLabelsPlugin,createCategoryTickCallback});
})(typeof window!=='undefined'?window:globalThis);
