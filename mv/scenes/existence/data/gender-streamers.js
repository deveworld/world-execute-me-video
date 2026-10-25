// Vector paths and per-frame values for the streamers (gzipped JSON).
const response=await fetch(new URL("./gender-streamers.json.gz",import.meta.url));
if(!response.ok)throw Error("Vector geometry: HTTP "+response.status);
export const GENDER_STREAMERS=await new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).json();
