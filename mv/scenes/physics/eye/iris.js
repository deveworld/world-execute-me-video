// Code vector iris fields with a radial pupil morph; no raster assets.
import { IRIS_FIELDS } from './field.js';
export const IRIS_R=246;
export const IRIS_CANVAS={S:500,C:250};
export const PALETTES={lav:{ruff:[205,203,228]},white:{ruff:[240,240,250]}};
function fieldCanvas(data){
 const cv=document.createElement('canvas');cv.width=cv.height=500;const c=cv.getContext('2d');
 c.fillStyle='rgb(8,7,14)';c.beginPath();c.arc(250,250,246,0,Math.PI*2);c.fill();
 c.lineJoin='round';c.lineWidth=.40;
 // Built as one SVG path string: Path2D.closePath() is quadratic in Chrome (3 s for these ~100k subpaths), the parsed path is pixel-identical.
 for(const [color,paths] of data){let d='';for(const pts of paths){d+=`M${pts[0]+.5} ${pts[1]+.5}`;for(let i=2;i<pts.length;i+=2)d+=`L${pts[i]+.5} ${pts[i+1]+.5}`;d+='Z';}const p=new Path2D(d);c.fillStyle=c.strokeStyle=`rgb(${color.join(',')})`;c.fill(p,'evenodd');c.stroke(p);}
 return cv;
}
export function makeIrisModel(){
 const cv=document.createElement('canvas');cv.width=cv.height=500;
 const gl=cv.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false});
 const program=gl.createProgram();
 const compile=(type,code)=>{const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
 gl.attachShader(program,compile(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=(p+1.)*.5;gl_Position=vec4(p,0.,1.);}'));
 gl.attachShader(program,compile(gl.FRAGMENT_SHADER,'precision highp float;varying vec2 uv;uniform sampler2D lav;uniform sampler2D white;uniform float pupil;uniform float whiteness;uniform float contrast;uniform vec3 gain;uniform vec3 offs;void main(){vec2 p=(uv-.5)*500.;float r=length(p);float canonical=64.5+(r-pupil)*(246.-64.5)/(246.-pupil);vec2 sampleUV=.5+p/max(r,.001)*canonical/500.;vec4 color=mix(texture2D(lav,sampleUV),texture2D(white,sampleUV),whiteness);color.rgb=max(vec3(0.),(color.rgb-vec3(.25))*contrast+vec3(.25));color.rgb=clamp(color.rgb*gain+offs,0.,1.);if(r>246.)color=vec4(0.);gl_FragColor=color;}'));
 gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 IRIS_FIELDS.forEach((data,i)=>{gl.activeTexture(gl.TEXTURE0+i);const tx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tx);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,fieldCanvas(data));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(program,i?'white':'lav'),i);});
 return {cv,gl,gain:gl.getUniformLocation(program,'gain'),offs:gl.getUniformLocation(program,'offs'),pupil:gl.getUniformLocation(program,'pupil'),whiteness:gl.getUniformLocation(program,'whiteness'),contrast:gl.getUniformLocation(program,'contrast')};
}
export function renderOuter(){const cv=document.createElement('canvas');cv.width=cv.height=500;return cv;}
export function drawInner(g,model,cx,cy,rp,w,opts={}){
 const {gl}=model;gl.uniform1f(model.pupil,rp);gl.uniform1f(model.whiteness,w);gl.uniform1f(model.contrast,opts.contrast??1);const gn=opts.gain??[1,1,1],of=opts.offset??[0,0,0];gl.uniform3f(model.gain,gn[0],gn[1],gn[2]);gl.uniform3f(model.offs,of[0]/255,of[1]/255,of[2]/255);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);g.drawImage(model.cv,cx-250,cy-250);
 if(!opts.noPupil)drawPupil(g,cx,cy,rp,w>.5?PALETTES.white.ruff:PALETTES.lav.ruff);
}
export function drawPupil(g,cx,cy,rp,ruff=PALETTES.lav.ruff){
  g.strokeStyle=`rgba(${ruff.join(',')},.78)`;g.lineWidth=.65;g.beginPath();
  const n=Math.round(rp*2.5);
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,c=Math.cos(a),s=Math.sin(a),len=3.7+1.7*Math.sin(i*2.399);g.moveTo(cx+(rp-.3)*c,cy+(rp-.3)*s);g.lineTo(cx+(rp+len)*c,cy+(rp+len)*s);}
  g.stroke();g.fillStyle='rgb(8,7,12)';g.beginPath();g.arc(cx,cy,rp,0,Math.PI*2);g.fill();
  g.strokeStyle='rgba(238,234,255,.85)';g.lineWidth=.8;g.beginPath();g.arc(cx,cy,rp+.4,0,Math.PI*2);g.stroke();
}
