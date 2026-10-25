// Pixel hearts, scanline CRT and RPG dialogue.
import{clamp,ease}from'./lib/util.js';
const PAT=['01110001110','11111011111','11111111111','11111111111','11111111111','01111111110','00111111100','00011111000','00001110000','00000100000'];
export default{id:'intro/rpg',start:122.05,end:125.73,fonts:['400 48px "Press Start 2P"','400 96px "Press Start 2P"'],async create(root,env){const{ctx}=env.canvas(root);const geom=await env.loadJSON('/scenes/intro/lib/late-geometry.json');const lettering=await env.loadJSON('/scenes/intro/lib/precision-lettering.json');const detail=await env.loadJSON('/scenes/intro/lib/precision-actors.json');const timing=await env.loadJSON('/scenes/intro/lib/precision-typing.json');const fragments=detail.fragments.map(([f,items])=>[f,items.map(([i,path,cells,pieces])=>[i,new Path2D(path),cells,pieces])]);
 function heart(x,y,state){const proto=detail.heartPalettes[String(state)];ctx.save();ctx.translate(x,y);
  proto.rows.forEach((row,r)=>row.forEach((k,c)=>{if(k<0)return;ctx.fillStyle=`rgb(${proto.palette[k].join(',')})`;ctx.fillRect(c*12,r*12,12,12);}));ctx.restore();
 }
 function pixels(chars,x,y,pitch,count,orangeFrom=-1){
  for(let i=0;i<Math.min(count,chars.length);i++){ctx.fillStyle=orangeFrom>=0&&i>=orangeFrom&&i<orangeFrom+3?'#f7b28f':'#f2effb';
   const path=new Path2D();chars[i].forEach((row,r)=>{for(let c=0;c<row.length;c++)if(row[c]==='1')path.rect(x+(i*8+c)*pitch,y+r*pitch,pitch,pitch);});ctx.fill(path);
  }
 }
 return{render(t){ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.fillStyle='#000001';ctx.fillRect(0,0,1920,1080);for(let y=0;y<1080;y+=3){ctx.fillStyle='#121114';ctx.fillRect(0,y,1920,1);ctx.fillStyle='#121114';ctx.fillRect(0,y+1,1920,1);}
  let hearts=geom.heart[0][1];for(const[f,st]of geom.heart){if(f>t*60+.01)break;hearts=st;}
  let bits=fragments[0][1];for(const[f,items]of fragments){if(f>t*60+.01)break;bits=items;}
  const replacing=new Set(bits.map(v=>v[0]));
  for(let i=0;i<10;i++){const st=hearts[i];if(st&&!replacing.has(i))heart(119+144*i,108,st);}
  for(const[i,path,cells,pieces]of bits){ctx.save();ctx.clip(path,'evenodd');cells.forEach((row,r)=>row.forEach((color,c)=>{if(!color)return;ctx.fillStyle=`rgb(${color.join(',')})`;ctx.fillRect(119+144*i+c*12,108+r*12,12,12);}));ctx.restore();
   // Large solid debris blocks (49x60 / 60x72) are not in the source (it shows the heart's right half sliding
   // half a cell for two frames), so they are skipped; the small cell-sized shards are kept.
   for(const[x,y,w,h,color]of pieces){if(w>=40)continue;
    ctx.fillStyle=`rgb(${color.join(',')})`;ctx.fillRect(x,y,w,h);}}
  // The thick border is assembled from square pixels, as in the source.
  ctx.fillStyle='#b6b1de';ctx.fillRect(120,774,6,180);ctx.fillRect(1794,774,6,180);ctx.fillRect(126,768,1668,6);ctx.fillRect(126,954,1668,6);ctx.fillStyle='#f0edff';ctx.fillRect(125,774,1,180);ctx.fillRect(1794,774,1,180);
  let typed=timing.typing[0][1];for(const[f,value]of timing.typing){if(f>t*60+.01)break;typed=value;}
  const[n1,n2,cursorLine,cursorX]=typed;
  pixels(lettering.dialogue[0],151,804,6,n1);if(n2>0)pixels(lettering.dialogue[1],151,876,6,n2,11);
  if(cursorLine>=0&&cursorX!==null){ctx.fillStyle='#ccc8f1';ctx.fillRect(cursorX-.5,cursorLine===1?876:804,42,42);}
  let captionAlpha=0;for(const[f,value]of timing.captionAlpha){if(f>t*60+.01)break;captionAlpha=value;}
  if(captionAlpha>0){ctx.save();ctx.globalAlpha=captionAlpha;pixels(lettering.caption,395,456,12,12);ctx.restore();}


 }};
}};
