// Procedural front/back identification card, lit laminate, metal clip and a timed 3D turn.
import {clamp,lerp,prog,ease} from './lib.js';
import {BADGE_ART,BADGE_HEAD,BADGE_REVEAL,BADGE_BACK} from './precision_art.js';
import {BADGE_POSES} from './data/badge-pose.js';
import {cardShutter} from './card-shutter.js';
const START=95.758333333;
// Word-opacity ramps measured frame by frame from the source (frame number, opacity).
// Word reveals traced frame by frame from the source (frame number, value). MY/TO fade in over two frames
// (stroke brightness); SWITCH, ROLE and the M token widen from condensed to full width about their centre.
const RAMPS={MY:[[5750,0],[5751,.57],[5752,.91],[5753,1]],
 SWITCH:[[5769,0],[5770,.9],[5771,.95],[5772,.95],[5773,.98],[5774,.99],[5775,1]],
 ROLE:[[5796,0],[5797,.9],[5798,.92],[5799,.95],[5800,.97],[5801,1]],
 TO1:[[5851,0],[5852,.59],[5853,.93],[5854,1]],
 S:[[5863,0],[5864,1]],
 TO2:[[5919,0],[5920,.6],[5921,.92],[5922,1]],
 M:[[5920,0],[5921,1]]};
const WIDEN={SWITCH:[407.5,[[5769,.32],[5770,.32],[5771,.57],[5772,.76],[5773,.89],[5774,.95],[5775,.98],[5776,1]]],
 ROLE:[596,[[5796,.17],[5797,.17],[5798,.44],[5799,.66],[5800,.82],[5801,.92],[5802,.97],[5803,.98],[5804,1]]],
 M:[399.5,[[5920,.43],[5921,.43],[5922,.71],[5923,.84],[5924,.93],[5925,.96],[5926,1]]]};
