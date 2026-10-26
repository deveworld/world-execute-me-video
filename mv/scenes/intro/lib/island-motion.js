// Smooth unions of flattened ellipses make the two extruded cloud surfaces.
const LOBES = [
  [[-36.5,-5.5,27,12.8],[-3,-.9,37.1,18.7],[-20.6,13.9,21.8,10.4],[33.2,5.2,29.1,14.2]],
  [[-30.6,-3.7,21.7,10.1],[-3.1,-.3,30.2,15.2],[27.3,4.4,22.2,11.2]],
];

export function createCloudPaths() {
  return LOBES.map(lobes => {
    const field = (x,y) => -1.2 * Math.log(lobes.reduce((sum,[cx,cy,rx,ry]) =>
      sum + Math.exp(-(Math.hypot((x-cx)/rx,(y-cy)/ry)-1)*ry/1.2),0));
    return Array.from({length:160},(_,i) => {
      const a = i * 2 * Math.PI / 160, c = Math.cos(a), s = Math.sin(a);
      let lo = 0, hi = 90;
      for (let j=0;j<20;j++) {
        const r = (lo+hi)/2;
        if (field(c*r,s*r)>0) hi=r; else lo=r;
      }
      return [c*(lo+hi)/2,s*(lo+hi)/2];
    });
  });
}

const clamp = x => Math.max(0,Math.min(1,x));

// Each hop follows a cosine horizontal ease and a raised arc between cell centres.
export function walkerAt(walker,t) {
  if (t < walker.appear) return null;
  const phase = Math.max(0,(t-walker.hop)*60/14);
  const i = Math.min(walker.path.length-1,Math.floor(phase));
  const a = walker.path[i], b = walker.path[Math.min(i+1,walker.path.length-1)];
  const k = t<walker.hop || i===walker.path.length-1 ? 0 : clamp((phase-i)*14/10);
  const u = (1-Math.cos(Math.PI*k))/2;
  return [a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u-16*Math.sin(Math.PI*k)-8*Math.exp(-(t-walker.appear)*90)];
}
