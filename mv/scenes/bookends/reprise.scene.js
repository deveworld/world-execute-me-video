import {createArecibo,background} from './lib/arecibo.js';
export default{
 id:'bookends/reprise',start:193.6,end:206.98,
 async create(root,env){const{ctx}=env.canvas(root);const ar=createArecibo(env);return{render(t){background(ctx);ar.draw(ctx,t,{reprise:true});}};}
};
