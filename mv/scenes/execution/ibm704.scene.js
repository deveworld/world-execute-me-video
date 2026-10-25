// 147.780–148.758 · FORTRAN punch card and a line-printer's EXECUTION.
import {litPaper,mono,paperHoles} from './lib/paper.js';
import {addLabel} from './lib/label.js';
import {guarded} from './lib/ctx2d.js';
const F=f=>(f-.5)/60;
const HOLES=[
 [135,[6,7,11,13,14,22,25,26]], [177,[8,9,19,20,21,24]],
 [219,[12,15,16,17,18,23]], [261,[7]], [345,[6,8,9,14,16,21,23]],
 [387,[15,17,22,24,26]], [429,[11,13,25]], [471,[18,19]],
 [513,[12]], [555,[17,23,26]], [597,[20]],
];
export default {
 id:'execution/ibm704',start:147.78,end:F(8926),
 fonts:['400 56.667px "Courier Prime"','400 12.5px "Liberation Sans"'],
 create(root,env) {
  const {ctx}=env.canvas(root), label=addLabel(root,env,'IBM 704');
  const card=litPaper(env,'card'),paper=litPaper(env,'print');
  const flat=document.createElement('canvas');flat.width=1920;flat.height=1080;
  const c=flat.getContext('2d');c.fillStyle='#020202';c.fillRect(0,0,1920,1080);c.drawImage(card,0,0);
  c.font='400 12.4px "Liberation Sans"';c.textAlign='center';c.fillStyle='#11120d';
  for(let row=0;row<10;row++) for(let j=0;j<80;j++) c.fillText(String(row),372+j*14.62,234+row*42);
  c.font='400 6.7px "Liberation Sans"';
  for(let j=0;j<80;j++) {c.fillText(String(j+1),372+j*14.62,253);c.fillText(String(j+1),372+j*14.62,632);}
  c.fillStyle='#030401';
  for(const[y,cols]of HOLES)for(const j of cols){c.fillRect(367.3+j*14.62,y,9.4,20.7);}
  // The small interpreter line is a 5x7 dot matrix (single-dot strokes, '(' ')' printed as '<' '>',
  // ',' as a short slash, as on the original card).
  const M57={C:'01110100011000010000100001000101110',A:'01110100011000110001111111000110001',L:'10000100001000010000100001000011111',
   E:'11111100001000011110100001000011111',X:'10001100010101000100010101000110001',U:'10001100011000110001100011000101110',
   T:'11111001000010000100001000010000100','(':'00010001000100010000010000010000010',W:'10001100011000110101101011010101010',
   O:'01110100011000110001100011000101110',R:'11110100011000111110101001001010001',D:'11100100101000110001100011001011100',
   ',':'00000000000000000000000100010001000',M:'10001110111010110101100011000110001',')':'01000001000001000001000100010001000'};
  const text='CALL EXECUT(WORLD,ME)';
  for(let i=0;i<text.length;i++){
   const g=M57[text[i]];if(!g)continue;
   for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(g[y*5+x]==='1'){c.beginPath();c.arc(455.6+i*14.62+x*2.1,111.2+y*1.98,.8,0,7);c.fill();}
  }
  c.drawImage(paper,0,0);paperHoles(c,644,706,168,26.8,3);
  return {ready:label.ready,render(t){guarded(ctx,()=>{ctx.drawImage(flat,0,0);if(t>=F(8868))mono(ctx,'EXECUTION',812,831,56.667,33.389,'#25231d',false,.55,'Courier Prime');});}};
 },
};
