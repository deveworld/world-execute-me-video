import { createYouTube, YT_STATE } from './youtube.js';

const SOURCE_FPS = 60, SOURCE_FRAMES = 12738, DURATION = SOURCE_FRAMES / SOURCE_FPS;
const STAGE_W = 1920, HIDE_AFTER = 2500;
const $ = id => document.getElementById(id);
const player = $('player'), screen = $('screen'), iframe = $('scene-frame'), audio = $('soundtrack'), timeline = $('timeline');
const bar = $('bar'), controls = $('controls'), playButton = $('play'), status = $('status'), timeInput = $('time-input');
const resolutionSelect = $('resolution'), fpsSelect = $('fps'), hoverTime = $('hover-time'), preview = $('preview'), thumb = $('thumb');

const stored = key => { try { return localStorage.getItem(key); } catch { return null; } };
const store = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
const params = new URL(location.href).searchParams;
function choose(select, ...values) {
  for (const value of values) if (value && [...select.options].some(option => option.value === value)) { select.value = value; return; }
}
choose(resolutionSelect, params.get('res'), stored('viewer.resolution'), 'fit');
choose(fpsSelect, params.get('fps'), stored('viewer.fps'), '60');

// Frame k of the chosen rate is song time k / fps; scenes are pure functions of time, so any rate works.
const framesAt = rate => Math.ceil(SOURCE_FRAMES * rate / SOURCE_FPS - 1e-9);
let fps = Number(fpsSelect.value), lastFrame = framesAt(fps) - 1;
let stage, isReady = false, playing = false, frame = 0, rate = 1, raf = 0;
let anchorTime = 0, anchorNow = 0, audioClock = false, audioAvailable = true;
let requestedTime = null, drawing = false, lastDrawnTime = -1, starting = false, fatal = false;
let audioGeneration = 0, renderSize = [STAGE_W, 1080], downscaled = false, muted = false;
let sound = 'file', yt = null, ytWant = 'pause', ytWantAt = 0, pending = null, free = false, stalled = false, skew = 0, lastReported = NaN;
let hideTimer = 0, toastTimer = 0, overBar = false, scrubbing = false, resumeAfterScrub = false;
let pointerInput = false, lastPointerType = 'mouse', lastPointer = '';
const format = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(3).padStart(6, '0')}`;
const clampFrame = f => Math.max(0, Math.min(lastFrame, Math.round(f)));
const clockTime = () => audioClock ? audio.currentTime : anchorTime + (stalled ? 0 : (performance.now() - anchorNow) / 1000 * rate * (1 + skew));
timeline.max = String(lastFrame);

// "화면 맞춤" fills the window at its device resolution. A fixed resolution draws the stage on
// that many device pixels (1:1, like render.mjs --scale); if the window is too small it is shown fitted.
function layout() {
  const dpr = devicePixelRatio || 1, vw = player.clientWidth, vh = player.clientHeight;
  const fit = Math.min(vw, vh * 16 / 9);
  const fixed = resolutionSelect.value === 'fit' ? 0 : Number(resolutionSelect.value.split('x')[0]);
  downscaled = fixed > 0 && fixed / dpr > fit + 0.01;
  const px = Math.max(16, Math.floor((fixed && !downscaled ? fixed : fit * dpr) + 1e-6));
  const w = px / dpr, h = w * 9 / 16;
  Object.assign(screen.style, { width: `${w}px`, height: `${h}px`, left: `${Math.round((vw - w) / 2 * dpr) / dpr}px`, top: `${Math.round((vh - h) / 2 * dpr) / dpr}px` });
  iframe.style.transform = `scale(${w / STAGE_W})`;
  renderSize = [px, Math.round(px * 9 / 16)];
  const fitPx = Math.floor(fit * dpr + 1e-6), fitSize = `${fitPx} × ${Math.round(fitPx * 9 / 16)}`;
  resolutionSelect.options[0].textContent = vw > 820 ? `화면 맞춤 · ${fitSize}` : `맞춤 ${fitSize.replaceAll(' ', '')}`;
  $('scale-note').hidden = !downscaled;
  $('scale-note').value = downscaled ? `창이 작아 축소: ${renderSize[0]} × ${renderSize[1]}` : '';
  $('scale-note').title = downscaled ? `1:1로 보려면 창이 ${Math.ceil(fixed / dpr)} × ${Math.ceil(fixed * 9 / 16 / dpr)} 이상이어야 합니다. 전체 화면(F)을 써 보세요.` : '';
}
new ResizeObserver(layout).observe(player);
(function watchPixelRatio() {
  matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener('change', () => { layout(); watchPixelRatio(); }, { once: true });
})();
layout();

function setStatus(text, ms = 4500) {
  status.textContent = text;
  status.hidden = !text;
  clearTimeout(toastTimer);
  if (text && ms) toastTimer = setTimeout(() => { status.hidden = true; }, ms);
}

function updateControls() {
  const t = frame / fps;
  if (!scrubbing) timeline.value = String(frame);
  timeline.style.setProperty('--f', String(lastFrame ? frame / lastFrame : 0));
  timeline.setAttribute('aria-valuetext', `${format(t)}, 프레임 ${frame}`);
  if (document.activeElement !== timeInput) timeInput.value = format(t);
  $('frame-number').value = `프레임 ${frame.toLocaleString('ko-KR')}`;
  const label = playing ? '일시정지' : frame === lastFrame ? '처음부터 다시 재생' : '재생';
  if (playButton.getAttribute('aria-label') !== label) {
    playButton.setAttribute('aria-label', label);
    $('play-icon').setAttribute('d', playing ? 'M5 4h4v12H5ZM12 4h4v12h-4Z' : 'M6 3.5 16 10 6 16.5Z');
  }
}

// Floating bar: shown on pointer movement, touch or keys; fades after HIDE_AFTER ms of inactivity.
function holdBar() {
  const active = document.activeElement;
  return overBar || scrubbing || !isReady || (bar.contains(active) && (active.matches('select, input[type="text"]') || active.matches(':focus-visible')));
}
function hideBar() {
  if (holdBar()) { hideTimer = setTimeout(hideBar, 800); return; }
  document.body.classList.add('idle');
  preview.hidden = true;
}
function revealBar() {
  document.body.classList.remove('idle');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(hideBar, HIDE_AFTER);
}
function hideBarNow() {
  clearTimeout(hideTimer);
  if (document.activeElement && bar.contains(document.activeElement)) document.activeElement.blur();
  document.body.classList.add('idle');
}

// Idle prewarm: scenes are created before they are needed, nearest to the playhead first. While playing
// only scenes starting in the next LOOKAHEAD seconds are prepared; when paused, the whole song is.
const LOOKAHEAD = 8;
let warming = false, warmTimer = 0;
const whenIdle = window.requestIdleCallback ? fn => requestIdleCallback(fn, { timeout: 1000 }) : fn => setTimeout(fn, 100);
function scheduleWarm(delay = 0) {
  if (warmTimer || warming || fatal || !isReady) return;
  warmTimer = setTimeout(() => whenIdle(() => { warmTimer = 0; void warmNext(); }), delay);
}
async function warmNext() {
  if (warming || fatal) return;
  if (scrubbing || starting || drawing) { scheduleWarm(150); return; }
  const scenes = stage.list();
  if (scenes.every(s => s.alive)) return;
  const t = playing ? clockTime() : frame / fps;
  const cold = scenes.filter(s => !s.alive && (!playing || (s.end > t && s.start < t + LOOKAHEAD)));
  if (!cold.length) { scheduleWarm(1000); return; }
  const distance = s => t < s.start ? s.start - t : t >= s.end ? t - s.end + 1e-3 : 0;
  const next = cold.sort((a, b) => distance(a) - distance(b))[0];
  warming = true;
  try { await stage.prewarm(Math.max(next.start, Math.min(t, next.end - 1e-3))); }
  finally { warming = false; }
  scheduleWarm(playing ? 200 : 0);
}

function fail(error) {
  fatal = true;
  pause();
  controls.disabled = true;
  timeline.disabled = true;
  $('loading').hidden = false;
  $('loading').textContent = '장면을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';
  setStatus('장면 오류가 발생했습니다. 새로고침 후 다시 확인해 주세요.', 0);
  revealBar();
  console.error(error);
}

async function draw(t) {
  requestedTime = t;
  if (drawing) return;
  drawing = true;
  try {
    while (requestedTime !== null) {
      const next = requestedTime;
      requestedTime = null;
      if (next === lastDrawnTime) continue;
      await stage.renderFrame(next);
      if (stage.errors.length) throw new Error(stage.errors.at(-1).message);
      lastDrawnTime = next;
    }
  } catch (error) { fail(error); }
  finally { drawing = false; }
}

let urlTimer = 0;
function replaceTimeURL() {
  if (urlTimer) return;
  urlTimer = setTimeout(() => {
    urlTimer = 0;
    const url = new URL(location.href);
    url.searchParams.set('t', (frame / fps).toFixed(3));
    history.replaceState(null, '', url);
  }, 250);
}

function pause() {
  if (playing) frame = clampFrame(Math.floor(Math.min(clockTime(), DURATION) * fps + 1e-6));
  playing = false;
  starting = false;
  pending = null;
  free = false;
  stalled = false;
  audioGeneration++;
  audio.pause();
  if (yt) ytCommand('pause');
  cancelAnimationFrame(raf);
  if (stage && !fatal) void draw(frame / fps);
  updateControls();
}

async function seekTime(t) {
  if (!isReady || !Number.isFinite(t) || fatal) return;
  frame = clampFrame(t * fps);
  anchorTime = frame / fps;
  anchorNow = performance.now();
  skew = 0;
  if (playing && sound === 'file' && audio.readyState >= 1 && audioAvailable) audio.currentTime = anchorTime;
  if (playing && yt && audioAvailable) followYouTube(anchorTime);
  updateControls();
  replaceTimeURL();
  scheduleWarm();
  await draw(frame / fps);
}

function tick() {
  if (!playing) return;
  if (yt && audioAvailable) steer();
  const t = Math.max(0, clockTime());
  frame = clampFrame(Math.floor(t * fps + 1e-6));
  updateControls();
  void draw(frame / fps);
  if (t >= DURATION || frame === lastFrame) { pause(); replaceTimeURL(); revealBar(); return; }
  raf = requestAnimationFrame(tick);
}

async function play() {
  if (!isReady || playing || starting || fatal) return;
  if (frame === lastFrame) await seekTime(0);
  starting = true;
  const generation = ++audioGeneration;
  anchorTime = frame / fps;
  audioClock = false;
  if (sound === 'file' && audioAvailable) {
    try {
      audio.currentTime = anchorTime;
      audio.playbackRate = rate;
      await audio.play();
      if (generation !== audioGeneration) return;
      audioClock = true;
    } catch (error) {
      if (generation !== audioGeneration) return;
      if (audio.error) useYouTube();
      else {
        audioAvailable = false;
        setStatus('음원을 재생하지 못했습니다. 장면은 무음으로 재생됩니다.');
        console.warn('Audio unavailable:', error.message);
      }
    }
  }
  if (generation !== audioGeneration) return;
  starting = false;
  anchorNow = performance.now();
  skew = 0;
  playing = true;
  if (yt && audioAvailable) followYouTube(anchorTime);
  updateControls();
  scheduleWarm();
  raf = requestAnimationFrame(tick);
}

const togglePlay = () => playing || starting ? pause() : void play();

function step(delta) {
  pause();
  void seekTime((frame + delta) / fps);
}

function goToInput() {
  const text = timeInput.value.trim();
  const match = /^(?:(\d+):([0-5]?\d(?:\.\d{1,3})?)|(\d+(?:\.\d{1,3})?))$/.exec(text);
  if (!match) { timeInput.setCustomValidity('0:16.000 또는 16처럼 시간을 입력해 주세요.'); timeInput.reportValidity(); return; }
  timeInput.setCustomValidity('');
  pause();
  void seekTime(match[3] !== undefined ? Number(match[3]) : Number(match[1]) * 60 + Number(match[2]));
  timeInput.blur();
}

function toggleMute() {
  muted = !muted;
  audio.muted = muted;
  if (yt) muted ? yt.mute() : yt.unMute();
  $('mute').setAttribute('aria-pressed', String(muted));
  $('mute').setAttribute('aria-label', muted ? '음소거 해제' : '음소거');
  $('mute-mark').setAttribute('display', muted ? 'inline' : 'none');
}

// Sound: the soundtrack `npm run build` extracts from the original video when it exists (local builds), otherwise
// Mili's official upload on YouTube (the published site ships no audio file). ?audio=youtube forces YouTube.
// The iframe API reports YouTube's time only every few hundred ms, so the clock keeps running on its own and is
// steered toward it: held while YouTube starts, seeks or buffers, then sped up or slowed by at most 5%. If YouTube
// does not start (autoplay blocked, offline), the scenes play on silently and YouTube is brought to them later.
function useYouTube() {
  if (sound === 'youtube') return;
  sound = 'youtube';
  audioClock = false;
  audio.removeAttribute('src');
  $('yt').hidden = false;
  $('youtube').hidden = false;
  setYouTubeShown(stored('viewer.youtube') !== 'hidden');
  createYouTube($('yt-player'), { onState: onYouTubeState }).then(player => {
    yt = player;
    if (muted) yt.mute();
    yt.setPlaybackRate(rate);
    if (playing) followYouTube(clockTime());
  }, error => {
    audioAvailable = false;
    $('yt').hidden = true;
    $('youtube').hidden = true;
    setStatus('YouTube 음원을 불러오지 못했습니다. 장면은 무음으로 재생됩니다.');
    console.warn('YouTube unavailable:', error.message);
  });
}
function ytCommand(want) {
  ytWant = want;
  ytWantAt = performance.now();
  if (want === 'play') yt.playVideo(); else yt.pauseVideo();
}
function followYouTube(t) {
  yt.setPlaybackRate(rate);
  yt.seekTo(t, true);
  ytCommand('play');
  anchorTime = t;
  anchorNow = performance.now();
  stalled = true;
  free = false;
  pending = { t, since: anchorNow, reseeked: false };
}
function steer() {
  const now = performance.now(), state = yt.getPlayerState(), reported = yt.getCurrentTime();
  const resume = () => { pending = null; stalled = false; anchorTime = reported; anchorNow = now; skew = 0; lastReported = reported; };
  if (pending) {
    const waited = now - pending.since;
    if (state === YT_STATE.PLAYING && (Math.abs(reported - pending.t) < 0.5 || waited > 4000)) resume();
    else if (state === YT_STATE.PLAYING && !pending.reseeked) { pending.reseeked = true; yt.seekTo(pending.t, true); }
    else if (state !== YT_STATE.PLAYING && waited > (state === YT_STATE.BUFFERING ? 10000 : 3000)) {
      pending = null;
      free = true;
      stalled = false;
      anchorNow = now;
      setStatus('YouTube 소리가 시작되지 않았습니다. 오른쪽 위 YouTube 화면을 누르면 소리가 함께 나옵니다.', 8000);
    }
    return;
  }
  if (free) {
    if (state === YT_STATE.PLAYING) followYouTube(clockTime());
    return;
  }
  if (state === YT_STATE.BUFFERING) {
    if (!stalled) { anchorTime = clockTime(); anchorNow = now; stalled = true; }
    return;
  }
  if (state !== YT_STATE.PLAYING) return;
  if (stalled) { resume(); return; }
  if (reported === lastReported) return;
  lastReported = reported;
  const t = clockTime(), drift = reported - t;
  anchorNow = now;
  if (Math.abs(drift) > 0.3) { anchorTime = reported; skew = 0; }
  else { anchorTime = t; skew = Math.max(-0.05, Math.min(0.05, drift * 0.5)); }
}
// Play and pause pressed on the YouTube player itself are followed. State changes that echo our own
// commands are ignored.
function onYouTubeState(state) {
  const echo = performance.now() - ytWantAt < 1000;
  if (state === YT_STATE.PLAYING && ytWant === 'pause') { if (echo) yt.pauseVideo(); else if (isReady && !fatal) void play(); }
  else if (state === YT_STATE.PAUSED && ytWant === 'play' && !echo && playing) pause();
  else if (state === YT_STATE.ENDED && playing) { frame = lastFrame; pause(); void seekTime(lastFrame / fps); revealBar(); }
}
// YouTube asks for its player to stay visible; hiding it is left to the viewer.
function setYouTubeShown(shown) {
  $('yt').classList.toggle('tucked', !shown);
  $('youtube').setAttribute('aria-pressed', String(shown));
  $('youtube').setAttribute('aria-label', shown ? 'YouTube 플레이어 숨기기' : 'YouTube 플레이어 보이기');
}
function toggleYouTube() {
  if (sound !== 'youtube') return;
  const shown = $('yt').classList.contains('tucked');
  setYouTubeShown(shown);
  store('viewer.youtube', shown ? 'shown' : 'hidden');
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { setStatus('이 브라우저에서는 전체 화면을 사용할 수 없습니다.'); }
}

function forgetURLSetting(name) {
  if (!params.has(name)) return;
  const url = new URL(location.href);
  url.searchParams.delete(name);
  history.replaceState(null, '', url);
}

playButton.addEventListener('click', togglePlay);
$('prev-frame').addEventListener('click', () => step(-1));
$('next-frame').addEventListener('click', () => step(1));
timeline.addEventListener('input', () => { void seekTime(Number(timeline.value) / fps); });
timeline.addEventListener('pointerdown', () => {
  scrubbing = true;
  $('seek').classList.add('scrubbing');
  resumeAfterScrub = playing || starting;
  if (resumeAfterScrub) pause();
});
addEventListener('pointerup', endScrub);
addEventListener('pointercancel', endScrub);
function endScrub() {
  if (!scrubbing) return;
  scrubbing = false;
  $('seek').classList.remove('scrubbing');
  if (!overSeek) preview.hidden = true;
  updateControls();
  if (resumeAfterScrub) void play();
  resumeAfterScrub = false;
}
// Seek-bar preview: thumbnails rendered from the scene code at build time (thumbs.mjs), 4 per second.
let thumbs = null, overSeek = false;
const sheetImages = [];
async function loadThumbs() {
  try {
    const response = await fetch('media/thumbs/index.json');
    if (!response.ok) return;
    thumbs = await response.json();
    thumbs.sheets = thumbs.sheets.map(src => new URL(src, response.url).href);
    for (const src of thumbs.sheets) { const image = new Image(); image.src = src; sheetImages.push(image); }
  } catch { thumbs = null; }
}
function showPreview(clientX) {
  if (timeline.disabled) return;
  const box = $('seek').getBoundingClientRect(), track = timeline.getBoundingClientRect();
  const f = Math.min(1, Math.max(0, (clientX - track.left - 6) / (track.width - 12)));
  const t = Math.round(f * lastFrame) / fps;
  hoverTime.value = format(t);
  thumb.hidden = !thumbs;
  preview.hidden = false;
  if (thumbs) {
    const i = Math.min(thumbs.count - 1, Math.floor(t * thumbs.fps + 1e-6)), cell = i % (thumbs.cols * thumbs.rows);
    const w = thumb.clientWidth, h = thumb.clientHeight;
    thumb.style.backgroundImage = `url(${thumbs.sheets[Math.floor(i / (thumbs.cols * thumbs.rows))]})`;
    thumb.style.backgroundSize = `${thumbs.cols * w}px ${thumbs.rows * h}px`;
    thumb.style.backgroundPosition = `${-(cell % thumbs.cols) * w}px ${-Math.floor(cell / thumbs.cols) * h}px`;
  }
  const half = preview.offsetWidth / 2 + 2;
  preview.style.left = `${Math.min(box.width - half, Math.max(half, clientX - box.left))}px`;
}
$('seek').addEventListener('pointerenter', () => { overSeek = true; });
$('seek').addEventListener('pointermove', event => showPreview(event.clientX));
$('seek').addEventListener('pointerleave', () => { overSeek = false; if (!scrubbing) preview.hidden = true; });
document.addEventListener('pointermove', event => { if (scrubbing) showPreview(event.clientX); });
timeInput.addEventListener('input', () => timeInput.setCustomValidity(''));
timeInput.addEventListener('focus', () => timeInput.select());
timeInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') goToInput();
  else if (event.key === 'Escape') { timeInput.setCustomValidity(''); timeInput.blur(); updateControls(); }
});
timeInput.addEventListener('blur', updateControls);
$('speed').addEventListener('change', () => {
  anchorTime = playing ? clockTime() : frame / fps;
  anchorNow = performance.now();
  rate = Number($('speed').value);
  audio.playbackRate = rate;
  if (yt) yt.setPlaybackRate(rate);
});
fpsSelect.addEventListener('change', () => {
  const t = playing ? Math.max(0, clockTime()) : frame / fps;
  fps = Number(fpsSelect.value);
  lastFrame = framesAt(fps) - 1;
  timeline.max = String(lastFrame);
  frame = clampFrame(Math.floor(t * fps + 1e-6));
  store('viewer.fps', fpsSelect.value);
  forgetURLSetting('fps');
  updateControls();
  if (!playing) { replaceTimeURL(); void draw(frame / fps); }
});
resolutionSelect.addEventListener('change', () => {
  store('viewer.resolution', resolutionSelect.value);
  forgetURLSetting('res');
  layout();
});
for (const select of bar.querySelectorAll('select')) select.addEventListener('change', () => { if (pointerInput) select.blur(); });
$('mute').addEventListener('click', toggleMute);
$('youtube').addEventListener('click', toggleYouTube);
$('fullscreen').addEventListener('click', () => void toggleFullscreen());
if (!document.fullscreenEnabled) $('fullscreen').hidden = true;
document.addEventListener('fullscreenchange', () => {
  $('fullscreen').setAttribute('aria-label', document.fullscreenElement ? '전체 화면 종료' : '전체 화면');
});
// A button clicked with the mouse gives focus back, so Space keeps meaning play/pause.
bar.addEventListener('click', event => { const button = event.target.closest('button'); if (button && event.detail > 0) button.blur(); });

audio.addEventListener('ended', () => { if (playing) { frame = lastFrame; pause(); void seekTime(lastFrame / fps); revealBar(); } });
audio.addEventListener('error', () => {
  if (sound !== 'file') return;
  anchorTime = clockTime();
  anchorNow = performance.now();
  audioClock = false;
  useYouTube();
});
if (params.get('audio') === 'youtube') useYouTube();
else audio.src = 'media/soundtrack.m4a';

document.addEventListener('pointermove', event => {
  const at = `${event.clientX},${event.clientY}`;
  if (at === lastPointer) return;
  lastPointer = at;
  if (event.pointerType === 'mouse') revealBar();
});
document.addEventListener('pointerdown', event => {
  pointerInput = true;
  lastPointerType = event.pointerType;
  if (event.pointerType === 'mouse' || bar.contains(event.target)) revealBar();
}, true);
document.addEventListener('keydown', () => { pointerInput = false; }, true);
bar.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') overBar = true; });
bar.addEventListener('pointerleave', () => { overBar = false; });
bar.addEventListener('focusin', revealBar);
player.addEventListener('click', event => {
  if (bar.contains(event.target) || !isReady || fatal) return;
  if (lastPointerType === 'mouse') { togglePlay(); revealBar(); }
  else if (document.body.classList.contains('idle')) revealBar();
  else hideBarNow();
});
player.addEventListener('dblclick', event => { if (!bar.contains(event.target) && lastPointerType === 'mouse') void toggleFullscreen(); });

document.addEventListener('keydown', event => {
  if (!isReady || event.altKey || event.ctrlKey || event.metaKey) return;
  const target = event.target;
  if (target.closest?.('input[type="text"], select, textarea, [contenteditable="true"]')) return;
  const key = event.key.toLowerCase();
  if (event.code === 'Space' || key === 'k') {
    if (event.code === 'Space' && target.closest?.('button')) return;
    event.preventDefault(); togglePlay();
  } else if (event.key === ',') { event.preventDefault(); step(-1); }
  else if (event.key === '.') { event.preventDefault(); step(1); }
  else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && target !== timeline) {
    event.preventDefault(); pause(); void seekTime(frame / fps + (event.key === 'ArrowLeft' ? -5 : 5));
  } else if (key === 'm') toggleMute();
  else if (key === 'y') toggleYouTube();
  else if (key === 'f') void toggleFullscreen();
  else if (event.key !== 'Tab' && target !== timeline) return;
  revealBar();
});

revealBar();
const ready = new Promise((resolve, reject) => {
  async function initialize() {
    try {
      stage = iframe.contentWindow.__stage;
      if (!stage) throw new Error('Stage runtime did not load');
      await stage.ready;
      if (stage.errors.length || !stage.list().length) throw new Error('Scene modules did not load');
      isReady = true;
      const initial = Number(params.get('t') || 0);
      await seekTime(Number.isFinite(initial) ? initial : 0);
      if (fatal) throw new Error('Initial scene failed');
      $('loading').hidden = true;
      controls.disabled = false;
      timeline.disabled = false;
      revealBar();
      scheduleWarm(300);
      void loadThumbs();
      resolve();
    } catch (error) { fail(error); reject(error); }
  }
  if (iframe.contentDocument?.readyState === 'complete' && iframe.contentWindow.__stage) void initialize();
  else iframe.addEventListener('load', initialize, { once: true });
});
ready.catch(() => {});
window.__player = {
  ready, seek: seekTime, play, pause,
  get state() {
    return { ready: isReady, playing, frame, fps, lastFrame, time: frame / fps, lastDrawnTime, drawing, rate, audioClock, audioAvailable, fatal, sound, youtube: yt?.getPlayerState() ?? null, stalled, free,
      resolution: resolutionSelect.value, renderSize: [...renderSize], downscaled, barVisible: !document.body.classList.contains('idle') };
  },
};
