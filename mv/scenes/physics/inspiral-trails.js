// Inspiral trail spirals (gzipped JSON).
const response=await fetch(new URL("./inspiral-trails.json.gz",import.meta.url));
if(!response.ok)throw Error("Vector geometry: HTTP "+response.status);
export const INSPIRAL_TRAILS=await new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).json();
