// A real canvas calendar, with vector marker writing and a travelling light/dark wipe.
import {clamp,lerp,prog,ease} from './lib.js';
import {INK_PATHS} from './calendar_ink.js';
import {TracedStrokes,loadStrokes} from './strokes.js';
const EVENTS=[
  [7,8.5,'7:00 – 8:30 AM',93.28],[9,10,'9:00 – 10:00 AM',93.49],
  [10,11.5,'10:00 – 11:30 AM',93.66],[12,13,'12:00 – 1:00 PM',93.79],
  [13.5,15,'1:30 – 3:00 PM',93.91],[15.5,17,'3:30 – 5:00 PM',94.02],
  [17.5,18.5,'5:30 – 6:30 PM',94.12],[19,20.5,'7:00 – 8:30 PM',94.20],
  [21,22.5,'9:00 – 10:30 PM',94.27],
];
const TIME_Y = h => 226.5+(h-6)*40;
// Measured: hour rows reveal one 1/8 beat apart; each rule sweeps left->right (outExpo, 17 frames)
// while its label rises from 1/3 to full opacity.
const ROW0=92.0513, ROWSTEP=0.0577;
const outExpo=k=>k>=1?1:1-Math.pow(2,-10*k);
// Event bars land every ~7 frames; their text fades in 2.4..8 frames later.
const BAR0=5599.3, BARSTEP=7.02;
// AM suffixes turn blue in a quick top-down cascade, 12 PM later (frames, measured).
const AM_BLUE=[5658,5660,5662,5664,5665,5667,5717];
// Hand-drawn arrow down the right margin (pen centre y per frame, measured).
const ARROW_Y=[[5725.5,266],[5726,269.5],[5727,306.5],[5728,352.5],[5729,402.5],[5730,460.5],[5731,519.5],[5732,580.5],[5733,641.5],[5734,702.5],[5735,758.5],[5736,810.5],[5737,854.5],[5738,884]];
const ARROW_X=[[266,1720],[310,1720.5],[390,1721.5],[470,1722.5],[550,1723],[630,1723],[690,1722.5],[770,1721.5],[830,1720.5],[884,1719.5]];
const lerpTab=(tab,x)=>{if(x<=tab[0][0])return tab[0][1];for(let i=1;i<tab.length;i++)if(x<=tab[i][0]){const[a,va]=tab[i-1],[b,vb]=tab[i];return va+(vb-va)*(x-a)/(b-a);}return tab[tab.length-1][1];};
export default {
  id:'existence/calendar',start:92.03,end:95.758333333,
  fonts:['500 16px "Plus Jakarta Sans"','700 29.5px "Plus Jakarta Sans"'],
  async create(root,env){
    await Promise.all(['400 18.5px','500 16px','600 20px','700 29.5px','800 22px'].map(f=>document.fonts.load(f+' "Plus Jakarta Sans"')));
    const {ctx}=env.canvas(root);
    const darkC=document.createElement('canvas');darkC.width=1920;darkC.height=1080;const dc=darkC.getContext('2d');
    const maskC=document.createElement('canvas');maskC.width=1920;maskC.height=1080;const mc=maskC.getContext('2d');
    const ink=INK_PATHS.map(p=>new Path2D(p));
    const pen=new TracedStrokes(await loadStrokes('calendar_pen'),{width:16,color:'#fff',dotR:8,dotHold:.018});
    const completed=await(await fetch(new URL('./data/calendar_completions.json',import.meta.url))).json();
    const markers=await(await fetch(new URL('./data/calendar_marker.json',import.meta.url))).json();
    // The detector jittered by 1 px; the real marker only moves down. It also exists (sweeping in) from frame 5581.
    {let m=-1;for(const r of markers){if(r[0]>=5581&&r[1]===null)r[1]=266.5;if(r[1]!==null){m=Math.max(m,r[1]);r[1]=m;}}}
    const EV_END=[8.5,10,11.5,13,15,17,18.5,20.5,22.5];
    // Past events dim once the marker settles on the next full hour row (measured 7-frame fade).
    const dimStart=EV_END.map(b=>{const y=TIME_Y(Math.ceil(b))-2;const r=markers.find(r=>r[1]!==null&&r[1]>=y);return r?r[0]/60:1e9;});
    const inkC=document.createElement('canvas');inkC.width=1920;inkC.height=1080;const ic=inkC.getContext('2d');
    const penC=document.createElement('canvas');penC.width=1920;penC.height=1080;const pc=penC.getContext('2d');
    const round=(c,x,y,w,h,r)=>{c.beginPath();c.roundRect(x,y,w,h,r);};
    const text=(c,s,x,y,font,col)=>{c.font=font;c.fillStyle=col;c.fillText(s,x,y);};
    const draw=(c,t,dark)=>{
      const BG=dark?'#0d0e15':'#f0f0f0',PANEL=dark?'#1d1e27':'#f5f5f5',FG=dark?'#e8e7f1':'#171718',MUTED=dark?'#b6b5c4':'#414146',RULE=dark?'#30313b':'#d3d3d3';
      c.clearRect(0,0,1920,1080);c.fillStyle=BG;c.fillRect(0,0,1920,1080);
      if(!dark){const g=c.createRadialGradient(960,540,100,960,540,1100);g.addColorStop(0,'#f6f6f6');g.addColorStop(1,'#ededed');c.fillStyle=g;c.fillRect(0,0,1920,1080);}
      c.save();c.shadowColor=dark?'rgba(0,0,0,.15)':'rgba(40,40,40,.07)';c.shadowBlur=24;c.shadowOffsetY=12;c.fillStyle=PANEL;round(c,120,110,1680,860,22);c.fill();c.restore();
      c.strokeStyle=dark?'#474851':'#d4d4d4';c.lineWidth=.9;round(c,120.5,110.5,1679,859,22);c.stroke();
      c.strokeStyle=dark?'#34353e':'#d8d8d8';c.beginPath();c.moveTo(121,206.5);c.lineTo(1799,206.5);c.stroke();
      const dg=c.createLinearGradient(148,134,194,181);dg.addColorStop(0,'#675fee');dg.addColorStop(1,'#514bd1');c.fillStyle=dg;c.beginPath();c.arc(172,158,24.4,0,Math.PI*2);c.fill();
      const PJ='"Plus Jakarta Sans"';text(c,'12',161,166,'800 22px '+PJ,'#fff');text(c,'Sunday',212,156,'700 29.5px '+PJ,FG);text(c,'June 2016',212,181,'500 16px '+PJ,MUTED);
      // Compact segmented display selector and the light/dark control.
      c.fillStyle=dark?'#252630':'#e9e9e9';round(c,1477,139,224,39,12);c.fill();
      c.save();c.shadowColor=dark?'rgba(0,0,0,.35)':'rgba(0,0,0,.12)';c.shadowBlur=5;c.shadowOffsetY=1;c.fillStyle=dark?'#32333f':'#f8f8f8';round(c,1479,142,63,33,10);c.fill();c.restore();
      text(c,'Day',1496,164,'500 14.5px '+PJ,dark?'#fff':'#111');text(c,'Week',1558,164,'500 15px '+PJ,MUTED);text(c,'Month',1633,164,'500 15px '+PJ,MUTED);
      const tk=prog(t,95.19,.12);c.fillStyle=dark?'#8983f0':(tk>0?'#8b84ee':'#e7e7e7');round(c,1716,142,56,33,17);c.fill();
      const tx=1732+24*tk;c.fillStyle=dark?'#e3e1ff':'#f8f8f8';c.beginPath();c.arc(tx,158.5,13,0,Math.PI*2);c.fill();
      c.strokeStyle=dark?'#8a82e9':'#333';c.lineWidth=1.2;
      if(dark||tk>.5){c.beginPath();c.arc(tx+1,157,7.2,.2,Math.PI*1.9);c.stroke();c.fillStyle='#8b84ed';c.beginPath();c.arc(tx+4.2,153.7,6.6,0,Math.PI*2);c.fill();}
      else{c.beginPath();c.arc(tx,158.5,4,0,Math.PI*2);c.stroke();for(let i=0;i<8;i++){let a=i*Math.PI/4;c.beginPath();c.moveTo(tx+7*Math.cos(a),158.5+7*Math.sin(a));c.lineTo(tx+10*Math.cos(a),158.5+10*Math.sin(a));c.stroke();}}
      // Hour rulers.
      c.textAlign='right';
      const marker=markers[Math.max(0,Math.min(markers.length-1,Math.round(t*60)-markers[0][0]))][1];
      const now=marker===null?6:6+(marker-226.5)/40;
      for(let h=6;h<=24;h++){
        const yy=TIME_Y(h), t0=ROW0+(h-6)*ROWSTEP, rp=outExpo(prog(t,t0,.283));
        if(rp>0){c.strokeStyle=RULE;c.lineWidth=.65;c.beginPath();c.moveTo(226,yy);c.lineTo(226+1442*rp,yy);c.stroke();}
        if(h>23)continue;
        const n=h%12||12, ap=h<12?'AM':'PM', LF='400 18.5px '+PJ;
        c.save();c.textAlign='right';c.globalAlpha=.33+.67*ease.outQuad(prog(t,t0,.11));
        if(dark){
          // Dark theme: AM rows stay grey; PM rows have white numerals and a lavender suffix.
          if(h<12)text(c,`${n} ${ap}`,199,yy+6.5,LF,'#c0c1ca');
          else{c.font=LF;const sw=c.measureText(' '+ap).width;text(c,`${n}`,199-sw,yy+6.5,'600 18.5px '+PJ,'#fff');text(c,ap,199,yy+6.5,LF,'#d9d7fa');}
        }else{
          text(c,`${n} ${ap}`,199,yy+6.5,LF,MUTED);
          const bi=h<12?h-6:(h===12?6:-1);
          if(bi>=0){const k=prog(t*60,AM_BLUE[bi]-1,1.5);if(k>0){c.globalAlpha=k;text(c,ap,199,yy+6.5,LF,'#4842c0');}}
        }
        c.restore();
      }
      c.textAlign='left';
      for(let i=0;i<EVENTS.length;i++){
        const [a,b,label]=EVENTS[i], bf=BAR0+BARSTEP*i, f=t*60, p=clamp((f-bf+.75)/1.5);if(p<=0)continue;
        const tp=clamp((f-bf-2.4)/5.6), dk=prog(t,dimStart[i],.117);
        const yy=TIME_Y(a), hh=40*(b-a)-2;
        const mix=(u,v)=>{const A=parseInt(u.slice(1),16),B=parseInt(v.slice(1),16);const ch=s=>Math.round(((A>>s)&255)*(1-dk)+((B>>s)&255)*dk);return `rgb(${ch(16)},${ch(8)},${ch(0)})`;};
        c.save();c.globalAlpha=p;c.fillStyle=dark?mix('#2c2e5c','#23253e'):mix('#e0dff3','#eeecf6');round(c,240,yy,1420,hh,7);c.fill();
        c.fillStyle=dark?mix('#9a94f6','#5e5d75'):mix('#4b45cf','#b4b0e6');round(c,239.5,yy,3,hh,1.5);c.fill();
        c.globalAlpha=p*tp;
        text(c,'Whatever',255,yy+26.5,(dark&&dk<.5?'600':'500')+' 20px '+PJ,dark?mix('#ffffff','#bdbdd5'):mix('#100a78','#302f40'));text(c,label,362,yy+26.5,'500 16px '+PJ,dark?mix('#dadeff','#c6c6e0'):mix('#211b6a','#2a2937'));c.restore();
      }
      if(marker!==null&&t>=93.008){const yy=marker,mp=outExpo(prog(t,93.008,.347));c.strokeStyle=dark?'#a094ff':'#6158e1';c.lineWidth=1.5;c.beginPath();c.moveTo(226,yy);c.lineTo(226+1442*mp,yy);c.stroke();c.fillStyle=dark?'#a094ff':'#6158e1';c.beginPath();c.arc(226,yy,6,0,Math.PI*2);c.fill();}
      // The lettering is vector geometry, revealed along the same three written lines.
      ic.clearRect(0,0,1920,1080);ic.save();ic.translate(.5,.5);ic.fillStyle=dark?'#aaa6ff':'#514fdf';for(const p of ink)ic.fill(p,'evenodd');ic.restore();
      pc.clearRect(0,0,1920,1080);pen.draw(pc,t);pc.fillStyle='#fff';for(const[x,y,w,h,done]of completed)if(t>=done)pc.fillRect(x,y,w,h);
      ic.globalCompositeOperation='destination-in';ic.drawImage(penC,0,0);ic.globalCompositeOperation='source-over';c.drawImage(inkC,0,0);
      // Hand-drawn arrow down the right margin, written after the switch is thrown.
      const af=t*60;
      if(af>=5725){
        c.save();c.strokeStyle=dark?'#aeaef4':'#514fdf';c.lineWidth=8.6;c.lineCap='round';c.lineJoin='round';c.beginPath();
        c.moveTo(1693,266);c.lineTo(1693+27*clamp((af-5725)/.5),266);
        if(af>=5725.5){const py=lerpTab(ARROW_Y,af);for(const[y,x]of ARROW_X){if(y>=py)break;c.lineTo(x,y);}c.lineTo(lerpTab(ARROW_X,py),py);}
        const kl=clamp((af-5737.5)/1.5), kr=clamp((af-5740.5)/2.5);
        if(kl>0){c.moveTo(1719.5,884);c.lineTo(1719.5-14.5*kl,884-23*kl);}
        if(kr>0){c.moveTo(1719.5,884);c.lineTo(1719.5+14.5*kr,884-23*kr);}
        c.stroke();c.restore();
      }
    };
    return {render(t){
      draw(ctx,t,false);
      // Dark wipe edge eased like the source (inOutSine fit to the measured edge row, max error 5 px).
      const we=-117.6+1276.5*ease.inOutSine(prog(t,5716/60,23.3/60)), k=t>=95.29?1:0;
      if(k>0){draw(dc,t,true);mc.clearRect(0,0,1920,1080);mc.drawImage(darkC,0,0);mc.globalCompositeOperation='destination-in';const yy=we+29,g=mc.createLinearGradient(0,yy-115,0,yy+115);g.addColorStop(0,'#000');g.addColorStop(1,'rgba(0,0,0,0)');mc.fillStyle=g;mc.fillRect(0,0,1920,1080);mc.globalCompositeOperation='source-over';ctx.drawImage(maskC,0,0);}
    }};
  }
};
