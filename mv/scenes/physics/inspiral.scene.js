// Binary inspiral on a deforming space-time lattice.
import { PHASE_KEYS } from './orbit.js';
import { ORBIT_POINTS } from './orbit_points.js';
import { STRAIN } from './strain.js';
import { LYRIC_TYPE, LYRIC_FIRST, LYRIC_TRANSFORMS } from './inspiral_type.js';
import { LYRIC_MORPH } from './lyric_morph.js';
import { MERGER_WAVE, OUTER_LOOP } from './merger_wave.js';
import { LATTICE_FIT, LATTICE_POST } from './lattice-fit.js';
import { INSPIRAL_TRAILS } from './inspiral-trails.js';
const W=1920,H=1080,T0=55.108333333333,MERGE=58.825;
const OUTER=new Map(OUTER_LOOP.frames),TRAILS=new Map(INSPIRAL_TRAILS),TRAIL_F0=INSPIRAL_TRAILS[0][0],TRAIL_F1=INSPIRAL_TRAILS.at(-1)[0],TRAIL_W=1.25,TRAIL_RGB='240,238,252';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,k)=>a+(b-a)*k;
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
function track(keys,t){if(t<=keys[0][0])return keys[0][1];for(let i=1;i<keys.length;i++)if(t<=keys[i][0])return mix(keys[i-1][1],keys[i][1],(t-keys[i-1][0])/(keys[i][0]-keys[i-1][0]));return keys.at(-1)[1];}
const CY=[[55.12,507],[57.15,507],[57.32,523],[57.52,551],[58.12,555],[58.32,584],[58.52,605],[58.72,620],[58.825,655],[59.30,655]];
function phase(t){
  if(t<PHASE_KEYS[0][0])return PHASE_KEYS[0][1]-(t-PHASE_KEYS[0][0])*5.7;
  return track(PHASE_KEYS,t);
}
function radius(t){return t>=MERGE?0:183.54*Math.pow(Math.max(0,58.827-t),.256);}
function observed(t,opposite=false){
  if(t>=MERGE)return [1180,655];
  const first=ORBIT_POINTS[0],j=opposite?3:1;
  if(t<first[0]){const x=first[j]+.5-1180,y=(first[j+1]+.5-507)/.52,r=Math.hypot(x,y)+(first[0]-t)*17,a=Math.atan2(y,x)-5.7*(t-first[0]);return [1180+r*Math.cos(a),507+r*.52*Math.sin(a)];}
  const f=(t-first[0])*60,i=Math.min(ORBIT_POINTS.length-2,Math.max(0,Math.floor(f))),k=clamp(f-i),a=ORBIT_POINTS[Math.max(0,i-1)],b=ORBIT_POINTS[i],c=ORBIT_POINTS[i+1],d=ORBIT_POINTS[Math.min(ORBIT_POINTS.length-1,i+2)],cubic=j=>.5*(2*b[j]+(-a[j]+c[j])*k+(2*a[j]-5*b[j]+4*c[j]-d[j])*k*k+(-a[j]+3*b[j]-3*c[j]+d[j])*k*k*k)+.5;return [cubic(j),cubic(j+1)];
}
function pairRadius(t){const a=observed(t),b=observed(t,true);return Math.hypot((a[0]-b[0])*.5,(a[1]-b[1])/(2*.52));}
function world(t){const points=[observed(t),observed(t,true)],cy=track(CY,t),R=pairRadius(t),bodies=points.map(p=>{const v=(p[1]-cy)/.49;return [(p[0]-1180)/(1+.000235*v),v];}),D=Math.max(0,cy-507)*Math.sqrt(R*R+235*235);
 const fit=t<MERGE?LATTICE_FIT[0].slice(1).map((_,j)=>track(LATTICE_FIT.map(r=>[r[0],r[j+1]]),t)):LATTICE_POST[0].slice(1).map((_,j)=>track(LATTICE_POST.map(r=>[r[0],r[j+1]]),t));
 return {points,cy,R,bodies,localGain:.5+.5*clamp(R/50),D,fit};}
function localDepth(u,v,field){let depth=0;const f=field.fit;for(let i=0;i<2;i++){const b=field.bodies[i];depth+=f[4+i]*f[6]/Math.sqrt((u-b[0])**2+(v-b[1])**2+f[6]**2)*field.localGain;}return depth;}
function globalDepth(u,v,field){const f=field.fit;return f[7]/Math.sqrt(u*u+v*v+f[8]**2);}
function orbit(t,opposite=false){const p=observed(t,opposite);return [...p,pairRadius(t),0];}


