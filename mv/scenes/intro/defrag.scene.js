// A defragmenter consolidates four file runs, then clears the disk's free tail.
import { clamp,paperBackground } from './lib/util.js';
import { createDefragModel } from './lib/defrag-model.js';
import { pixelText,drawPixelText } from './lib/defrag-type.js';

const X=119,Y=312,D=30,S=29;
const WORDS=[
  ['If',7100,120,195,35,47],['I',7116,166,199,11,43],
  ['can',7140,196,211,71,31],['If',7158,286,195,35,47],
  ['I',7182,332,199,11,43],['can',7196,362,211,71,31],
  ['erase',7212,454,211,121,31],['all',7240,592,195,43,47],
  ['the',7252,654,195,69,47],['fragments',7266,742,195,201,54],
];
const LEGEND=[
  ['Used',155,940,50,23],['Fragmented',282,940,130,29],
  ['Free',489,942,43,21],['Moving',609,942,73,27],
  ['Contiguous',1177,942,124,27],
];

export default {
  id:'intro/defrag',start:118.33,end:122.05,
  fonts:['200 22px "Roboto Condensed"','300 15px "Roboto Condensed"','400 28px "Roboto Condensed"','400 16px "IBM Plex Mono"'],
  async create(root,env) {
    const {ctx}=env.canvas(root);
    const bg=paperBackground(1920,1080,{inner:236,outer:223,r0:480,r1:1200});
    const model=createDefragModel();
    const words=WORDS.map(([text])=>pixelText(text));
    const labels=LEGEND.map(([text])=>pixelText(text));
    const heading=pixelText('Fragments',15,300);
    const capitalI=pixelText('I',16,400,'IBM Plex Mono');
    const lowerF=pixelText('f');

    function paintTile(c,s,size) {
      c.fillStyle='#fdfdfd';c.fillRect(0,0,size,size);
      c.fillStyle=['#fdfdfd','#595ae2','#acb0f7','#09084b'][s];c.fillRect(1,1,size-2,size-2);
      c.strokeStyle=s===0?'#c5c5c9':s===2?'#a6a6ea':'#4541be';
      c.lineWidth=1;c.strokeRect(1.5,1.5,size-3,size-3);
      if(s===2) {
        for(let k=1;k<size-1;k++) {
          const px=size-1-k;
          c.fillStyle='#e0e3ff';
          if(px-1>=1)c.fillRect(px-1,k,1,1);
          if(px+1<=size-2)c.fillRect(px+1,k,1,1);
        }
        for(let k=1;k<size-1;k++) {
          c.fillStyle=k===1||k===size-2?'#6e7088':'#00003d';
          c.fillRect(size-1-k,k,1,1);
        }
      }
    }
    const sprites={};
    for(const size of[S,23]) sprites[size]=[0,1,2].map(s=>{
      const canvas=document.createElement('canvas');
      canvas.width=canvas.height=size;
      paintTile(canvas.getContext('2d'),s,size);
      return canvas;
    });
    function tile(x,y,s,size=S) {ctx.drawImage(sprites[size][s],x,y,size,size);}
    function movingActor(x,y,w,h) {
      ctx.fillStyle='#1c1892';ctx.fillRect(x,y,w,h);
      ctx.lineWidth=1;
      const ring=(i,c)=>{
        ctx.strokeStyle=c;ctx.strokeRect(x+i+.5,y+i+.5,w-2*i-1,h-2*i-1);
      };
      ctx.fillStyle='#171682';ctx.fillRect(x+5,y+5,w-10,h-10);
      ring(0,'#00002e');ring(3,'#000050');ring(4,'#ffffff');ring(5,'#00003a');
    }
    return {
      render(t) {
        ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;
        ctx.drawImage(bg,0,0);
        const f=Math.round(t*60),{grid,actors,scan,pct}=model.at(t);
        for(let r=0;r<20;r++) for(let c=0;c<56;c++) tile(X+c*D,Y+r*D,grid[r*56+c]===3?0:grid[r*56+c]);
        for(const actor of actors) movingActor(...actor);
        if(scan!==null) {ctx.fillStyle='#1e1e1f';ctx.fillRect(scan,303,2,617);}

        const shown=f<7286?10:f<7288?6:f<7290?3:0;
        WORDS.forEach(([text,start,x,y,w,h],i)=>{
          if(f<start||i>=shown) return;
          if(text==='I') drawPixelText(ctx,capitalI,x,y,w,h,'#111113');
          else if(text==='If') {
            drawPixelText(ctx,capitalI,x,y+4,11,43,'#111113');
            drawPixelText(ctx,lowerF,x+16,y,19,47,'#111113');
          } else drawPixelText(ctx,words[i],x,y,w,h,'#111113');
        });
        if(f>=7292) {
          const stage=f<7294?0:f<7302?1:f<7308?2:3;
          const size=[2,6,10,12.4][stage];
          ctx.fillStyle=['#9692c0','#8a80e8','#756fe3','#5c5be6'][stage];
          const sx=708/heading.width,sy=168/heading.height;
          for(const [x,y] of heading.cells) {
            const cx=126.5+x*sx,cy=116.5+y*sy;
            if(stage===0) {
              for(const dx of[0,6]) for(const dy of[-6,0]) ctx.fillRect(Math.round(cx+dx-1),Math.round(cy+dy-1),2,2);
            } else ctx.fillRect(cx-size/2,cy-size/2,size,size);
          }
        }

        for(const [s,x] of [[1,119],[2,246],[0,454]]) tile(x,942,s,23);
        ctx.fillStyle='#0d0b5a';ctx.fillRect(573,942,23,23);
        ctx.fillStyle='#141786';ctx.fillRect(577,946,15,15);
        ctx.strokeStyle='#f4f3ff';ctx.lineWidth=1;ctx.strokeRect(576.5,945.5,16,16);
        LEGEND.forEach(([,x,y,w,h],i)=>drawPixelText(ctx,labels[i],x,y,w,h,'#3d3c45'));

        ctx.fillStyle='#d3d3d7';ctx.beginPath();ctx.roundRect(1318,949,401,8,4);ctx.fill();
        ctx.fillStyle='#625be6';ctx.beginPath();ctx.roundRect(1318,949,401*clamp(pct/100),8,4);ctx.fill();
        ctx.strokeStyle='#4e47c5';ctx.lineWidth=.7;ctx.stroke();
        ctx.font='400 28px "Roboto Condensed"';ctx.textAlign='right';ctx.textBaseline='top';
        ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=2;
        ctx.strokeText(pct+'%',1790,940);ctx.fillStyle='#1d1662';ctx.fillText(pct+'%',1790,940);
        ctx.textAlign='left';
      },
    };
  },
};
