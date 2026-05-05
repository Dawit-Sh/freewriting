'use strict';

// ── State ────────────────────────────────────────────────────
const state = {
  totalSeconds: 0,      // total session duration in seconds
  remaining: 0,         // seconds left
  running: false,       // true = counting down
  finished: false,
  startedAt: null,      // Date when current run segment began
  intervalId: null,
  faviconCanvas: null,
  faviconCtx: null,
  faviconLink: null,
};

// ── DOM refs ─────────────────────────────────────────────────
const setupScreen   = document.getElementById('setup-screen');
const writingScreen = document.getElementById('writing-screen');
const doneScreen    = document.getElementById('done-screen');
const presetBtns    = document.querySelectorAll('.preset');
const customInput   = document.getElementById('custom-input');
const startBtn      = document.getElementById('start-btn');
const timerDisplay  = document.getElementById('timer-display');
const pausedBadge   = document.getElementById('paused-badge');
const hud           = document.getElementById('hud');
const editor        = document.getElementById('editor');
const wordCountEl   = document.getElementById('word-count');
const bottomBar     = document.getElementById('bottom-bar');
const giveUpBtn     = document.getElementById('give-up-btn');
const doneTitle     = document.getElementById('done-title');
const statWords     = document.getElementById('stat-words');
const statDuration  = document.getElementById('stat-duration');
const statWpm       = document.getElementById('stat-wpm');
const donePreview   = document.getElementById('done-preview');
const copyBtn       = document.getElementById('copy-btn');
const downloadBtn   = document.getElementById('download-btn');
const newSessionBtn  = document.getElementById('new-session-btn');
const progressBar    = document.getElementById('progress-bar');

// ── Favicon setup ────────────────────────────────────────────
(function initFavicon() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  state.faviconCanvas = canvas;
  state.faviconCtx    = canvas.getContext('2d');
  state.faviconLink   = document.getElementById('favicon');
})();

