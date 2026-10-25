// "If I can have you back, I will run the EXECUTION".
// A vector particle-detector display: counter-rotating beams, fading circular tracks,
// and the frozen jet event.
import { clamp, lerp, prog, table, rng, loadLoveFonts } from './lib.js';
import { DETECTOR } from './orbit/detector.js';
import { LABELS } from './orbit/labels.js';
import { ORBIT_MOTION } from './orbit/motion.js';
import { OPENING_PATHS } from './orbit/opening.js';
import { CENTRAL_FIELD } from './orbit/central-field.js';
import { BURST_TRACKS, BURST_INNER } from './orbit/tracks.js';
import { JETS } from './orbit/jets.js';
import { EVENT_LOOPS } from './orbit/loops.js';

const CX = 1220, CY = 540.5, TAU = Math.PI * 2, D = Math.PI / 180;
const phi = (a) => a * D;

// Lyric glyphs as monoline vector ink, revealed per character on the original's timing.
const LINES = [
  {y:381,chars:[['I',119,0,44,-1],['f',131,17,44,-1],['I',184,0,44,170.283],['c',222,25,44,170.658],['a',258,25,44,170.691],['n',298,24,44,170.725]]},
  {y:461,chars:[['h',119,24,44,170.892],['a',155,25,44,170.925],['v',192,25,44,170.942],['e',226,25,44,170.958],['y',282,27,44,171.275,'warm'],['o',318,28,44,171.308,'warm'],['u',358,24,44,171.325,'warm'],['b',421,26,44,171.358],['a',457,26,44,171.375],['c',496,25,44,171.392],['k',534,23,44,171.408]]},
  {y:541,chars:[['I',119,0,44,171.825],['w',158,33,44,172.225],['i',204,0,44,172.258],['l',220,0,44,172.275],['l',236,0,44,172.292],['r',276,17,44,172.308],['u',302,24,44,172.325],['n',341,23,44,172.342],['t',400,16,44,172.542],['h',427,24,44,172.575],['e',464,25,44,172.592]]},
  {y:619,chars:[['E',119,51,81,172.925],['X',187,54,81,172.925],['E',266,51,81,172.925],['C',333,60,82,172.925],['U',416,57,81,172.925],['T',489,55,81,172.925],['I',561,0,81,172.925],['O',587,63,82,172.925],['N',674,55,81,172.925]]},
];

