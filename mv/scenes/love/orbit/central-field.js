// Central field of the collision event (gzipped JSON).
const response=await fetch(new URL("./central-field.json.gz",import.meta.url));
if(!response.ok)throw Error("Vector geometry: HTTP "+response.status);
export const CENTRAL_FIELD=await new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).json();
