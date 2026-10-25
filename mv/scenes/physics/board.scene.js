// Airport split-flap board, 51.425–55.108333. Every flap is sought from song time.
import { BOARD_TYPE } from './board_type.js';
import { FLAP_FIRST, FLAP_STATES, LYRIC_STATES } from './board_flaps.js';
const W=1920,H=1080;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const dates=[
  [51.425,'2026','','BOARDING'],
  [51.900,'1969','','MOON LANDING'],
  [52.400,'1903','','FIRST FLIGHT'],
  [52.850,'1492','','COLUMBUS'],
  [53.317,'1271','AD','MARCO POLO'],
  [53.783,'  79','AD','VESUVIUS'],
  [54.267,'   1','AD','ANNO DOMINI'],
  [54.583,'2560','BC','GREAT PYRAMID'],
];
const statusTimes=[51.425,52.117,52.500,52.933,53.317,53.800,54.350,54.583];
const targets=[
  ['OH WE CAN',[51.20,51.20,99,51.425,51.445,99,52.16,52.06,51.98],[.10,.10,0,.23,.21,0,.17,.27,.35]],
  ['TRAVEL   ',[52.25,52.28,52.31,52.34,52.37,52.40,99,99,99],[.50,.46,.43,.39,.35,.31,0,0,0]],
  ['TO AD    ',[53.033,53.08,99,53.34,53.37,99,99,99,99],[.47,.42,0,.16,.13,0,0,0,0]],
  ['TO BC    ',[53.90,53.96,99,54.583,54.583,99,99,99,99],[.46,.40,0,.12,.12,0,0,0,0]],
];
const rr=(ctx,x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};

