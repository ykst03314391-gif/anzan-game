'use strict';

let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

const _seCache = {};
async function playSe(name) {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    const path = `sounds/se/${name}.mp3`;
    if (!_seCache[path]) {
      const res = await fetch(path);
      if (!res.ok) return;
      _seCache[path] = await ctx.decodeAudioData(await res.arrayBuffer());
    }
    const src = ctx.createBufferSource();
    src.buffer = _seCache[path];
    src.connect(ctx.destination);
    src.start();
  } catch {}
}

let _bgmNode = null, _bgmGain = null;
const _bgmCache = {};

async function playBgm(name) {
  stopBgm();
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    const path = `sounds/bgm/${name}.mp3`;
    if (!_bgmCache[path]) {
      const res = await fetch(path);
      if (!res.ok) return;
      _bgmCache[path] = await ctx.decodeAudioData(await res.arrayBuffer());
    }
    _bgmGain = ctx.createGain();
    _bgmGain.gain.value = 0.5;
    _bgmGain.connect(ctx.destination);
    const loop = () => {
      _bgmNode = ctx.createBufferSource();
      _bgmNode.buffer = _bgmCache[path];
      _bgmNode.connect(_bgmGain);
      _bgmNode.onended = () => { if (_bgmNode) loop(); };
      _bgmNode.start();
    };
    loop();
  } catch {}
}

function stopBgm() {
  if (_bgmNode) {
    try { _bgmNode.onended = null; _bgmNode.stop(); } catch {}
    _bgmNode = null;
  }
  _bgmGain = null;
}

// ページ読み込み後、最初のユーザー操作でBGMを開始
function startBgmOnInteraction(name) {
  const handler = () => {
    getAudioCtx();
    playBgm(name);
    document.removeEventListener('pointerdown', handler);
  };
  document.addEventListener('pointerdown', handler, { once: true });
}
