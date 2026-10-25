import {createModern} from './lib/modern.js';
const F=f=>(f-.5)/60;
export default {id:'execution/powershell',start:F(9370),end:F(9426),create:(root,env)=>createModern(root,env,'powershell')};
