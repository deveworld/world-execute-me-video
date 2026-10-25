import {createArecibo,background} from './lib/arecibo.js';
import {createCRT} from './lib/crt.js';
import * as T from './lib/term.js';
import POINT from './lib/point-motion.js';
const clamp=x=>Math.max(0,Math.min(1,x));
// Measured on the original through the tube: a warm cream figure and a dim grey-lavender status line.
const PERSON=[246,195,168],HALT='#7b7e95';
function pointAt(t){if(t<=POINT[0][0])return POINT[0].slice(1);if(t>=POINT.at(-1)[0])return POINT.at(-1).slice(1);let lo=0,hi=POINT.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(POINT[m][0]<=t)lo=m;else hi=m;}const k=(t-POINT[lo][0])/(POINT[hi][0]-POINT[lo][0]);return POINT[lo].slice(1).map((v,i)=>v+(POINT[hi][i+1]-v)*k);}
export default{
 id:'bookends/ending',start:206.98,end:212.3,fonts:['62.5px "VT323"'],
 async create(root,env){
  const crt=createCRT(root,env),ar=createArecibo(env),canvas=document.createElement('canvas');canvas.width=1920;canvas.height=1080;const ctx=canvas.getContext('2d');
  return{render(t){
   const bgFade=clamp((t-208.85)*30);ctx.fillStyle=`rgb(${14-4*bgFade},${17-3*bgFade},${24-5*bgFade})`;ctx.fillRect(0,0,1920,1080);ar.draw(ctx,206.95,{reprise:true,ending:true,personRGB:PERSON});
   T.setFont(ctx);ctx.fillStyle=HALT;const s='System halted.',n=T.typedCount(t,207.205,120,s.length);T.drawMono(ctx,s.slice(0,n),190,929);
   const blink=((t-.2056)/(60/130))%1<.5;if(t>207.205&&(blink||t<207.6)){ctx.fillStyle='#f4f4f8';T.drawCursor(ctx,190,929,n);}
   crt.beginContent();crt.drawCanvas(canvas);
   let sy=1,sx=1,lit=1,beam=0,beamHalfW=920,beamThick=3.2;
   // Measured content-height samples fit sy=1-((t-208.782278)/0.12)^2.
   if(t>=208.782278&&t<208.9165){const k=clamp((t-208.782278)/.12);sy=Math.max(.001,1-k*k);}
   if(t>=208.9165){lit=0;sy=.001;beam=1;const k=clamp((t-208.917)/.15);const bw=clamp((t-208.901710)/.160776);beamHalfW=960.291*(1-bw*bw*(3-2*bw));beamThick=3.2;}
   // The retained point measures ~8% brighter on the original than the stored emission curve renders.
   const nativePoint=t>=209.0583333333?pointAt(t).map((v,i)=>i===3?v*1.08:v):null;
   const liftTable=[[0,.10],[.037,.095],[.2908,.053],[.5075,.033],[.6803,.023],[.819,.012],[.9174,.0045],[.9784,0],[1,0]];let blackLift=0;for(let i=1;i<liftTable.length;i++)if(sy>=liftTable[i-1][0]&&sy<=liftTable[i][0]){const[a,x]=liftTable[i-1],[b,y]=liftTable[i];blackLift=x+(y-x)*(sy-a)/(b-a);break;}
   crt.present({sx,sy,lit,beam,beamHalfW,beamThick,blackLift,blackTint:[1,1,1.45],nativeBeam:t>=208.9165&&t<209.0583333333,nativePoint,beamGlow:.16,gain:1.3,bloomA:.16,bloomB:.08,bloomThresh:.4,aberr:.35});
  }};
 }
};
