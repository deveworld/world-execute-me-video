// 148.758–149.692 · LISP EVALQUOTE on green-bar tractor-feed paper.
import {litPaper,mono,paperHoles} from './lib/paper.js';
import {addLabel} from './lib/label.js';
import {guarded} from './lib/ctx2d.js';
const F=f=>(f-.5)/60;
export default {
 id:'execution/ibm7090',start:F(8926),end:F(8982),
 fonts:['400 40.7px "Nimbus Mono PS"'],
 create(root,env){
  const {ctx}=env.canvas(root),label=addLabel(root,env,'IBM 7090');
  const paper=litPaper(env,'lisp');
  const flat=document.createElement('canvas');flat.width=1920;flat.height=1080;
  const c=flat.getContext('2d');c.fillStyle='#020202';c.fillRect(0,0,1920,1080);c.drawImage(paper,0,0);
  paperHoles(c,528,56,116,18.3,10);
  c.strokeStyle='rgba(38,39,34,.24)';c.lineWidth=1;c.setLineDash([3,5]);c.beginPath();c.moveTo(586,0);c.lineTo(586,1080);c.stroke();
  mono(c,'FUNCTION   EVALQUOTE   HAS BEEN ENTERED, ARGUMENTS',666,434,40.7,23.25,'#0d100c');
  mono(c,'EXECUTE',666,473,40.7,23.25,'#10130f');
  mono(c,'(WORLD ME)',666,550,40.7,23.25,'#141611');
  mono(c,'END OF EVALQUOTE, VALUE IS ..',666,667,40.7,23.25,'#151913');
  return{ready:label.ready,render(t){guarded(ctx,()=>{ctx.drawImage(flat,0,0);if(t>=F(8928))mono(ctx,'EXECUTION',666,705,40.7,23.25,'#151913');});}};
 },
};
