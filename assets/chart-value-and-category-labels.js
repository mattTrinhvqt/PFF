/*
 * PFF Chart Value & Category Labels — v2 (opt-in visual helpers).
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
    categoryEllipsis: '…',
    labelPositionDuration: 210, categoryMinimumFontPx: 5.5
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

  // Default truncate mode retains the v1 API. Shrink mode changes only the label
  // that needs extra room; a minimum font size prevents unreadable tiny text.
  function fitCategoryLabel(ctx, value, maxWidth, options={}) {
    const fullText=String(value??''), ellipsis=String(options.ellipsis??defaults.categoryEllipsis);
    const mode=options.mode==='shrink'?'shrink':'truncate', available=Number(maxWidth);
    const originalFont=ctx?.font||'10px Lato, sans-serif';
    const detected=originalFont.match(/(\d+(?:\.\d+)?)px/);
    const base=Number(options.baseFontPx??(detected?detected[1]:10));
    const min=clamp(Number(options.minFontPx??defaults.categoryMinimumFontPx),1,Math.max(1,base));
    function measure(t,size=base){
      if(ctx?.measureText){
        if(typeof ctx.save==='function'&&typeof ctx.restore==='function'&&detected){
          ctx.save();ctx.font=originalFont.replace(/\d+(?:\.\d+)?px/,`${size}px`);
          const w=ctx.measureText(t).width;ctx.restore();return w;
        }
        return ctx.measureText(t).width*(size/base);
      }
      return String(t).length*6*size/base;
    }
    const result=(text,fontSize,truncated)=>({text,fullText,truncated,scaled:fontSize<base-0.05,
      needsTooltip:truncated,width:measure(text,fontSize),fontSize,mode});
    if(!Number.isFinite(available)||available<=0)return result('',base,!!fullText);
    const width=measure(fullText);
    if(width<=available)return result(fullText,base,false);
    let size=base;
    if(mode==='shrink') {
      size=Math.min(base,Math.max(min,base*available/Math.max(width,0.001)));
      // Account for actual canvas glyph widths instead of relying only on linear scaling.
      if(measure(fullText,size)<=available+0.05)return result(fullText,size,false);
      if(measure(fullText,min)<=available+0.05){
        let lo=min,hi=size;
        for(let i=0;i<12;i++){const mid=(lo+hi)/2;if(measure(fullText,mid)<=available)lo=mid;else hi=mid;}
        return result(fullText,lo,false);
      }
      size=min; // Extreme labels fall back to ellipsis and retain the complete tooltip.
    }
    if(measure(ellipsis,size)>available)return result('',size,!!fullText);
    const chars=Array.from(fullText);let lo=0,hi=chars.length;
    while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(measure(chars.slice(0,mid).join('')+ellipsis,size)<=available)lo=mid;else hi=mid-1;}
    return result(chars.slice(0,lo).join('').trimEnd()+ellipsis,size,true);
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

  // The rendered glyph centre is used rather than its text anchor so changing
  // alignment (left -> right, top -> bottom) does not teleport the label.
  function placementCentre(p,width,fontSize) {
    return {x:p.x+(p.textAlign==='left'?width/2:p.textAlign==='right'?-width/2:0),
      y:p.y+(p.textBaseline==='top'?fontSize/2:p.textBaseline==='bottom'?-fontSize/2:0)};
  }
  function createBarLabelMotion({duration=defaults.labelPositionDuration}={}) {
    const states=new Map(),ms=Math.max(1,Number(duration)||210);
    const nowValue=()=>global.performance?.now?.()??Date.now();
    const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
    function update(key,{placement,tipX,tipY,textWidth=0,fontSize=10,orientation='horizontal',now=nowValue()}={}) {
      if(!placement){states.delete(key);return null;}
      const c=placementCentre(placement,Number(textWidth),Number(fontSize));
      const axis=orientation==='vertical'?'y':'x';
      const tip=axis==='x'?Number(tipX):Number(tipY);
      const desired=c[axis]-tip;
      let st=states.get(key);
      if(!st){st={inside:placement.inside,from:desired,to:desired,start:now,previousColour:placement.colour,colour:placement.colour};states.set(key,st);}
      const current=()=>st.from+(st.to-st.from)*smooth((now-st.start)/ms);
      if(st.inside!==placement.inside){
        const old=current();st.from=old;st.to=desired;st.start=now;
        st.previousColour=st.colour;st.colour=placement.colour;st.inside=placement.inside;
      }else if(st.from!==st.to&&now-st.start<ms){st.to=desired;}
      else{st.from=desired;st.to=desired;st.colour=placement.colour;st.previousColour=placement.colour;}
      const t=clamp((now-st.start)/ms,0,1),progress=smooth(t);
      const offset=st.from+(st.to-st.from)*progress;
      const animating=st.from!==st.to&&t<1;
      if(!animating){st.from=desired;st.to=desired;st.previousColour=placement.colour;}
      return {x:axis==='x'?tip+offset:c.x,y:axis==='y'?tip+offset:c.y,
        colour:placement.colour,previousColour:st.previousColour,progress,inside:placement.inside,animating};
    }
    return {update,clear:key=>key===undefined?states.clear():states.delete(key)};
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
    const motion=createBarLabelMotion({duration:options.labelMoveMs??defaults.labelPositionDuration});
    let redrawPending=false;
    const plugin={id:options.id||'pffBarValueLabels',_labelMotionActive:false,
      afterDatasetsDraw(chart) {
        if(!chart?.chartArea || !chart.ctx)return;
        const ctx=chart.ctx,area=chart.chartArea,mobile=chart.width<=430;
        const orientation=options.orientation||((chart.options?.indexAxis)==='y'?'horizontal':'vertical');
        const gap=mobile?defaults.gapMobile:defaults.gapDesktop,boxes=[];
        let moving=false;
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
            const w=ctx.measureText(text).width,size=mobile?9:10;
            const bg=Array.isArray(dataset.backgroundColor)?dataset.backgroundColor[j]:dataset.backgroundColor;
            const placement=getBarEndPlacement({area,orientation,x:p.x,y:p.y,base:p.base,value:v,
              textWidth:w,fontSize:size,gap,outsideColour:options.getTextColour?.({chart,dataset,index:j,value:v})||MUTED,
              insideColour:contrastText(bg)});
            const key=`${i}:${j}`;
            const pos=motion.update(key,{placement,tipX:p.x,tipY:p.y,textWidth:w,fontSize:size,orientation});
            if(!pos)return;
            moving=moving||pos.animating;
            const rect={left:pos.x-w/2,right:pos.x+w/2,top:pos.y-(size+4)/2,bottom:pos.y+(size+4)/2};
            if(boxes.some(b=>intersects(b,rect)))return;
            boxes.push(rect);ctx.textAlign='center';ctx.textBaseline='middle';
            if(pos.animating && pos.previousColour!==pos.colour){
              ctx.globalAlpha=1-pos.progress;ctx.fillStyle=pos.previousColour;ctx.fillText(text,pos.x,pos.y);
              ctx.globalAlpha=pos.progress;ctx.fillStyle=pos.colour;ctx.fillText(text,pos.x,pos.y);ctx.globalAlpha=1;
            }else{ctx.fillStyle=pos.colour;ctx.fillText(text,pos.x,pos.y);}
          });
        });ctx.restore();plugin._labelMotionActive=moving;
        // On an otherwise static Chart.js frame, finish the label transition.
        if(moving&&!redrawPending&&typeof chart.draw==='function'&&typeof global.requestAnimationFrame==='function'){
          redrawPending=true;global.requestAnimationFrame(()=>{redrawPending=false;if(!chart._destroyed)chart.draw();});
        }
      },beforeDestroy(){motion.clear();}};
    return plugin;
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

  function categorySource(value,scale,labels){
    return typeof scale?.getLabelForValue==='function'?scale.getLabelForValue(value):
      (Array.isArray(labels)?labels[value]??value:value);
  }
  // Chart.js y.ticks.callback; use font callback below alongside shrink mode.
  function createCategoryTickCallback({ctx,maxWidth,labels,ellipsis,mode='truncate',minFontPx,baseFontPx}={}) {
    return function(value){const full=categorySource(value,this,labels);
      return fitCategoryLabel(ctx,full,typeof maxWidth==='function'?maxWidth():maxWidth,
        {ellipsis,mode,minFontPx,baseFontPx}).text;};
  }
  // Chart.js y.ticks.font is scriptable; only oversized category ticks shrink.
  function createCategoryTickFontCallback({ctx,maxWidth,labels,mode='shrink',minFontPx,baseFontPx=10,
        family='Lato, sans-serif',weight='400'}={}) {
    return function(context){const tick=context.tick,value=tick?.value??context.index;
      const full=categorySource(value,context.scale,labels);
      const fit=fitCategoryLabel(ctx||context.chart?.ctx,full,typeof maxWidth==='function'?maxWidth():maxWidth,
        {mode,minFontPx,baseFontPx});
      return {size:fit.fontSize,family,weight};};
  }
  // Opt-in full-name disclosure for truncated canvas category ticks. The caller
  // can provide hit areas from its own renderer, or a real Chart.js category scale.
  function attachCategoryLabelTooltip(canvas,{getRegions,chart,scaleId='y',maxWidth=100,labels}={}) {
    if(!canvas?.addEventListener||!global.document)return {destroy(){},hide(){}};
    const doc=global.document;
    const popup=doc.createElement('div');popup.className='pff-category-label-full-text';
    Object.assign(popup.style,{position:'fixed',zIndex:'9999',pointerEvents:'none',display:'none',
      background:'#ffffff',border:'1px solid #dce0ec',borderRadius:'7px',padding:'6px 9px',
      color:'#151515',boxShadow:'0 3px 12px rgba(20,28,60,.12)',font:'12px Lato,Arial,sans-serif',
      maxWidth:'260px',lineHeight:'1.4',whiteSpace:'normal'});
    doc.body.appendChild(popup);
    let pinned=false,lastText='';
    function regions(){
      if(typeof getRegions==='function')return getRegions()||[];
      const scale=chart?.scales?.[scaleId];if(!scale?.ticks)return [];
      return scale.ticks.map((tick,i)=>{
        const fullText=String(categorySource(tick.value,scale,labels));
        const fit=fitCategoryLabel(chart.ctx,fullText,typeof maxWidth==='function'?maxWidth():maxWidth);
        const py=scale.getPixelForTick?.(i);
        return {left:scale.left,right:scale.right,top:py-9,bottom:py+9,
          fullText,truncated:fit.truncated};
      });
    }
    function regionAt(e){
      const r=canvas.getBoundingClientRect();
      const x=e.clientX-r.left,y=e.clientY-r.top;
      return regions().find(t=>t?.truncated && x>=t.left&&x<=t.right&&y>=t.top&&y<=t.bottom);
    }
    function hide(){popup.style.display='none';lastText='';pinned=false;}
    function show(hit,e){
      if(!hit)return hide();
      lastText=hit.fullText;popup.textContent=hit.fullText;popup.style.display='block';
      const width=popup.offsetWidth,height=popup.offsetHeight;
      const left=clamp(e.clientX+10,5,Math.max(5,global.innerWidth-width-5));
      const above=e.clientY+height+16>global.innerHeight;
      const top=clamp(e.clientY+(above?-height-10:13),5,Math.max(5,global.innerHeight-height-5));
      popup.style.left=`${left}px`;popup.style.top=`${top}px`;
    }
    function pointermove(e){if(e.pointerType==='touch'||pinned)return;const hit=regionAt(e);
      if(hit)show(hit,e);else hide();}
    function pointerdown(e){const hit=regionAt(e);if(hit){pinned=e.pointerType==='touch';show(hit,e);}else hide();}
    function leave(e){if(e.pointerType!=='touch'&&!pinned)hide();}
    function outside(e){if(e.target!==canvas)hide();}
    canvas.addEventListener('pointermove',pointermove);canvas.addEventListener('pointerdown',pointerdown);
    canvas.addEventListener('pointerleave',leave);doc.addEventListener('pointerdown',outside,true);
    return {hide,destroy(){canvas.removeEventListener('pointermove',pointermove);
      canvas.removeEventListener('pointerdown',pointerdown);canvas.removeEventListener('pointerleave',leave);
      doc.removeEventListener('pointerdown',outside,true);popup.remove();}};
  }

  root.chartValueLabels=Object.freeze({version:'2.0.0-review',defaults,contrastText,fitCategoryLabel,
    getBarEndPlacement,getSegmentPlacement,createBarLabelMotion,createBarValueLabelsPlugin,
    createSegmentLabelsPlugin,createCategoryTickCallback,createCategoryTickFontCallback,
    attachCategoryLabelTooltip});
})(typeof window!=='undefined'?window:globalThis);
