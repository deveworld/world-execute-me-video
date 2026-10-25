// Integrate the rotating laminate in floating point, then quantise once.
// Canvas lighter blending quantised every low-alpha shutter sample and produced bands.
export function cardShutter(){
 const canvas=document.createElement('canvas');canvas.width=750;canvas.height=900;
 const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false});
 const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
 const p=gl.createProgram();
 gl.attachShader(p,shader(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=(p+1.)*.5;gl_Position=vec4(p,0.,1.);}'));
 gl.attachShader(p,shader(gl.FRAGMENT_SHADER,`precision highp float;
 varying vec2 uv;uniform sampler2D front;uniform sampler2D back;
 uniform float poses[49];uniform float roll;uniform float dx;uniform int samples;
 void main(){
  vec2 xy=vec2(900.+uv.x*750.,150.+(1.-uv.y)*900.)-vec2(1250.+dx,220.);
  float c=cos(roll),s=sin(roll);xy=vec2(c*xy.x+s*xy.y,-s*xy.x+c*xy.y);
  vec3 rgb=vec3(0.);float alpha=0.;
  for(int i=0;i<49;i++){
   if(i>=samples)break;
   float k=poses[i];vec2 at=vec2(xy.x/max(.001,abs(k))+250.,xy.y+35.);
   if(at.x<0.||at.x>500.||at.y<0.||at.y>790.)continue;
   vec2 q=vec2(at.x/500.,1.-at.y/790.);
   vec4 col=k>=0.?texture2D(front,q):texture2D(back,q);
   // Lambert-like falloff: a face turned away from the camera/light reads darker.
   col.rgb*=.55+.45*abs(k);
   rgb+=col.rgb*col.a;alpha+=col.a;
  }
  gl_FragColor=alpha>0.?vec4(rgb/alpha,alpha/float(samples)):vec4(0.);
 }`));
 gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);
 const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(p,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 const textures=[0,1].map(i=>{gl.activeTexture(gl.TEXTURE0+i);const tx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tx);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(p,i?'back':'front'),i);return tx;});
 const u=Object.fromEntries(['poses','roll','dx','samples'].map(n=>[n,gl.getUniformLocation(p,n)]));
 return {canvas,render(front,back,poses,z,dx){
  gl.useProgram(p);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  [front,back].forEach((cv,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,textures[i]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,cv);});
  const a=new Float32Array(49);a.set(poses);gl.uniform1fv(u.poses,a);gl.uniform1i(u.samples,poses.length);gl.uniform1f(u.roll,z*Math.PI/180);gl.uniform1f(u.dx,dx);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 },destroy(){gl.getExtension('WEBGL_lose_context')?.loseContext();}};
}
