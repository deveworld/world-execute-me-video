// Procedural front/back identification card, lit laminate, metal clip and a timed 3D turn.
import {prog,ease} from './lib.js';
import {inkText,frontPrint,backPrint,portrait,role as printRole} from './badge/art.js';
import {swayAt,yawAt,hookAt,revealAt,HEADINGS} from './badge/motion.js';
import {cardShutter} from './card-shutter.js';
const START=95.758333333, S_ON=97.725, S_FILL=97.791666667;
const ON={OH:-Infinity,MY:95.833333333,SWITCH:96.15,ROLE:96.6,TO1:97.516666667,S:97.716666667,TO2:98.65,M:98.666666667};
const GLINTS=[[96,916,6240,45],[96.233333333,1015,6000,43],[97.4,872,6462,44],[97.866666667,859,6330,43],[99.066666667,1117,6360,21.5],[99.266666667,986,6048,31]];
const GN=[.6/Math.hypot(.6,1),1/Math.hypot(.6,1)];
const withWiden=(ctx,s,t,draw)=>{
  const on=ON[s],amount=s==='SWITCH'?.32:s==='ROLE'?.17:s==='M'?.43:1;
  const k=amount+(1-amount)*ease.outCubic(prog(t,on+.0167,.117));
  const center=s==='SWITCH'?407.5:s==='ROLE'?596:399.5;
  ctx.save();ctx.translate(center,0);ctx.scale(k,1);ctx.translate(-center,0);draw();ctx.restore();
};
export default {
  id:'existence/badge',start:START,end:99.40,
  async create(root,env){
    const fontURL=new URL('./fonts/leaguegothic/LeagueGothic-wdth.ttf',import.meta.url).href;
    await Promise.all([['League Gothic X',100],['League Gothic Narrow',75]].map(async([family,width])=>{
      const face=new FontFace(family,`url(${fontURL})`,{variationSettings:`"wdth" ${width}`});document.fonts.add(face);await face.load();
    }));
    await document.fonts.load('47px "Roboto Mono"');
    root.style.background='radial-gradient(ellipse at 65% 55%,#0e0f1c 0%,#0c0d14 72%)';
    const {ctx}=env.canvas(root);
    const mk=()=>{const c=document.createElement('canvas');c.width=500;c.height=790;return[c,c.getContext('2d',{willReadFrequently:true})];};
    const [front,fc]=mk(),[back,bc]=mk();
    const shutter=cardShutter();
    const reveal=(s,t)=>revealAt(t,ON[s],s==='SWITCH'||s==='ROLE'||s==='M'?.032:.065);
    const rounded=(c,x,y,w,h,r)=>{c.beginPath();c.roundRect(x,y,w,h,r);};
    // Draw the active glint (if any) on a face canvas, in card-local coordinates.
    const glint=(c,t,z,dx)=>{
      const f=t;let g=null;for(const e of GLINTS){const u=e[1]+e[2]*(f-e[0]);if(u>640&&u<1820){g=[u,e[3]];break;}}
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
    const base=(c)=>{c.clearRect(0,0,500,790);let g=c.createLinearGradient(0,0,500,790);g.addColorStop(0,'#211f94');g.addColorStop(.4,'#161670');g.addColorStop(1,'#13135d');c.fillStyle=g;rounded(c,.6,.6,498.8,788.8,28);c.fill();c.strokeStyle='#6b67a0';c.lineWidth=.8;c.stroke();c.fillStyle='#0c0d17';rounded(c,193,21,114,28,15);c.fill();c.strokeStyle='#6f6a9d';c.lineWidth=1;c.stroke();};
    const paintFront=(role,filled)=>{
      base(fc);
      fc.strokeStyle='rgba(188,179,239,.29)';fc.lineWidth=.7;fc.beginPath();fc.moveTo(36,122);fc.lineTo(464,122);fc.stroke();portrait(fc);frontPrint(fc);
      if(filled){let g=fc.createLinearGradient(35,451,35,752);g.addColorStop(0,'#474ed6');g.addColorStop(1,'#3e44cd');fc.fillStyle=g;rounded(fc,35,453,430,299,10);fc.fill();}
      else{fc.strokeStyle='rgba(187,178,244,.56)';fc.lineWidth=1;rounded(fc,35,453,430,299,10);fc.stroke();}
      if(role)printRole(fc,role);
    };
    // Print each face state once; only the laminate light changes between renders.
    const frontStates=[['',false],['S',false],['S',true],['M',true]].map(([role,filled])=>{
      paintFront(role,filled);const [image,pen]=mk();pen.drawImage(front,0,0);return image;
    });
    const frontDraw=t=>{
      const state=t>=98.875?3:t>=S_FILL?2:t>=S_ON?1:0;
      fc.clearRect(0,0,500,790);fc.drawImage(frontStates[state],0,0);
    };
    base(bc);backPrint(bc);
    const reverseTexture=document.createElement('canvas');reverseTexture.width=500;reverseTexture.height=790;reverseTexture.getContext('2d',{willReadFrequently:true}).drawImage(back,0,0);
    const backDraw=()=>{
      bc.clearRect(0,0,500,790);bc.drawImage(reverseTexture,0,0);
      // The reverse is lit as evenly as the front, so it gets no extra shading.
    };
    const strap=t=>{
      const [z,dx]=swayAt(t),hook=hookAt(t,z,dx);
      ctx.save();const tip=hook[0];const g=ctx.createLinearGradient(tip-35,0,tip+35,0);g.addColorStop(0,'#28256d');g.addColorStop(.2,'#4943bd');g.addColorStop(.65,'#504bd0');g.addColorStop(1,'#2a267a');ctx.fillStyle=g;
      ctx.beginPath();ctx.moveTo(tip-37,-15);ctx.lineTo(tip+37,-15);ctx.lineTo(tip+34,89);ctx.lineTo(tip-35,89);ctx.closePath();ctx.fill();ctx.strokeStyle='rgba(190,185,255,.20)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(tip-30,0);ctx.lineTo(tip-29,84);ctx.moveTo(tip+29,0);ctx.lineTo(tip+27,84);ctx.stroke();
      const metal=ctx.createLinearGradient(0,84,0,123);metal.addColorStop(0,'#efedf8');metal.addColorStop(.2,'#bcbcc9');metal.addColorStop(.5,'#9a9ba8');metal.addColorStop(.6,'#c3c4ce');metal.addColorStop(1,'#757684');ctx.fillStyle=metal;rounded(ctx,tip-42,85,84,38,6);ctx.fill();ctx.strokeStyle='#d8d7e7';ctx.lineWidth=.6;ctx.stroke();ctx.strokeStyle='#666879';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(tip-36,98);ctx.lineTo(tip+36,98);ctx.moveTo(tip-36,110);ctx.lineTo(tip+36,110);ctx.stroke();
      ctx.fillStyle='#b0b0bd';rounded(ctx,tip-8,122,16,17,3);ctx.fill();ctx.lineWidth=11;ctx.strokeStyle='#737586';ctx.lineCap='round';
      const wire=offset=>{ctx.beginPath();ctx.moveTo(hook[0]+offset,137);const ys=[140,155,175,195,212];for(let i=1;i<hook.length-1;i++)ctx.quadraticCurveTo(hook[i]+offset,ys[i],(hook[i]+hook[i+1])/2+offset,(ys[i]+ys[i+1])/2);ctx.lineTo(hook.at(-1)+offset,215);};
      wire(0);ctx.stroke();ctx.lineWidth=7;ctx.strokeStyle='#d5d4e4';ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#f2f1fa';wire(-2);ctx.stroke();ctx.lineCap='butt';ctx.restore();
    };
    return{render(t){
      ctx.clearRect(0,0,1920,1080);
      const [z,dx]=swayAt(t);
      frontDraw(t);backDraw();glint(fc,t,z,dx);glint(bc,t,z,dx);
      // Integrate the face over the shutter interval while the card turns.
      const moving=Math.abs(yawAt(t+1/120)-yawAt(t-1/120))>1;
      const N=moving?49:1;
      const shutterPoses=[];
      for(let i=0;i<N;i++){
        const st=t+(N===1?0:((i+.5)/N-.5)/60),a=yawAt(st)*Math.PI/180,c=Math.cos(a);
        shutterPoses.push(c);
      }
      shutter.render(front,back,shutterPoses,z,dx);ctx.drawImage(shutter.canvas,900,150);strap(t);
      for(const [s,x,y,w,h]of HEADINGS){
        const id=y>800?(x<200?'TO1':'TO2'):s;
        ctx.globalAlpha=reveal(id,t);
        if(ctx.globalAlpha>0)withWiden(ctx,id,t,()=>inkText(ctx,s,x,y,w,h,'#f4f1fb','League Gothic X',5));
      }
      ctx.globalAlpha=1;
      const token=(s,x,filled)=>{
        ctx.globalAlpha=reveal(s,t);if(ctx.globalAlpha<=0)return;
        if(filled){ctx.fillStyle='#4a4fdc';rounded(ctx,x-9,827,s==='M'?54:49,91,8);ctx.fill();}
        inkText(ctx,s,x+(s==='M'?6:8),840,s==='M'?23.25:17.42,64,'#f4f1fb','League Gothic Narrow');
        ctx.globalAlpha=1;
      };
      token('S',217,t>=S_FILL);
      withWiden(ctx,'M',t,()=>token('M',382,true));
      ctx.globalAlpha=1;
    },destroy(){shutter.destroy();}};
  }
};
