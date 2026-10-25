// A deterministic dot-matrix identity exchange. Artwork is geometric, including every particle.
import { clamp, lerp, prog, ease } from './lib.js';
import { GENDER_HEAD } from './precision_art.js';
import { GENDER_STREAMERS } from './data/gender-streamers.js';
import { GENDER_TAILS } from './data/gender-tails.js';

const BLUE = '#635be5';
export default {
  id: 'existence/gender', start: 88.825, end: 92.03,
  async create(root, env) {
    await Promise.all(['400','500','600'].map(w=>document.fonts.load(w+' 15px "Red Hat Mono"')));
    const tracks=await (await fetch(new URL('./data/gender_tracks.json',import.meta.url))).json();
    const streamers=GENDER_STREAMERS.map(([f,groups])=>[f,groups.map(([alpha,paths])=>{const p=new Path2D();for(const a of paths){p.moveTo(a[0],a[1]);for(let j=2;j<a.length;j+=2)p.lineTo(a[j],a[j+1]);}return[alpha,p];})]);
    // Background: measured elliptical falloff (fit to the source, rms 0.6 grey levels), painted once.
    {const {ctx:bg}=env.canvas(root);const im=bg.createImageData(1920,1080),d=im.data;
     for(let y=0;y<1080;y++){const dy=(y+.5-540)/540*.55;for(let x=0;x<1920;x++){const dx=(x+.5-960)/960,r=Math.sqrt(dx*dx+dy*dy);
       const m=235.157-41.245*Math.pow(Math.max(0,r-.45),1.5),i=(y*1920+x)*4;d[i]=m-.33;d[i+1]=m-1.33;d[i+2]=m+1.67;d[i+3]=255;}}
     bg.putImageData(im,0,0);}
    const {ctx} = env.canvas(root);
    // Source counter "in flight N / 342", read frame by frame from 5437 (90.617 s).
    const FLIGHT=[0,0,0,0,14,32,48,69,86,89,89,90,90,90,90,90,90,91,97,105,114,116,115,105,98,91,82,81,81,81,81,84,91,96,101,105,107,97,92,86,82,81,81,81,81,86,98,103,112,119,116,106,102,95,91,90,90,90,90,88,79,68,58,43,32,20,10,5,1,0];
    const RH='"Red Hat Mono"';
    const dot=(x,y,r,col)=>{ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();};
    const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};
    const text=(s,x,y,font,col)=>{ctx.fillStyle=col;ctx.font=font;ctx.fillText(s,x,y);};
    // Each word eases in over 0.15 s; `on` is measured from the source's 50% point.
    // Words rise into place while fading in. Per-frame opacity and y-offset traced from the source
    // (fit of the settled glyph, shifted, against every reveal frame); offsets snap to whole pixels.
    // [opacity, y-offset px] per frame from each word's first visible frame (traced per word).
    const REVEAL={
      1:[[.01,16],[.27,13],[.42,10],[.64,7],[.75,5],[.78,4],[.89,3],[.89,2],[.93,1],[.96,1],[.96,1],[.97,0],[1,0]],
      2:[[0,16],[.21,14],[.43,10],[.63,8],[.64,6],[.85,4],[.85,3],[.91,2],[.92,1],[.95,1],[.96,1],[.97,0],[1,0]],
      3:[[.02,24],[.27,20],[.49,14],[.67,11],[.71,8],[.80,5],[.88,4],[.94,3],[.94,2],[.97,1],[.97,1],[.99,1],[1,0]],
      4:[[.04,24],[.30,19],[.46,14],[.63,10],[.73,7],[.81,5],[.86,4],[.94,3],[.94,2],[.94,1],[.95,1],[.97,1],[1,0]],
      5:[[.07,24],[.36,18],[.50,13],[.64,10],[.74,7],[.81,5],[.89,4],[.89,3],[.96,2],[.97,1],[.97,1],[.98,1],[1,0]],
      6:[[0,24],[.23,21],[.47,15],[.60,11],[.70,8],[.80,6],[.83,4],[.92,3],[.92,2],[.99,1],[.99,1],[.99,1],[1,0]]};
    const tab=(T,k,j)=>{if(k>=T.length-1)return T[T.length-1][j];const i=Math.floor(k);return lerp(T[i][j],T[i+1][j],k-i);};
    // Source dots carry the video's sharpening: a slightly darker rim and a pale halo (measured radial profile).
    const word=(i,k0,col='#69686b')=>{const k=t60-k0;if(k<-.5)return;const kk=Math.max(0,k),R=REVEAL[i]||[[1,0]],a=tab(R,kk,0);if(a<=0)return;
      const r=i<3?2.43:4.15, dy=tab(R,kk,1);ctx.globalAlpha=a;ctx.save();ctx.translate(0,dy);
      ctx.lineWidth=1;ctx.strokeStyle='rgba(255,255,255,.35)';ctx.beginPath();for(const p of GENDER_HEAD[i]){ctx.moveTo(p[0]+r+.7,p[1]);ctx.arc(p[0],p[1],r+.7,0,Math.PI*2);}ctx.stroke();
      ctx.fillStyle=col;ctx.beginPath();for(const p of GENDER_HEAD[i]){ctx.moveTo(p[0]+r,p[1]);ctx.arc(p[0],p[1],r,0,Math.PI*2);}ctx.fill();
      ctx.strokeStyle='rgba(20,16,60,.28)';ctx.beginPath();for(const p of GENDER_HEAD[i]){ctx.moveTo(p[0]+r-.75,p[1]);ctx.arc(p[0],p[1],r-.75,0,Math.PI*2);}ctx.stroke();
      ctx.restore();ctx.globalAlpha=1;};
    let t60=0;
    return { render(t) {
      ctx.setTransform(1,0,0,1,.5,.5);ctx.clearRect(-1,-1,1922,1082);
      // Small top title is already present on the first frame; subsequent words follow the vocal.
      // First visible frame of each word (source frame numbers).
      t60=t*60;word(0,-1e9);word(1,5351,BLUE);word(2,5375);
      word(3,5415,'#202020');word(4,5422,BLUE);word(5,5475,'#202020');word(6,5478,BLUE);

      // The frame grows from all four corners toward the middle of each side (measured inOutSine, 0.46 s).
      const k=ease.inOutSine(prog(t,88.822,.46)), x=120, y=388, w=1679, h=559, mx=x+w/2, my=y+h/2;
      ctx.strokeStyle='#89898c';ctx.lineWidth=1;ctx.beginPath();
      if(k>0){
        for(const yy of [y,y+h]){ctx.moveTo(x,yy);ctx.lineTo(x+(mx-x)*k,yy);ctx.moveTo(x+w,yy);ctx.lineTo(x+w-(x+w-mx)*k,yy);}
        for(const xx of [x,x+w]){ctx.moveTo(xx,y);ctx.lineTo(xx,y+(my-y)*k);ctx.moveTo(xx,y+h);ctx.lineTo(xx,y+h-(y+h-my)*k);}
      }
      ctx.stroke();
      // Fine dotted field and understated ruler ticks.
      ctx.globalAlpha=prog(t,89.36,.36);
      for(let yy=y+7;yy<y+h;yy+=14) for(let xx=x+7;xx<x+w;xx+=14)dot(xx,yy,.62,'#b6b5b9');
      ctx.strokeStyle='#727275';ctx.lineWidth=1;ctx.beginPath();
      for(let xx=x;xx<=x+w;xx+=56){ctx.moveTo(xx,y);ctx.lineTo(xx,y+4);ctx.moveTo(xx,y+h);ctx.lineTo(xx,y+h-4);}
      for(let yy=y;yy<=y+h;yy+=56){ctx.moveTo(x,yy);ctx.lineTo(x+4,yy);ctx.moveTo(x+w,yy);ctx.lineTo(x+w-4,yy);}
      ctx.stroke();ctx.globalAlpha=prog(t,89.75,.04);ctx.strokeStyle='#9c9c9f';ctx.lineWidth=.6;ctx.setLineDash([4,3]);ctx.lineDashOffset=1;ctx.beginPath();ctx.moveTo(960,y);ctx.lineTo(960,y+h);ctx.stroke();ctx.setLineDash([]);
      ctx.globalAlpha=1;
      // Corner crosses: crisp black hairlines with a white keyline.
      for(const [lw,col] of [[3,'#fff'],[1,'#000']]){ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.beginPath();
        for(const [xx,yy] of [[x,y],[x,y+h],[x+w,y],[x+w,y+h]]){ctx.moveTo(xx-10,yy);ctx.lineTo(xx+10,yy);ctx.moveTo(xx,yy-10);ctx.lineTo(xx,yy+10);}
        ctx.stroke();}
      // identity.swap() tab: fades in while a left-to-right clip opens (measured outExpo, 20 frames).
      if(t>=89.308){ctx.save();ctx.beginPath();ctx.rect(118,350,2+163*ease.outExpo(prog(t,89.308,.333)),45);ctx.clip();
      ctx.globalAlpha=prog(t,89.313,.085);ctx.fillStyle='#242426';ctx.fillRect(120,357.5,161,31);
      ctx.strokeStyle='#fff';ctx.lineWidth=.7;ctx.strokeRect(119.5,357,162,32);
      text('identity.swap()',133,378,'600 15px '+RH,'#fff');ctx.restore();}
      const track=tracks[Math.max(0,Math.min(tracks.length-1,Math.round(t*60)-tracks[0][0]))];
      const swap=t<90.4?0:track[3];
      ctx.globalAlpha=prog(t,89.80,.15);text('swap',920,358,'400 15px '+RH,'#3a393c');text(swap.toFixed(2),964,358,'500 15px '+RH,'#000');ctx.globalAlpha=1;
      // The toggle remains crisp while the field is drawing itself in.
      ctx.fillStyle='#eae9eb';ctx.strokeStyle='#17171a';ctx.lineWidth=1.8;rr(926.5,373,67,31,15.5);ctx.fill();ctx.stroke();
      dot(942.5+35*swap,388.5,9.5,'#1d1d20');
      let flying=0;
      // Measured particle tracks preserve occupancy as well as the moving cloud's shape.
      if(t>=90.4-2.5/60&&t<90.4){const a=clamp((t*60-5421.3)/1.7);ctx.globalAlpha=a;for(const [xx,yy,rr] of tracks[0][1]){dot(xx,yy,Math.min(3.16,rr-.24),'#222124');}ctx.globalAlpha=1;}
      if(t>=90.4){
        for(const [xx,yy,rr] of track[1]){dot(xx,yy,Math.min(3.5,rr+.08),'rgba(255,255,255,.7)');dot(xx,yy,Math.min(3.16,rr-.24),'#222124');}
        flying=track[2].length;
        const trails=streamers[Math.max(0,Math.min(streamers.length-1,Math.round(t*60)-streamers[0][0]))][1];
        ctx.save();ctx.translate(-.5,-.5);ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=.8;
        for(const [alpha,path] of trails){ctx.strokeStyle=`rgba(90,86,170,${alpha})`;ctx.stroke(path);}
        ctx.restore();
        // Comet tails: each flying dot trails its own recent path (traced through the source's motion), fading with age.
        const tails=GENDER_TAILS[Math.max(0,Math.min(GENDER_TAILS.length-1,Math.round(t*60)-GENDER_TAILS[0][0]))][1];
        ctx.save();ctx.translate(-.5,-.5);ctx.lineWidth=1;ctx.lineCap='round';
        for(let i=0;i<track[2].length;i++){
          const [xx,yy]=track[2][i], p=tails[i]||[];let px=xx,py=yy;
          for(let k=0;k<p.length;k+=2){const nx=xx+p[k]/2,ny=yy+p[k+1]/2;ctx.strokeStyle=`rgba(92,90,112,${(.3*Math.exp(-k/2/4)).toFixed(3)})`;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(nx,ny);ctx.stroke();px=nx;py=ny;}
        }
        ctx.restore();
        for(let i=0;i<track[2].length;i++){
          const [xx,yy,rr]=track[2][i];
          dot(xx,yy,rr<2.5?Math.min(3.1,rr+.6):4.3,'#6555f4');
          if(rr>=2.5){ctx.strokeStyle='rgba(48,38,160,.35)';ctx.lineWidth=.9;ctx.beginPath();ctx.arc(xx,yy,3.7,0,Math.PI*2);ctx.stroke();}
        }
      }
      ctx.globalAlpha=prog(t,89.75,.04);ctx.strokeStyle='#9d9da0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(952.5,667.5);ctx.lineTo(966.5,667.5);ctx.moveTo(959.5,660.5);ctx.lineTo(959.5,674.5);ctx.stroke();ctx.globalAlpha=1;
      ctx.globalAlpha=prog(t,90.31,.23)*(1-prog(t,91.417,.14));text('0 // F',625,976,'500 15px '+RH,'#0a0a0b');
      ctx.globalAlpha=prog(t,91.225,.25);text('1 // M',1255,976,'500 15px '+RH,'#0a0a0b');
      ctx.globalAlpha=prog(t,90.6,.15);
      if(ctx.globalAlpha>0){const n=String(FLIGHT[Math.max(0,Math.min(FLIGHT.length-1,Math.round(t*60)-5437))]);const x0=1800-9*(16+n.length);
        text('in flight',x0,976,'400 15px '+RH,'#3a393c');text(n,x0+90,976,'500 15px '+RH,'#000');text('/ 342',x0+90+9*(n.length+1),976,'400 15px '+RH,'#3a393c');}
      ctx.globalAlpha=1;
    }};
  }
};
