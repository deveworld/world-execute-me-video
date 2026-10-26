// A dot-matrix identity exchange.
import { prog, ease } from './lib.js';
import { createParticles, swapAt } from './gender/particles.js';

const BLUE = '#635be5';
export default {
  id: 'existence/gender', start: 88.825, end: 92.03,
  async create(root, env) {
    const url = new URL('./gender/identity-dots.woff2', import.meta.url).href;
    await Promise.all([730, 820].map(async weight => {
      const face = new FontFace('Identity Dots', `url(${url})`, {
        weight: String(weight), variationSettings: `"ROND" 100, "wght" ${weight}`,
      });
      document.fonts.add(face);await face.load();
    }));
    await Promise.all([400,500,600,700].map(w=>document.fonts.load(w+' 15px "Red Hat Mono"')));
    const particles = createParticles();
    // Background: elliptical falloff, painted once.
    {const {ctx:bg}=env.canvas(root);const im=bg.createImageData(1920,1080),d=im.data;
     for(let y=0;y<1080;y++){const dy=(y+.5-540)/540*.55;for(let x=0;x<1920;x++){const dx=(x+.5-960)/960,r=Math.sqrt(dx*dx+dy*dy);
       const m=235.157-41.245*Math.pow(Math.max(0,r-.45),1.5),i=(y*1920+x)*4;d[i]=m-.33;d[i+1]=m-1.33;d[i+2]=m+1.67;d[i+3]=255;}}
     bg.putImageData(im,0,0);}
    const {ctx} = env.canvas(root);
    const field = new Path2D();
    for(let y=395;y<947;y+=14)for(let x=127;x<1799;x+=14){
      field.moveTo(x+.62,y);field.arc(x,y,.62,0,Math.PI*2);
    }
    const RH='"Red Hat Mono"';
    const dot=(x,y,r,col)=>{ctx.fillStyle=col;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();};
    const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};
    const text=(s,x,y,font,col)=>{ctx.fillStyle=col;ctx.font=font;ctx.fillText(s,x,y);};
    const words = [
      ['Switch',119.4,191.5,62,-Infinity,'#69686b'],
      ['my',380,191.5,62,89.183333333,BLUE],
      ['gender',491.4,191.5,62,89.583333333,'#69686b'],
      ['To',119.6,289.5,92,90.25,'#202020'],
      ['F',284.9,289.5,92,90.366666667,BLUE],
      ['to',395.6,289.5,92,91.25,'#202020'],
      ['M',561.4,289.5,92,91.3,BLUE],
    ];
    return { render(t) {
      ctx.setTransform(1,0,0,1,.5,.5);ctx.clearRect(-1,-1,1922,1082);
      for(const [s,x,y,size,on,col] of words){
        if(t<on)continue;
        const age=t-on,k=age>.25?1:1-Math.exp(-age/.05);
        const dy=Math.round((size===62?16:24)*Math.exp(-Math.max(0,age-.006)/.055));
        ctx.globalAlpha=k;ctx.font=`${size===62?730:820} ${size}px "Identity Dots"`;
        ctx.lineWidth=1.15;ctx.strokeStyle='rgba(255,255,255,.35)';ctx.strokeText(s,x,y+dy);
        ctx.fillStyle=col;ctx.fillText(s,x,y+dy);
      }
      ctx.globalAlpha=1;
      // The frame grows from all four corners toward the middle of each side (inOutSine, 0.46 s).
      const k=ease.inOutSine(prog(t,88.822,.46)), x=120, y=388, w=1679, h=559, mx=x+w/2, my=y+h/2;
      ctx.strokeStyle='#89898c';ctx.lineWidth=1;ctx.beginPath();
      if(k>0){
        for(const yy of [y,y+h]){ctx.moveTo(x,yy);ctx.lineTo(x+(mx-x)*k,yy);ctx.moveTo(x+w,yy);ctx.lineTo(x+w-(x+w-mx)*k,yy);}
        for(const xx of [x,x+w]){ctx.moveTo(xx,y);ctx.lineTo(xx,y+(my-y)*k);ctx.moveTo(xx,y+h);ctx.lineTo(xx,y+h-(y+h-my)*k);}
      }
      ctx.stroke();
      // Fine dotted field and understated ruler ticks.
      ctx.globalAlpha=prog(t,89.36,.36);
      ctx.fillStyle='#b6b5b9';ctx.fill(field);
      ctx.strokeStyle='#727275';ctx.lineWidth=1;ctx.beginPath();
      for(let xx=x;xx<=x+w;xx+=56){ctx.moveTo(xx,y);ctx.lineTo(xx,y+4);ctx.moveTo(xx,y+h);ctx.lineTo(xx,y+h-4);}
      for(let yy=y;yy<=y+h;yy+=56){ctx.moveTo(x,yy);ctx.lineTo(x+4,yy);ctx.moveTo(x+w,yy);ctx.lineTo(x+w-4,yy);}
      ctx.stroke();ctx.globalAlpha=prog(t,89.75,.04);ctx.strokeStyle='#9c9c9f';ctx.lineWidth=.6;ctx.setLineDash([4,3]);ctx.lineDashOffset=1;ctx.beginPath();ctx.moveTo(960,y);ctx.lineTo(960,y+h);ctx.stroke();ctx.setLineDash([]);
      ctx.globalAlpha=1;
      // Corner crosses: crisp black hairlines with a white keyline.
      for(const [lw,col] of [[3,'#fff'],[1,'#000']]){ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.beginPath();
        for(const [xx,yy] of [[x,y],[x,y+h],[x+w,y],[x+w,y+h]]){ctx.moveTo(xx-10,yy);ctx.lineTo(xx+10,yy);ctx.moveTo(xx,yy-10);ctx.lineTo(xx,yy+10);}
        ctx.stroke();}
      // identity.swap() tab: fades in while a left-to-right clip opens (outExpo, 20 frames).
      if(t>=89.308){ctx.save();ctx.beginPath();ctx.rect(118,350,2+163*ease.outExpo(prog(t,89.308,.333)),45);ctx.clip();
      ctx.globalAlpha=prog(t,89.313,.085);ctx.fillStyle='#242426';ctx.fillRect(120,357.5,161,31);
      ctx.strokeStyle='#fff';ctx.lineWidth=.7;ctx.strokeRect(119.5,357,162,32);
      text('identity.swap()',133,378,'600 15px '+RH,'#fff');ctx.restore();}
      const swap=swapAt(t);
      ctx.globalAlpha=prog(t,89.80,.15);text('swap',920,358,'400 15px '+RH,'#3a393c');text(swap.toFixed(2),964,358,'500 15px '+RH,'#000');ctx.globalAlpha=1;
      // The toggle remains crisp while the field is drawing itself in.
      ctx.fillStyle='#eae9eb';ctx.strokeStyle='#17171a';ctx.lineWidth=1.8;rr(926.5,373,67,31,15.5);ctx.fill();ctx.stroke();
      dot(942.5+35*swap,388.5,9.5,'#1d1d20');
      const flying=particles.render(ctx,t);
      ctx.globalAlpha=prog(t,89.75,.04);ctx.strokeStyle='#9d9da0';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(952.5,667.5);ctx.lineTo(966.5,667.5);ctx.moveTo(959.5,660.5);ctx.lineTo(959.5,674.5);ctx.stroke();ctx.globalAlpha=1;
      ctx.globalAlpha=prog(t,90.31,.23)*(1-prog(t,91.417,.14));text('0 // F',625,976,'500 15px '+RH,'#0a0a0b');
      ctx.globalAlpha=prog(t,91.225,.25);text('1 // M',1255,976,'500 15px '+RH,'#0a0a0b');
      ctx.globalAlpha=prog(t,90.6,.15);
      if(ctx.globalAlpha>0){const n=String(flying);const x0=1800-9*(16+n.length);
        text('in flight',x0,976,'400 15px '+RH,'#3a393c');text(n,x0+90,976,'500 15px '+RH,'#000');text('/ 342',x0+90+9*(n.length+1),976,'400 15px '+RH,'#3a393c');}
      ctx.globalAlpha=1;
    }};
  }
};
