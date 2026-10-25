// Syntax -> AST -> x86 pipeline.
import {clamp,lerp,ease,table} from './lib/util.js';
const FONT='"Geist Mono"';
const C={bg:'#08070c',white:'#f0effb',dim:'#85838d',purple:'#b9b0ff',blue:'#6058e4',line:'#aaa8b5'};
const TITLE='world.execute(me);', TX=248, ADV=84, SZ=140;
const labels=[['object',249,645,446,287,15.44],['member access',678,710,694,242,15.91],['method',741,1292,1016,287,16.15],['argument',1384,1532,1458,287,16.46],['statement end',1644,1676,1660,242,16.69]];
const ASM=[
 ['0040102E','8B 45 F8','mov  eax,[ebp-8]'],['00401031','50','push eax'],['00401032','8B 0D 44 9A 40 00','mov  ecx,[00409A44]'],['00401038','8B 11','mov  edx,[ecx]'],['0040103A','FF 52 08','call dword ptr [edx+8]'],
 ['0040103D','33 C0','xor  eax,eax'],['0040103F','8B E5','mov  esp,ebp'],['00401041','5D','pop  ebp'],['004011A0','55','push ebp']
];
const PIPE=[[[0,'PF'],[1,'D1'],[2,'D2'],[3,'EX'],[4,'WB']],[[1,'PF'],[2,'D1'],[3,'D2'],[4,'EX'],[5,'WB']],[[2,'PF'],[3,'D1'],[4,'D2'],[5,'EX'],[6,'WB']],[[3,'PF'],[4,'D1'],[5,'AGI'],[6,'D2'],[7,'EX'],[8,'WB']],[[4,'PF'],[5,'D1'],[6,'D1'],[7,'AGI'],[8,'D2'],[9,'EX']],[[5,'PF'],[6,'PF'],[7,'D1'],[8,'D1'],[9,'×']],[[7,'PF'],[8,'PF'],[9,'×']],[[9,'×']],[[10,'PF']]];
export default {id:'intro/title',start:14.98,end:22.3583333333,fonts:[`400 140px ${FONT}`,`800 140px ${FONT}`,`italic 400 25px ${FONT}`],async create(root,env){
 const {ctx}=env.canvas(root); const W=1920,H=1080;
 const geom=await env.loadJSON('/scenes/intro/lib/title-geometry.json');
 const lettering=await env.loadJSON('/scenes/intro/lib/precision-lettering.json');
 const pipeline=await env.loadJSON('/scenes/intro/lib/precision-pipeline.json');
 const asmPaths=pipeline.asm.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,new Path2D(v)])));
 const stagePaths=Object.fromEntries(Object.entries(pipeline.stageLabels).map(([k,v])=>[k,{...v,path:new Path2D(v.path)}]));
 const syntaxPaths=Object.fromEntries(Object.entries(lettering.syntaxLabels).map(([k,v])=>[k,new Path2D(v)]));
 const astPaths=Object.fromEntries(Object.entries(lettering.ast).map(([k,v])=>[k,{...v,path:new Path2D(v.path)}]));
 const TT=await env.loadJSON('/scenes/intro/lib/title-track.json');
 const TREE=(await env.loadJSON('/scenes/intro/lib/title-tree.json')).el;
 const glyphs=Object.fromEntries(Object.entries(geom.paths).map(([k,v])=>[k,v.map(s=>new Path2D(s))]));
 const bg=ctx.createRadialGradient(960,540,460,960,540,1100);bg.addColorStop(0,'#08070c');bg.addColorStop(1,'#06050a');
 const p=(t,a,d=.15)=>ease.outCubic(clamp((t-a)/d));
 function line(points,color=C.line,w=1){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
 function text(s,x,y,size=26,color=C.white,weight=400){ctx.fillStyle=color;ctx.font=`${weight} ${size}px ${FONT}`;ctx.fillText(s,x,y);}
 function box(s,x,y,t,t0){const a=p(t,t0,.045);if(a<=0)return;ctx.save();ctx.globalAlpha*=a;const item=astPaths[s],w=item.width;ctx.strokeStyle='#d8d6df';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x-w/2,y,w,46,6);ctx.stroke();ctx.translate(x-item.cx+.5,y-item.top+.5);ctx.fillStyle=C.white;ctx.strokeStyle=C.white;ctx.lineWidth=.8;ctx.fill(item.path,'evenodd');ctx.stroke(item.path);ctx.restore();return w;}
 // Title glyphs: the regular outlines, filled and stroked with a per-frame width (the weight changes grow
 // the stroke). Zoom, y offset, token alpha, punctuation whitening, the white->blue "me" and the word glow
 // are per-frame curves.
 const scratch=(()=>{const cv=document.createElement('canvas');cv.width=1920;cv.height=1080;return cv.getContext('2d');})();
 const TOKENS=[[0,5,'w'],[5,6,'p'],[6,13,'w'],[13,14,'p'],[14,16,'m'],[16,17,'p'],[17,18,'p']];
 const T_WHITE=[242,241,254],T_PUR=[180,180,248],T_BLUE=[94,94,230];
 const mixc=(a,b,k)=>`rgb(${Math.round(a[0]+(b[0]-a[0])*k)},${Math.round(a[1]+(b[1]-a[1])*k)},${Math.round(a[2]+(b[2]-a[2])*k)})`;
 const BOXES=[[235,658],[666,716],[724,1308],[1316,1370],[1378,1549],[1557,1623],[1631,1694]];
 function title(t){
  const fi=clamp(Math.round(t*60)-TT.f0,0,TT.z.length-1);
  const zoom=TT.z[fi],yoff=TT.y[fi],glow=TT.g[fi];
  ctx.save();ctx.translate(960,450);ctx.scale(zoom,zoom);ctx.translate(-960,-450);
  // token boxes while the line is typed in: each appears with its token, then all fade out
  if(t<15.4){const fade=1-clamp((t-15.16)/.24);ctx.lineWidth=1;ctx.strokeStyle='#b4b2bc';BOXES.forEach(([x0,x1],k)=>{if(TT.tok[k][fi][0]<=0)return;ctx.globalAlpha=fade*.8;ctx.beginPath();ctx.roundRect(x0+.5,332.5,x1-x0,162,8);ctx.stroke();});}
  ctx.translate(0,yoff);ctx.lineJoin='round';
  TOKENS.forEach(([a,b,kind],k)=>{const[al,lw,mx]=TT.tok[k][fi];if(al<=0)return;
   const col=kind==='p'?mixc(T_PUR,T_WHITE,mx):kind==='m'?mixc(T_WHITE,T_BLUE,mx):mixc(T_WHITE,T_WHITE,0);
   // A token still fading in is drawn opaque on a scratch layer first, so fill and stroke do not double up.
   const c=al<1?scratch:ctx;if(al<1){c.setTransform(ctx.getTransform());c.clearRect(-2000,-2000,6000,6000);c.lineJoin='round';}
   c.globalAlpha=1;c.fillStyle=col;c.strokeStyle=col;c.lineWidth=Math.max(.01,lw);
   const dx=kind==='m'?0:.5;c.translate(dx,0);
   for(let i=a;i<b;i++){const path=glyphs.regular[i];
    if(glow>0&&kind!=='p'){c.shadowColor=col;c.shadowBlur=glow;c.stroke(path);c.shadowBlur=0;c.fill(path,'evenodd');}
    else{c.fill(path,'evenodd');if(lw>0)c.stroke(path);}}
   c.translate(-dx,0);
   if(al<1){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=al;ctx.drawImage(scratch.canvas,0,0);ctx.restore();}
  });
  ctx.restore();ctx.globalAlpha=1;
  let marks=lettering.underlines[0][1];for(const[f,st]of lettering.underlines){if(f>t*60+.01)break;marks=st;}
  if(t*60>=lettering.underlines[0][0])marks.forEach((r,i)=>{if(!r)return;ctx.fillStyle=i===2?C.blue:C.white;ctx.fillRect(...r);});
 }
 // Syntax labels and AST. Lines are crisp 1 px; every element's grey level is keyed per frame
 // (title-tree.json): new branches arrive bright, dim as the next ones appear, and the whole tree lights up again
 // at 18.2 s until the cut at frame 1121. Labels are typed one character per source frame; AST boxes open
 // outward from their centre with the text clipped by the growing frame.
 const TYPE=[[928,930,932,933,935,937],[956,957,958,959,960,960,962,962,963,964,965,966,967],[971,973,975,977,978,980],[983,985,986,988,989,991,992,994],[998,999,1000,1000,1001,1002,1003,1004,1005,1006,1007,1008,1009]];
 const LON=[[926,926],[953,955],[969,970],[981,982],[995,996]];
 const lvl=(name,f)=>{const pts=TREE[name];if(!pts||f<pts[0][0])return pts?pts[0][1]:200;let v=pts[0][1];for(const[ff,val]of pts){if(ff>f)break;v=val;}return v;};
 const grey=v=>`rgb(${v},${Math.max(0,v-1)},${Math.min(255,v+4)})`;
 const grow=(n,s=.75)=>n<0?0:1-Math.exp(-(n+s)/1.2);
 function seg(pts,v){ctx.strokeStyle=grey(v);ctx.lineWidth=1;ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x+.5,y+.5):ctx.moveTo(x+.5,y+.5));ctx.stroke();}
 function astBox(name,cx,top,hl,hr,e,vb,vt,fill){if(e<=0)return;const l=hl*e,r=hr*e;ctx.save();ctx.beginPath();ctx.roundRect(cx-l+.5,top+.5,l+r,45,Math.min(5,(l+r)/2));if(fill){ctx.fillStyle='#1c1a27';ctx.fill();}ctx.strokeStyle=grey(vb);ctx.lineWidth=1;ctx.stroke();
  ctx.beginPath();ctx.rect(cx-l+1,top+1,l+r-1,44);ctx.clip();const item=astPaths[name];ctx.translate(cx-item.cx+.5,top-item.top+.5);const lit=vt===true,tc=lit?'rgb(253,252,255)':'rgb(226,224,239)';ctx.fillStyle=tc;ctx.strokeStyle=tc;ctx.lineWidth=lit?.75:.6;ctx.fill(item.path,'evenodd');ctx.stroke(item.path);ctx.restore();}
 // L-shaped branch with a rounded corner (radius 8), as in the source
 function branch(x0,y0,xc,yc,x1,y1,v){ctx.strokeStyle=grey(v);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x0+.5,y0+.5);ctx.arcTo(xc+.5,yc+.5,x1+.5,y1+.5,8);ctx.lineTo(x1+.5,y1+.5);ctx.stroke();}
 function syntax(t){
  const f=t*60,fr=Math.round(f);if(fr>=1121)return;
  labels.forEach(([s,x0,x1,cx,ty],i)=>{const[fb,fc]=LON[i];if(fr<fb)return;const yy=331;
   const pb=fr===fb?.85:1,vb=lvl(`L${i}b`,fr);
   seg(pb<1?[[cx-(cx-x0)*pb,yy],[cx+(x1-cx)*pb,yy]]:[[x0,yy+6],[x0,yy],[x1,yy],[x1,yy+6]],vb);
   if(fr>=fc){const g=[.3,.7,.9][fr-fc]??1;seg([[cx,yy],[cx,yy-(yy-ty-3)*g]],lvl(`L${i}c`,fr));}
   const n=TYPE[i].filter(ff=>ff<=fr).length;if(!n)return;
   const adv=14.43,left=cx-s.length*adv/2-1;ctx.save();ctx.beginPath();ctx.rect(left-6,190,n*adv+6,95);ctx.clip();ctx.translate(.5,.5);const c=grey(lvl(`L${i}t`,fr));ctx.fillStyle=c;ctx.strokeStyle=c;ctx.lineWidth=.6;ctx.fill(syntaxPaths[s],'evenodd');ctx.stroke(syntaxPaths[s]);ctx.restore();
  });
  // ExpressionStatement
  if(fr>=1009){const e=grow(f-1009);seg([[959-710*e,493],[959+712*e,493]],lvl('tb',fr));if(e>.97){seg([[249,487],[249,493]],lvl('tb',fr));seg([[1671,487],[1671,493]],lvl('tb',fr));}
   seg([[959,494],[959,494+62*e]],lvl('esc',fr));astBox('ExpressionStatement',959,557,149,150,e,lvl('esb',fr),fr>=1093);}
  // CallExpression
  if(fr>=1036){const e=grow(f-1036,.43);seg([[959,603],[959,603+57*e]],lvl('cec',fr));astBox('CallExpression',959,661,114,114,e,lvl('ceb',fr),fr>=1095);}
  // MemberExpression + Identifier
  if(fr>=1064){const e=grow(f-1064);seg([[959,707],[959,736]],lvl('mec',fr));
   const L=235*(f-1063),mv=fr>=1095&&fr<1102?lvl('meh',1094):lvl('meh',fr);if(L>=499){branch(959,736,731,736,731,764,mv);branch(959,736,1458,736,1458,764,mv);}else{if(L>=228)branch(959,736,731,736,731,764,mv);else seg([[959-L,736],[959,736]],mv);seg([[959,736],[959+L,736]],mv);}
   if(fr>=1095&&fr<1102){const w=64*(f-1094.06);seg([[Math.max(739,959-w),736],[Math.min(1450,959+w),736]],255);}
   astBox('MemberExpression',731,765,128,128,e,lvl('meb',fr),fr>=1099);astBox('Identifier',1458,765,85,85,e,lvl('idb',fr),fr>=1103,fr>=1103);}
  // Identifier, Identifier
  if(fr>=1091){const e=grow(f-1091);seg([[731,811],[731,840]],lvl('i2h',fr));
   const L=235*(f-1090),hv=fr>=1100&&fr<1104?lvl('i2h',1099):lvl('i2h',fr);if(L>=285){branch(731,840,446,840,446,868,hv);branch(731,840,1016,840,1016,868,hv);}else seg([[731-L,840],[731+L,840]],hv);
   if(fr>=1100&&fr<1104){const w=64*(f-1099.2);seg([[Math.max(454,731-w),840],[Math.min(1008,731+w),840]],251);}
   astBox('Identifier',446,869,85,85,e,lvl('i2b',fr),fr>=1105,fr>=1105);astBox('Identifier',1016,869,85,85,e,lvl('i3b',fr),fr>=1105,fr>=1105);}
 }
 // Row 7 ("00401041 5D pop ebp") is composed from character cells of the other rows.
 const ROW7=[['address',1,[0,1,2,3,4,5],[0,1,2,3,4,5]],['address',1,[2],[6]],['address',1,[7],[7]],['bytes',8,[0],[0]],['bytes',2,[4],[1]],
  ['code',8,[0],[0]],['code',0,[1],[1]],['code',8,[0],[2]],['code',8,[5,6,7],[5,6,7]]];
 const FX={address:121,bytes:277,code:573},ADV=15.6;
 const keyc=(keys,fr)=>{if(fr<keys[0][0])return null;let k=keys.length-1;for(let i=0;i<keys.length-1;i++){if(fr<keys[i+1][0]){k=i;break;}}const a=keys[k],b=keys[k+1];if(!b||fr<=a[0])return a.slice(1);const u=(fr-a[0])/(b[0]-a[0]);return[0,1,2].map(j=>Math.round(a[1+j]+(b[1+j]-a[1+j])*u));};
 const EXK={'0,3':[[1244,206,208,252],[1257,206,208,252],[1258,90,84,196],[1259,61,58,147],[1261,50,46,115],[1264,41,35,92],[1269,31,26,69],[1278,28,24,59],[1293,25,23,58]],
  '1,4':[[1258,209,209,255],[1270,209,209,255],[1271,115,109,244],[1272,90,83,194],[1273,64,58,142],[1275,52,47,119],[1277,41,37,97],[1279,33,30,78],[1283,30,28,67],[1297,26,25,59]],
  '2,5':[[1271,253,253,253],[1286,253,253,253],[1287,228,226,240],[1288,179,177,189],[1289,130,129,136],[1290,109,108,115],[1294,83,82,89],[1298,65,64,71],[1302,60,59,66]],
  '3,7':[[1299,252,251,251],[1314,251,251,251],[1315,213,212,217],[1316,153,152,159],[1317,130,129,136],[1318,110,109,116],[1320,97,96,103],[1322,77,76,83],[1325,66,65,72],[1328,60,59,66],[1329,58,57,64]],
  '4,9':[[1327,252,251,254]]};
 function assembly(t){const fr=Math.round(t*60),ff=t*60;if(ff<1146)return;
  const rows=fr<1271?5:fr<1299?6:fr<1327?7:9;
  const rowY=r=>366+r*54+(r===8?27:0);
  let inkW=.8;const ink=(path,color)=>{ctx.save();ctx.translate(.5,.5);ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=inkW;ctx.fill(path,'evenodd');if(inkW>0)ctx.stroke(path);ctx.restore();};
  const inkField=(r,field,color)=>{if(r!==7){ink(asmPaths[r][field],color);return;}
   for(const[fld,src,sc,dc]of ROW7){if(fld!==field)continue;sc.forEach((c,j)=>{const d=dc[j],x0=FX[fld];ctx.save();ctx.beginPath();ctx.rect(x0+d*ADV-2,rowY(7)-34,ADV,46);ctx.clip();
    ctx.translate(Math.round(x0+d*ADV)-Math.round(x0+c*ADV),rowY(7)-rowY(src));ink(asmPaths[src][fld],color);ctx.restore();});}};
  // Frame events: code lines fade in one 1/8 beat apart, the hex bytes and then the addresses pop in,
  // the current instruction's address and bytes turn white, later rows fade in with the pipeline.
  const ON=[1146,1149.4,1152.8,1155.8,1159.6,1270.8,1298.5,1326.3,1326],FD=[5,5,5,6,5,4,3.5,3.5,3];
  const BY=[1175,1178,1182,1185,1189],AD=[1190,1192,1194,1195,1197];
  let cur=-1;for(const[f0,r]of[[1202,0],[1258,1],[1271,2],[1285,3],[1313,4],[1327,8]])if(fr>=f0)cur=r;
  for(let r=0;r<rows;r++){const y=rowY(r);const a=clamp((ff-ON[r])/FD[r]);if(a<=0)continue;
   // the current instruction's code is drawn heavier than the others (+17% ink); struck rows dim
   ctx.save();ctx.globalAlpha=a;const codeCol=r>=5&&r<=7?(ff>=1327?'#a9a7b1':'#c8c6d0'):C.white;
   inkW=r===cur?.95:r>=5&&r<=7?0:.6;inkField(r,'code',codeCol);inkW=.8;
   // Colour the argument-bearing words of the first two operations.
   if(r===0){ctx.save();ctx.beginPath();ctx.rect(710,y-30,15,36);ctx.rect(772,y-30,50,36);ctx.clip();ink(asmPaths[r].code,C.purple);ctx.restore();}
   if(r===1){ctx.save();ctx.beginPath();ctx.rect(648,y-30,49,36);ctx.clip();ink(asmPaths[r].code,C.purple);ctx.restore();}
   // hex bytes are typed one byte per frame, so reveal them through a growing clip
   if(r>=5)inkField(r,'bytes',r===cur?C.white:'#b2b0ba');
   else if(fr>=BY[r]){const nb=fr-BY[r]+1;ctx.save();ctx.beginPath();ctx.rect(270,y-40,7+45*nb-12,52);ctx.clip();inkField(r,'bytes',r===cur?C.white:'#b2b0ba');ctx.restore();}
   if(r>=5||fr>=AD[r])inkField(r,'address',r===cur?C.white:'#93919b');
   if(r>=5&&r<=7&&ff>=1326){ctx.globalAlpha=a*clamp((ff-1326)/3);line([[570,y-9],[570+ASM[r][2].length*15.6,y-9]],'#aeacb6',2);}
   ctx.restore();
  }
  // Clock and pipeline cells.
  const cNow=(t-20.02)/(.461538/2),cmax=Math.floor(cNow+1e-5),x0=959,dx=76.4;
  const ga=clamp((t*60-1146)/6);ctx.save();ctx.globalAlpha=ga;for(let r=0;r<rows;r++){line([[959,rowY(r)-10],[1800,rowY(r)-10]],'#34323d',.8);}
  text('CLK',914,309,16,C.dim);for(let c=0;c<11;c++){text(String(c+1),992+c*dx,280,16,c<=cmax+1?C.white:C.dim);}
  if(cNow>=0){let xx=pipeline.wave[0][1];for(const[f,value]of pipeline.wave){if(f>t*60+.01)break;xx=value;}ctx.save();ctx.beginPath();ctx.rect(x0,280,xx-x0,40);ctx.clip();const pts=[[x0,315]];for(let c=0;c<11;c++){pts.push([x0+c*dx,292],[x0+c*dx+dx/2,292],[x0+c*dx+dx/2,315],[x0+(c+1)*dx,315]);}line(pts,'#d0cdd9',1.1);ctx.restore();}
  line([[959,315],[1800,315]],'#484550',.8);
  if(cmax>=0){let shade=null;for(const[f,value]of pipeline.shade){if(f>t*60+.01)break;shade=value;}if(shade){ctx.fillStyle='rgba(80,76,106,.12)';ctx.fillRect(shade[0],287,shade[1],rows*54+44+(rows===9?27:0));}}
  PIPE.forEach((row,r)=>row.forEach(([c,s])=>{if(t*60+.01<(pipeline.visible[`${r},${c}`]??1e9))return;const x=964+c*dx,y=336+r*54+(r===8?27:0);const current=c===Math.min(cmax,9);let fill='rgba(8,8,12,.65)',stroke=current?'#ecebf2':'#9995a2',col=current?'#f6f5fb':'#b4b0bc',glow=0;
   // EX cells: fill colour per source frame (lit white/lavender, then decaying to blue or grey)
   if(s==='EX'){const k=EXK[`${r},${c}`];const cc=k?keyc(k,Math.round(t*60)):null;if(!cc){fill='#09090e';stroke='#aaa8b4';col='#eeeaf5';}else{fill=`rgb(${cc})`;const lum=cc[0]+cc[1]+cc[2];if(lum>420){stroke='#ffffff';col='#16131e';glow=10;}else if(cc[2]>cc[0]+25){stroke='#7e73cf';col='#eeeaf5';}else{stroke='#aaa8b4';col='#eeeaf5';}}}
   if(s==='AGI'||(r===4&&c===6)||(r===5&&(c===6||c===8))||(r===6&&c===8)||(r===8&&c===10))ctx.setLineDash([4,3]);else ctx.setLineDash([]);
   ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=.9;ctx.beginPath();ctx.roundRect(x,y,68,39,4);if(glow){ctx.save();ctx.shadowColor=fill;ctx.shadowBlur=glow;ctx.fill();ctx.restore();}else ctx.fill();ctx.stroke();ctx.setLineDash([]);
   if(s==='×'){line([[x+12,y+7],[x+56,y+32]],'#aaa7b3');line([[x+56,y+7],[x+12,y+32]],'#aaa7b3');}else{const st=stagePaths[s];ctx.save();ctx.translate(x+34-st.cx,y-st.top);ink(st.path,s==='AGI'?C.purple:col);ctx.restore();}
  }));
  // stall link from the lit EX cell down to the address-generation cell
  for(const[f0,f1,r,c]of[[1271,1286,2,5],[1299,1314,3,7]]){const fr2=Math.round(t*60);if(fr2>=f0&&fr2<=f1){const x=Math.round(964+c*dx+34)+.5,y0=336+r*54+39;line([[x,y0],[x,y0+15]],'#e8e6f0',1);}}
  if(t*60+.01>=(pipeline.visible['8,10']??1e9)){line([[1719,572],[1750,572],[1762,584],[1762,789]],C.white,1);ctx.fillStyle=C.white;ctx.beginPath();ctx.moveTo(1757,784);ctx.lineTo(1767,784);ctx.lineTo(1762,792);ctx.fill();}
  ctx.restore();
  // Register file and stack, driven by the frame events: values arrive with a highlight box that
  // later fades (keyframed colours), unset registers show dim dashes, and a pointer marks the stack top.
  if(fr<1188)return;ctx.save();ctx.globalAlpha=1;line([[119,866],[1800,866]],'#34323b');
  const at=(list,dflt)=>{let v=dflt;for(const[ff,val]of list){if(fr>=ff)v=val;}return v;};
  const hl=(keys)=>{if(fr<keys[0][0])return null;let k=keys.length-1;for(let i=0;i<keys.length-1;i++){if(fr<keys[i+1][0]){k=i;break;}}const a=keys[k],b=keys[k+1];if(!b||fr<=a[0])return a.slice(1);const u=(fr-a[0])/(b[0]-a[0]);return[0,1,2].map(j=>Math.round(a[1+j]+(b[1+j]-a[1+j])*u));};
  const HL={EIP:[[1258,40,39,44],[1270,38,37,42],[1271,30,29,34],[1284,30,29,34],[1285,34,33,38],[1299,34,33,38],[1305,18,17,22],[1312,16,15,20],[1313,36,35,40],[1326,36,35,40],[1327,26,25,30]],
   EAX:[[1258,39,36,85],[1270,38,35,84],[1276,23,20,46],[1283,13,12,19],[1290,8,7,12]],ECX:[[1285,37,36,43],[1299,37,36,43],[1305,18,17,24],[1311,12,11,18],[1316,8,7,12]],
   EDX:[[1313,41,40,45],[1327,40,39,44],[1330,26,25,30],[1334,18,17,22],[1338,8,7,12]],ESP:[[1271,27,26,31],[1285,27,26,31],[1290,16,15,20],[1297,10,9,14],[1306,8,7,12]],S1:[[1271,30,27,59],[1285,30,27,59],[1290,15,13,29],[1296,10,8,22],[1305,9,8,17]]};
  const box=(k,x,y,w,h)=>{const c=hl(HL[k]);if(c){ctx.fillStyle=`rgb(${c})`;ctx.fillRect(x,y,w,h);}};
  const DASH='rgb(58,56,64)',LBL='#9e9da2',PURV='rgb(160,154,236)';
  const regs=[
   ['EIP',1190,at([[1190,'0040102E'],[1258,'00401031'],[1271,'00401032'],[1285,'00401038'],[1313,'0040103A'],[1327,'004011A0']],''),C.white,fr>=1327?'World::execute':'','#eeedf3'],
   ['EAX',1192,fr>=1258?'005A2F10':'--------',fr>=1258?PURV:DASH,fr>=1258?'me':'',PURV],
   ['ECX',1194,fr>=1285?'005A1D28':'--------',fr>=1285?C.white:DASH,fr>=1285?'world':'','#a9a7b6'],
   ['EDX',1195,fr>=1313?'004070F8':'--------',fr>=1313?C.white:DASH,fr>=1313?"World::`vftable'":'','#d6d4e1'],
   ['ESP',1197,fr>=1271?'0012FF74':'0012FF78','#d6d5db','','']];
  regs.forEach(([s,f0,v,col,sub,subc],i)=>{const x=119+i*280;text(s,x,898,15,LBL);if(fr<f0)return;box(s,x-7,908,160,40);text(v,x-1,938,30,col);if(sub)text(sub,x,966,16,subc);});
  text('STACK',1519,898,15,LBL);
  if(fr>=1199){const top=fr>=1271;box('S1',1634,916,108,26);text('0012FF74',1519,936,20,top?'#fcfbfe':'#a3a1ac');text(top?'005A2F10':'--------',1639,936,20,top?'rgb(172,167,235)':DASH);if(top)text('me',1759,936,20,'rgb(159,153,230)');
   ctx.fillStyle='#f3f2f7';const my=top?924:956;ctx.beginPath();ctx.moveTo(1505,my);ctx.lineTo(1512,my+4.5);ctx.lineTo(1505,my+9);ctx.closePath();ctx.fill();}
  if(fr>=1201){text('0012FF78',1519,968,20,fr>=1271?'#a4a3ad':'#fdfdfe');text('005A2F10',1639,968,20,'rgb(175,168,241)');text('me',1759,968,20,'rgb(159,153,230)');}
  ctx.restore();
 }
 return{render(t){ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.textAlign='left';title(t);syntax(t);assembly(t);}};
}};