const widen=(s,t)=>{const w=WIDEN[s];if(!w)return null;const k=w[1],f=t*60;if(f<=k[0][0])return [w[0],k[0][1]];for(let i=1;i<k.length;i++)if(f<=k[i][0])return [w[0],lerp(k[i-1][1],k[i][1],(f-k[i-1][0])/(k[i][0]-k[i-1][0]))];return [w[0],1];};
const withWiden=(ctx,s,t,draw)=>{const w=widen(s,t);if(!w||w[1]>=1){draw();return;}ctx.save();ctx.translate(w[0],0);ctx.scale(w[1],1);ctx.translate(-w[0],0);draw();ctx.restore();};
const S_ON=5863.5/60, S_FILL=5867.5/60;
// Pendulum roll (deg) and horizontal offset per source frame from 5746, measured from the card outline
// (turn frames interpolated); replaces the earlier hand-set keys.
const SWAY_Z=[-1.92,-1.88,-1.80,-1.72,-1.59,-1.47,-1.30,-1.13,-0.93,-0.71,-0.47,-0.29,-0.11,0.11,0.30,0.47,0.66,0.82,0.93,1.01,1.09,1.16,1.24,1.32,1.40,1.48,1.56,1.63,1.69,1.73,1.70,1.65,1.52,1.35,1.18,1.02,0.83,0.65,0.46,0.26,0.06,-0.16,-0.37,-0.55,-0.71,-0.87,-0.97,-1.05,-1.13,-1.21,-1.29,-1.37,-1.45,-1.53,-1.61,-1.69,-1.75,-1.77,-1.75,-1.68,-1.55,-1.38,-1.22,-1.02,-0.81,-0.60,-0.41,-0.20,-0.00,0.21,0.41,0.62,0.85,1.05,1.22,1.39,1.54,1.66,1.75,1.82,1.85,1.87,1.86,1.86,1.85,1.78,1.72,1.61,1.47,1.31,1.15,0.95,0.75,0.51,0.31,0.10,-0.11,-0.33,-0.51,-0.74,-0.95,-1.12,-1.28,-1.44,-1.55,-1.66,-1.76,-1.84,-1.88,-1.92,-1.92,-1.90,-1.86,-1.78,-1.70,-1.56,-1.43,-1.27,-1.09,-0.90,-0.72,-0.50,-0.28,-0.08,0.13,0.32,0.51,0.71,0.90,1.11,1.31,1.46,1.59,1.72,1.80,1.88,1.94,1.98,2.00,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.01,2.00,2.00,1.99,1.98,1.97,1.96,1.95,1.95,1.94,1.93,1.93,1.92,1.91,1.92,1.91,1.90,1.85,1.79,1.69,1.56,1.42,1.24,1.08,0.90,0.72,0.50,0.30,0.08,-0.14,-0.35,-0.56,-0.75,-0.96,-1.16,-1.33,-1.47,-1.61,-1.70,-1.75];
const SWAY_DX=[25.7,25.4,24.9,24.1,23.4,22.3,21.1,19.6,18.1,16.6,15.2,13.1,11.2,9.4,7.6,5.4,4.1,3.3,2.7,1.9,1.1,0.3,-0.5,-1.3,-2.1,-2.9,-3.8,-4.6,-5.5,-5.7,-5.3,-4.0,-3.1,-2.1,-1.0,0.5,2.1,3.9,5.7,7.5,9.5,11.1,13.0,14.8,16.3,17.0,17.5,18.2,18.9,19.6,20.3,21.0,21.7,22.4,23.1,23.8,24.7,25.1,24.7,23.7,22.6,21.5,20.1,18.7,17.1,15.4,13.6,12.0,10.0,8.3,6.1,4.3,2.7,1.2,-0.4,-1.7,-2.9,-3.9,-4.9,-5.7,-6.5,-6.8,-6.9,-6.7,-6.1,-5.4,-4.4,-3.3,-2.3,-1.1,0.1,1.5,3.1,4.7,6.5,8.3,10.2,12.1,14.2,15.7,17.3,19.0,20.5,21.8,23.0,24.1,24.9,25.6,26.1,26.3,26.2,25.9,25.4,24.8,23.9,23.1,21.9,20.7,19.2,17.6,15.8,14.2,12.5,10.6,8.6,6.6,4.7,3.0,1.5,0.3,-1.0,-2.4,-4.0,-4.7,-5.5,-6.0,-6.4,-6.4,-6.4,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.3,-6.2,-6.0,-5.8,-5.9,-6.0,-6.0,-6.1,-6.1,-6.2,-6.3,-6.3,-6.3,-6.2,-6.3,-6.1,-5.6,-5.0,-4.2,-3.4,-2.3,-1.2,0.4,2.0,3.9,5.5,7.6,9.2,10.9,12.7,14.6,16.4,17.9,19.3,20.7,22.1,23.2,24.3,25.0];
// Specular glints: fast diagonal light passes measured from the source (luma excess vs a glint-free render).
// [frame at u0, u0 (screen px along n), px per frame, peak luma gain]; n is the band normal (0.6,1)/|.|.
const GLINTS=[[5760,916,104,45],[5774,1015,100,43],[5844,872,107.7,44],[5872,859,105.5,43],[5944,1117,106,21.5],[5956,986,100.8,31]];
const GN=[0.6/Math.hypot(.6,1),1/Math.hypot(.6,1)];
const sway=(tab,t)=>{const f=clamp(t*60-5746,0,tab.length-1),i=Math.floor(f),k=f-i;return lerp(tab[i],tab[Math.min(i+1,tab.length-1)],k);};
const key=(t,keys)=>{if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++)if(t<=keys[i][0])return lerp(keys[i-1][1],keys[i][1],ease.inOutSine((t-keys[i-1][0])/(keys[i][0]-keys[i-1][0])));return keys.at(-1)[1];};
const poseAt=t=>{
 const f=clamp(t*60-BADGE_POSES[0][0],0,BADGE_POSES.length-1),i=Math.floor(f),a=BADGE_POSES[i],b=BADGE_POSES[Math.min(i+1,BADGE_POSES.length-1)],k=f-i;
 return [lerp(a[1],b[1],k),a[2].map((v,j)=>lerp(v,b[2][j],k))];
};
export default {
  id:'existence/badge',start:START,end:99.40,
  async create(root,env){
    const ff=new FontFace('League Gothic X',`url(${new URL('./fonts/leaguegothic/LeagueGothic-wdth.ttf',import.meta.url).href})`);document.fonts.add(ff);await ff.load();await document.fonts.load('47px "Roboto Mono"');
    root.style.background='radial-gradient(ellipse at 65% 55%,#0e0f1c 0%,#0c0d14 72%)';
    const {ctx}=env.canvas(root);
    const holder=document.createElement('div');holder.style.cssText='position:absolute;left:1000px;top:185px;width:500px;height:790px;transform-style:preserve-3d;transform-origin:250px 35px;';root.append(holder);
    const mk=(back)=>{const c=document.createElement('canvas');c.width=500;c.height=790;c.style.cssText='position:absolute;inset:0;width:500px;height:790px;backface-visibility:hidden;border-radius:28px;'+(back?'transform:rotateY(180deg)':'');holder.append(c);return[c,c.getContext('2d')];};
    const [front,fc]=mk(false),[back,bc]=mk(true);
    holder.style.display='none';
    const shutter=cardShutter();
    const rolePaths={S:new Path2D(BADGE_ART.S.d),M:new Path2D(BADGE_ART.M.d)};
    const printPaths=BADGE_ART.parts.map(([n,d,col])=>[new Path2D(d),col]);
    const silhouette=new Path2D(BADGE_ART.portrait.d);
    const heading=Object.fromEntries(Object.entries(BADGE_HEAD).map(([k,d])=>[k,new Path2D(d)]));
    const reveal=(s,t)=>{const keys=RAMPS[s]?RAMPS[s].map(([f,v])=>[f/60,v]):BADGE_REVEAL[s];if(!keys)return 1;if(t<=keys[0][0])return 0;for(let i=1;i<keys.length;i++)if(t<=keys[i][0])return lerp(keys[i-1][1],keys[i][1],prog(t,keys[i-1][0],keys[i][0]-keys[i-1][0]));return 1;};
    const rounded=(c,x,y,w,h,r)=>{c.beginPath();c.roundRect(x,y,w,h,r);};
    // Draw the active glint (if any) on a face canvas, in card-local coordinates.
    const glint=(c,t,z,dx)=>{
      const f=t*60;let g=null;for(const e of GLINTS){const u=e[1]+e[2]*(f-e[0]);if(u>640&&u<1820){g=[u,e[3]];break;}}
      if(!g)return;
      const r=z*Math.PI/180,cs=Math.cos(r),sn=Math.sin(r),nl=[cs*GN[0]+sn*GN[1],-sn*GN[0]+cs*GN[1]];
      // screen = P0 + R^T (L - L0) with P0=(1250+dx,220), L0=(250,35)  =>  n.screen = n.P0 + nl.(L-L0)
      const ul=g[0]-(GN[0]*(1250+dx)+GN[1]*220)+(nl[0]*250+nl[1]*35), a=g[1]/215;
      c.save();rounded(c,1,1,498,788,28);c.clip();
      const W=130,gr=c.createLinearGradient(nl[0]*(ul-W),nl[1]*(ul-W),nl[0]*(ul+W),nl[1]*(ul+W));
      for(let i=0;i<=12;i++){const d=(i/12*2-1)*W;gr.addColorStop(i/12,`rgba(228,230,255,${(a*Math.exp(-d*d/(2*42*42))).toFixed(4)})`);}
      c.fillStyle=gr;c.fillRect(0,0,500,790);
      // Hologram grain: small globe marks in the laminate, visible only inside the light band.
      c.lineWidth=1;
      for(let row=0;row<22;row++)for(let col=-1;col<12;col++){
        const x=col*44+(row%2?22:0)+14,y=row*38+12,d=nl[0]*x+nl[1]*y-ul,k=Math.exp(-d*d/(2*30*30))*a*1.6;if(k<.02)continue;
        c.strokeStyle=`rgba(236,238,255,${k.toFixed(3)})`;c.beginPath();c.arc(x,y,6,0,Math.PI*2);c.ellipse(x,y,2.6,6,0,0,Math.PI*2);c.moveTo(x-6,y);c.lineTo(x+6,y);c.stroke();
      }
      c.restore();
    };
    const text=(c,s,x,y,size,col='#f4f0ff',spacing=0)=>{c.font=`${size}px "League Gothic X"`;c.letterSpacing=`${spacing}px`;c.fillStyle=col;c.fillText(s,x,y);c.letterSpacing='0px';};
    const globe=(c,x,y,r,col,w=1.5)=>{c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.ellipse(x,y,r*.42,r,0,0,Math.PI*2);c.moveTo(x-r,y);c.lineTo(x+r,y);c.stroke();};
    const base=(c)=>{c.clearRect(0,0,500,790);let g=c.createLinearGradient(0,0,500,790);g.addColorStop(0,'#211f94');g.addColorStop(.4,'#161670');g.addColorStop(1,'#13135d');c.fillStyle=g;rounded(c,.6,.6,498.8,788.8,28);c.fill();c.strokeStyle='#6b67a0';c.lineWidth=.8;c.stroke();c.fillStyle='#0c0d17';rounded(c,193,21,114,28,15);c.fill();c.strokeStyle='#6f6a9d';c.lineWidth=1;c.stroke();};
    const portrait=(c)=>{
      c.save();rounded(c,36,147,170,211,7);c.clip();
      let g=c.createRadialGradient(117,244,15,117,244,150);g.addColorStop(0,'#d4d7fb');g.addColorStop(.68,'#c3c6f3');g.addColorStop(1,'#a6a9e4');c.fillStyle=g;c.fillRect(36,147,170,211);
      c.filter='blur(3.5px)';c.fillStyle='#1f2290';c.fill(silhouette,'evenodd');c.filter='none';c.restore();
      c.strokeStyle='rgba(255,255,255,.33)';c.lineWidth=.7;rounded(c,36.5,147.5,169,210,7);c.stroke();
    };
    const frontDraw=(t)=>{
      base(fc);
      fc.strokeStyle='rgba(188,179,239,.29)';fc.lineWidth=.7;fc.beginPath();fc.moveTo(36,122);fc.lineTo(464,122);fc.stroke();portrait(fc);
      fc.save();fc.translate(.5,.5);for(const [p,col]of printPaths){fc.fillStyle=col;fc.fill(p,'evenodd');}fc.restore();
      const role=t>=98.875?'M':t>=S_ON?'S':'';const filled=t>=S_FILL;
      if(filled){let g=fc.createLinearGradient(35,451,35,752);g.addColorStop(0,'#474ed6');g.addColorStop(1,'#3e44cd');fc.fillStyle=g;rounded(fc,35,453,430,299,10);fc.fill();}
      else{fc.strokeStyle='rgba(187,178,244,.56)';fc.lineWidth=1;rounded(fc,35,453,430,299,10);fc.stroke();}
      if(role){fc.save();fc.translate(.5,.5);fc.fillStyle='#f0edff';fc.fill(rolePaths[role],'evenodd');fc.restore();}
    };
    base(bc);bc.fillStyle='#ffffff';bc.fill(new Path2D(BADGE_BACK.text),'evenodd');
    globe(bc,250,391,118,'rgba(150,150,230,.10)',1.5);
    bc.fillStyle='#f5f4f7';bc.fill(new Path2D(BADGE_BACK.plate),'evenodd');
    bc.fillStyle='#171718';bc.fill(new Path2D(BADGE_BACK.ink),'evenodd');
    const reverseTexture=document.createElement('canvas');reverseTexture.width=500;reverseTexture.height=790;reverseTexture.getContext('2d').drawImage(back,0,0);
    const backDraw=t=>{
      bc.clearRect(0,0,500,790);bc.drawImage(reverseTexture,0,0);
      // The reverse is lit as evenly as the front in the source (measured), so no extra shading.
    };
    const strap=(t,anchorX)=>{
      const hook=poseAt(t)[1];anchorX=hook[0];
      ctx.save();const tip=anchorX;const g=ctx.createLinearGradient(tip-35,0,tip+35,0);g.addColorStop(0,'#28256d');g.addColorStop(.2,'#4943bd');g.addColorStop(.65,'#504bd0');g.addColorStop(1,'#2a267a');ctx.fillStyle=g;
      ctx.beginPath();ctx.moveTo(tip-37,-15);ctx.lineTo(tip+37,-15);ctx.lineTo(tip+34,89);ctx.lineTo(tip-35,89);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(190,185,255,.20)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(tip-30,0);ctx.lineTo(tip-29,84);ctx.moveTo(tip+29,0);ctx.lineTo(tip+27,84);ctx.stroke();
      const metal=ctx.createLinearGradient(0,84,0,123);metal.addColorStop(0,'#efedf8');metal.addColorStop(.2,'#bcbcc9');metal.addColorStop(.5,'#9a9ba8');metal.addColorStop(.6,'#c3c4ce');metal.addColorStop(1,'#757684');ctx.fillStyle=metal;rounded(ctx,tip-42,85,84,38,6);ctx.fill();ctx.strokeStyle='#d8d7e7';ctx.lineWidth=.6;ctx.stroke();ctx.strokeStyle='#666879';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(tip-36,98);ctx.lineTo(tip+36,98);ctx.moveTo(tip-36,110);ctx.lineTo(tip+36,110);ctx.stroke();
      ctx.fillStyle='#b0b0bd';rounded(ctx,tip-8,122,16,17,3);ctx.fill();ctx.lineWidth=11;ctx.strokeStyle='#737586';ctx.lineCap='round';
      const wire=offset=>{ctx.beginPath();ctx.moveTo(hook[0]+offset,137);const ys=[140,155,175,195,212];for(let i=1;i<hook.length-1;i++)ctx.quadraticCurveTo(hook[i]+offset,ys[i],(hook[i]+hook[i+1])/2+offset,(ys[i]+ys[i+1])/2);ctx.lineTo(hook.at(-1)+offset,215);};
      wire(0);ctx.stroke();ctx.lineWidth=7;ctx.strokeStyle='#d5d4e4';ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#f2f1fa';wire(-2);ctx.stroke();ctx.lineCap='butt';ctx.restore();
    };
    return{render(t){
      ctx.clearRect(0,0,1920,1080);
      // Final S→M turn: front through 98.783, edges near 98.833/98.883,
      // barcode back on 98.850–98.867, and the M front settled by 98.933.
      const z=sway(SWAY_Z,t), dx=sway(SWAY_DX,t);
      frontDraw(t);backDraw(t);glint(fc,t,z,dx);glint(bc,t,z,dx);
      // The reference uses an almost orthographic card camera. Integrate 49 shutter samples
      // during each turn, preserving the blurred edge/back/edge poses rather than a crisp CSS face.
      const yawAt=u=>{
        if(u<98.79)return poseAt(u)[0];
        const poses=[[98.79,360],[98.8,370],[98.816666667,405],[98.833333333,445],[98.85,510],[98.866666667,565],[98.883333333,630],[98.9,670],[98.916666667,705],[98.933333333,720]];
        for(let i=1;i<poses.length;i++)if(u<=poses[i][0])return lerp(poses[i-1][1],poses[i][1],prog(u,poses[i-1][0],poses[i][0]-poses[i-1][0]));return 720;
      };
      const moving=Math.abs(yawAt(t+1/120)-yawAt(t-1/120))>1;
      const N=moving?49:1;
      const shutterPoses=[];
      for(let i=0;i<N;i++){
        const st=t+(N===1?0:((i+.5)/N-.5)/60),a=yawAt(st)*Math.PI/180,c=Math.cos(a);
        shutterPoses.push(c);
      }
      shutter.render(front,back,shutterPoses,z,dx);ctx.drawImage(shutter.canvas,900,150);strap(t,1250+dx);
      const topWords=[['OH',START],['MY',95.88],['SWITCH',96.12],['ROLE',96.59]];
      ctx.fillStyle='#f4f1fb';for(const [s,at]of topWords){ctx.globalAlpha=reveal(s,t);if(ctx.globalAlpha>0)withWiden(ctx,s,t,()=>ctx.fill(heading[s],'evenodd'));}ctx.globalAlpha=1;
      ctx.globalAlpha=reveal('TO1',t);ctx.fill(heading.TO1,'evenodd');ctx.globalAlpha=1;
      const token=(s,x,at,filled)=>{const k=reveal(s,t);if(k<=0)return;ctx.globalAlpha=k;if(filled){ctx.fillStyle='#4a4fdc';rounded(ctx,x-9,827,s==='M'?54:49,91,8);ctx.fill();}const [bx,by,bX,bY]=BADGE_ART[s].box;ctx.save();ctx.translate(x+(s==='M'?6:8),840);ctx.scale(64/(bY-by),64/(bY-by));ctx.translate(-bx,-by);ctx.fillStyle='#f4f1fb';ctx.fill(rolePaths[s],'evenodd');ctx.restore();ctx.globalAlpha=1;};
      token('S',217,97.70,t>=S_FILL);
      ctx.globalAlpha=reveal('TO2',t);ctx.fillStyle='#f4f1fb';ctx.fill(heading.TO2,'evenodd');ctx.globalAlpha=1;
      withWiden(ctx,'M',t,()=>token('M',382,98.76,true));
    },destroy(){shutter.destroy();}};
  }
};
