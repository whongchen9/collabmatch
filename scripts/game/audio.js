// ===== audio.js — Web Audio API 音效合成（需在用户交互后调用 initAudio） =====

var audioCtx = null;

/**
 * 初始化音频上下文（必须在用户交互事件回调中调用）
 */
function initAudio() {
  if (audioCtx) return;
  var AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContextClass();
}

/**
 * 脚步声 — 低频三角波短脉冲 80→40Hz
 */
function sfxFootstep() {
  if (!audioCtx) return;
  try {
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(80, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.08);
  } catch (e) {
    // 静默忽略音效错误
  }
}

/**
 * 交互提示音 — 清脆短铃 880→440Hz
 */
function sfxInteract() {
  if (!audioCtx) return;
  try {
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.2);
  } catch (e) {
    // 静默忽略
  }
}

/**
 * 打开弹窗音效 — 白噪声模拟卷轴展开
 */
function sfxOpenPanel() {
  if (!audioCtx) return;
  try {
    var bufferSize = Math.floor(audioCtx.sampleRate * 0.2);
    var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    var source = audioCtx.createBufferSource();
    var gain = audioCtx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    source.connect(gain);
    gain.connect(audioCtx.destination);
    source.start();
  } catch (e) {
    // 静默忽略
  }
}

/**
 * 匹配成功 — 上行和弦 C5-E5-G5
 */
function sfxMatchSuccess() {
  if (!audioCtx) return;
  try {
    var notes = [523, 659, 784]; // C5, E5, G5
    for (var i = 0; i < notes.length; i++) {
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = notes[i];
      gain.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + i * 0.12 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.12 + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + i * 0.12);
      osc.stop(audioCtx.currentTime + i * 0.12 + 0.5);
    }
  } catch (e) {
    // 静默忽略
  }
}
