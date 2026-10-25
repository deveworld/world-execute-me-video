import {createArecibo,background} from './lib/arecibo.js';
export default{
 id:'bookends/arecibo',start:22.3583333333,end:29.23,
 async create(root,env){const{ctx}=env.canvas(root);const ar=createArecibo(env);return{render(t){background(ctx);ar.draw(ctx,t);}};}
};
