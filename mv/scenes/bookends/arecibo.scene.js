import {createArecibo,background} from './lib/arecibo.js';
export default{
 id:'bookends/arecibo',start:22.3583333333,end:29.23,
 fonts:['840 96px "Doto"'],
 async create(root,env){const{ctx}=env.canvas(root);const ar=createArecibo(env,{particles:true});return{render(t){background(ctx);ar.draw(ctx,t);}};}
};
