// Mili's official upload as the sound source, through the YouTube iframe API. Its audio lines up with the
// soundtrack `npm run build` extracts from the original video, so video time is song time.
export const VIDEO_ID = 'ESx_hy1n7HA';
export const YT_STATE = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };

let api = null;
function loadAPI() {
  api ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) { resolve(window.YT); return; }
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => reject(new Error('the YouTube iframe API did not load'));
    document.head.append(script);
  });
  return api;
}

// Replaces `element` with the YouTube player; resolves once it accepts commands.
export async function createYouTube(element, { onState }) {
  const YT = await loadAPI();
  return new Promise((resolve, reject) => {
    let ready = false;
    const player = new YT.Player(element, {
      videoId: VIDEO_ID, host: 'https://www.youtube-nocookie.com', width: '100%', height: '100%',
      playerVars: { controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, playsinline: 1, rel: 0, origin: location.origin },
      events: {
        onReady: () => { ready = true; resolve(player); },
        onStateChange: event => onState(event.data),
        onError: event => { if (!ready) reject(new Error(`YouTube player error ${event.data}`)); else console.warn('YouTube player error', event.data); },
      },
    });
  });
}
