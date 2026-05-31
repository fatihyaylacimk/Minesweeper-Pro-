// ===================== BOARD RENDERING =====================

function renderBoard() {
  const el = document.getElementById('board');
  const wrapper = document.getElementById('board-wrapper');
  const maxW = Math.min(window.innerWidth - 40, 660);
  const rawSize = Math.floor((maxW - 24) / G.cols) - 2;
  const cellSize = Math.max(Math.min(rawSize, 38), 14);
  const fontSize = Math.max(cellSize * 0.45, 8);

  el.style.gridTemplateColumns = `repeat(${G.cols}, ${cellSize}px)`;
  el.style.setProperty('--cell-font', fontSize + 'px');
  el.innerHTML = '';
  wrapper.classList.add('board-appear');
  setTimeout(() => wrapper.classList.remove('board-appear'), 500);

  for (let r = 0; r < G.rows; r++) {
    for (let c = 0; c < G.cols; c++) {
      const div = document.createElement('div');
      div.className = 'cell';
      div.style.width = div.style.height = cellSize + 'px';
      div.dataset.r = r;
      div.dataset.c = c;

      div.addEventListener('click', () => handleCellClick(r, c));
      div.addEventListener('contextmenu', e => handleCellRightClick(e, r, c));
      div.addEventListener('dblclick', () => { if (G.board[r][c].revealed) autoReveal(r, c); });

      // Touch support
      let touchHold = null;
      div.addEventListener('touchstart', e => {
        touchHold = setTimeout(() => {
          touchHold = null;
          handleCellRightClick(e, r, c);
        }, 400);
      }, { passive: true });
      div.addEventListener('touchend', () => {
        if (touchHold) { clearTimeout(touchHold); touchHold = null; }
      });
      div.addEventListener('touchmove', () => {
        if (touchHold) { clearTimeout(touchHold); touchHold = null; }
      }, { passive: true });

      el.appendChild(div);
    }
  }
}

function getCellEl(r, c) {
  return document.querySelector(`#board [data-r="${r}"][data-c="${c}"]`);
}

function updateCellEl(r, c, animate = false) {
  const el = getCellEl(r, c);
  if (!el) return;
  const cell = G.board[r][c];
  el.className = 'cell';
  el.textContent = '';
  el.style.color = '';

  if (cell.revealed) {
    el.classList.add('revealed');
    if (animate) el.classList.add('cell-reveal');
    if (cell.mine) {
      el.textContent = '💣';
    } else if (cell.num > 0) {
      el.classList.add('n' + cell.num);
      el.textContent = cell.num;
    }
  } else if (cell.flagged) {
    el.classList.add('flagged');
    el.textContent = '🚩';
  } else if (cell.questioned) {
    el.classList.add('questioned');
    el.textContent = '❓';
  }
}

function animateCellClass(r, c, cls) {
  const el = getCellEl(r, c);
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 400);
}

function updateMineCount() {
  const remaining = G.mines - G.flags;
  const el = document.getElementById('mine-count');
  el.textContent = String(Math.max(0, remaining)).padStart(3, '0');
  el.classList.add('hud-bump');
  setTimeout(() => el.classList.remove('hud-bump'), 300);
}

function updateHintBtn() {
  const btn = document.getElementById('hint-btn');
  const cnt = document.getElementById('hint-count');
  cnt.textContent = G.hintsLeft;
  btn.disabled = G.hintsLeft <= 0;
}

// ===================== COMBO UI =====================

function showCombo(level, cells) {
  const el = document.getElementById('combo-display');
  el.style.display = 'block';
  document.getElementById('combo-text').textContent = `COMBO x${level} — ${cells} hücre!`;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'comboPulse 0.5s ease';
}

function hideCombo() {
  document.getElementById('combo-display').style.display = 'none';
}

// ===================== FLOAT SCORE =====================

function addFloatScore(r, c, pts) {
  if (pts <= 10) return;
  const el = getCellEl(r, c);
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const div = document.createElement('div');
  div.className = 'float-score';
  div.textContent = '+' + pts;
  div.style.left = rect.left + rect.width / 2 + 'px';
  div.style.top  = rect.top + window.scrollY + 'px';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 1100);
}

// ===================== GAME OVERLAY =====================

