// The heart is a pair of stepped lobes above a narrowing triangular point.
const inside=(x,y) => x>=0 && x<11 && y>=0 && y<10 &&
  (y===0 ? Math.abs(x-2)<=1 || Math.abs(x-8)<=1 :
   y===1 ? x!==5 : y<5 || Math.abs(x-5)<=9-y);
const BLUE={edge:[49,52,200],fill:[89,91,230],shade:[69,73,212],empty:[17,20,88],glint:[34,37,149]};
const ORANGE={edge:[199,99,57],fill:[254,193,161],shade:[229,157,128],empty:[57,25,17],glint:[134,66,38]};
const DAMAGE=[
  {i:6,blink:[[122.4667,122.5333],[122.7333,122.8]],empty:122.8333},
  {i:5,blink:[[123.4333,123.5],[123.6667,123.7333]],empty:123.7667},
  {i:4,blink:[[124.1333,124.2],[124.3667,124.4333]],empty:124.4333},
  {i:3,blink:[[124.3667,124.4333]],empty:124.4333},
  {i:2,blink:[[124.3667,124.4333]],empty:124.4333},
  {i:1,blink:[[124.6,124.6667],[124.9333,125]],empty:125.0333},
  {i:0,blink:[[125.0333,125.1]],empty:125.1333},
];
const noise=(i,j) => {
  let a=Math.imul(i+71,1597334677)^Math.imul(j+19,3812015801);
  a=Math.imul(a^(a>>>16),2246822519);
  return ((a^(a>>>13))>>>0)/4294967296;
};

function color(x,y,p,filled) {
  const edge=!inside(x-1,y)||!inside(x+1,y)||!inside(x,y-1)||!inside(x,y+1);
  if(x===2&&y===2) return filled?[237,240,254]:p.glint;
  if(edge) return p.edge;
  if(!filled) return p.empty;
  return !inside(x+2,y) ? p.shade : p.fill;
}

function heart(ctx,i,t,p,filled,damage) {
  const origin=119+144*i;
  // A returning heart briefly opens a one-cell seam near its centre.
  let split=0;
  if(damage) for(const [,end] of damage.blink) {
    const f=(t-end)*60;
    if(f>=0&&f<4) split=Math.sin(Math.PI*f/4)*6;
  }
  for(let y=0;y<10;y++) for(let x=0;x<11;x++) {
    if(!inside(x,y)) continue;
    const c=color(x,y,p,filled);
    ctx.fillStyle=`rgb(${c})`;
    const dx=split && x>=6 ? split : 0;
    ctx.fillRect(origin+x*12+dx,108+y*12,12,12);
  }
}

function shards(ctx,i,t,start,p,burst=false) {
  const age=(t-start)*60;
  if(age<0||age>=8) return;
  const n=burst?13:4;
  for(let j=0;j<n;j++) {
    const u=noise(i*43+j,11),v=noise(i*43+j,27);
    const x=2+Math.floor(7*u),y=4+Math.floor(5*v);
    if(!inside(x,y)) continue;
    const k=age/8,dx=(u-.5)*age*(burst?5:2),dy=age*(1+2*v)+.35*age*age;
    ctx.fillStyle=`rgb(${j%3===0?p.edge:p.fill})`;
    const size=j%4===0?6:12;
    ctx.globalAlpha=1-k*.7;
    ctx.fillRect(Math.round(119+144*i+x*12+dx),Math.round(108+y*12+dy),size,size);
  }
  ctx.globalAlpha=1;
}

export function drawHearts(ctx,t) {
  for(let i=0;i<10;i++) {
    const damage=DAMAGE.find(d=>d.i===i),orange=i===4&&t>=123.8333;
    const p=orange?ORANGE:BLUE;
    const hidden=damage?.blink.some(([a,b])=>t>=a-.0001&&t<b-.0001);
    const filled=i<7 && (!damage||t<damage.empty-.0001);
    if(!hidden) heart(ctx,i,t,p,filled,damage);
    if(damage) shards(ctx,i,t,damage.empty,p,i>=2&&i<=4);
  }
}
