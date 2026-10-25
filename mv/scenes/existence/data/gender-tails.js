// Particle comet tails: per frame and per flying dot (same order as gender_tracks.json), the dot's
// previous positions along the source's optical flow (offsets in half pixels).
const response=await fetch(new URL("./gender-tails.json.gz",import.meta.url));
if(!response.ok)throw Error("Gender tails: HTTP "+response.status);
export const GENDER_TAILS=await new Response(response.body.pipeThrough(new DecompressionStream("gzip"))).json();