function showGameOverlay(win, secs, revealed, total, score = 0, isRecord = false) {
  document.getElementById('overlay-emoji').textContent  = win ? '🏆' : '💥';
  const title = document.getElementById('overlay-title');
  title.textContent = win ? 'ZAFERSİN!' : 'GAME OVER';
  title.className   = 'overlay-title ' + (win ? 'win' : 'lose');
  document.getElementById('overlay-sub').textContent    = win ? 'Tüm mayınları temizledin!' : 'Mayına bastın!';
  document.getElementById('stat-time').textContent      = secs + 's';
  document.getElementById('stat-cells').textContent     = revealed;
  document.getElementById('stat-score').textContent     = score.toLocaleString();
  const acc = total > 0 ? Math.round(revealed / total * 100) : 0;
  document.getElementById('stat-accuracy').textContent  = acc + '%';

  const rec = document.getElementById('new-record');
  rec.style.display = (win && isRecord) ? 'block' : 'none';

  // Confetti if win
  if (win) spawnConfetti();

  document.getElementById('overlay').classList.add('show');

  if (win && isRecord) {
    setTimeout(() => {
      closeOverlay();
      document.getElementById('name-modal').classList.add('show');
    }, 2000);
  }
}

function closeOverlay() {
  document.getElementById('overlay').classList.remove('show');
}

// ===================== CONFETTI =====================

function spawnConfetti() {
  const container = document.getElementById('overlay-particles');
  container.innerHTML = '';
  const colors = ['#00ff9d','#ff3860','#ffdd57','#4fc3f7','#ec407a','#ff8a65'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-particle';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = (20 + Math.random() * 60) + '%';
    p.style.top  = (10 + Math.random() * 30) + '%';
    p.style.setProperty('--dur', (0.8 + Math.random() * 0.8) + 's');
    p.style.setProperty('--dx',  (Math.random() * 120 - 60) + 'px');
    p.style.setProperty('--dy',  (40 + Math.random() * 100) + 'px');
    p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
    p.style.animationDelay = (Math.random() * 0.3) + 's';
    container.appendChild(p);
  }
}

// ===================== MODALS =====================

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

function showHelp() {
  document.getElementById('help-modal').classList.add('show');
}

// ===================== THEME =====================

const THEMES = ['theme-cyber','theme-blood','theme-ice','theme-gold','theme-ghost'];
let themeIdx = 0;

function cycleTheme() {
  themeIdx = (themeIdx + 1) % THEMES.length;
  const body = document.getElementById('app-body');
  THEMES.forEach(t => body.classList.remove(t));
  body.classList.add(THEMES[themeIdx]);
  try { localStorage.setItem('msw_theme', themeIdx); } catch {}
}

function loadTheme() {
  try {
    const saved = localStorage.getItem('msw_theme');
    if (saved !== null) {
      themeIdx = parseInt(saved);
      const body = document.getElementById('app-body');
      THEMES.forEach(t => body.classList.remove(t));
      body.classList.add(THEMES[themeIdx]);
    }
  } catch {}
}

// ===================== SOUND TOGGLE =====================

function toggleSound() {
  const on = SoundEngine.toggle();
  document.getElementById('sound-btn').textContent = on ? '🔊' : '🔇';
}

// ===================== BACKGROUND CANVAS =====================

(function initBgCanvas() {
  const canvas = document.getElementById('bg-canvas');
  const ctx2 = canvas.getContext('2d');
  let W, H;
  const particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function randomParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.4 + 0.05,
    };
  }

  function getAccentColor() {
    return getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#00ff9d';
  }

  resize();
  for (let i = 0; i < 60; i++) particles.push(randomParticle());

  function draw() {
    ctx2.clearRect(0, 0, W, H);
    const accent = getAccentColor();
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
      ctx2.beginPath();
      ctx2.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx2.fillStyle = accent;
      ctx2.globalAlpha = p.alpha;
      ctx2.fill();
    }
    ctx2.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  draw();
})();

// ===================== KEYBOARD SHORTCUTS =====================

document.addEventListener('keydown', e => {
  if (e.key === 'r' || e.key === 'R') newGame();
  if (e.key === 'h' || e.key === 'H') useHint();
  if (e.key === 'Escape') {
    closeOverlay();
    ['scoreboard-modal','custom-modal','help-modal','name-modal'].forEach(closeModal);
  }
});

// ===================== RESIZE HANDLER =====================

window.addEventListener('resize', () => {
  if (G.board && G.board.length) {
    renderBoard();
    // Re-apply visible state
    for (let r = 0; r < G.rows; r++)
      for (let c = 0; c < G.cols; c++)
        updateCellEl(r, c);
  }
});

// ===================== INIT =====================

loadTheme();
newGame();