export default {
  id:'physics/board',start:51.425,end:55.108333333333,
  fonts:['700 138px "Roboto Condensed"','400 25px "Roboto Condensed"'],
  async create(root,env){
    const {ctx}=env.canvas(root);
    const pathCache=new Map();
    const bg=document.createElement('canvas');bg.width=W;bg.height=H;
    const bc=bg.getContext('2d');
    const g=bc.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#141318');g.addColorStop(.48,'#0c0c13');g.addColorStop(.84,'#09090e');g.addColorStop(.86,'#07060b');g.addColorStop(1,'#07060b');bc.fillStyle=g;bc.fillRect(0,0,W,H);
    const haze=bc.createRadialGradient(980,100,0,980,100,1300);haze.addColorStop(0,'rgba(15,17,24,.28)');haze.addColorStop(1,'rgba(0,0,0,0)');bc.fillStyle=haze;bc.fillRect(0,0,W,920);
    bc.fillStyle='rgba(2,3,6,.55)';bc.fillRect(0,520,W,4);bc.fillRect(0,903,W,5);
    bc.fillStyle='rgba(75,77,90,.17)';bc.fillRect(0,520,W,1);bc.fillRect(0,903,W,1);
    function trackText(text,x,y,size,spacing,color,weight=400){bc.font=`${weight} ${size}px "Roboto Condensed"`;bc.textBaseline='alphabetic';bc.fillStyle=color;for(const ch of text){bc.fillText(ch,x,y);x+=bc.measureText(ch).width+spacing;}}
    for(const [name,x]of [['TIME',118],['DESTINATION',768]]){bc.save();bc.translate(x,110);bc.fillStyle='rgb(145,144,160)';bc.fill(outlines(BOARD_TYPE.headers[name]),'evenodd');bc.restore();}
    const cells=[],status=[];
    function cell(x,y,w=107,h=164){
      bc.save();bc.shadowColor='rgba(0,0,0,.95)';bc.shadowBlur=5;rr(bc,x-3,y-3,w+6,h+6,4);bc.fillStyle='#05070b';bc.fill();bc.restore();
      const gr=bc.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,'#201f24');gr.addColorStop(.48,'#1c1c21');gr.addColorStop(.5,'#15151b');gr.addColorStop(1,'#1b1b20');rr(bc,x,y,w,h,3);bc.fillStyle=gr;bc.fill();
      bc.lineWidth=1;bc.strokeStyle=w>600?'#35343b':'#05060b';bc.stroke();bc.fillStyle='rgba(0,0,0,.25)';bc.fillRect(x,y+h/2,w,3);
      return {x,y,w,h};
    }
    for(const y of [167,541]){
      const row=[];for(let i=0;i<4;i++)row.push(cell(126+114*i,y));row.push(cell(589,y,158));cells.push(row);
      status.push(cell(126,y+173,621));
    }
    const dest=[];for(const y of [167,340,541,714]){const row=[];for(let i=0;i<9;i++)row.push(cell(775+114*i,y));dest.push(row);}
    const faceCache=new Map();
    function outlines(data){
      if(pathCache.has(data))return pathCache.get(data);const p=new Path2D();
      for(const ar of data[2]){const pts=[];for(let i=0;i<ar.length;i+=2)pts.push([ar[i],ar[i+1]]);const n=pts.length;
        const corner=i=>{const a=pts[(i+n-1)%n],b=pts[i%n],c=pts[(i+1)%n],u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-b[0],c[1]-b[1]];return(u[0]*v[0]+u[1]*v[1])/Math.max(.01,Math.hypot(...u)*Math.hypot(...v))<.70;};
        p.moveTo(...pts[0]);for(let i=0;i<n;i++){const a=pts[(i+n-1)%n],b=pts[i],c=pts[(i+1)%n],d=pts[(i+2)%n],k1=corner(i)?0:1/6,k2=corner((i+1)%n)?0:1/6;p.bezierCurveTo(b[0]+(c[0]-a[0])*k1,b[1]+(c[1]-a[1])*k1,c[0]-(d[0]-b[0])*k2,c[1]-(d[1]-b[1])*k2,c[0],c[1]);}p.closePath();
      }pathCache.set(data,p);return p;
    }
    function face(text,c,size=138,sx=.90,weight=700,track=0){
      const key=[text,c.w,size,sx,weight,track].join('|');if(faceCache.has(key))return faceCache.get(key);
      const cv=document.createElement('canvas');cv.width=c.w;cv.height=c.h;const fc=cv.getContext('2d');
      const mid=c.w>600?80:81,gr=fc.createLinearGradient(0,0,0,c.h);
      const stops=[[0,[4,3,8]],[1,[48,47,54]],[2,[30,29,36]],[20,[29,28,35]],[mid-3,[28,27,34]],[mid-1,[44,43,50]],[mid,[3,2,7]],[mid+1,[9,8,14]],[mid+4,[20,19,25]],[mid+9,[26,25,32]],[c.h-3,[27,26,33]],[c.h-1,[5,4,9]]];
      for(const [y,col]of stops)gr.addColorStop(y/c.h,`rgb(${col.join(',')})`);fc.fillStyle=gr;fc.fillRect(0,0,c.w,c.h);
      const data=c.w>600?BOARD_TYPE.labels[text]:BOARD_TYPE.glyphs[text];
      if(data){fc.save();fc.translate((c.w-data[0])/2,0);fc.fillStyle=c.w>600?'rgb(218,216,246)':'rgb(252,251,255)';fc.fill(outlines(data),'evenodd');fc.restore();}
      else if(text){
        fc.save();fc.translate(c.w/2,c.h/2);const charScale={O:.86,H:.85,W:1.01,E:.98,C:.885,A:.845,N:.918,T:.88,R:.91,V:.90,L:.94,B:.90,D:.90};fc.scale(sx*(text.length===1?(charScale[text]||1):1),1);fc.font=`${weight} ${size}px "Roboto Condensed"`;fc.textBaseline='middle';fc.fillStyle=c.w>600?'rgb(218,216,246)':'rgb(252,251,255)';const width=fc.measureText(text).width+track*Math.max(0,text.length-1);let xx=-width/2;for(const ch of text){fc.fillText(ch,xx,size>100?14:1);xx+=fc.measureText(ch).width+track;}fc.restore();
      }
      faceCache.set(key,cv);return cv;
    }
    function seam(c){
      const sy=c.y+(c.w>600?80:81);ctx.fillStyle='rgba(0,0,0,.92)';ctx.fillRect(c.x,sy,c.w,1);ctx.fillStyle='rgba(10,9,15,.72)';ctx.fillRect(c.x,sy+1,c.w,1);
      ctx.fillStyle='#57555e';ctx.fillRect(c.x-2,sy-1,2,4);ctx.fillRect(c.x+c.w,sy-1,2,4);
    }
    function drawFace(c,old,next,p,size=138,sx=.9,weight=700,track=0){
      const a=face(old,c,size,sx,weight,track),b=face(next,c,size,sx,weight,track),h=c.w>600?80.5:81.5,bh=c.h-h;
      ctx.save();rr(ctx,c.x+1,c.y+1,c.w-2,c.h-2,4);ctx.clip();
      if(p==null){ctx.drawImage(a,c.x,c.y);}else{
        ctx.drawImage(b,0,0,c.w,h,c.x,c.y,c.w,h);ctx.drawImage(a,0,h,c.w,bh,c.x,c.y+h,c.w,bh);
        // flap shading measured on the status card: the revealed top half sits in the falling flap's shadow
        // and the flap darkens as it tilts
        const k=Math.cos(Math.PI*p);
        if(k>0){ctx.fillStyle=`rgba(0,0,0,${.55*k})`;ctx.fillRect(c.x,c.y,c.w,h);ctx.drawImage(a,0,0,c.w,h,c.x,c.y+h-h*k,c.w,h*k);ctx.fillStyle=`rgba(0,0,0,${.35*(1-k)})`;ctx.fillRect(c.x,c.y+h-h*k,c.w,h*k);}
        else ctx.drawImage(b,0,h,c.w,bh,c.x,c.y+h,c.w,-bh*k);
      }
      ctx.restore();seam(c);
    }
    function spinning(c,target,t,t0,len,seed,opts=[]){
      if(t<t0){drawFace(c,'','',null,...opts);return;}
      if(t>=t0+len){drawFace(c,target,target,null,...opts);return;}
      const cycles=Math.max(2,Math.round(len*30)),u=clamp((t-t0)/len)*cycles,i=Math.floor(u),p=u-i;
      const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const a=i===0?'':chars[(seed+i*3)%26],b=i>=cycles-1?target:chars[(seed+(i+1)*3)%26];drawFace(c,a,b,p,...opts);
    }
    function changing(c,old,next,t,t0,len,seed,opts=[]){
      if(old===next||t>=t0+len){drawFace(c,next,next,null,...opts);return;}
      if(t<t0){drawFace(c,old,old,null,...opts);return;}
      const u=(t-t0)/len*3,i=Math.floor(u),p=u-i;const a=i===0?old:String((seed+i)%10),b=i>=2?next:String((seed+i+1)%10);drawFace(c,a,b,p,...opts);
    }
    const vignette=document.createElement('canvas');vignette.width=W;vignette.height=H;const vc=vignette.getContext('2d'),vg=vc.createRadialGradient(960,540,0,960,540,1120);
    for(const [r,a]of [[0,0],[560,0],[640,.025],[750,.075],[850,.12],[1000,.23],[1120,.29]])vg.addColorStop(r/1120,`rgba(6,5,10,${a})`);vc.fillStyle=vg;vc.fillRect(0,0,W,H);
    return {render(t){
      ctx.drawImage(bg,0,0);
      for(let i=0;i<4;i++)drawFace(cells[0][i],'2026'[i],'',null);
      drawFace(cells[0][4],'','',null);
      drawFace(status[0],'NOW','',null,72,.86,700,3);
      const fi=clamp(Math.round(t*60)-FLAP_FIRST,0,FLAP_STATES.length-1),lyric=LYRIC_STATES[fi];
      for(let r=0;r<4;r++)for(let i=0;i<9;i++){const [a,b,p]=lyric[r][i];drawFace(dest[r][i],a,b,p<0?null:p);}
      const fitted=FLAP_STATES[clamp(Math.round(t*60)-FLAP_FIRST,0,FLAP_STATES.length-1)];
      for(let i=0;i<5;i++){const [a,b,p]=fitted[i];drawFace(cells[1][i],a,b,p<0?null:p);}
      {const [a,b,p]=fitted[5];drawFace(status[1],a,b,p<0?null:p,72,.86,700,2);}
      ctx.drawImage(vignette,0,0);
    }};
  }
};
