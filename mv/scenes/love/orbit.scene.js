// "If I can have you back, I will run the EXECUTION".
// A vector particle-detector display: counter-rotating beams, fading circular tracks,
// and the frozen jet event.
import { clamp, lerp, prog, rng, loadLoveFonts } from './lib.js';
import { makeDetector, jetEnergy, inJet } from './orbit/detector.js';
import { VERTEX_BURSTS } from './orbit/vertex.js';
import { makeBurstTracks, trackFade } from './orbit/tracks.js';

const CX = 1220, CY = 540.5, TAU = Math.PI * 2, D = Math.PI / 180;
const phi = (a) => a * D;

// Character layout and typing events for the thin geometric lettering.
const LINES = [
  {y:381,chars:[['I',119,0,44,-1],['f',131,17,44,-1],['I',184,0,44,170.283],['c',222,25,44,170.658],['a',258,25,44,170.691],['n',298,24,44,170.725]]},
  {y:461,chars:[['h',119,24,44,170.892],['a',155,25,44,170.925],['v',192,25,44,170.942],['e',226,25,44,170.958],['y',282,27,44,171.275,'warm'],['o',318,28,44,171.308,'warm'],['u',358,24,44,171.325,'warm'],['b',421,26,44,171.358],['a',457,26,44,171.375],['c',496,25,44,171.392],['k',534,23,44,171.408]]},
  {y:541,chars:[['I',119,0,44,171.825],['w',158,33,44,172.225],['i',204,0,44,172.258],['l',220,0,44,172.275],['l',236,0,44,172.292],['r',276,17,44,172.308],['u',302,24,44,172.325],['n',341,23,44,172.342],['t',400,16,44,172.542],['h',427,24,44,172.575],['e',464,25,44,172.592]]},
  {y:619,chars:[['E',119,51,81,172.925],['X',187,54,81,172.925],['E',266,51,81,172.925],['C',333,60,82,172.925],['U',416,57,81,172.925],['T',489,55,81,172.925],['I',561,0,81,172.925],['O',587,63,82,172.925],['N',674,55,81,172.925]]},
];

