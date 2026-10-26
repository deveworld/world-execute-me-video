// Each transfer names a source column, a vertical run, and the next free destination run.
// The scanner waits while a run travels, then advances to the next source.
export const TRANSFERS=[
  [7100,32,9,4,6,4], [7108,33,2,4,10,2],
  [7114,35,12,4,12,5], [7122,36,5,4,17,3],
  [7128,38,14,11,5,3], [7136,40,3,11,8,5],
  [7142,41,10,11,13,2], [7150,43,6,11,15,3],
  [7156,44,1,19,8,2], [7162,46,13,19,10,4],
  [7170,48,7,19,14,3], [7176,49,15,19,17,3],
  [7184,51,4,26,5,5], [7190,52,11,26,10,3],
  [7198,54,16,26,13,2], [7204,55,8,26,15,4],
];
const HOLES=[[4,3,6,20],[11,1,5,18],[19,6,8,20],[26,2,5,19]];
const clamp=x=>Math.max(0,Math.min(1,x));
const noise=(i) => {
  let h=Math.imul(i+984,1597334677);
  h=Math.imul(h^(h>>>16),2246822519);
  return ((h^(h>>>13))>>>0)/4294967296;
};

export function createDefragModel() {
  const initial=new Uint8Array(56*20);
  for(let r=0;r<20;r++) for(let c=0;c<56;c++) {
    initial[r*56+c]=c<32 ? (c===31&&r>=12?0:1) :
      noise(r*56+c)<.5-.19*Math.cos(2*Math.PI*(r+.5)/20)?2:0;
  }
  for(const [c,top,free,end] of HOLES) for(let r=top;r<end;r++) initial[r*56+c]=r<free?2:0;
  // Runs belong to files, so their source cells are occupied together.
  for(const [,c,r,,,n] of TRANSFERS) for(let j=0;j<n;j++) initial[(r+j)*56+c]=2;

  const grid=new Uint8Array(initial.length);
  function at(t) {
    const f=Math.round(t*60),actors=[];
    grid.set(initial);
    let currentColumn=-1;
    for(const [start,c,r,dc,dr,n] of TRANSFERS) {
      if(f<start) break;
      if(dc!==currentColumn) {
        for(let i=0;i<grid.length;i++) if(grid[i]===3) grid[i]=1;
        const hole=HOLES.find(h=>h[0]===dc);
        for(let y=hole[1];y<hole[2];y++) grid[y*56+dc]=1;
        currentColumn=dc;
      }
      for(let j=0;j<n;j++) grid[(r+j)*56+c]=0;
      const k=clamp((f-start)/6),u=(1-Math.cos(Math.PI*k))/2;
      if(k>=1) {
        for(let j=0;j<n;j++) grid[(dr+j)*56+dc]=3;
      } else {
        const scale=1+.075*Math.sin(Math.PI*k);
        const x=120+30*(c+(dc-c)*u)-(scale-1)*13.5;
        const centre=314+30*(r+(dr-r)*u)+(n*30-3)/2;
        for(let j=0;j<n;j++) actors.push([Math.round(x),Math.round(centre+(j*30-(n*30-3)/2)*scale),27*scale,27*scale]);
      }
    }
    if(f>=7212) {
      for(let i=0;i<grid.length;i++) if(grid[i]===3) grid[i]=1;
      // After consolidation the empty tail of the disk is swept from right to left.
      const head=55-Math.floor((f-7210)*2/7);
      for(let r=0;r<20;r++) for(let c=Math.max(32,head+1);c<56;c++) grid[r*56+c]=0;
    }
    for(let r=0;r<20;r++) for(let c=0;c<32;c++) if(grid[r*56+c]===3) actors.push([120+c*30,314+r*30,27,27]);

    let scan=null;
    if(f<7212) {
      const future=TRANSFERS.findIndex(v=>v[0]>f);
      const i=future<0?TRANSFERS.length-1:Math.max(0,future-1);
      const a=TRANSFERS[i],b=TRANSFERS[Math.min(i+1,TRANSFERS.length-1)];
      const k=clamp((f-b[0]+2)/2),u=1-(1-k)**3;
      scan=133+30*(a[1]+(b[1]-a[1])*u);
    } else if(f<7294) {
      scan=133+30*(55-Math.floor((f-7210)*2/7));
    }
    const pct=f<7212 ? Math.min(79,71+2*Math.floor((f-7100)/28)) :
      Math.min(100,Math.floor(79+(f-7212)*21/82+.2));
    return {grid,actors,scan,pct};
  }
  return {at};
}
