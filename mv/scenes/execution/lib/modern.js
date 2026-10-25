// Canvas recreations of the four modern editors/terminals.
import {addLabel} from './label.js';
import {loadExecFonts} from './fonts.js';
import {guarded} from './ctx2d.js';
const F=f=>(f-.5)/60;
const W=1920,H=1080;
const WHITE='#cccccc',UI='Inter';
const rect=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
function text(c,s,x,y,font='400 24px Inter',col=WHITE){c.font=font;c.fillStyle=col;c.textBaseline='alphabetic';c.fillText(s,x,y);}
function line(c,pts,col='#bfc1c3',width=1.7){c.strokeStyle=col;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();}
function circle(c,x,y,r,col='#bfc1c3',width=1.7){c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.arc(x,y,r,0,7);c.stroke();}
function terminal(c,spans,x,y,{font='400 29px "JetBrains Mono"',cell=17.4,color=WHITE}={}){
 c.save();c.font=font;c.textBaseline='alphabetic';let col=0;
 for(const span of spans){const[s,ink,style]=Array.isArray(span)?span:[span];c.font=style||font;c.fillStyle=ink||color;
  const nat=c.measureText('M').width;c.save();c.translate(x+col*cell,y);c.scale(cell/nat,1);c.fillText(s,0,0);c.restore();col+=s.length;}
 c.restore();return x+col*cell;
}
function icon(c,name,x,y,s=24,col='#d0d2d3'){
 c.save();c.translate(x,y);c.scale(s/24,s/24);
 if(name==='folder')line(c,[[1,5],[9,5],[12,8],[23,8],[23,22],[1,22],[1,5]],col);
 if(name==='search'){circle(c,11,10,8,col);line(c,[[5,17],[0,23]],col);}
 if(name==='files'){line(c,[[5,1],[16,1],[23,8],[23,23],[5,23],[5,1],[16,1],[16,8],[23,8]],col);line(c,[[1,7],[1,27],[17,27],[17,23]],col);}
 if(name==='branch'){circle(c,6,3,3,col);circle(c,6,22,3,col);circle(c,21,8,3,col);line(c,[[6,6],[6,19]],col);line(c,[[6,15],[17,15],[21,12]],col);}
 if(name==='play')line(c,[[5,1],[21,12],[5,23],[5,1]],col);
 if(name==='term'){line(c,[[0,2],[23,2],[23,22],[0,22],[0,2]],col);line(c,[[4,7],[9,12],[4,17]],col);line(c,[[12,17],[18,17]],col);}
 if(name==='split'){line(c,[[1,2],[22,2],[22,22],[1,22],[1,2]],col);line(c,[[12,2],[12,22]],col);}
 if(name==='close'){line(c,[[4,4],[20,20]],col);line(c,[[20,4],[4,20]],col);}
 if(name==='gear'){
  circle(c,12,12,8,col);circle(c,12,12,3,col);for(let i=0;i<8;i++){let a=i*Math.PI/4;line(c,[[12+8*Math.cos(a),12+8*Math.sin(a)],[12+11*Math.cos(a),12+11*Math.sin(a)]],col);}
 }
 if(name==='user'){circle(c,12,6,5,col);c.strokeStyle=col;c.lineWidth=1.7;c.beginPath();c.arc(12,25,11,Math.PI,2*Math.PI);c.stroke();}
 if(name==='bug'){circle(c,12,7,4,col);c.strokeStyle=col;c.lineWidth=1.5;c.beginPath();c.ellipse(12,15,5,7,0,0,7);c.stroke();line(c,[[12,9],[12,22]],col);for(const yy of[11,16,21]){line(c,[[3,yy-2],[7,yy]],col);line(c,[[17,yy],[21,yy-2]],col);}}
 c.restore();
}
function kotlin(c,x,y,size=20){const g=c.createLinearGradient(x,y,x+size,y+size);g.addColorStop(0,'#7f52ff');g.addColorStop(.5,'#ba69aa');g.addColorStop(1,'#ea7c67');c.fillStyle=g;c.beginPath();c.moveTo(x,y);c.lineTo(x+size,y);c.lineTo(x+size*.5,y+size*.5);c.lineTo(x+size,y+size);c.lineTo(x,y+size);c.closePath();c.fill();}

