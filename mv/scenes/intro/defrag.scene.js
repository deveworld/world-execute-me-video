// Defragmenter: the original's 56x20 semantic tile map is rebuilt from rectangles.
// Only numerical cell classifications are stored; no raster reference art is loaded.
import {clamp,lerp,ease,paperBackground} from './lib/util.js';
const X=119,Y=312,D=30,S=29;
// Words pop in whole on these source frames (measured); the line is then backspaced in three
// chunks (frames 7286/7288/7290) before the "Fragments" heading builds up in four stages.
const WORD_F=[7100,7116,7140,7158,7182,7196,7212,7240,7252,7266];
const ERASE=[[7286,6],[7288,3],[7290,0]];
const HEAD_STAGES=[[7292,'dots'],[7294,'small'],[7302,'large'],[7308,'solid']];
export default{id:'intro/defrag',start:118.33,end:122.05,fonts:['400 64px "VT323"','400 36px "VT323"','400 150px "DotGothic16"'],async create(root,env){
 const {ctx}=env.canvas(root);const bg=paperBackground(1920,1080,{inner:236,outer:223,r0:480,r1:1200});const data=await env.loadJSON('/scenes/intro/lib/defrag-data.json');const geom=await env.loadJSON('/scenes/intro/lib/late-geometry.json');const detail=await env.loadJSON('/scenes/intro/lib/precision-actors.json');const percent=await env.loadJSON('/scenes/intro/lib/percent-font.json');const head=await env.loadJSON('/scenes/intro/lib/defrag-heading.json');const wordPaths=geom.lyrics.map(s=>new Path2D(s)),legendPaths=geom.legend.map(s=>new Path2D(s));
 const states=[];let state=new Uint8Array(Array.from(data.events[0][1],Number));let ei=1;
 for(let f=data.firstFrame;f<=7324;f++){while(ei<data.events.length&&data.events[ei][0]<=f){for(const[i,s]of data.events[ei][1])state[i]=s;ei++;}states.push(state.slice());}
 // Tiles are pre-rendered sprites. The fragmented tile's diagonal is an aliased one-pixel
 // staircase with pale flanks, as in the source (not an anti-aliased stroke).
 function paintTile(c,s,size){
  c.fillStyle='#fdfdfd';c.fillRect(0,0,size,size);
  c.fillStyle=['#fdfdfd','#595ae2','#acb0f7','#09084b'][s];c.fillRect(1,1,size-2,size-2);
  c.strokeStyle=s===0?'#c5c5c9':s===2?'#a6a6ea':'#4541be';c.lineWidth=1;c.strokeRect(1.5,1.5,size-3,size-3);
  if(s===2){for(let k=1;k<size-1;k++){const px=size-1-k,py=k;c.fillStyle='#e0e3ff';if(px-1>=1)c.fillRect(px-1,py,1,1);if(px+1<=size-2)c.fillRect(px+1,py,1,1);}
   for(let k=1;k<size-1;k++){c.fillStyle=k===1||k===size-2?'#6e7088':'#00003d';c.fillRect(size-1-k,k,1,1);}}
 }
 const sprites={};for(const size of[S,23]){sprites[size]=[0,1,2,3].map(s=>{const cv=document.createElement('canvas');cv.width=cv.height=size;paintTile(cv.getContext('2d'),s,size);return cv;});}
 function tile(x,y,s,alpha=1,size=S){ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(sprites[size][s],x,y);ctx.restore();}
 function legendMoving(x,y,size){ctx.fillStyle='#0d0b5a';ctx.fillRect(x,y,size,size);ctx.fillStyle='#141786';ctx.fillRect(x+4,y+4,size-8,size-8);ctx.strokeStyle='#f4f3ff';ctx.lineWidth=1;ctx.strokeRect(x+3.5,y+3.5,size-7,size-7);}
 // Moving block: dark 1 px frame, indigo fill and an inset white ring held between two dark
 // rings (insets 3/4/5 px). The source draws no drop shadow.
 function movingActor(x,y,w,h){
  ctx.fillStyle='#1c1892';ctx.fillRect(x,y,w,h);
  ctx.lineWidth=1;const ring=(i,c)=>{ctx.strokeStyle=c;ctx.strokeRect(x+i+.5,y+i+.5,w-2*i-1,h-2*i-1);};
  ctx.fillStyle='#171682';ctx.fillRect(x+5,y+5,w-10,h-10);
  ring(0,'#00002e');ring(3,'#000050');ring(4,'#ffffff');ring(5,'#00003a');
 }
 return{render(t){ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.drawImage(bg,0,0);const f=Math.round(t*60),fi=clamp(f-data.firstFrame,0,states.length-1),a=states[fi];
  for(let r=0;r<20;r++)for(let c=0;c<56;c++)tile(X+c*D,Y+r*D,a[r*56+c]===3?0:a[r*56+c]);
  let moving=detail.actors[0][1];for(const[ff,arr]of detail.actors){if(ff>f)break;moving=arr;}for(const r of moving)movingActor(...r);
  const stat=data.stats[clamp(fi,0,data.stats.length-1)],scan=stat[1];if(scan!==null){ctx.fillStyle='#1e1e1f';ctx.fillRect(scan,303,2,617);}
  let shown=WORD_F.length;for(const[ff,n]of ERASE)if(f>=ff)shown=n;
  ctx.fillStyle='#111113';ctx.strokeStyle='#111113';ctx.lineWidth=1;ctx.lineJoin='miter';
  WORD_F.forEach((wf,i)=>{if(f<wf||i>=shown)return;ctx.fill(wordPaths[i],'evenodd');ctx.stroke(wordPaths[i]);});
  let stage=null;for(const[ff,s]of HEAD_STAGES)if(f>=ff)stage=s;
  if(stage==='dots'){ctx.fillStyle='rgb(150,146,192)';for(const[cx,cy]of head.cells)for(const dx of[0,6])for(const dy of[-6,0])ctx.fillRect(Math.round(cx+dx-1),Math.round(cy+dy-1),2,2);}
  else if(stage){const sz=stage==='small'?6:stage==='large'?10:12.4;ctx.fillStyle=stage==='small'?'#8a80e8':stage==='large'?'#756fe3':'#5c5be6';for(const[cx,cy]of head.cells){const ox=stage==='small'?.5:0;ctx.fillRect(cx+ox-sz/2,cy+ox-sz/2,sz,sz);}}
  // Legend and progress meter.
  const items=[['Used',1,119],['Fragmented',2,246],['Free',0,454],['Moving',3,573]];
  for(const[s,v,x]of items){if(v===3)legendMoving(x,942,23);else tile(x,942,v,1,23);}
  ctx.fillStyle='#3d3c45';ctx.strokeStyle='#3d3c45';ctx.lineWidth=.7;for(const path of legendPaths){ctx.fill(path,'evenodd');ctx.stroke(path);}ctx.font='400 36px "VT323"';
  ctx.fillStyle='#55545b';let pct=percent.events[0][1];for(const[ff,value]of percent.events){if(ff>f)break;pct=value;}ctx.fillStyle='#d3d3d7';ctx.beginPath();ctx.roundRect(1318,949,401,8,4);ctx.fill();ctx.fillStyle='#625be6';ctx.beginPath();ctx.roundRect(1318,949,401*clamp(pct/100),8,4);ctx.fill();ctx.strokeStyle='#4e47c5';ctx.lineWidth=.7;ctx.stroke();const num=String(pct);for(const pass of[0,1]){ctx.fillStyle=pass?'#1d1662':'rgba(255,255,255,.75)';[...num+'%'].forEach((ch,i)=>{const x=1776-14*(num.length-i);percent.glyphs[ch].forEach((row,r)=>{for(let c=0;c<row.length;c++)if(row[c]==='1'){if(pass)ctx.fillRect(x+c*2,942+r*2,2,2);else ctx.fillRect(x+c*2-1,942+r*2-1,4,4);}});});}
 }};
}};