export default {
  id:'love/orbit', start:169.9583333333, end:173.642,
  async create(root,env){
    await loadLoveFonts(['100 22px LoveK2D']);
    const {ctx}=env.canvas(root);
    const labelPaths=new Map(Object.entries(LABELS).map(([text,v])=>[text,{...v,shape:new Path2D(v.path)}]));
    const headX=ORBIT_MOTION.heads.map(([t,x])=>[t,x+.5]),headY=ORBIT_MOTION.heads.map(([t,x,y])=>[t,y+.5]);
    const glyphs=LINES.map((line,li)=>({...line,chars:line.chars.map(([ch,x,w,h,t0,col],ci)=>({ch,x,w,h,t0,col,p:new Path2D(OPENING_PATHS[`${li}:${ci}`])}))}));
    const sector=(c,r0,r1,a0,a1)=>{c.beginPath();c.arc(CX,CY,r1,a0,a1);c.arc(CX,CY,r0,a1,a0,true);c.closePath();};
    const circle=(c,r)=>{c.beginPath();c.arc(CX,CY,r,0,TAU);c.stroke();};
    // Static detector as vector layers. Each layer has its own brightness
    // (stroke excess over the background, relative to rgb(68,67,74)): the layers flash
    // from the outside in as the beams are brought into the centre (171.90-172.25).
    const ringPath=(radii)=>{const p=new Path2D();for(const r of radii){p.moveTo(CX+r,CY);p.arc(CX,CY,r,0,TAU);}return p;};
    const linePath=(r0,r1)=>{const p=new Path2D();for(let i=0;i<64;i++){const a=i*TAU/64;p.moveTo(CX+r0*Math.cos(a),CY+r0*Math.sin(a));p.lineTo(CX+r1*Math.cos(a),CY+r1*Math.sin(a));}return p;};
    const sectorPath=(ri,ro)=>{const p=new Path2D();for(let i=0;i<12;i++){const a=i*TAU/12,a0=a-phi(13),a1=a+phi(13);p.moveTo(CX+ro*Math.cos(a0),CY+ro*Math.sin(a0));p.arc(CX,CY,ro,a0,a1);p.arc(CX,CY,ri,a1,a0,true);p.closePath();}return p;};
    const bandFill=new Path2D();bandFill.arc(CX,CY,279.4,0,TAU);bandFill.moveTo(CX+272.6,CY);bandFill.arc(CX,CY,272.6,0,TAU,true);
    const tick=new Path2D();for(const sign of [-1,1]){tick.moveTo(CX,CY+sign*413);tick.lineTo(CX,CY+sign*423);}
    const LAYERS=[
      [ringPath([5,12,20,28,44,62,80,98,118,140,164]),[[172.233,.46],[172.25,1.33],[172.333,1.28],[172.367,1.25],[172.4,1.13],[172.433,1.1],[172.5,1.08],[172.6,.97],[172.7,.9],[172.8,.85]],.0],
      [ringPath([184,208]),[[172.183,.74],[172.2,2.57],[172.233,2.35],[172.267,1.98],[172.3,1.78],[172.333,1.61],[172.367,1.55],[172.4,1.45],[172.467,1.4],[172.5,1.38],[172.6,1.33],[172.733,1.27]],.16],
      [linePath(184,208),[[172.183,1.26],[172.2,3.16],[172.233,2.95],[172.267,2.58],[172.3,2.2],[172.333,2.05],[172.4,1.84],[172.5,1.74],[172.8,1.68]],.63],
      [ringPath([212,262]),[[172.117,.73],[172.133,1.95],[172.2,1.97],[172.233,1.85],[172.267,1.6],[172.3,1.51],[172.333,1.42],[172.4,1.35],[172.5,1.31],[172.6,1.29],[172.8,1.25]],.15],
      [linePath(208,262),[[172.117,1.5],[172.133,2.94],[172.2,2.94],[172.233,2.75],[172.267,2.44],[172.3,2.25],[172.333,2.19],[172.4,2.06],[172.5,2.0]],.75],
      [ringPath([272,280]),[[172.067,1.02],[172.083,3.3],[172.1,3.3],[172.133,2.98],[172.167,2.6],[172.2,2.39],[172.233,2.18],[172.267,1.9],[172.3,1.88],[172.333,1.83],[172.4,1.77],[172.5,1.71],[172.6,1.69]],.14,bandFill],
      [sectorPath(294,304),[[172.0,1.02],[172.017,2.1],[172.033,3.16],[172.067,3.04],[172.1,2.71],[172.133,2.47],[172.167,2.2],[172.2,2.16],[172.233,2.02],[172.267,1.88],[172.333,1.84],[172.4,1.82],[172.6,1.76],[172.8,1.71]],.245],
      [sectorPath(322,332),[[171.95,1.02],[171.967,3.4],[172.0,3.04],[172.033,2.6],[172.067,2.33],[172.1,2.2],[172.133,2.12],[172.167,2.0],[172.233,1.86],[172.267,1.78],[172.333,1.73],[172.6,1.69]],.245],
      [sectorPath(350,360),[[171.883,1.02],[171.9,1.73],[171.917,2.8],[171.967,2.7],[172.0,2.37],[172.033,2.24],[172.067,2.06],[172.1,2.0],[172.133,1.96],[172.2,1.94],[172.233,1.82],[172.267,1.78],[172.5,1.71]],.245],
    ];
    const grey=(g,ex=62)=>{const v=(k)=>Math.min(255,Math.round(k+ex*g));return`rgb(${v(6)},${v(5)},${v(10)+Math.round(2*g)})`;};
    function detector(t){
      ctx.lineWidth=.6;
      // off: the source's codec noise floor adds ~1.2 grey to the band energies.
      for(const[path,gain,off,fill]of LAYERS){const g=Math.max(.1,table(gain,t)-off);
        if(fill){ctx.fillStyle=grey(g,7);ctx.fill(fill,'evenodd');}
        ctx.strokeStyle=grey(g);ctx.stroke(path);}
      const g4=table([[172.45,1.35],[172.5,1.3],[172.533,1.15],[172.567,1.02],[172.6,.93],[172.667,.86]],t)-.24;
      ctx.lineWidth=.55;ctx.strokeStyle=grey(g4,79);ctx.stroke(ringPath([428]));
      ctx.lineWidth=.6;ctx.strokeStyle='rgb(198,196,205)';ctx.stroke(tick);
    }
    // Final energetic event: 3 jets and curved low-momentum particles.
    // Cell 32 sits under the missing-energy line; its sampled colour picked up the orange glow.
    // On the original the cell itself is dark like its neighbour.
    const CELLS=DETECTOR.cells.map((c,i)=>i===32?{...c,inner:[16,15,22],outer:[15,15,27],bar:[27,25,62]}:c);
    // Tracks inside the three jets are nearly straight (high momentum).
    const inJet=(a)=>{const d=((a*180/Math.PI)%360+360)%360;return JETS.some(([lo,fi])=>d>=lo-2&&d<=lo+fi.length*.5+2);};
    const finalTracks=DETECTOR.tracks.map(tr=>{
      const k=inJet(tr.angle)?tr.curvature*.08:tr.curvature;
      const pts=[];for(let r=0;r<=184;r+=.65){const a=tr.angle+Math.asin(k*r/2);pts.push([r*Math.cos(a),r*Math.sin(a)]);}return{pts,loop:false,jet:inJet(tr.angle)};
    });
    // Jet wedges rendered once from their angular brightness profiles.
    const jetCanvas=document.createElement('canvas');jetCanvas.width=jetCanvas.height=380;{
      const jc=jetCanvas.getContext('2d'),img=jc.createImageData(380,380);
      for(let y=0;y<380;y++)for(let x=0;x<380;x++){
        const dx=x+.5-190,dy=y+.5-190,r=Math.hypot(dx,dy);if(r>185)continue;
        const deg=(Math.atan2(dy,dx)*180/Math.PI+360)%360;let v=0;
        for(const[lo,fi,fo]of JETS){const u=(deg-lo)/.5;if(u<0||u>fi.length-1)continue;const i=Math.floor(u),f=u-i,j=Math.min(i+1,fi.length-1);
          const vi=fi[i]+(fi[j]-fi[i])*f,vo=fo[i]+(fo[j]-fo[i])*f,m=clamp((r-55)/60);v=Math.max(vi,(vi+(vo-vi)*m*m*(3-2*m)));if(r>=55)v=vi+(vo-vi)*m*m*(3-2*m);}
        if(v<=0)continue;const k=4*(y*380+x),w=v/230;
        img.data[k]=lerp(214,255,clamp(w));img.data[k+1]=lerp(210,255,clamp(w));img.data[k+2]=255;img.data[k+3]=Math.min(255,v*1.08);
      }
      jc.putImageData(img,0,0);
    }
    // Curling tracks: full circles (they start near the vertex).
    for(const[x,y,radius]of EVENT_LOOPS){const pts=[];const a0=Math.atan2(-y,-x);for(let i=0;i<=300;i++){const a=a0+TAU*i/300;pts.push([x+radius*Math.cos(a),y+radius*Math.sin(a)]);}finalTracks.push({pts,loop:true});}

    function glow(x,y,r,a=1,color='255,255,255'){
      const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${color},${.85*a})`);g.addColorStop(.24,`rgba(${color},${.25*a})`);g.addColorStop(1,`rgba(${color},0)`);
      ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);
    }
    // Burst tracks outside the central field: arcs revealed per sample at their frame and
    // faded with the per-pixel decay.
    const FADE=[.9,.97,.97,.95,.92,.87,.81,.74,.67,.6,.54,.49,.44,.4,.36,.33,.3,.27,.25,.23,.21,.195,.18,.165,.15,.13,.11,.1,.09,.08,.07,.06,.05,.045,.04,.035,.03,.025,.02,.015,.01,.005];
    const NL=24,TRACK_GAIN=2.1;
    function bursts(t){
      const fr=Math.round(t*60);
      const collect=(sets)=>{
        const buckets=Array.from({length:NL},()=>new Path2D());let any=false;
        for(const[f0,arcs]of sets){
          if(fr<f0||fr-f0>80)continue;
          // Per-burst gain; the two light-up bursts also fade faster than the per-pixel average.
          const wg=f0===10312?1.05:f0===10340?1.25:f0===10368?1.45:1,ws=f0===10312||f0===10340?1.25:1;
          for(const[cx,cy,r,a0,a1,T,I]of arcs){
            const n=T.length,da=(a1-a0)/(n-1);
            for(let i=0;i<n-1;i++){
              const age=Math.round((fr-f0-Math.max(T[i],T[i+1]))*ws);if(age<0||age>=FADE.length)continue;
              const v=Math.min(1,wg*TRACK_GAIN*(I[i]+I[i+1])/510*FADE[age]),q=Math.min(NL-1,Math.round(v*NL));if(q<=0)continue;
              const p0=phi(a0+i*da),p1=phi(a0+(i+1)*da),b=buckets[q];
              b.moveTo(CX+cx+r*Math.cos(p0),CY+cy+r*Math.sin(p0));b.arc(CX+cx,CY+cy,r,p0,p1);any=true;
            }
          }
        }
        return any?buckets:null;
      };
      const draw=(buckets,clipR)=>{
        if(!buckets)return;
        ctx.save();ctx.beginPath();ctx.arc(CX,CY,clipR,0,TAU);ctx.clip();ctx.lineWidth=1;
        for(let q=1;q<NL;q++){ctx.strokeStyle=`rgba(242,240,255,${q/NL})`;ctx.stroke(buckets[q]);}
        ctx.restore();
      };
      draw(collect(BURST_TRACKS),184);
      // Inside r < 62 the central field carries the bursts until 172.925.
      if(t>=172.925)draw(collect([BURST_INNER]),61.5);
    }
    const centralPaths=new Map();
    function centralField(t){
      if(t>=172.925)return;
      const i=clamp(Math.round(t*60)-CENTRAL_FIELD[0][0],0,CENTRAL_FIELD.length-1);
      if(!centralPaths.has(i)){
        centralPaths.set(i,CENTRAL_FIELD[i][1].map(([alpha,d])=>[alpha,new Path2D(d)]));
        if(centralPaths.size>8)centralPaths.delete(centralPaths.keys().next().value);
      }
      ctx.save();ctx.beginPath();ctx.arc(CX,CY,61.5,0,TAU);ctx.clip();ctx.fillStyle='rgb(6,5,10)';ctx.fillRect(CX-63,CY-63,126,126);
      // The cluster is lavender at its core and whiter outward (B/G 1.2 -> 1.1); the gain
      // keeps its luminance and timing.
      let previous=0,scaledPrevious=0;
      for(const[alpha,path]of centralPaths.get(i)){
        const cumulative=previous+(1-previous)*alpha,scaled=Math.min(1,cumulative*1.32);
        const coverage=scaledPrevious>=1?0:(scaled-scaledPrevious)/(1-scaledPrevious);
        const g=ctx.createRadialGradient(CX,CY,0,CX,CY,61.5);
        g.addColorStop(0,`rgba(214,209,255,${coverage})`);g.addColorStop(.33,`rgba(219,214,255,${coverage})`);g.addColorStop(1,`rgba(230,226,255,${coverage})`);
        ctx.fillStyle=g;ctx.fill(path,'evenodd');
        previous=cumulative;scaledPrevious=scaled;
      }
      ctx.restore();
    }
    function beams(t){
      if(t>172.94)return;
      function position(tm,k){
        const base=phi(337.5-780*(tm-169.966666667));
        if(tm<172.35){const a=k?3*Math.PI-base:base;return[CX+428*Math.cos(a),CY+428*Math.sin(a)];}
        const x=table(headX,tm),y=table(headY,tm),right=(Math.cos(base)>=0)!==!!k;return[right?x:2*CX-x,y];
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
      // The particles fly outward: everything inside the tracker is revealed by radius
      // (18 px at 172.933, 52 at .950, 90 at .967, 128 at .983, 164 at 173.0, full at 173.017).
      const R=table([[172.925,0],[172.933,18],[172.95,52],[172.967,90],[172.983,128],[173.0,164],[173.017,186]],t);if(t<172.925||R<=0)return;
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
      glow(CX,CY,34,table([[172.925,0],[172.933,1.25],[172.95,1.45],[172.983,1.3],[173.05,1.15],[173.3,1.0],[173.642,.95]],t),'236,234,255');
      {const c=table([[172.925,0],[172.933,1],[172.95,.85],[172.967,.78],[172.983,.75],[173.0,.7],[173.033,.62],[173.067,.52],[173.1,.47],[173.133,.42],[173.2,.38]],t);
       const g=ctx.createRadialGradient(CX,CY,0,CX,CY,30);g.addColorStop(0,`rgba(255,255,255,${c})`);g.addColorStop(13/30,`rgba(252,251,255,${c})`);g.addColorStop(1,'rgba(240,238,255,0)');
       ctx.fillStyle=g;ctx.fillRect(CX-26,CY-26,52,52);}
      const cells=t>=173.009?1:0,a=table([[173.033,0],[173.05,.76],[173.067,.92],[173.083,1]],t);if(cells<=0)return;
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
          const h=lerp(280,cell.height,table(ORBIT_MOTION.bar,t));sector(ctx,280,h,a0,a1);
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
        ctx.save();ctx.globalAlpha=.3+.7*a;ctx.fillStyle=g.col==='warm'?'rgb(244,212,184)':'rgb(243,240,240)';ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.18;
        ctx.beginPath();ctx.rect(g.x-3,line.y-4,(g.w+6)*clamp(a*1.25),g.h+25);ctx.clip();ctx.fill(g.p,'evenodd');ctx.stroke(g.p);ctx.restore();
      }ctx.restore();
    }
    function labels(t){
      ctx.save();ctx.font='100 21.4px LoveK2D';ctx.fillStyle='#ece8f0';ctx.textBaseline='alphabetic';
      const label=(text,l,r,top,bottom)=>{const p=labelPaths.get(text);ctx.save();ctx.translate(l,top);
        if(p){ctx.scale((r-l+1)/p.width,(bottom-top+1)/p.height);ctx.fill(p.shape,'evenodd');ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=.2;ctx.stroke(p.shape);}
        else{const m=ctx.measureText(text);ctx.scale((r-l+1)/(m.actualBoundingBoxLeft+m.actualBoundingBoxRight),(bottom-top+1)/(m.actualBoundingBoxAscent+m.actualBoundingBoxDescent));ctx.fillText(text,m.actualBoundingBoxLeft,m.actualBoundingBoxAscent);}ctx.restore();};
      if(t>=172.35)label('Run 34',1583,1648,930,944);
      if(t>=172.942)label('Event 1',1583,1648,954,968);
      const rightTables=[[[173.267,1510],[173.283,1534],[173.300,1578],[173.317,1603],[173.333,1635],[173.350,1649]],
        [[173.300,1510],[173.317,1535],[173.333,1578],[173.350,1602],[173.367,1635],[173.383,1649]],
        [[173.333,1510],[173.350,1535],[173.367,1590],[173.383,1602],[173.400,1639],[173.417,1649]]];
      const left=['Muon 43 GeV','MET   36 GeV','mT    78 GeV'],right=['Jet 1 410 GeV','Jet 2 396 GeV','Jet 3  99 GeV'];
      for(let j=0;j<3;j++){
        const edge=table(rightTables[j],t),p=clamp((edge-1510)/139);
        if(p>0)for(const [text,l,r]of[[left[j],790,916],[right[j],1511,1648]]){ctx.save();ctx.beginPath();ctx.rect(l-2,107+j*24,(r-l+4)*p,23);ctx.clip();label(text,l,r,111+j*24,125+j*24);ctx.restore();}
        // Jet number tags: fade-in and peak brightness per tag (independent of the text wipe).
        if(t<173.25)continue;
        ctx.save();ctx.globalAlpha=table([[[173.283,0],[173.3,.7]],[[173.25,0],[173.267,.19],[173.283,.66],[173.3,.76],[173.317,.85]],[[173.25,0],[173.267,.31],[173.283,.68],[173.3,.74],[173.317,.82],[173.333,.87]]][j],t);const[l,r,top,bot]=[[1451,1460,225,239],[926,936,803,817],[1408,1418,870,884]][j];label(String(j+1),l,r,top,bot);ctx.restore();
      }ctx.restore();
    }
    return{render(t){
      ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgb(6,5,10)';ctx.fillRect(0,0,1920,1080);
      // The detector gains contrast as the beams are brought into the centre.
      detector(t);bursts(t);beams(t);centralField(t);event(t);words(t);labels(t);
    }};
  },
};