// IntelliJ's "rerun" icon: a 2 px circular arrow, open at the top-right, arrowhead at the top pointing right.
function rerun(c,cx,cy,col){c.save();c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.arc(cx,cy,7.5,-Math.PI/4,1.5*Math.PI);c.stroke();
 c.fillStyle=col;c.beginPath();c.moveTo(cx-3,cy-12.3);c.lineTo(cx+3.6,cy-9);c.lineTo(cx-3,cy-5.7);c.closePath();c.fill();c.restore();}
function ubuntu(c){
 rect(c,0,0,W,H,'#300922');
 const cfg={font:'400 48px "Ubuntu Mono"',cell:24,color:'#ffffff'};
 const green='#8ae234',blue='#729fcf',bold='700 48px "Ubuntu Mono"';
 const prompt=[['me@ubuntu',green,bold],[':',null,bold],['~/me',blue,bold],['$ ',null]];
 const row=(n,sp)=>terminal(c,sp,11.8,51+n*50,cfg);
 row(0,[...prompt,'cat src/main.rs']);row(1,['use world::{Me, World};']);
 row(3,['fn main() {']);row(4,['    let world = World::new();']);row(5,['    let me = Me::new();']);
 row(6,['    world.execute(&me);']);row(7,['}']);row(8,[...prompt,'cargo run']);
 row(9,[['   Compiling',green,bold],' world v0.1.0 (/home/me/world)']);
 row(10,[['   Compiling',green,bold],' me v0.1.0 (/home/me/me)']);
 row(11,[['    Finished',green,bold],' dev [unoptimized + debuginfo] target(s) in 0.71s']);
 row(12,[['     Running',green,bold],' `target/debug/me`']);
 return(t)=>{
  const f=Math.round(t*60);
  if(f>=9316)row(13,['execution']);
  if(f>=9345){row(14,prompt);if(f<9359)rect(c,396,718,24,47,'#fff');}  // caret still on at 9358
  else rect(c,11, f>=9316?718:668,24,47,'#fff');
 };
}
function powershell(c){
 rect(c,0,0,W,H,'#002354');
 const cfg={font:'400 40.4px "X Cascadia Mono"',cell:23.05,color:'#c8ced4'};
 const row=(n,sp)=>terminal(c,sp,15,48+n*46.1,cfg);
 row(0,['Windows PowerShell']);row(1,['Copyright (C) Microsoft Corporation. All rights reserved.']);
 row(3,['Try the new cross-platform PowerShell https://aka.ms/pscore6']);
 row(5,['PS C:\\Users\\me> . ',['.\\world.ps1','#f9f1a5']]);
 row(6,['PS C:\\Users\\me> ',['$world','#00ff00'],['.Execute(','#ffffff'],['$me','#00ff00'],')']);
 return(t)=>{const f=Math.round(t*60);if(f>=9372)row(7,['execution']);if(f>=9401)row(8,['PS C:\\Users\\me> ']);
  const x=f>=9401?384:16,y=f>=9372?382:336;
  if(f<9414){rect(c,x-1,y-1,5,44,'#000');rect(c,x,y,3,42,'#fff');}};
}
// IntelliJ's left tool-window strip (project, commit, structure; run, terminal, problems, git):
// ~2.5 px near-white strokes.
function ijStrip(c){
 c.save();c.lineJoin='round';c.lineCap='round';const W2='#ececec';
 const P=(pts,w,close)=>{c.lineWidth=w;c.strokeStyle=W2;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));if(close)c.closePath();c.stroke();};
 P([[18.8,104.2],[18.8,88.4],[27.6,88.4],[29.8,90.8],[41.6,90.8],[41.6,104.2]],2.6,true);
 P([[17.8,147.8],[25.2,147.8]],2.2);P([[34.8,147.8],[42.2,147.8]],2.2);c.lineWidth=2.4;c.beginPath();c.arc(30,147.6,4.6,0,7);c.stroke();
 c.lineWidth=2.2;c.beginPath();c.roundRect(19.6,190.2,7.6,5.2,1.2);c.stroke();P([[23,196.2],[23,208]],2);P([[23,200.2],[30,200.2]],2.4);P([[23,207.6],[30,207.6]],2.4);
 c.lineWidth=2;c.beginPath();c.roundRect(30.6,198,11,4.6,1);c.stroke();c.beginPath();c.roundRect(30.6,206,11,4.6,1);c.stroke();
 c.fillStyle='#414247';c.beginPath();c.roundRect(9,634,42,42,7);c.fill();
 P([[23.6,645.6],[38.6,654.6],[23.6,663.8]],2.4,true);
 c.lineWidth=2.8;c.beginPath();c.roundRect(18.6,697.4,23.4,18.6,2);c.stroke();P([[24.2,703.4],[28.6,707.2],[24.2,711]],2.2);P([[30.6,711.2],[37,711.2]],2);
 c.lineWidth=2.6;c.beginPath();c.arc(31,758.6,10.2,0,7);c.stroke();rect(c,29.8,752,2.2,8.6,W2);rect(c,29.8,762.6,2.2,2.6,W2);
 c.lineWidth=2.4;for(const[x,y]of[[22.6,802],[22.6,818.4],[35.4,805.4]]){c.beginPath();c.arc(x,y,3.4,0,7);c.stroke();}
 P([[22.6,805.6],[22.6,814.8]],2.2);c.beginPath();c.moveTo(22.8,813.4);c.quadraticCurveTo(34.8,812.6,35.2,809);c.stroke();
 c.restore();
}
function intellij(c){
 rect(c,0,0,W,H,'#2b2c2f');rect(c,59,63,1861,578,'#1d1e21');
 rect(c,59,261,1861,40,'#25262d');rect(c,59,640,1861,1,'#3b3c3f');
 rect(c,59,694,1861,1,'#3b3c3f');rect(c,58,64,1,972,'#414245');rect(c,0,1036,W,1,'#414245');
 // top toolbar and selected editor tab
 c.fillStyle='#45474d';c.beginPath();c.roundRect(24,16,32,32,7);c.fill();text(c,'ME',28,38,'600 14px Inter','#e4e4e7');
 text(c,'me',68,41,'600 24px Inter','#eee');text(c,'⌄',109,39,'400 20px Inter','#bbb');icon(c,'branch',154,22,18,'#eee');
 text(c,'main',182,41,'400 24px Inter','#eee');text(c,'⌄',244,39,'400 20px Inter','#aaa');
 kotlin(c,1364,22);text(c,'MainKt',1397,41,'400 24px Inter','#eee');text(c,'⌄',1480,37,'400 20px Inter','#aaa');
 c.fillStyle='#ddd';for(const yy of[25.2,32,38.8]){c.beginPath();c.arc(1638.5,yy,1.9,0,7);c.fill();}icon(c,'search',1802,23,18,'#eee');icon(c,'gear',1858,21,21,'#eee');
 kotlin(c,84,82);text(c,'Main.kt',114,101,'400 24px Inter','#eee');icon(c,'close',208,85,14,'#999');rect(c,68,117,162,2,'#5276eb');rect(c,59,119,1861,1,'#414245');
 ijStrip(c);
 // editor gutter and Kotlin tokens
 const cfg={font:'450 27.3px "JetBrains Mono"',cell:16.15,color:'#d0d1d5'},kw='#d5977d',pur='#cc8ec1';
 for(let i=1;i<=5;i++)text(c,String(i),103,170+(i-1)*40,'400 27px "JetBrains Mono"',i===4?'#bcbec4':'#62656b');
 c.fillStyle='#6caf78';c.beginPath();c.moveTo(138,230);c.lineTo(150,238);c.lineTo(138,246);c.closePath();c.fill();
 terminal(c,[['import',kw],' world.*'],180,170,cfg);
 terminal(c,[['fun',kw],' ',['main','#76b3f0'],'() {'],180,250,cfg);
 terminal(c,['    ',['world',pur,'italic 27.3px "JetBrains Mono"'],'.execute(',['me',pur,'italic 27.3px "JetBrains Mono"'],')'],180,290,cfg);
 terminal(c,['}'],180,330,cfg);
 text(c,'Run',81,676,'600 23px Inter','#eee');text(c,'MainKt',163,676,'400 23px Inter','#eee');icon(c,'close',248,661,12,'#888');rect(c,151,690,121,3,'#5276eb');
 rerun(c,90,723.8,'#7aba7f');
 const output={font:'400 25px "JetBrains Mono"',cell:15,color:'#ccd0d5'};
 c.save();c.beginPath();c.rect(134,710,1755,45);c.clip();terminal(c,['/Users/me/Library/Java/JavaVirtualMachines/openjdk-21.0.2/Contents/Home/bin/java -javaagent:/Applications/IntelliJ IDEA.app/Contents/lib/idea_rt.jar'],134,744,output);c.restore();
 text(c,'me  ›  src  ›  main  ›  kotlin  ›  Main.kt',24,1066,'400 21px Inter','#bcbec4');
 text(c,'4:22     LF     UTF-8     4 spaces',1586,1066,'400 21px Inter','#bcbec4');
 // While MainKt runs (until 9456) the toolbar shows rerun + a red stop square and the run
 // gutter's stop square is red; afterwards play + debug and a grey square. The editor caret is a 2 px white
 // bar with a 1 px black outline blinking 14 frames on / 14 off (on 9428–9441, 9456–9469).
 return(t)=>{const f=Math.round(t*60);if(f>=9428)terminal(c,['execution'],134,782,output);
  const running=f<9456;
  if(running){rerun(c,1534.5,33.8,'#79bd79');rect(c,1580.4,26,12,12,'#c85152');rect(c,84,762,12,12,'#c84e4f');}
  else{terminal(c,['Process finished with exit code 0'],134,858,output);
   c.fillStyle='#67b471';c.beginPath();c.moveTo(1529,23.5);c.lineTo(1540,31.25);c.lineTo(1529,39);c.closePath();c.fill();
   icon(c,'bug',1576,23,20,'#eee');rect(c,84,762,12,12,'#5d5e61');}
  if((f>=9428&&f<9442)||(f>=9456&&f<9470)){rect(c,519,262,4,36,'#000');rect(c,520,263,2,34,'#fff');}};
}
// VS Code activity-bar icons (explorer, search, source control, run & debug, extensions):
// 2 px strokes, ~#a2a2a2.
function vsActivity(c,col){
 c.save();c.strokeStyle=col;c.fillStyle=col;c.lineWidth=2;c.lineJoin='round';c.lineCap='round';
 const P=(pts,close)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));if(close)c.closePath();c.stroke();};
 // explorer: front page with dog-ear, back page up-right
 P([[25.6,87.6],[37,87.6],[43.2,94.4],[43.2,110.6],[25.6,110.6]],true);P([[36.8,88],[36.8,94.6],[43.2,94.6]]);
 P([[32.2,87.4],[32.2,80.8],[45,80.8],[50.4,86.6],[50.4,103.6],[43.4,103.6]]);
 // search
 c.beginPath();c.arc(41.4,168,9.4,0,7);c.stroke();c.lineWidth=2.3;P([[34.6,175.2],[25,185]]);c.lineWidth=2;
 // source control
 for(const[x,y]of[[30,237.6],[30,257.6],[48.3,242]]){c.beginPath();c.arc(x,y,4.3,0,7);c.stroke();}
 P([[30,242],[30,253.3]]);c.beginPath();c.moveTo(30.6,251.4);c.quadraticCurveTo(44.5,251.2,46.4,246.2);c.stroke();
 // run & debug: triangle (its lower-left hidden behind a bug)
 P([[33,322],[33,308.6],[53.2,321.4],[40.4,330.4]]);
 c.beginPath();c.ellipse(29.4,333,5,6.3,0,0,7);c.stroke();
 c.beginPath();c.arc(29.4,327.4,3.3,Math.PI,0);c.stroke();P([[24.6,329.6],[34.2,329.6]]);
 for(const sx of[-1,1]){P([[29.4+sx*5,328],[29.4+sx*7.6,326.4]]);P([[29.4+sx*5.2,332.6],[29.4+sx*8,332.6]]);P([[29.4+sx*4.4,336.8],[29.4+sx*6.8,339]]);}
 // extensions: three joined squares + one apart at the top right
 c.beginPath();c.roundRect(22.6,390.6,24.4,24,1.5);c.stroke();
 c.fillStyle='#181818';c.fillRect(36.2,389,12,12.6);
 P([[35,390.6],[35,414.6]]);P([[22.6,402.6],[47,402.6]]);
 c.beginPath();c.roundRect(40.6,384.4,12,12.2,2);c.stroke();
 c.restore();
}
function vscode(c){
 rect(c,0,0,W,H,'#181818');rect(c,76,114,1844,486,'#1f1f1f');rect(c,75,56,216,58,'#1f1f1f');
 rect(c,0,55,1920,1,'#303030');rect(c,75,56,216,2,'#007acc');rect(c,290,57,1,57,'#303030');
 rect(c,75,56,1,984,'#303030');rect(c,76,600,1844,1,'#303030');rect(c,0,1040,1920,1,'#303030');
 // titlebar search, navigation and layout icons
 // back / forward arrows
 line(c,[[650,21.8],[643.8,28],[650,34.2]],'#8c8c8c',2);line(c,[[644,28],[658,28]],'#8c8c8c',2);
 line(c,[[692.5,21.8],[698.8,28],[692.5,34.2]],'#5c5c5c',2);line(c,[[683,28],[698.5,28]],'#5c5c5c',2);
 c.fillStyle='#222';c.strokeStyle='#484848';c.lineWidth=1;c.beginPath();c.roundRect(720,9,480,37,8);c.fill();c.stroke();icon(c,'search',905,20,15,'#ddd');text(c,'me',932,35,'400 21px Inter','#eee');
 // layout toggles: primary sidebar, panel, secondary sidebar, customise
 [1718,1762,1806,1850].forEach((x,i)=>{c.strokeStyle='#d8d8d8';c.lineWidth=1.8;c.strokeRect(x,20.4,18,15.2);
  if(i===0)rect(c,x+5,20,1.4,16,'#d8d8d8');if(i===1)rect(c,x,30,18,6,'#d8d8d8');if(i===2)rect(c,x+11.6,20,1.4,16,'#d8d8d8');
  if(i===3){rect(c,x,24,18,2,'#d8d8d8');rect(c,x+6,25,2,11,'#d8d8d8');}});
 text(c,'JS',98,94,'600 19px Inter','#dcdcaa');text(c,'me.js',133,94,'500 22px Inter','#eee');icon(c,'close',253,78,15,'#eee');
 icon(c,'split',1818,77,18,'#ddd');text(c,'···',1869,88,'600 22px Inter','#ddd');
 text(c,'JS',98,141,'600 16px Inter','#dcdcaa');text(c,'me.js',126,141,'400 20px Inter','#bbb');
 // activity bar
 vsActivity(c,'#a2a2a2');
 icon(c,'user',24,886,28,'#888');icon(c,'gear',24,960,29,'#888');
 // editor text and active line
 rect(c,77,234,1704,1,'#292929');rect(c,77,276,1704,1,'#292929');rect(c,1780,235,1,41,'#292929');
 const cfg={font:'400 29px "X DejaVu Mono"',cell:16.8,color:'#d4d4d4'};
 for(let i=1;i<=3;i++)text(c,String(i),150,182+(i-1)*42,'400 29px "X DejaVu Mono"',i===3?'#ddd':'#858585');
 terminal(c,[['import','#c586c0'],' ',['{','#ffd700'],' ',['world','#9cdcfe'],', ',['me','#9cdcfe'],' ',['}','#ffd700'],' ',['from','#c586c0'],' ',["'./world.js'",'#ce9178'],';'],215,182,cfg);
 terminal(c,[['world','#9cdcfe'],'.',['execute','#dcdcaa'],['(','#ffd700'],['me','#9cdcfe'],[')','#ffd700'],';'],215,266,cfg);
 // miniature code overview at far right
 rect(c,1802,158,61,2,'#555');rect(c,1802,164,29,2,'#444');
 const tabfont='400 16.5px Inter';
 text(c,'PROBLEMS',105,638,tabfont);text(c,'OUTPUT',233,638,tabfont);text(c,'DEBUG CONSOLE',339,638,tabfont);
 text(c,'TERMINAL',522,638,'600 16.5px Inter','#eee');text(c,'PORTS',643,638,tabfont);rect(c,521,650,88,2,'#007acc');
 icon(c,'term',1532,624,17,'#eee');text(c,'zsh',1563,638,'400 18px Inter','#eee');text(c,'+',1627,640,'400 29px Inter','#ccc');
 text(c,'⌄',1668,637,'400 20px Inter','#ccc');icon(c,'split',1702,624,18,'#ccc');
 line(c,[[1743,628],[1755,628],[1754,642],[1745,642],[1743,628],[1741,625],[1757,625]],'#bbb');text(c,'···',1778,636,'600 21px Inter','#ccc');
 text(c,'⌃',1817,640,'400 21px Inter','#ccc');icon(c,'close',1856,624,15,'#ccc');
 const out={font:'400 27px "X DejaVu Mono"',cell:15.6,color:'#d4d4d4'};
 terminal(c,['me@mac me % node me.js'],105,704,out);
 // statusbar
 rect(c,0,1041,52,39,'#007acc');text(c,'›‹',16,1068,'400 23px Inter','#fff');
 icon(c,'branch',74,1052,16,'#eee');text(c,'main',98,1068,'400 20px Inter','#eee');circle(c,161,1060,6,'#ddd');
 circle(c,201,1060,7,'#ddd');text(c,'×',197,1065,'400 16px Inter','#ddd');text(c,'0',217,1068,'400 20px Inter','#ddd');
 line(c,[[246,1067],[254,1053],[263,1067],[246,1067]],'#ddd');text(c,'0',271,1068,'400 20px Inter','#ddd');
 text(c,'Ln 3, Col 19     Spaces: 2     UTF-8     LF    { } JavaScript',1332,1068,'400 19px Inter','#ddd');
 return(t)=>{const f=Math.round(t*60);if(f>=9482)terminal(c,['execution'],105,742,out);
  if(f>=9511)terminal(c,['me@mac me % '],105,780,out);
  rect(c,f>=9511?293:105,f>=9511?751:f>=9482?751:713,15.5,32,'#ccc');};
}

export function createModern(root,env,kind){
 const{ctx}=env.canvas(root);const names={ubuntu:'Ubuntu',powershell:'Windows Terminal',intellij:'IntelliJ IDEA',vscode:'Visual Studio Code'};
 const label=addLabel(root,env,names[kind]);let draw;
 const base=document.createElement('canvas');base.width=W;base.height=H;const c=base.getContext('2d');
 const background=document.createElement('canvas');background.width=W;background.height=H;
 const ready=Promise.all([label.ready,loadExecFonts(['X Cascadia Mono','X DejaVu Mono']),document.fonts.load('450 27.3px "JetBrains Mono"'),document.fonts.load('italic 27px "JetBrains Mono"'),document.fonts.load('400 48px "Ubuntu Mono"'),document.fonts.load('700 48px "Ubuntu Mono"')]).then(()=>{
  draw=({ubuntu,powershell,intellij,vscode}[kind])(c);background.getContext('2d').drawImage(base,0,0);
 });
 return{ready,render(t){if(draw)guarded(c,()=>{c.clearRect(0,0,W,H);c.drawImage(background,0,0);draw(t);});guarded(ctx,()=>ctx.drawImage(base,0,0));}};
}
