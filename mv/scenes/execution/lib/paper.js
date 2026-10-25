// Procedural stationery and a soft desk-lamp falloff for the two mainframe shots.
// All pixels are generated here; no reference still is used as an asset.
const W = 1920, H = 1080;

export function litPaper(env, kind) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const card = kind === 'card', lisp = kind === 'lisp';
  const P = card ? [-3.078125,198.515625,831.25,618.125,476.25,504.375,-0.35,2.1]
    : lisp ? [4.015625,180.46875,1019.375,610.625,472.5,475,-0.0109375,2.159375]
    : [9.1875,192.1875,821.25,543.75,463.75,506.875,0.309375,2.375];
  const [b,a,cx,cy,sx,sy,th,p] = P, co = Math.cos(th), si = Math.sin(th);
  const im = ctx.createImageData(W,H), d = im.data;
  let seed = 49701;
  for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
    const i = (y*W+x)*4;
    const inside = card ? x>=330 && x<1570 && y>=104 && y<650 && x+y>=470
      : lisp ? x>=470 : x>=560 && y >= 622 + (((x*13)%7)-3)*0.22;
    if (!inside) continue;
    const u=(x-cx)*co+(y-cy)*si, v=-(x-cx)*si+(y-cy)*co;
    seed = (Math.imul(seed,1664525)+1013904223)>>>0;
    const light=Math.max(0,b+a*Math.exp(-(Math.abs(u/sx)**p+Math.abs(v/sy)**p)))+(seed/4294967296-0.5)*1.8;
    let col = card ? [1,.954,.84] : [1,1,.966];
    if (lisp && [174,405,637,868].some(z=>y>=z && y<z+116) && x>=586) col=[.872,.941,.863];
    d[i]=light*col[0]; d[i+1]=light*col[1]; d[i+2]=light*col[2]; d[i+3]=255;
  }
  ctx.putImageData(im,0,0);
  return c;
}

export function mono(ctx,text,x,baseline,size,cell,color='#0a0b08',bold=false,stroke=0,family='Nimbus Mono PS') {
  ctx.save(); ctx.font=`${bold?700:400} ${size}px "${family}"`;
  ctx.fillStyle=color; ctx.textBaseline='alphabetic';
  const natural=ctx.measureText('M').width;
  ctx.translate(x,baseline); ctx.scale(cell/natural,1);
  if(stroke){ctx.lineWidth=stroke;ctx.strokeStyle='#090b06';ctx.strokeText(text,0,0);}
  ctx.fillText(text,0,0); ctx.restore();
}

export function paperHoles(ctx,x,y0,step,r,n) {
  ctx.fillStyle='#030402'; ctx.strokeStyle='rgba(220,220,210,.28)'; ctx.lineWidth=.7;
  for(let i=0;i<n;i++) {ctx.beginPath();ctx.arc(x,y0+i*step,r,0,Math.PI*2);ctx.fill();ctx.stroke();}
}
