// Arecibo message: squares, glyphs, the scan line and light streaks.
import DATA from './arecibo-data.js';
import {createPixelText} from './pixel-text.js';
import { messageMotion, messagePalette, personScale } from './message-model.js';
import { createParticleField, sphereProgress, N } from '../../math/core/particles.js';
const W=1920,H=1080,P=23,X=131,Y=283,SPB=60/130;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,k)=>a+(b-a)*k;
// Labels briefly swell their pixel shapes when they land.
const FLASH = { globe:[24.2167,0.0333], comp:[26.0667,0.0333], person:[27.9,0.06],
  rblk:[197.3,0.0167], rheart:[201.9167,0.0167], rperson:[205.6,0.0333] };
const flashAt = (group, t) => {
  const [start, duration] = FLASH[group], age = t - start;
  return age >= 0 && age < duration ? 2 * Math.min(1, (duration - age) / 0.013) : 0;
};
// Labels dissolve in a soft sweep from left to right.
const WIPE_W=330;
const wipeFront=(t,rep)=>rep?6700*(t-205.6):129+6400*(t-28.383);
const inOutCubic=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
const C={W:[250,251,255],L:[117,115,255],P:[255,218,191],D:[109,111,134]};
const rgb=c=>`rgb(${c.map(x=>Math.round(x)).join(',')})`;
const mix=(a,b,k)=>a.map((v,i)=>lerp(v,b[i],k));
// Handoff heart, identical to love/heart's final state at 193.583: the same 1440-point polyline of
// (x²+y²−1)³ − x²y³ = 0 (radius by 50-step bisection), origin (1120.45, 559.45), scale 181.75, y up.
const HF=(x,y)=>{const a=x*x+y*y-1;return a*a*a-x*x*y*y*y;};
const heartPath=new Path2D();
{const n=1440;for(let i=0;i<=n;i++){
 const th=-Math.PI/2+(i/n)*Math.PI*2,c=Math.cos(th),si=Math.sin(th);let lo=0,hi=2;
 for(let j=0;j<50;j++){const m=(lo+hi)/2;if(HF(m*c,m*si)<0)lo=m;else hi=m;}
 let r=(lo+hi)/2,px=r*c,py=r*si;if(i===0||i===n){px=0;py=-1;}
 const x=1120.45+px*181.75,y=559.45-py*181.75;if(!i)heartPath.moveTo(x,y);else heartPath.lineTo(x,y);
}heartPath.closePath();}
export function drawHandoffHeart(ctx,alpha=1){
 ctx.save();ctx.globalAlpha=alpha;ctx.lineJoin='round';ctx.lineCap='round';
 // faint additive bloom, then the thin near-white outline
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.filter='blur(3.1px)';ctx.strokeStyle='rgba(150,155,230,0.018)';ctx.lineWidth=2.58;ctx.stroke(heartPath);ctx.restore();
 ctx.strokeStyle='rgb(250,250,255)';ctx.lineWidth=1.0;ctx.stroke(heartPath);
 // the lavender centre dot exactly as love/heart leaves it
 ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(1120.1,559,0,1120.1,559,24);
 g.addColorStop(0,'rgba(70,70,190,0)');g.addColorStop(.3,'rgba(40,42,150,.55)');g.addColorStop(.6,'rgba(20,20,80,.35)');g.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=g;ctx.fillRect(1120.1-24,559-24,48,48);ctx.restore();
 ctx.fillStyle='rgb(104,104,246)';ctx.beginPath();ctx.arc(1120.1,559,6.6,0,Math.PI*2);ctx.fill();ctx.restore();
}
export function background(ctx){ctx.fillStyle='#0e0f16';ctx.fillRect(0,0,W,H);}
function square(ctx,x,y,w,h,col,alpha=1,outline=true){
 if(alpha<=0||w<=0||h<=0)return;
 ctx.globalAlpha=alpha;ctx.fillStyle=col;ctx.fillRect(x-(w-1)/2,y-(h-1)/2,w,h);
 if(outline&&w>4&&h>4){ctx.strokeStyle='rgba(225,228,255,.22)';ctx.lineWidth=.7;ctx.strokeRect(x-(w-1)/2+.35,y-(h-1)/2+.35,w-.7,h-.7);}
}
function litSquare(ctx,x,y,w,h,col,alpha=1){ctx.globalAlpha=alpha;ctx.fillStyle='#02030a';ctx.fillRect(x-(w+1)/2,y-(h+1)/2,w+2,h+2);square(ctx,x,y,w,h,col,alpha,true);}
function offCell(ctx,x,y){
 // A three-pixel recessed cell: dark one-pixel reconstruction rim, bright corners,
 // dimmer horizontal/vertical centre strokes and a dimmest central phosphor.
 ctx.globalAlpha=1;ctx.fillStyle='#05060d';ctx.fillRect(x-2,y-1,5,3);ctx.fillRect(x-1,y-2,3,5);
 ctx.fillStyle='#6c6d75';ctx.fillRect(x-1,y-1,3,3);
 ctx.fillStyle='#5e5f67';ctx.fillRect(x,y-1,1,3);ctx.fillRect(x-1,y,3,1);
 ctx.fillStyle='#51525a';ctx.fillRect(x,y,1,1);
}
function beveledCell(ctx,x,y,q,col){const left=x-(q-1)/2,top=y-(q-1)/2;ctx.globalAlpha=1;ctx.fillStyle='#00020b';ctx.fillRect(left-1,top-1,q+2,q+2);const grad=ctx.createLinearGradient(0,top,0,top+q);grad.addColorStop(0,rgb(col.map(v=>v*1.035)));grad.addColorStop(.48,rgb(col));grad.addColorStop(1,rgb(col.map(v=>v*.98)));ctx.fillStyle=grad;ctx.fillRect(left,top,q,q);const bevel=.98+.19*clamp((15-q)/4);ctx.strokeStyle=rgb(col.map(v=>v*bevel));ctx.lineWidth=.8;ctx.strokeRect(left+.4,top+.4,Math.max(0,q-.8),Math.max(0,q-.8));ctx.fillStyle=rgb(col.map(v=>v*1.085));ctx.fillRect(left+.6,top+.4,Math.max(0,q-1.2),.8);ctx.fillStyle=rgb(col.map(v=>v*.945));ctx.fillRect(left+.6,top+q-1.2,Math.max(0,q-1.2),.8);}
// Scan line: a 2 px near-white core with a ~7 px lavender glow, spanning the panel.
function scan(ctx,x,a=1){if(x<114||x>1807)return;ctx.save();ctx.globalAlpha=a*.13;ctx.fillStyle='#c8c8f0';ctx.fillRect(x-7,273,14,527);ctx.globalAlpha=a*.16;ctx.fillRect(x-3.5,273,7,527);ctx.globalAlpha=a;ctx.shadowColor='#e9e6ff';ctx.shadowBlur=6;ctx.fillStyle='#fbfbfe';ctx.fillRect(x-1,273,2,527);ctx.restore();}
function columnScan(t,on){
 // Line held at a panel boundary, then follows the column reveals.
 let idx=-1;for(let i=0;i<on.length;i++)if(t>=on[i])idx=i;
 return idx<0?119:X+P*(idx+.5)+P*clamp((t-on[Math.max(0,idx)])/(SPB/4));
}
// The visible reveal line sits on the boundary of the last revealed column (it jumps per column).
function columnLine(t,on){let idx=-1;for(let i=0;i<on.length;i++)if(t>=on[i])idx=i;return idx<0?119:X+P*(idx+.5);}
// Dissolve sweep: starts at x=131 and moves 7272 px/s.
const SWEEP_V=7272,sweep0=rep=>rep?205.5986:28.3624;
// A light streak lifting out of a swept cell (age in s since the sweep passed).
function streak(ctx,x,y,am,w0,core='rgba(242,242,255,1)',base=3.3){
 const yy=y-500*am-1050*am*am,hh=20+500*am,ww=base+w0*Math.exp(-am*38),a=1-clamp((am-.4)/.6)*.5;
 const g=ctx.createLinearGradient(0,yy-hh/2,0,yy+hh/2);g.addColorStop(0,'rgba(182,181,216,.75)');g.addColorStop(.1,core);g.addColorStop(.65,core);g.addColorStop(1,'rgba(160,163,198,0)');square(ctx,x,yy,ww,hh,g,a,false);
}
function markerPos(t){const k=inOutCubic(clamp((t-28.83)/.9));return[lerp(1626,845,k),lerp(536,220.6,k)];}
// The message hands the same seeded particles to the sphere scene.
function makeParticleField(env){
 const {G,grp,dup,S,Sz,Bd}=createParticleField(env);
 return (ctx,t)=>{
  const k=sphereProgress(t),fade=clamp((t-28.86)/.15);ctx.save();ctx.fillStyle='#e9eaf2';
  for(let i=0;i<N;i++){
   const j=grp[i];let x=lerp(G[i*2],S[j*2],k),y=lerp(G[i*2+1],S[j*2+1],k),a=.44*(.78+.22*Bd[j]);
   if(dup[i]){x+=7*Math.min(1,k*2);y+=1.5;}if(Sz[j]>0)a*=1-.2*k;
   ctx.globalAlpha=a*fade;ctx.beginPath();ctx.arc(x,y,1.4,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
 };
}
export function createArecibo(env,{particles=false}={}){
 const particleField=particles?makeParticleField(env):null;
 const pixelText=createPixelText();
 // Recessed cells stay fixed. A bevel atlas shares each column's illumination across its rows.
 const makeRecessed=rows=>{
  const cv=document.createElement('canvas');cv.width=1663;cv.height=513;const c=cv.getContext('2d');
  for(let j=0;j<23;j++)for(let i=0;i<73;i++)if(rows[j][i]==='.')offCell(c,3+P*i,3+P*j);
  return cv;
 };
 const recessed=[makeRecessed(DATA.intro),makeRecessed(DATA.reprise)];
 const atlas=document.createElement('canvas');atlas.width=32*73;atlas.height=32;const ac=atlas.getContext('2d');
 function glyphs(ctx,t,rep,ending,palette){
  const fadeT=rep?205.6:28.383,front=wipeFront(t,rep);
  const wipe=t>=fadeT&&!ending,fade=xx=>clamp((xx-front)/WIPE_W+.5);
  const draw=(s,x,y,p,color,alpha=1)=>pixelText(ctx,s,x,y,p,color,alpha,wipe?fade:null);
  if(!rep){
   draw('1 2 3 4 5 6 7 8 9 10',190,226,23/6,'#ebebf6');
   draw('world.execute(me);',190,824,23/6,'#ebecf4');
   // The two large labels fade as whole words once the dissolve reaches them.
   if(t>=24.2163)pixelText(ctx,'me',825.333,203.333,23/3,rgb(palette.me),1-clamp((t-28.425)/.076));
   if(t>=26.0663)pixelText(ctx,'machine',1124.333,203.333,23/3,rgb(palette.machine),1-clamp((t-28.4825)/.084));
  }else if(!ending){
   // Both lines are typed together at 34.5 characters per second.
   const n=Math.floor(Math.max(0,t-197.2547)*34.5);
   draw('(x^2+y^2-1)^3-x^2*y^3=0'.slice(0,n),190,226,23/6,'#ececf8');
   draw('me.execute(world);'.slice(0,n),190,824,23/6,'#ebecf7');
  }
  if((!rep&&t>=27.9)||(rep&&t>=205.6)||ending){
   const alpha=!rep?1-clamp((t-28.826)/.118):1;
   pixelText(ctx,'you',1561.333,203.333,23/3,!rep?rgb(palette.you):ending?'#f7caad':'#ffe2c9',alpha);
  }
  if(!ending&&(!rep||t<205.95)){
   const a=rep?1-clamp((t-205.8333)/.107):1-clamp((t-28.598)/.108);
   pixelText(ctx,'1679 = 23 x 73',1158.667,824,23/3,'#cac8e2',a);
  }
  if(rep&&(ending||t>=205.81)){
   const a=ending?1:clamp((t-205.8117)/.0567),col=ending?'#eff0fb':'#ffffff';pixelText(ctx,'Execution',190,824,23/3,col,a);ctx.save();ctx.globalAlpha=a;ctx.fillStyle=col;for(let i=0;i<3;i++)ctx.fillRect(605+i*15.333333,863.333,6.44,6.44);ctx.restore();
  }
 }
 function drawGrid(ctx,t,rep,ending,personRGB,motion,palette){
  const rows=rep?DATA.reprise:DATA.intro,on=rep?DATA.repriseOn:DATA.introOn,start=rep?193.6:22.3667;
  const ageStart=Math.max(0,t-start),unSize=motion.size;
  const onSize=19+(!rep?2*Math.pow(Math.max(0,1-ageStart/.13),2):0);
  const unRGB=motion.color;
  const dissolveT=sweep0(rep),dissolve=t>=dissolveT&&!ending;
  const humanShrink=!rep&&t>=28.825,ss=humanShrink?personScale(t):1;
  const mp=markerPos(t);
  ctx.save();
  if(!rep&&ageStart<.12){const g=Math.pow(1-ageStart/.12,1.1);ctx.fillStyle=rgb([14+13*g,15+15*g,22+23*g]);ctx.fillRect(694,273,1106,527);}
  if(rep&&dissolve)for(let j=0;j<23;j++)for(let i=0;i<61;i++){
   const age=t-(dissolveT+(X+P*i-131)/SWEEP_V);
   if(rows[j][i]!=='.'&&age>0)streak(ctx,X+P*i,Y+P*j,age,6,'rgba(218,217,243,1)',3.9);
  }
  ctx.globalAlpha=1;
  if(!(!rep&&t>=28.86)){
   ctx.save();
   if(!ending){
    ctx.beginPath();
    for(let i=0;i<73;i++)if(t+1e-5>=on[i])ctx.rect(X+P*i-4,Y-4,8,515);
    ctx.clip();
   }
   ctx.drawImage(recessed[rep?1:0],X-3,Y-3);ctx.restore();
  }
  ac.clearRect(0,0,atlas.width,atlas.height);
  if(!ending)for(let i=0;i<73;i++)if(t+1e-5<on[i]){
   const x=X+P*i,shade=1-.08*Math.pow((x-960)/900,2);
   beveledCell(ac,i*32+16,16,unSize,unRGB.map((v,k)=>lerp([14,15,22][k],v,shade)));
  }
  for(let j=0;j<23;j++)for(let i=0;i<73;i++){
   const ch=rows[j][i],x=X+P*i,y=Y+P*j,active=t+1e-5>=on[i]||ending;
   if(ch==='P'&&humanShrink)continue;
   if(!active){ctx.drawImage(atlas,i*32,0,32,32,x-16,y-16,32,32);continue;}
   const has=ch!=='.';
   if(!has)continue;
   let col=C[ch];
   // Number and binary baselines pulse into muted lavender between beats.
   if((!rep&&(j===8||j===18)&&i<25)||(rep&&(j===9||j===20)&&i<26))col=mix(C.D,C.W,motion.binary);
   // Pigment curves: the globe fades white -> lavender and pulses, the monitor and the
   // person flash when their labels land, and the person warms from white to skin tone.
   if(!rep&&ch==='L'&&i<41)col=t<24.1999?C.W:palette.globe;
   if(ch==='P')col=personRGB||((rep?t<205.55:t<27.8999)?C.W:palette.person);
   if(rep&&ch==='L')col=palette.heart;
   if(ch==='W'&&!rep&&i>=43)col=palette.comp;
   const fg=rep?(ch==='W'&&i<26?'rblk':ch==='W'&&i>=30&&i<56?'rheart':ch==='P'?'rperson':null):ch==='L'&&i<41?'globe':ch==='W'&&i>=43?'comp':ch==='P'?'person':null,fl=fg?flashAt(fg,t):0;
   const age=t-(dissolveT+(x-131)/SWEEP_V);
   if(dissolve&&age>0&&(rep?i<61:i<61)){
    // Reprise retains the pixels while their light streaks lift out of the display.
    // (the swept cells flash lavender for ~0.1 s and their streaks start thin)
    // In the reprise the streaks were drawn in a pre-pass, behind the retained squares.
    if(rep)litSquare(ctx,x,y,onSize,onSize,rgb(mix(col,[205,203,245],.75*Math.exp(-age/.04))));
    else streak(ctx,x,y,Math.max(0,age-.0167),16);
   }else litSquare(ctx,x,y,onSize+fl,onSize+fl,rgb(col));
  }
  if(humanShrink){
   // The cells merge into one glowing solid silhouette as it shrinks, ending as a bright oval point.
   // (the collapsing figure is a more saturated peach than the resting cells)
   const pc=rgb(mix(palette.person,[255,206,176],.45*clamp((1-ss)/.3))),q=19+4*clamp((1-ss)/.42),body=new Path2D();
   for(let j=0;j<23;j++)for(let i=61;i<70;i++)if(rows[j][i]==='P')body.rect(X+P*i-q/2,Y+P*j-q/2,q,q);
   // Small sizes close the one-cell gaps (arms merge with the body) like a low-resolution raster: a
   // fixed ~3 device-pixel rounded outline.
   const merged=ss<.9,grow=3*clamp((.45-ss)/.2)+.8*clamp((.12-ss)/.07);
   ctx.save();ctx.translate(mp[0],mp[1]);ctx.scale(ss,ss);ctx.translate(-1626,-536);
   ctx.globalAlpha=1;ctx.fillStyle=pc;ctx.strokeStyle=pc;ctx.lineJoin='round';
   if(merged){ctx.save();ctx.shadowColor='rgba(255,222,196,.22)';ctx.shadowBlur=7;ctx.fill(body);ctx.restore();}
   if(ss>.9)for(let j=0;j<23;j++)for(let i=61;i<70;i++){if(rows[j][i]==='P')square(ctx,X+P*i,Y+P*j,q,q,pc,1,true);}
   else{ctx.fill(body);if(grow>.05){ctx.lineWidth=grow/ss;ctx.stroke(body);}}
   ctx.restore();
   const e=clamp((.06-ss)/.025);
   if(e>0){ctx.globalAlpha=e;ctx.fillStyle=pc;ctx.beginPath();ctx.ellipse(mp[0],mp[1],(203*ss/2+1.6)*.95,(341*ss/2+1.6)*.95,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
  }
  ctx.restore();
  if(!rep&&t>=28.86)particleField(ctx,t);
  if(rep&&!ending){
   // The pre-existing algebraic curve is progressively replaced by the scanned pixels.
   const hx=columnScan(t,on);ctx.save();ctx.beginPath();ctx.rect(Math.max(0,hx),0,1920,1080);ctx.clip();drawHandoffHeart(ctx);ctx.restore();
  }
  if(!ending){
   // (the reprise scan line is dimmed to ~half while it waits at a panel boundary)
   if(rep&&t<205.5986)scan(ctx,columnLine(t,on),(t<194.4||(t>=197.4&&t<198.9)||(t>=202.0167&&t<202.8333))?.5:1);
   if(dissolve&&t<dissolveT+.235)scan(ctx,131+(t-dissolveT)*SWEEP_V);
   if(!rep&&t<28.38){
    // Thin leading bars at the two symmetric reveal fronts.
    // (only the rightward front, columns 32-65, leaves a fading bar on the column centre)
    for(let i=32;i<66;i++)if(t+1e-4>=on[i]&&t<on[i]+.1&&Math.abs(on[i]-on[i-1])>1e-3)scan(ctx,X+P*i,.24*Math.exp(-Math.max(0,t-on[i])/.075));
   }
  }
 }
 return {draw(ctx,t,{reprise=false,ending=false,personRGB=null}={}){
  const motion=messageMotion(t,reprise),palette=messagePalette(t,reprise,motion.energy);
  drawGrid(ctx,t,reprise,ending,personRGB,motion,palette);glyphs(ctx,t,reprise,ending,palette);
 }};
}
