import {createModern} from './lib/modern.js';
const F=f=>(f-.5)/60;
export default {id:'execution/vscode',start:F(9480),end:F(9536),create:(root,env)=>createModern(root,env,'vscode')};
