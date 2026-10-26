const LINES=['Then maybe',"Then maybe you won't leave me so"];
// Word cues control the start, cadence, and short cursor hold after each word.
const WORDS=[
  [0,0,4,122.05,3,8], [0,5,5,122.50,3.5,8],
  [1,0,4,122.90,3.4,9], [1,5,5,123.2333,3.5,13],
  [1,11,3,123.8333,3,10], [1,15,5,124.10,2,6],
  [1,21,5,124.3333,2,6], [1,27,2,124.5667,4,6],
  [1,30,2,124.7333,4,16],
];

export function dialogueAt(t) {
  const counts=[0,0];
  let active=null,age=0,finished=0;
  for(const word of WORDS) {
    const [line,offset,n,start,step]=word;
    const frames=(t-start)*60;
    if(frames<-.001) break;
    const typed=Math.min(n,1+Math.floor((frames+.001)/step));
    counts[line]=offset+typed;
    active=word;age=frames;finished=(n-1)*step;
  }
  let cursor=-1;
  if(active) {
    const [line,,,,,hold]=active;
    const last=active===WORDS[WORDS.length-1];
    if(age<finished+hold || (last && Math.floor((age-finished-hold)/14)%2===1)) cursor=line;
  }
  return {counts,cursor};
}

export function drawDialogue(ctx,{counts,cursor}) {
  ctx.font='400 48px "Press Start 2P"';
  ctx.textBaseline='top';
  for(let line=0;line<2;line++) {
    const y=804+line*72;
    for(let i=0;i<counts[line];i++) {
      ctx.fillStyle=line===1 && i>=11 && i<14 ? '#f7b28f' : '#f2effb';
      ctx.fillText(LINES[line][i],151+i*48,y);
    }
    if(cursor===line) {
      ctx.fillStyle='#ccc8f1';
      ctx.fillRect(151+48*counts[line]+.5,y,42,42);
    }
  }
}