export default {
  id:'love/orbit', start:169.9583333333, end:173.642,
  async create(root,env){
    await loadLoveFonts(['100 22px LoveK2D', '100 63px "Josefin Sans"', '100 115px "Josefin Sans"', '100 49px Raleway']);
    const {ctx}=env.canvas(root);
    const glyphs=LINES.map((line,li)=>({...line,chars:line.chars.map(([ch,x,w,h,t0,col])=>{
      const font=ch==='e'?'100 49px Raleway':`100 ${li===3?115:63}px "Josefin Sans"`;
      ctx.font=font.replace(/([\d.]+)px/,(_,size)=>`${Number(size)*8}px`);const m=ctx.measureText(ch);
      const ascent=m.actualBoundingBoxAscent/8,descent=m.actualBoundingBoxDescent/8,ink=(m.actualBoundingBoxLeft+m.actualBoundingBoxRight)/8;
      const sy=li===3?1:ch==='y'?44/(ascent+descent):(/[acenurovw]/.test(ch)?30:ch==='i'?46:44)/ascent;
      const sx=w?(w+1)/ink:1,baseline=li===3?100:70,height=li===3?130:100;
      // Cached supersampled type keeps its thin strokes stable at both device scales.
      const raster=document.createElement('canvas');raster.width=Math.ceil((ink*sx+8)*3);raster.height=height*3;
      const text=raster.getContext('2d',{willReadFrequently:true});text.scale(3,3);text.translate(4,baseline);text.scale(sx,sy);
      text.font=font;text.textBaseline='alphabetic';text.fillStyle=col==='warm'?'rgb(244,212,184)':'rgb(243,240,240)';text.fillText(ch,m.actualBoundingBoxLeft/8,0);
      return{ch,x,w,h,t0,raster,baseline,height};
    })}));
    const sector=(c,r0,r1,a0,a1)=>{c.beginPath();c.arc(CX,CY,r1,a0,a1);c.arc(CX,CY,r0,a1,a0,true);c.closePath();};
    const circle=(c,r)=>{c.beginPath();c.arc(CX,CY,r,0,TAU);c.stroke();};
    // The detector rings flash from the outside in as the beams approach.
    const ringPath=(radii)=>{const p=new Path2D();for(const r of radii){p.moveTo(CX+r,CY);p.arc(CX,CY,r,0,TAU);}return p;};
    const linePath=(r0,r1)=>{const p=new Path2D();for(let i=0;i<64;i++){const a=i*TAU/64;p.moveTo(CX+r0*Math.cos(a),CY+r0*Math.sin(a));p.lineTo(CX+r1*Math.cos(a),CY+r1*Math.sin(a));}return p;};
    const sectorPath=(ri,ro)=>{const p=new Path2D();for(let i=0;i<12;i++){const a=i*TAU/12,a0=a-phi(13),a1=a+phi(13);p.moveTo(CX+ro*Math.cos(a0),CY+ro*Math.sin(a0));p.arc(CX,CY,ro,a0,a1);p.arc(CX,CY,ri,a1,a0,true);p.closePath();}return p;};
    const bandFill=new Path2D();bandFill.arc(CX,CY,279.4,0,TAU);bandFill.moveTo(CX+272.6,CY);bandFill.arc(CX,CY,272.6,0,TAU,true);
    const tick=new Path2D();for(const sign of [-1,1]){tick.moveTo(CX,CY+sign*413);tick.lineTo(CX,CY+sign*423);}
    const LAYERS=[
      // Path, onset, resting gain, peak gain, residual gain, rise, decay, material offset.
      [ringPath([5,12,20,28]),172.333,.46,1.60,.80,.10,.18,0],
      [ringPath([44,62,80,98,118,140,164]),172.233,.46,1.33,.78,.017,.32,0],
      [ringPath([184,208]),172.183,.74,2.57,1.27,.017,.09,.16],
      [linePath(184,208),172.183,1.26,3.16,1.68,.017,.09,.63],
      [ringPath([212,262]),172.117,.73,1.99,1.25,.045,.12,.15],
      [linePath(208,262),172.117,1.5,2.98,2,.045,.12,.75],
      [ringPath([272,280]),172.067,1.02,3.30,1.69,.025,.09,.14,bandFill],
      [sectorPath(294,304),172.0,1.02,3.16,1.71,.033,.12,.245],
      [sectorPath(322,332),171.95,1.02,3.40,1.69,.017,.09,.245],
      [sectorPath(350,360),171.883,1.02,2.80,1.71,.034,.12,.245],
    ];
    const grey=(g,ex=62)=>{const v=(k)=>Math.min(255,Math.round(k+ex*g));return`rgb(${v(6)},${v(5)},${v(10)+Math.round(2*g)})`;};
    function detector(t){
      ctx.lineWidth=.6;
      for(const[path,on,base,peak,settled,rise,decay,off,fill]of LAYERS){
        const age=t-on;const response=age<=0?base:age<rise?lerp(base,peak,age/rise):settled+(peak-settled)*Math.exp(-(age-rise)/decay);
        const g=Math.max(.1,response-off);
        if(fill){ctx.fillStyle=grey(g,7);ctx.fill(fill,'evenodd');}
        ctx.strokeStyle=grey(g);ctx.stroke(path);}
      const g4=1.35-.49*prog(t,172.48,.187)-.24;
      ctx.lineWidth=.55;ctx.strokeStyle=grey(g4,79);ctx.stroke(ringPath([428]));
      ctx.lineWidth=.6;ctx.strokeStyle='rgb(198,196,205)';ctx.stroke(tick);
    }
    // Final energetic event: three showers and curved low-momentum particles.
    const DETECTOR=makeDetector(),CELLS=DETECTOR.cells;
    // Tracks inside the three jets are nearly straight (high momentum).
    const finalTracks=DETECTOR.tracks.map(tr=>{
      const k=inJet(tr.angle)?tr.curvature*.08:tr.curvature;
      const pts=[];for(let r=0;r<=184;r+=.65){const a=tr.angle+Math.asin(k*r/2);pts.push([r*Math.cos(a),r*Math.sin(a)]);}return{pts,loop:false,jet:inJet(tr.angle)};
    });
    // The shower field is cached once; its ribs are functions of angle and radius.
    const jetCanvas=document.createElement('canvas');jetCanvas.width=jetCanvas.height=380;{
      const jc=jetCanvas.getContext('2d'),img=jc.createImageData(380,380);
      for(let y=0;y<380;y++)for(let x=0;x<380;x++){
        const dx=x+.5-190,dy=y+.5-190,r=Math.hypot(dx,dy);if(r>185)continue;
        const deg=(Math.atan2(dy,dx)*180/Math.PI+360)%360,v=jetEnergy(deg,r);
        if(v<=0)continue;const k=4*(y*380+x),w=v/230;
        img.data[k]=lerp(214,255,clamp(w));img.data[k+1]=lerp(210,255,clamp(w));img.data[k+2]=255;img.data[k+3]=Math.min(255,v*1.08);
      }
      jc.putImageData(img,0,0);
    }
    // Curling tracks: full circles (they start near the vertex).
    for(const[x,y,radius]of DETECTOR.loops){const pts=[];const a0=Math.atan2(-y,-x);for(let i=0;i<=300;i++){const a=a0+TAU*i/300;pts.push([x+radius*Math.cos(a),y+radius*Math.sin(a)]);}finalTracks.push({pts,loop:true});}

    function glow(x,y,r,a=1,color='255,255,255'){
      const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${color},${.85*a})`);g.addColorStop(.24,`rgba(${color},${.25*a})`);g.addColorStop(1,`rgba(${color},0)`);
      ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);
    }
    // Each point's age comes from its travel distance and the phosphor decay.
    const burstTracks=makeBurstTracks(),NL=24,TRACK_GAIN=2.1;
    function bursts(t){
      const frame=t*60,buckets=Array.from({length:NL},()=>new Path2D());
      for(const {frame:f0,tracks}of burstTracks){
        const elapsed=frame-f0;if(elapsed<0||elapsed>66)continue;
        const gain=f0===10312?1.05:f0===10340?1.25:f0===10368?1.45:1;
        const speed=f0===10312||f0===10340?1.25:1;
        for(const points of tracks){
          let previous=-1;
          for(let i=4;i<points.length;i+=4){
            const age=(elapsed-points[i+2])*speed;if(age<0)break;
            const value=TRACK_GAIN*gain*points[i+3]*trackFade(age);
            const q=Math.min(NL-1,Math.round(value*NL));if(q<=0){previous=-1;continue;}
            if(previous!==q)buckets[q].moveTo(CX+points[i-4],CY+points[i-3]);
            buckets[q].lineTo(CX+points[i],CY+points[i+1]);previous=q;
          }
        }
      }
      ctx.save();ctx.beginPath();ctx.arc(CX,CY,184,0,TAU);
      if(t<172.925){ctx.moveTo(CX+61.5,CY);ctx.arc(CX,CY,61.5,0,TAU,true);}
      ctx.clip();ctx.lineWidth=1;
      for(let q=1;q<NL;q++){ctx.strokeStyle=`rgba(242,240,255,${q/NL})`;ctx.stroke(buckets[q]);}
      ctx.restore();
    }
    // Central field: on every burst charged particles leave the vertex. A track starts on a circle
    // through the vertex and tightens into a spiral as the particle slows down: its radius at arc
    // length s is r0*(1-s/S)^0.7 for a particle with range S. Tracks grow outward at a fixed speed,
    // each point fades like the outer tracks from the moment it is drawn, beads mark the hits, and
    // the vertex glows lavender.
    const SPIRAL_EXP=.7,REVEAL_SPEED=37,REVEAL_DELAY=.5,VERTEX_FADE=8,BEAD_GAIN=1.5,NF=40;
    function spiral(th,r0,S,len){
      const pts=[];let x=0,y=0;
      for(let j=0;j*.5<=len;j++){
        const s=j*.5,u=S?1-s/S:1;
        if(S&&Math.abs(r0)*Math.pow(u,SPIRAL_EXP)<=1.2)break;
        if(j%2===0)pts.push(x,y);
        const a=S?th+S/r0*(1-Math.pow(u,1-SPIRAL_EXP))/(1-SPIRAL_EXP):th+s/r0;
        x+=.5*Math.cos(a);y+=.5*Math.sin(a);
      }
      return Float32Array.from(pts);
    }
    // Track colour by distance from the vertex: white, tinted lavender towards the core.
    const fieldColor=(k)=>`rgb(${Math.round(240-55*k)},${Math.round(240-62*k)},${Math.round(242+13*k)})`;
    const vertexBursts=VERTEX_BURSTS.map(([f0,tint,glow,halo,tracks])=>{
      const style=ctx.createRadialGradient(CX,CY,0,CX,CY,61.5);
      style.addColorStop(0,fieldColor(tint));style.addColorStop(.33,fieldColor(tint*.7));style.addColorStop(1,fieldColor(tint*.45));
      return{f0,glow,halo,style,tracks:tracks.map(([th,r0,S,len,I],i)=>{
        const pts=spiral(th*D,r0,S,len),n=pts.length/2,rand=rng(f0*97+i),beads=[];
        for(let at=3+6*rand();at<n;at+=6+6*rand())beads.push(Math.round(at));
        return{pts,beads,v:I/255};
      })};
    });
    const fieldFade=trackFade;
    // Vertex glow: a small lavender-white core and a wider blue-lavender halo (gaussian profiles).
    const gaussGlow=(sigma,rgb)=>{const g=ctx.createRadialGradient(CX,CY,0,CX,CY,3*sigma);
      for(let k=0;k<=6;k++)g.addColorStop(k/6,`rgba(${rgb},${k<6?Math.exp(-k*k/8):0})`);return g;};
    const glowCore=gaussGlow(1.5,'220,216,255'),glowHalo=gaussGlow(7,'140,128,255');
    function centralField(t){
      if(t>=172.925)return;
      ctx.save();ctx.beginPath();ctx.arc(CX,CY,61.5,0,TAU);ctx.clip();
      ctx.globalCompositeOperation='lighter';ctx.lineWidth=1;
      for(const b of vertexBursts){
        const age=t*60-b.f0;if(age<0||age>54)continue;
        const lit=fieldFade(age-REVEAL_DELAY);
        for(const[style,a,r]of[[glowCore,b.glow,4.5],[glowHalo,b.halo,21]])if(a*lit>0){ctx.globalAlpha=a*lit;ctx.fillStyle=style;ctx.fillRect(CX-r,CY-r,2*r,2*r);}
        ctx.globalAlpha=1;
        const lines=Array.from({length:NF},()=>new Path2D()),dots=Array.from({length:NF},()=>new Path2D());
        for(const{pts:p,beads,v}of b.tracks){
          const n=p.length/2;let prev=-1;
          for(let i=1;i<n;i++){
            const a=age-REVEAL_DELAY-i/REVEAL_SPEED;if(a<0)break;
            // Tracks emerge from the vertex glow over their first few pixels.
            const q=Math.min(NF-1,Math.round(v*fieldFade(a)*Math.min(1,i/VERTEX_FADE)*NF));
            if(q<=0){prev=-1;continue;}
            if(q!==prev)lines[q].moveTo(CX+p[2*i-2],CY+p[2*i-1]);
            lines[q].lineTo(CX+p[2*i],CY+p[2*i+1]);prev=q;
          }
          for(const i of beads){
            const a=age-REVEAL_DELAY-i/REVEAL_SPEED;if(a<0)break;
            const q=Math.min(NF-1,Math.round(Math.min(1,v*BEAD_GAIN*fieldFade(a)*Math.min(1,i/VERTEX_FADE))*NF));if(q<=0)continue;
            const x=CX+p[2*i],y=CY+p[2*i+1];dots[q].moveTo(x+.8,y);dots[q].arc(x,y,.8,0,TAU);
          }
        }
        ctx.strokeStyle=ctx.fillStyle=b.style;
        for(let q=1;q<NF;q++){ctx.globalAlpha=q/NF;ctx.stroke(lines[q]);ctx.fill(dots[q]);}
        ctx.globalAlpha=1;
      }
      ctx.restore();
    }
    function beams(t){
      if(t>172.94)return;
      function position(tm,k){
        const inward=Math.max(0,tm-172.35);
        const base=phi(337.5-780*(tm-169.966666667)-28*inward*inward);
        const radius=428*(1-prog(tm,172.359,.562));
        const a=k?3*Math.PI-base:base;
        return[CX+radius*Math.cos(a),CY+radius*Math.sin(a)];
      }
      const fade=1-prog(t,172.9,.035);
      for(let k=0;k<2;k++){
        // The tail follows the past trajectory, so it bends outward as the heads
        // spiral inward. Tail: full brightness at the head, smooth fall-off over ~56 degrees (0.072 s).
        for(let n=0;n<28;n++){
          const age=n*.0026,[x0,y0]=position(t-age,k),[x1,y1]=position(t-age-.0028,k),u=Math.min(1,(age+.0013)/.0718);
          ctx.strokeStyle=`rgba(250,248,255,${(1-u*u*(3-2*u))*fade})`;ctx.lineWidth=2.2;
          ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();
        }
        const[x,y]=position(t,k);glow(x,y,15,.75*fade);ctx.fillStyle=`rgba(255,255,255,${fade})`;ctx.beginPath();ctx.arc(x,y,2,0,TAU);ctx.fill();
      }
    }
    function event(t){
      // The final collision propagates outward at a fixed display speed.
      const R=clamp((t-172.925)*2200,0,186);if(R<=0)return;
      ctx.save();ctx.beginPath();ctx.arc(CX,CY,Math.min(184,R),0,TAU);ctx.clip();
      ctx.drawImage(jetCanvas,CX-190,CY-190);
      ctx.translate(CX,CY);
      finalTracks.forEach((tr,i)=>{
        const pts=tr.pts;ctx.strokeStyle=tr.jet?'rgba(250,249,255,.6)':tr.loop?'rgba(206,203,255,.68)':i%4===0?'rgba(185,182,255,.82)':'rgba(247,245,255,.93)';ctx.lineWidth=tr.loop?.75:.7;ctx.beginPath();pts.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
        ctx.fillStyle='rgba(255,255,255,.95)';for(let j=8+i%15;j<pts.length;j+=17+i%7){const[x,y]=pts[j];ctx.beginPath();ctx.arc(x,y,.7,0,TAU);ctx.fill();}
      });
      // Missing transverse energy inside the tracker appears with the tracks.
      {const aa=phi(181.6);ctx.strokeStyle='rgb(255,212,173)';ctx.lineWidth=1.6;ctx.shadowColor='rgb(255,212,173)';ctx.shadowBlur=6;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(184*Math.cos(aa),184*Math.sin(aa));ctx.stroke();ctx.shadowBlur=0;}
      ctx.restore();
      // Collision flash at the vertex (peak at 172.95, then a slow decay).
      glow(CX,CY,34,prog(t,172.925,.012)*(.95+.5*Math.exp(-Math.max(0,t-172.95)/.15)),'236,234,255');
      {const c=prog(t,172.925,.008)*(.38+.62*Math.exp(-Math.max(0,t-172.933)/.08));
       const g=ctx.createRadialGradient(CX,CY,0,CX,CY,30);g.addColorStop(0,`rgba(255,255,255,${c})`);g.addColorStop(13/30,`rgba(252,251,255,${c})`);g.addColorStop(1,'rgba(240,238,255,0)');
       ctx.fillStyle=g;ctx.fillRect(CX-26,CY-26,52,52);}
      const cells=t>=173.009?1:0,a=1-(1-prog(t,173.033,.05))**3.4;if(cells<=0)return;
      ctx.save();
      // Cool calorimeter readout and its thin illuminated outer ring.
      for(let i=0;i<64;i++){
        const cell=CELLS[i],a0=i*TAU/64+.004,a1=(i+1)*TAU/64-.004;
        sector(ctx,184.5,207.5,a0,a1);ctx.fillStyle=`rgb(${cell.inner.join(',')})`;ctx.fill();
        sector(ctx,212.5,261.5,a0,a1);ctx.fillStyle=`rgb(${cell.outer.join(',')})`;ctx.fill();
        if(a<=0)continue;
        ctx.globalAlpha=a;
        if(cell.bar.reduce((s,v)=>s+v,0)>190){sector(ctx,263,280,a0,a1);ctx.fillStyle=`rgb(${cell.bar.join(',')})`;ctx.fill();}
        if(cell.height){
          // Towers bloom: a soft lavender halo and a bright cap on top.
          const h=lerp(280,cell.height,1-(1-prog(t,173.033,.067))**3.5);sector(ctx,280,h,a0,a1);
          const g=ctx.createRadialGradient(CX,CY,280,CX,CY,cell.height);cell.ramp.forEach((rgb,j)=>g.addColorStop(j/2,`rgb(${rgb.join(',')})`));ctx.fillStyle=g;
          ctx.shadowColor='rgba(150,140,255,.85)';ctx.shadowBlur=14;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#eeebff';ctx.lineWidth=.7;ctx.stroke();
          if(h>284){ctx.beginPath();ctx.arc(CX,CY,h-1.2,a0+.003,a1-.003);ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=2.2;ctx.stroke();}
        }
        ctx.globalAlpha=1;
      }
      if(a<=0){ctx.restore();return;}
      ctx.globalAlpha=a;
      ctx.shadowColor='#7774ff';ctx.shadowBlur=9;ctx.strokeStyle='rgb(173,166,255)';ctx.lineWidth=1;circle(ctx,267);ctx.shadowBlur=0;
      ctx.setLineDash([19,3]);ctx.strokeStyle='rgb(205,200,255)';ctx.lineWidth=.8;circle(ctx,265);ctx.setLineDash([]);
      // Missing transverse energy and the third jet cross the outer detector.
      for(const [angle,color,fill]of[[181.6,'255,212,173','rgba(245,175,130,.23)'],[65.3,'248,248,255','rgba(248,248,255,.155)']]){
        const aa=phi(angle),x=CX+360*Math.cos(aa),y=CY+360*Math.sin(aa);ctx.strokeStyle=`rgb(${color})`;ctx.lineWidth=1.6;ctx.shadowColor=`rgb(${color})`;ctx.shadowBlur=6;
        ctx.beginPath();ctx.moveTo(CX+184*Math.cos(aa),CY+184*Math.sin(aa));ctx.lineTo(x,y);ctx.stroke();ctx.shadowBlur=0;
        for(const [ri,ro]of[[294,304],[322,332],[350,360]]){sector(ctx,ri,ro,aa-phi(13),aa+phi(13));ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=`rgba(${color},.9)`;ctx.lineWidth=.85;ctx.stroke();}
      }
      // Muon arrow.
      const aa=phi(-10.5),rr=148,x=CX+rr*Math.cos(aa),y=CY+rr*Math.sin(aa);ctx.strokeStyle='#eeedff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(CX,CY);ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle='#f8f7ff';ctx.beginPath();ctx.moveTo(x+8*Math.cos(aa),y+8*Math.sin(aa));ctx.lineTo(x-4*Math.cos(aa)+4*Math.sin(aa),y-4*Math.sin(aa)-4*Math.cos(aa));ctx.lineTo(x-4*Math.cos(aa)-4*Math.sin(aa),y-4*Math.sin(aa)+4*Math.cos(aa));ctx.closePath();ctx.fill();
      ctx.restore();
    }
    function words(t){
      ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
      for(const line of glyphs)for(const g of line.chars){
        // Glyphs pop in within about one frame (wipe + fade per glyph).
        const a=g.t0<0?1:clamp((t-g.t0+.008)/.018);if(a<=0)continue;
        ctx.save();ctx.globalAlpha=.3+.7*a;
        ctx.beginPath();ctx.rect(g.x-3,line.y-4,(g.w+6)*clamp(a*1.25),g.h+25);ctx.clip();
        ctx.drawImage(g.raster,g.x-4,line.y+g.h-g.baseline,g.raster.width/3,g.height);ctx.restore();
      }ctx.restore();
    }
    function labels(t){
      ctx.save();ctx.font='100 21.4px LoveK2D';ctx.fillStyle='#ece8f0';ctx.textBaseline='alphabetic';
      const label=(text,l,r,top,bottom)=>{const m=ctx.measureText(text);ctx.save();ctx.translate(l,top);
        ctx.scale((r-l+1)/(m.actualBoundingBoxLeft+m.actualBoundingBoxRight),(bottom-top+1)/(m.actualBoundingBoxAscent+m.actualBoundingBoxDescent));
        ctx.fillText(text,m.actualBoundingBoxLeft,m.actualBoundingBoxAscent);ctx.restore();};
      if(t>=172.35)label('Run 34',1583,1648,930,944);
      if(t>=172.942)label('Event 1',1583,1648,954,968);
      const left=['Muon 43 GeV','MET   36 GeV','mT    78 GeV'],right=['Jet 1 410 GeV','Jet 2 396 GeV','Jet 3  99 GeV'];
      for(let j=0;j<3;j++){
        const p=prog(t,173.267+j/30,.0833);
        if(p>0)for(const [text,l,r]of[[left[j],790,916],[right[j],1511,1648]]){ctx.save();ctx.beginPath();ctx.rect(l-2,107+j*24,(r-l+4)*p,23);ctx.clip();label(text,l,r,111+j*24,125+j*24);ctx.restore();}
        // Jet number tags: fade-in and peak brightness per tag (independent of the text wipe).
        if(t<173.25)continue;
        ctx.save();ctx.globalAlpha=(j===0?.7:.87)*prog(t,j===0?173.283:173.25,j===0?.017:.067);const[l,r,top,bot]=[[1451,1460,225,239],[926,936,803,817],[1408,1418,870,884]][j];label(String(j+1),l,r,top,bot);ctx.restore();
      }ctx.restore();
    }
    return{render(t){
      ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgb(6,5,10)';ctx.fillRect(0,0,1920,1080);
      // The detector gains contrast as the beams are brought into the centre.
      detector(t);bursts(t);beams(t);centralField(t);event(t);words(t);labels(t);
    }};
  },
};