export default {
  id:'physics/inspiral',start:T0,end:59.30,fonts:['300 100px Inter','400 20px Inter'],
  async create(root,env){
    const {ctx}=env.canvas(root);
    const typePaths=LYRIC_TYPE.map(words=>words.map(w=>{const path=new Path2D();for(const ar of w.paths){const p=[];for(let i=0;i<ar.length;i+=2)p.push([ar[i],ar[i+1]]);const n=p.length,corner=i=>{const a=p[(i+n-1)%n],b=p[i%n],c=p[(i+1)%n],u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-b[0],c[1]-b[1]];return(u[0]*v[0]+u[1]*v[1])/Math.max(.01,Math.hypot(...u)*Math.hypot(...v))<.60;};path.moveTo(...p[0]);for(let i=0;i<n;i++){const a=p[(i+n-1)%n],b=p[i],c=p[(i+1)%n],d=p[(i+2)%n],k1=corner(i)?0:1/6,k2=corner((i+1)%n)?0:1/6;path.bezierCurveTo(b[0]+(c[0]-a[0])*k1,b[1]+(c[1]-a[1])*k1,c[0]-(d[0]-b[0])*k2,c[1]-(d[1]-b[1])*k2,c[0],c[1]);}path.closePath();}return path;}));

    const bg=document.createElement('canvas');bg.width=W;bg.height=H;const bc=bg.getContext('2d');
    bc.fillStyle='#06050a';bc.fillRect(0,0,W,H);
    bc.save();bc.translate(1170,535);bc.scale(1.4,1);let g=bc.createRadialGradient(0,0,30,0,0,670);g.addColorStop(0,'#09091b');g.addColorStop(.48,'#080815');g.addColorStop(1,'rgba(6,5,10,0)');bc.fillStyle=g;bc.fillRect(-850,-700,1700,1400);bc.restore();
    bc.fillStyle='rgb(1,0,5)';bc.fillRect(120,903,1680,1);bc.fillRect(120,905,1680,1);bc.fillStyle='rgb(74,73,82)';bc.fillRect(120,904,1680,1);
    bc.fillStyle='#a6a3b6';bc.font='400 22.5px Inter';bc.textBaseline='alphabetic';bc.fillText('strain',119.5,858);bc.font='italic 22.5px Inter';bc.fillText('h',180.5,858);
    bc.font='400 20px Inter';bc.textAlign='center';for(const [x,s] of [[467,'-3 s'],[852,'-2 s'],[1237,'-1 s'],[1622,'merger']]){bc.font=s==='merger'?'400 22.5px Inter':'400 20px Inter';bc.fillText(s,x,977);}
    // Mesh projection: the pair makes two local wells; the merged well draws the centre down.
    function meshPoint(u,v,field){const f=field.fit,x=f[0]+u*(1+f[3]*v),y=f[1]+v*f[2]+localDepth(u,v,field)+globalDepth(u,v,field),c=Math.cos(f[9]),s=Math.sin(f[9]);return[1180+(x-1180)*c-(y-507)*s,507+(x-1180)*s+(y-507)*c];}
    function grid(t,field){
      const step=40,R=520;ctx.lineWidth=.75;
      for(let axis=0;axis<2;axis++)for(let k=-13;k<=13;k++){
        const fixed=k*step;let prev=null;
        for(let j=0;j<=100;j++){
          const varying=-R+j*R/50,u=axis?fixed:varying,v=axis?varying:fixed,p=meshPoint(u,v,field);
          if(prev){const fade=Math.exp(-Math.pow(Math.hypot(u/1.03,v)/410,6));ctx.strokeStyle=`rgba(91,85,127,${.39*fade})`;ctx.beginPath();ctx.moveTo(prev[0],prev[1]);ctx.lineTo(p[0],p[1]);ctx.stroke();}prev=p;
        }
      }
    }
    function trails(t){
      // Trail spirals: per source frame, rho over the lag angle (2 deg steps) in elliptic polar
      // coordinates (the two bodies' trails before the merger; the merged body's spiral and plunge hook after).
      const fr=TRAILS.get(clamp(Math.round(t*60),TRAIL_F0,TRAIL_F1)),runs=new Map();
      for(const [th0i,dir,cxi,cyi,r0,dr,al] of fr){
        const th0=th0i/1e4,cx=cxi/100+.5,cy=cyi/100+.5,step=dir*Math.PI/90;let rho=r0/100,px=cx+rho*Math.cos(th0),py=cy+.52*rho*Math.sin(th0),last=-1;
        for(let i=1;i<al.length;i++){
          rho+=dr[i-1]/100;const th=th0-step*i,x=cx+rho*Math.cos(th),y=cy+.52*rho*Math.sin(th),q=Math.round((al[i-1]+al[i])/40);
          if(q>0){let p=runs.get(q);if(!p){p=new Path2D();runs.set(q,p);}if(q!==last)p.moveTo(px,py);p.lineTo(x,y);}
          last=q;px=x;py=y;
        }
      }
      // after the merger: the spiral's faint third loop (ellipse, opacity per 10 deg)
      const outer=OUTER.get(Math.round(t*60));
      if(outer){const [ox,oy,orx,ory]=OUTER_LOOP.ell;let px=ox+orx,py=oy,last=-1;
        for(let i=1;i<=180;i++){const a=i*Math.PI/90,x=ox+orx*Math.cos(a),y=oy+ory*Math.sin(a),u=(i-.5)/5,j=Math.floor(u)%36,k=u-Math.floor(u),al=outer[j]*(1-k)+outer[(j+1)%36]*k,q=Math.round(al/20);
          if(q>0){let p=runs.get(q);if(!p){p=new Path2D();runs.set(q,p);}if(q!==last)p.moveTo(px,py);p.lineTo(x,y);}last=q;px=x;py=y;}}
      ctx.save();ctx.lineWidth=TRAIL_W;ctx.lineCap='butt';ctx.lineJoin='round';
      for(const [q,p] of runs){ctx.strokeStyle=`rgba(${TRAIL_RGB},${Math.min(1,q/50)})`;ctx.stroke(p);}
      ctx.restore();
    }
    function body(p,warm=false,merged=false,t=55.5){
      const [x,y]=p,col=warm?[255,212,192]:merged?[235,213,241]:[230,230,235],R=merged?65:44,strength=(warm?.9:1)*(1+(warm?.4:.25)*clamp((t-55.5)/3));
      const gl=ctx.createRadialGradient(x,y,0,x,y,R);
      for(const [r,a]of [[0,.75],[4,.75],[5,.58],[6,.30],[8,.22],[12,.135],[18,.095],[26,.060],[34,.020],[40,.005],[44,0]])gl.addColorStop(r/44,`rgba(${col.join(',')},${Math.min(.95,a*strength)})`);
      ctx.fillStyle=gl;ctx.fillRect(x-R,y-R,2*R,2*R);ctx.strokeStyle=`rgba(${col.join(',')},.06)`;ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x-24,y);ctx.lineTo(x+24,y);ctx.moveTo(x,y-24);ctx.lineTo(x,y+24);ctx.stroke();
      ctx.fillStyle=warm?'rgb(246,217,213)':merged?'rgb(250,235,245)':'rgb(235,234,251)';ctx.beginPath();ctx.arc(x,y,merged?5.2:4.45,0,Math.PI*2);ctx.fill();
    }
    function strain(t){
      ctx.save();ctx.translate(.5,.5);const head=clamp(120+(t-54.923)*385-.5,120,1800);ctx.beginPath();
      let last=STRAIN[0],hp=last;
      for(let i=0;i<STRAIN.length;i++){
        const p=STRAIN[i];if(p[0]>head){const k=(head-last[0])/(p[0]-last[0]);hp=[head,mix(last[1],p[1],k)];ctx.lineTo(...hp);break;}
        if(i)ctx.lineTo(...p);else ctx.moveTo(...p);last=p;hp=p;
      }ctx.strokeStyle='rgb(1,0,5)';ctx.lineWidth=2.2;ctx.stroke();ctx.strokeStyle='#eeeaf5';ctx.lineWidth=1.02;ctx.stroke();ctx.fillStyle='#ddd9e7';ctx.beginPath();ctx.arc(hp[0],hp[1],3.2,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    function lyric(t){
      const [phase,states]=LYRIC_TRANSFORMS[clamp(Math.round(t*60)-LYRIC_FIRST,0,LYRIC_TRANSFORMS.length-1)];
      states.forEach(([x,y,sx,sy,a],i)=>{
        if(a<=0)return;ctx.save();ctx.translate(x,y);ctx.globalAlpha=Math.min(1,a);
        if(phase===0){ctx.scale(sx,sy);ctx.fillStyle=`rgb(${LYRIC_TYPE[phase][i].color.join(',')})`;ctx.fill(typePaths[phase][i],'evenodd');}
        else{
          const box=LYRIC_TYPE[1][i].box,width=(box[2]-box[0])*sx,height=(box[3]-box[1])*sy;let ia=0,ib=0,k=0;
          for(let j=0;j<LYRIC_MORPH.length-1;j++){if(width<=LYRIC_MORPH[j][i].width){ia=j;ib=j+1;k=clamp((LYRIC_MORPH[j][i].width-width)/(LYRIC_MORPH[j][i].width-LYRIC_MORPH[j+1][i].width));}}
          const A=LYRIC_MORPH[ia][i],B=LYRIC_MORPH[ib][i];ctx.fillStyle=`rgb(${A.color.map((v,j)=>mix(v,B.color[j],k)).join(',')})`;ctx.beginPath();
          for(let q=0;q<A.paths.length;q++){const ap=A.paths[q],bp=B.paths[q];for(let j=0;j<ap.length;j+=2){const xx=mix(ap[j],bp[j],k)*width,yy=mix(ap[j+1],bp[j+1],k)*height;if(j)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);}ctx.closePath();}ctx.fill('evenodd');
        }ctx.restore();
      });
    }
    return {render(t){
      ctx.drawImage(bg,0,0);const field=world(t),p1=orbit(t),p2=orbit(t,true);grid(t,field);trails(t);
      if(t<MERGE){body(p1,false,false,t);body(p2,true,false,t);}else{
        const wf=clamp(Math.round(t*60)-3530,0,MERGER_WAVE.length-1),wave=MERGER_WAVE[wf];
        if(wave[5]>0){ctx.strokeStyle=`rgba(244,239,253,${wave[5]})`;ctx.lineWidth=1.25;ctx.beginPath();ctx.ellipse(wave[1],wave[2],wave[3],wave[4],0,0,Math.PI*2);ctx.stroke();}
        body([1180,655],false,true,t);
      }
      strain(t);lyric(t);
    }};
  }
};
