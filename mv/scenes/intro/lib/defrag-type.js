// Text is rasterized from the font at its design pixel size before enlargement.
export function pixelText(text,size=22,weight=200,family='Roboto Condensed') {
  const canvas=new OffscreenCanvas(8,size*2);
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.font=weight+' '+size+'px "'+family+'"';
  canvas.width=Math.ceil(ctx.measureText(text).width)+8;
  canvas.height=size*2;
  ctx.font=weight+' '+size+'px "'+family+'"';
  ctx.fillStyle='white';
  ctx.fillText(text,2,size);
  const image=ctx.getImageData(0,0,canvas.width,canvas.height);
  let x0=canvas.width,y0=canvas.height,x1=0,y1=0;
  for(let y=0;y<canvas.height;y++) for(let x=0;x<canvas.width;x++) if(image.data[(y*canvas.width+x)*4+3]>110) {
    x0=Math.min(x0,x);x1=Math.max(x1,x+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);
  }
  const cells=[];
  for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) if(image.data[(y*canvas.width+x)*4+3]>110) cells.push([x-x0,y-y0]);
  return {cells,width:x1-x0,height:y1-y0};
}

export function drawPixelText(ctx,text,x,y,width,height,color) {
  ctx.fillStyle=color;
  const sx=width/text.width,sy=height/text.height;
  ctx.beginPath();
  for(const [cx,cy] of text.cells) ctx.rect(x+cx*sx,y+cy*sy,sx,sy);
  ctx.fill();
}