function drawFavicon(secondsLeft, paused) {
  const ctx = state.faviconCtx;
  const size = 32;
  const cx = size / 2, cy = size / 2, r = 14;
  const total = state.totalSeconds || 1;
  const progress = secondsLeft / total; // 1 = full, 0 = empty

  ctx.clearRect(0, 0, size, size);

  // Background circle
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = paused ? '#3a2e10' : '#0f2a1a';
  ctx.fill();

  // Track ring
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = paused ? '#5a4a20' : '#1a4a2a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Progress arc (clockwise from top)
  const startAngle = -Math.PI / 2;
  const endAngle   = startAngle + progress * Math.PI * 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = paused ? '#e8c87a' : '#a8e6cf';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Center text: minutes remaining (or seconds if < 60)
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const label = mins > 0 ? String(mins) : String(secs);
  ctx.fillStyle = paused ? '#e8c87a' : '#a8e6cf';
  ctx.font = `bold ${label.length > 1 ? 11 : 14}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy + 0.5);

  state.faviconLink.href = state.faviconCanvas.toDataURL('image/png');
}

// ── Tab title ────────────────────────────────────────────────
function updateTabTitle(secondsLeft, paused) {
  if (state.finished) { document.title = 'Freewrite — Done'; return; }
  const m = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const s = String(secondsLeft % 60).padStart(2, '0');
  const icon = paused ? '⏸' : '▶';
  document.title = `${icon} ${m}:${s} — Freewrite`;
}

// ── Timer formatting ─────────────────────────────────────────
function fmt(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// ── Timer control ────────────────────────────────────────────
function tick() {
  if (state.remaining <= 0) { endSession(true); return; }
  state.remaining -= 1;
  renderTimer();
  if (state.remaining <= 0) endSession(true);
}

function startCountdown() {
  if (state.intervalId) return;
  state.running = true;
  state.intervalId = setInterval(tick, 1000);
}

function pauseCountdown() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  state.running = false;
}

function renderTimer() {
  const paused = !state.running;
  timerDisplay.textContent = fmt(state.remaining);
  updateTabTitle(state.remaining, paused);
  drawFavicon(state.remaining, paused);
  const pct = state.totalSeconds > 0 ? (state.remaining / state.totalSeconds) * 100 : 0;
  progressBar.style.width = `${pct}%`;
}

// ── Visibility API ───────────────────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (state.finished) return;
  if (document.visibilityState === 'hidden') {
    if (state.running) {
      pauseCountdown();
      showPaused(true);
    }
  } else {
    // Only resume if we were actively running before hide
    showPaused(false);
    if (!state.finished) {
      startCountdown();
    }
  }
});

function showPaused(yes) {
  pausedBadge.classList.toggle('hidden', !yes);
  hud.classList.toggle('paused', yes);
  editor.disabled = yes;
  if (yes) {
    renderTimer(); // update favicon/title to paused state
  }
}

// ── Idle fade ─────────────────────────────────────────────────
let idleTimer = null;
function resetIdleFade() {
  hud.classList.remove('faded');
  bottomBar.classList.remove('faded');
  progressBar.classList.remove('faded');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (state.running) {
      hud.classList.add('faded');
      bottomBar.classList.add('faded');
      progressBar.classList.add('faded');
    }
  }, 3000);
}
document.addEventListener('mousemove', resetIdleFade);
document.addEventListener('keydown', resetIdleFade);

// ── Word count ───────────────────────────────────────────────
editor.addEventListener('input', () => {
  const words = countWords(editor.value);
  wordCountEl.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
  localStorage.setItem('fw_draft', editor.value);
});

function countWords(text) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

// ── Session start ────────────────────────────────────────────
function startSession(minutes) {
  state.totalSeconds = minutes * 60;
  state.remaining    = state.totalSeconds;
  state.finished     = false;
  state.running      = false;

  // Restore draft if any
  const saved = localStorage.getItem('fw_draft');
  editor.value = saved || '';
  editor.disabled = false;
  const words = countWords(editor.value);
  wordCountEl.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;

  showScreen(writingScreen);
  renderTimer();
  resetIdleFade();

  // Small delay so the screen transition finishes before counting
  setTimeout(() => {
    startCountdown();
    editor.focus();
  }, 50);
}

// ── Session end ───────────────────────────────────────────────
function endSession(natural) {
  pauseCountdown();
  state.finished = true;
  clearTimeout(idleTimer);

  const text      = editor.value;
  const words     = countWords(text);
  const elapsed   = state.totalSeconds - state.remaining;
  const elapsedMin = Math.max(1, Math.round(elapsed / 60));
  const wpm       = elapsed > 0 ? Math.round(words / (elapsed / 60)) : 0;

  doneTitle.textContent      = natural ? "Time's up!" : 'Session ended';
  statWords.textContent      = words;
  statDuration.textContent   = `${elapsedMin}m`;
  statWpm.textContent        = wpm;
  donePreview.value          = text;

  document.title = 'Freewrite — Done';
  drawFavicon(0, false);

  // Clear saved draft
  localStorage.removeItem('fw_draft');

  showScreen(doneScreen);
}

// ── Screen transitions ───────────────────────────────────────
function showScreen(target) {
  [setupScreen, writingScreen, doneScreen].forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
    s.style.opacity = '0';
  });
  target.style.display = 'flex';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      target.classList.add('active');
      target.style.opacity = '1';
    });
  });
}

// ── Preset / custom duration picker ──────────────────────────
let selectedMinutes = 15;

presetBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    presetBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedMinutes = parseInt(btn.dataset.minutes, 10);
    customInput.value = '';
  });
});

customInput.addEventListener('input', () => {
  const val = parseInt(customInput.value, 10);
  if (val > 0) {
    presetBtns.forEach(b => b.classList.remove('active'));
    selectedMinutes = val;
  }
});

startBtn.addEventListener('click', () => {
  const custom = parseInt(customInput.value, 10);
  const minutes = custom > 0 ? custom : selectedMinutes;
  if (!minutes || minutes < 1) return;
  startSession(minutes);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && setupScreen.classList.contains('active') && document.activeElement !== customInput) {
    startBtn.click();
  }
});

// ── "Finish early" ────────────────────────────────────────────
let giveUpPending = false;
let giveUpTimeout = null;

giveUpBtn.addEventListener('click', () => {
  if (!giveUpPending) {
    giveUpPending = true;
    giveUpBtn.textContent = 'end session?';
    giveUpBtn.classList.add('confirming');
    giveUpTimeout = setTimeout(() => {
      giveUpPending = false;
      giveUpBtn.textContent = 'finish early';
      giveUpBtn.classList.remove('confirming');
    }, 2500);
  } else {
    clearTimeout(giveUpTimeout);
    endSession(false);
  }
});

// ── Done screen actions ───────────────────────────────────────
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(donePreview.value);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy text'; }, 2000);
  } catch {
    donePreview.select();
    document.execCommand('copy');
  }
});

downloadBtn.addEventListener('click', () => {
  const blob = new Blob([donePreview.value], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const ts   = new Date().toISOString().slice(0, 10);
  const elapsed   = state.totalSeconds - state.remaining;
  const elapsedMin = Math.round(elapsed / 60);
  const timeStr = elapsedMin >= 60 ? `${Math.floor(elapsedMin / 60)}h${elapsedMin % 60 > 0 ? elapsedMin % 60 + 'm' : ''}` : `${elapsedMin}m`;
  a.href     = url;
  a.download = `${ts}-freewriting-session-${timeStr}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

newSessionBtn.addEventListener('click', () => {
  document.title = 'Freewrite';
  showScreen(setupScreen);
});

// ── Init ──────────────────────────────────────────────────────
drawFavicon(1, false); // set initial favicon
