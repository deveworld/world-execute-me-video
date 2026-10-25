// Particle comet tails: per frame and per flying dot (same order as gender_tracks.json), the dot's
// previous positions traced backwards through the source's optical flow (offsets in half pixels).
// Numeric observations only; no raster or video.
const response=await fetch(new URL("./gender-tails.json.gz",import.meta.url));
if(!response.ok)throw Error("Gender tails: HTTP "+response.status);
export const GENDER_TAILS=await new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).json();
