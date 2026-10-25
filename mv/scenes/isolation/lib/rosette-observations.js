// Losslessly compressed vector paths and numeric observations; no raster or video.
const response=await fetch(new URL("./rosette-observations.json.gz",import.meta.url));
if(!response.ok)throw Error("Vector geometry: HTTP "+response.status);
export const ROSETTE_GEOMETRY=await new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).json();
