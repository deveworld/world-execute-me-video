import { ROSETTE_GEOMETRY } from './rosette-observations.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// Prepare and rasterise each vector template before the stage becomes ready.
// Playback and arbitrary seeks then only composite two already-prepared layers.
// Each template also gets a small, blurred "floor" layer: in the original the gaps between dense
// orbit lines are much darker than the open background (~5 grey against ~20), so the
// background under the lattice is multiplied down in proportion to the local line density.
// Lattice spin between consecutive templates (degrees, clockwise negative, 6-frame steps; where new orbit
// families appear the steady -0.8 is used). Interpolated frames rotate both neighbouring templates towards
// each other, so the two lattices stay aligned while they blend.
const SPIN=[0.0, 0.0, 0.0, 0.0, 0.0, -0.05, -0.25, -0.35, -0.45, -0.4, -0.57, -0.9, -0.7, -0.65, -0.7, -0.7, -0.95, -0.75, -0.75, -0.75, -0.75, -0.75, -0.8, -0.65, -1.0, -1.0, -0.8, -0.8, -0.8, -0.8, -0.8, -0.8, -0.8, -0.8, -0.7, -0.8, -0.8, -0.8, -0.8, -0.8, -0.8, 0.0];
const CX=1219.5,CY=629.5;
// Per-frame blend weight from one template to the next (frames 5964-6215). New orbit families pop in
// late within an interval (e.g. 101.75 s).
const BLEND=[0, 0.166, 0.291, 0.438, 0.605, 0.795, 0, 0.308, 0.319, 0.333, 0.34, 0.57, 0, 0.239, 0.397, 0.568, 0.724, 0.849, 0, 0.192, 0.328, 0.45, 0.6, 0.753, 0, 0.054, 0.106, 0.163, 0.215, 0.257, 0, 0.517, 0.749, 0.83, 0.877, 0.925, 0, 0.264, 0.407, 0.553, 0.741, 0.819, 0, 0.217, 0.338, 0.501, 0.673, 0.792, 0, 0.34, 0.612, 0.813, 0.903, 0.947, 0, 0.037, 0.086, 0.146, 0.205, 0.48, 0, 0.254, 0.628, 0.92, 1, 1, 0, 0.148, 0.345, 0.532, 0.704, 0.887, 0, 0.21, 0.391, 0.522, 0.648, 0.834, 0, 0.166, 0.338, 0.519, 0.683, 0.851, 0, 0.196, 0.399, 0.664, 0.786, 0.927, 0, 0.205, 0.332, 0.546, 0.721, 0.918, 0, 0.118, 0.29, 0.488, 0.695, 0.869, 0, 0.211, 0.411, 0.58, 0.726, 0.863, 0, 0.202, 0.366, 0.537, 0.72, 0.879, 0, 0.105, 0.383, 0.737, 0.989, 1, 0, 0.025, 0.1, 0.301, 0.492, 0.679, 0, 0.254, 0.4, 0.567, 0.728, 0.847, 0, 0.265, 0.418, 0.568, 0.707, 0.84, 0, 0.005, 0.135, 0.439, 0.712, 0.899, 0, 0.409, 0.803, 0.868, 0.931, 0.995, 0, 0.171, 0.361, 0.544, 0.718, 0.874, 0, 0.171, 0.332, 0.502, 0.657, 0.812, 0, 0.3, 0.465, 0.538, 0.626, 0.782, 0, 0, 0.088, 0.297, 0.601, 0.887, 0, 0.139, 0.232, 0.298, 0.497, 0.723, 0, 0.174, 0.344, 0.51, 0.678, 0.844, 0, 0.261, 0.369, 0.464, 0.602, 0.759, 0, 0.112, 0.215, 0.296, 0.388, 0.493, 0, 0.27, 0.594, 0.856, 0.951, 0.966, 0, 0.113, 0.291, 0.48, 0.647, 0.817, 0, 0.213, 0.304, 0.442, 0.65, 0.799, 0, 0.233, 0.405, 0.555, 0.69, 0.824, 0, 0, 0.035, 0.124, 0.314, 0.633, 0, 0.111, 0.188, 0.3, 0.49, 0.689, 0, 0.138, 0.385, 0.595, 0.811, 0.92, 0, 0.261, 0.573, 0.63, 0.749, 0.875, 0, 0.195, 0.359, 0.701, 0.873, 1];
const FLOOR_W=190,FLOOR_H=180;
const FLOOR={d0:3,dk:16,max:.7,blue:178};
const PREPARED=[];
for(const [frame,layers]of ROSETTE_GEOMETRY.templates){
 const cv=document.createElement('canvas');cv.width=760;cv.height=720;
 const c=cv.getContext('2d');c.translate(-840,-280);
 for(const[alpha,d]of layers){c.fillStyle=`rgba(235,234,255,${alpha})`;c.fill(new Path2D(d),'evenodd');}
 const bitmap=await createImageBitmap(cv);
 const fc=document.createElement('canvas');fc.width=FLOOR_W;fc.height=FLOOR_H;
 const f=fc.getContext('2d',{willReadFrequently:true});f.imageSmoothingQuality='high';
 f.filter='blur(2px)';f.drawImage(cv,0,0,FLOOR_W,FLOOR_H);f.filter='none';
 const img=f.getImageData(0,0,FLOOR_W,FLOOR_H),p=img.data;
 for(let i=0;i<p.length;i+=4){
  const dens=p[i+3]/255*235;          // blurred line brightness above the background, grey levels
  const dark=clamp((dens-FLOOR.d0)/FLOOR.dk,0,1)*FLOOR.max;
  p[i]=0;p[i+1]=0;p[i+2]=FLOOR.blue;p[i+3]=Math.round(dark*255);
 }
 f.putImageData(img,0,0);
 PREPARED.push([frame,bitmap,await createImageBitmap(fc)]);
}
ROSETTE_GEOMETRY.templates.length=0;
export function createRosette(){
 const templates=PREPARED;
 const pick=(t)=>{
  const f=t*60;let i=0;while(i<templates.length-2&&templates[i+1][0]<f)i++;
  const a=templates[i],b=templates[i+1];
  const lin=clamp((f-a[0])/(b[0]-a[0]),0,1),j=f-5964,j0=Math.floor(j);
  let k=lin;
  if(j0>=0&&j0<BLEND.length-1){const k0=j0+5964<=a[0]?0:BLEND[j0],k1=j0+5965>=b[0]?1:BLEND[j0+1];k=clamp(k0+(k1-k0)*(j-j0),0,1);}
  // a frame that is itself the next template must blend 1 (BLEND restarts at 0 there)
  if(f>=b[0])k=1;
  return [a,b,k,SPIN[i]||0,lin];
 };
 // draw a template image rotated about the rosette centre by `deg` (OpenCV sign: negative = clockwise)
 const drawRot=(ctx,img,deg,w,h)=>{
  if(!deg){ctx.drawImage(img,840,280,w,h);return;}
  ctx.translate(CX,CY);ctx.rotate(-deg*Math.PI/180);ctx.translate(-CX,-CY);
  ctx.drawImage(img,840,280,w,h);ctx.setTransform(1,0,0,1,0,0);
 };
 return {
  // darken the background under the lattice (multiply keeps it relative to the fading background)
  floor(ctx,t){
   const [a,b,k,d,lin]=pick(t);
   ctx.save();ctx.globalCompositeOperation='multiply';ctx.imageSmoothingQuality='high';
   ctx.globalAlpha=1-k;drawRot(ctx,a[2],lin*d,760,720);ctx.globalAlpha=k;drawRot(ctx,b[2],-(1-lin)*d,760,720);
   ctx.restore();
  },
  lines(ctx,t){
   const [a,b,k,d,lin]=pick(t);
   ctx.save();ctx.globalCompositeOperation='lighter';
   ctx.globalAlpha=1-k;drawRot(ctx,a[1],lin*d,760,720);ctx.globalAlpha=k;drawRot(ctx,b[1],-(1-lin)*d,760,720);
   ctx.restore();
  },
  // Comet heads: each entry is [alpha, x0,y0, ..., x,y] with the head last. Trails only join
  // contiguous detections, so heads hidden in the bright hole ring are not drawn.
  heads(ctx,t){
   const H=ROSETTE_GEOMETRY.heads,i=Math.round(t*60)-H[0][0];
   if(i<0||i>=H.length)return;
   ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineWidth=1.4;ctx.lineCap='round';ctx.lineJoin='round';
   for(const h of H[i][1]){
    const a=h[0],n=(h.length-1)/2;
    for(let j=1;j<n;j++){const x0=h[2*j-1],y0=h[2*j],x1=h[2*j+1],y1=h[2*j+2];
     ctx.strokeStyle=`rgba(255,255,255,${.5*a*Math.exp(-(n-1-j)/4)})`;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();}
    const x=h[h.length-2],y=h[h.length-1],g=ctx.createRadialGradient(x,y,0,x,y,6);
    g.addColorStop(0,`rgba(255,255,255,${a})`);g.addColorStop(.3,`rgba(235,235,255,${.65*a})`);g.addColorStop(1,'rgba(200,200,255,0)');ctx.fillStyle=g;ctx.fillRect(x-6,y-6,12,12);
   }
   ctx.restore();
  }
 };
}
