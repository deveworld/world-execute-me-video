import {createModern} from './lib/modern.js';
const F=f=>(f-.5)/60;
export default {id:'execution/ubuntu',start:F(9314),end:F(9370),create:(root,env)=>createModern(root,env,'ubuntu')};
