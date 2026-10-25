// Rosette geometry (gzipped JSON).
const response=await fetch(new URL("./rosette-observations.json.gz",import.meta.url));
if(!response.ok)throw Error("Vector geometry: HTTP "+response.status);
export const ROSETTE_GEOMETRY=await new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).json();
