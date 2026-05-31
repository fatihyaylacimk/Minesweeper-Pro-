// ===================== GAME STATE =====================

const DIFFS = {
  easy:   { rows: 9,  cols: 9,  mines: 10,  countdown: 0 },
  medium: { rows: 14, cols: 14, mines: 35,  countdown: 0 },
  hard:   { rows: 16, cols: 18, mines: 60,  countdown: 0 },
  custom: { rows: 10, cols: 10, mines: 15,  countdown: 0 }
};

let G = {};  // game state
let pendingScore = null;

function resetState() {
  const cfg = DIFFS[G.diff];
  G.rows     = cfg.rows;
  G.cols     = cfg.cols;
  G.mines    = cfg.mines;
  G.countdown = cfg.countdown;
  G.board    = [];
  G.started  = false;
  G.over     = false;
  G.won      = false;
  G.flags    = 0;
  G.questions = 0;
  G.revealed = 0;
  G.seconds  = 0;
  G.hintsUsed = 0;
  G.hintsLeft = 3;
  G.combo    = 0;
  G.comboTimer = null;
  G.clicks   = 0;
  G.correctFlags = 0;
  clearInterval(G.timerInt);
  clearInterval(G.countdownInt);
  G.timerInt = null;
  G.countdownInt = null;
}

function initBoard() {
  G.board = [];
  for (let r = 0; r < G.rows; r++) {
    G.board[r] = [];
    for (let c = 0; c < G.cols; c++) {
      G.board[r][c] = { mine:false, revealed:false, flagged:false, questioned:false, num:0 };
    }
  }
}

function placeMines(fr, fc) {
  let placed = 0;
  const safe = new Set();
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      const nr = fr+dr, nc = fc+dc;
      if (nr>=0&&nr<G.rows&&nc>=0&&nc<G.cols) safe.add(nr*G.cols+nc);
    }
  while (placed < G.mines) {
    const r = Math.floor(Math.random() * G.rows);
    const c = Math.floor(Math.random() * G.cols);
    if (!G.board[r][c].mine && !safe.has(r*G.cols+c)) {
      G.board[r][c].mine = true;
      placed++;
    }
  }
  for (let r = 0; r < G.rows; r++)
    for (let c = 0; c < G.cols; c++)
      if (!G.board[r][c].mine)
        G.board[r][c].num = countNeighbors(r, c);
}

function countNeighbors(r, c) {
  let n = 0;
  eachNeighbor(r, c, (nr, nc) => { if (G.board[nr][nc].mine) n++; });
  return n;
}

function eachNeighbor(r, c, cb) {
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (dr===0&&dc===0) continue;
      const nr=r+dr, nc=c+dc;
      if (nr>=0&&nr<G.rows&&nc>=0&&nc<G.cols) cb(nr, nc);
    }
}

// ===================== REVEAL LOGIC =====================

function reveal(r, c) {
  const cell = G.board[r][c];
  if (cell.revealed || cell.flagged || cell.questioned) return 0;
  cell.revealed = true;
  G.revealed++;
  updateCellEl(r, c, true);
  if (cell.num === 0) {
    let count = 1;
    eachNeighbor(r, c, (nr, nc) => { count += reveal(nr, nc); });
    return count;
  }
  return 1;
}

function revealCascade(r, c) {
  // BFS for animation delays
  const queue = [[r, c]];
  const visited = new Set();
  visited.add(r*G.cols+c);
  let idx = 0;
  let totalRevealed = 0;

  while (queue.length) {
    const [cr, cc] = queue.shift();
    const cell = G.board[cr][cc];
    if (cell.revealed || cell.flagged || cell.questioned) continue;
    cell.revealed = true;
    G.revealed++;
    totalRevealed++;

    const el = getCellEl(cr, cc);
    if (el) {
      const delay = Math.min(idx * 8, 250);
      setTimeout(() => {
        updateCellEl(cr, cc, true);
        SoundEngine.cascade(idx);
      }, delay);
    }
    idx++;

    if (cell.num === 0) {
      eachNeighbor(cr, cc, (nr, nc) => {
        const key = nr*G.cols+nc;
        if (!visited.has(key) && !G.board[nr][nc].revealed && !G.board[nr][nc].flagged) {
          visited.add(key);
          queue.push([nr, nc]);
        }
      });
    }
  }
  return totalRevealed;
}

// ===================== CLICK HANDLERS =====================

let lastClickTime = 0, lastClickRC = [-1,-1];

function handleCellClick(r, c) {
  if (G.over) return;
  const cell = G.board[r][c];
  if (cell.flagged || cell.questioned) return;

  // Double-click: auto-reveal
  const now = Date.now();
  if (now - lastClickTime < 350 && lastClickRC[0]===r && lastClickRC[1]===c) {
    if (cell.revealed) {
      autoReveal(r, c);
      return;
    }
  }
  lastClickTime = now;
  lastClickRC = [r, c];

  if (cell.revealed) return;

  G.clicks++;

  if (!G.started) {
    G.started = true;
    placeMines(r, c);
    startTimer();
    if (G.countdown > 0) startCountdown();
  }

  if (cell.mine) {
    triggerExplosion(r, c);
    return;
  }

  SoundEngine.reveal();
  const count = revealCascade(r, c);

  // Combo
  if (count >= 5) {
    G.combo++;
    clearTimeout(G.comboTimer);
    G.comboTimer = setTimeout(() => { G.combo = 0; hideCombo(); }, 3000);
    showCombo(G.combo, count);
    SoundEngine.combo(G.combo);
  }

  addFloatScore(r, c, count * 10);
  checkWin();
}

function handleCellRightClick(e, r, c) {
  e.preventDefault();
  if (G.over || !G.started) return;
  const cell = G.board[r][c];
  if (cell.revealed) return;

  if (!cell.flagged && !cell.questioned) {
    // Place flag
    cell.flagged = true;
    G.flags++;
    SoundEngine.flag();
    updateCellEl(r, c);
    animateCellClass(r, c, 'cell-flag-place');
  } else if (cell.flagged) {
    // Flag -> Question
    cell.flagged = false;
    cell.questioned = true;
    G.flags--;
    SoundEngine.question();
    updateCellEl(r, c);
  } else {
    // Question -> nothing
    cell.questioned = false;
    SoundEngine.unflag();
    updateCellEl(r, c);
  }

  updateMineCount();
}

function autoReveal(r, c) {
  const cell = G.board[r][c];
  if (!cell.revealed || cell.num === 0) return;
  let flagCount = 0;
  eachNeighbor(r, c, (nr, nc) => { if (G.board[nr][nc].flagged) flagCount++; });
  if (flagCount !== cell.num) return;

  SoundEngine.autoReveal();
  let hitMine = false;
  eachNeighbor(r, c, (nr, nc) => {
    const nc2 = G.board[nr][nc];
    if (!nc2.revealed && !nc2.flagged) {
      if (nc2.mine) { hitMine = true; triggerExplosion(nr, nc); }
      else { revealCascade(nr, nc); }
    }
  });
  if (!hitMine) checkWin();
}

// ===================== HINT =====================

function useHint() {
  if (G.over || !G.started || G.hintsLeft <= 0) return;
  // Find safe unrevealed non-flagged cell
  const candidates = [];
  for (let r = 0; r < G.rows; r++)
    for (let c = 0; c < G.cols; c++) {
      const cell = G.board[r][c];
      if (!cell.mine && !cell.revealed && !cell.flagged) candidates.push([r,c]);
    }
  if (!candidates.length) return;
  const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
  G.hintsLeft--;
  G.hintsUsed++;
  updateHintBtn();
  SoundEngine.hint();

  // Highlight then reveal
  const el = getCellEl(r, c);
  if (el) {
    el.classList.add('hint-highlight');
    setTimeout(() => {
      el.classList.remove('hint-highlight');
      revealCascade(r, c);
      checkWin();
    }, 1200);
  }
}

// ===================== EXPLOSION =====================

function triggerExplosion(r, c) {
  G.over = true;
  G.won  = false;
  clearInterval(G.timerInt);
  clearInterval(G.countdownInt);

  SoundEngine.explode();
  document.getElementById('reset-emoji').textContent = '💀';

  // Animate the clicked mine
  const el = getCellEl(r, c);
  if (el) {
    el.classList.add('cell-explode', 'exploded');
    el.textContent = '💥';
  }

  // Shake board
  const wrapper = document.getElementById('board-wrapper');
  wrapper.classList.add('shake');
  setTimeout(() => wrapper.classList.remove('shake'), 500);

  // Flash screen red
  document.body.classList.add('screen-flash-red');
  setTimeout(() => document.body.classList.remove('screen-flash-red'), 300);

  // Reveal all mines with stagger
  let idx = 0;
  for (let mr = 0; mr < G.rows; mr++) {
    for (let mc = 0; mc < G.cols; mc++) {
      const cell = G.board[mr][mc];
      if (cell.mine && !(mr===r && mc===c)) {
        const mel = getCellEl(mr, mc);
        if (!mel) continue;
        const delay = 50 + (idx++) * 30;
        setTimeout(() => {
          if (cell.flagged) {
            mel.className = 'cell correct-flag';
            mel.textContent = '✅';
          } else {
            mel.className = 'cell mine-revealed cell-mine-reveal';
            mel.textContent = '💣';
          }
        }, delay);
      } else if (!cell.mine && cell.flagged) {
        setTimeout(() => {
          const mel = getCellEl(mr, mc);
          if (mel) { mel.className = 'cell wrong-flag revealed'; mel.textContent = '❌'; }
        }, 50 + (idx++) * 30);
      }
    }
  }

  const total = G.rows * G.cols - G.mines;
  setTimeout(() => showGameOverlay(false, G.seconds, G.revealed, total), 800 + idx * 30);
}

// ===================== WIN =====================

function checkWin() {
  const total = G.rows * G.cols - G.mines;
  if (G.revealed < total) return;

  G.over = true;
  G.won  = true;
  clearInterval(G.timerInt);
  clearInterval(G.countdownInt);

  SoundEngine.win();
  document.getElementById('reset-emoji').textContent = '🏆';

  // Flash green
  document.body.classList.add('screen-flash-green');
  setTimeout(() => document.body.classList.remove('screen-flash-green'), 400);

  // Auto-flag remaining
  for (let r = 0; r < G.rows; r++) {
    for (let c = 0; c < G.cols; c++) {
      if (G.board[r][c].mine && !G.board[r][c].flagged) {
        G.board[r][c].flagged = true;
        const el = getCellEl(r, c);
        if (el) { el.className = 'cell flagged correct-flag'; el.innerHTML = '🚩'; }
      }
    }
  }

  document.getElementById('mine-count').textContent = '000';

  // Win cell animations with stagger
  let idx = 0;
  for (let r = 0; r < G.rows; r++)
    for (let c = 0; c < G.cols; c++) {
      const el = getCellEl(r, c);
      if (el && G.board[r][c].revealed) {
        const delay = idx++ * 5;
        setTimeout(() => el.classList.add('win-cell'), delay);
      }
    }

  const score = Scores.calcScore(G.diff, G.seconds, G.revealed, total + G.mines, G.mines, G.hintsUsed);
  const isRec = Scores.isRecord(G.diff, score);

  setTimeout(() => {
    showGameOverlay(true, G.seconds, G.revealed, total, score, isRec);
    if (isRec) {
      SoundEngine.record();
      pendingScore = { diff: G.diff, score, time: G.seconds };
    }
  }, 600);
}

// ===================== TIMER =====================

function startTimer() {
  G.seconds = 0;
  G.timerInt = setInterval(() => {
    G.seconds++;
    const el = document.getElementById('timer');
    el.textContent = String(G.seconds).padStart(3, '0');
    if (G.seconds >= 999) clearInterval(G.timerInt);
  }, 1000);
}

function startCountdown() {
  let remaining = G.countdown;
  const wrap = document.getElementById('countdown-wrap');
  const bar  = document.getElementById('countdown-bar');
  const lbl  = document.getElementById('countdown-label');
  wrap.style.display = 'flex';
  bar.style.setProperty('--pct', '100%');
  lbl.textContent = remaining + 's';

  G.countdownInt = setInterval(() => {
    remaining--;
    const pct = (remaining / G.countdown * 100) + '%';
    bar.style.setProperty('--pct', pct);
    lbl.textContent = remaining + 's';

    if (remaining <= 10) {
      bar.classList.add('danger');
      SoundEngine.tickUrgent();
    } else {
      SoundEngine.tick();
    }

    if (remaining <= 0) {
      clearInterval(G.countdownInt);
      if (!G.over) triggerTimeUp();
    }
  }, 1000);
}

function triggerTimeUp() {
  G.over = true;
  clearInterval(G.timerInt);
  document.getElementById('reset-emoji').textContent = '⏰';
  SoundEngine.explode();
  const total = G.rows * G.cols - G.mines;
  showGameOverlay(false, G.seconds, G.revealed, total);
}

// ===================== NEW GAME =====================

function newGame() {
  if (!G.diff) G.diff = 'easy';
  resetState();
  initBoard();
  renderBoard();
  updateMineCount();
  updateHintBtn();
  document.getElementById('timer').textContent = '000';
  document.getElementById('reset-emoji').textContent = '🔄';
  document.getElementById('countdown-wrap').style.display = 'none';
  document.getElementById('streak-wrap').style.display = 'none';
  hideCombo();
  pendingScore = null;
}

function setDifficulty(diff, btn) {
  G.diff = diff;
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  newGame();
}

function showCustomModal() {
  document.getElementById('custom-modal').classList.add('show');
}

function applyCustom() {
  const r = parseInt(document.getElementById('custom-rows').value);
  const c = parseInt(document.getElementById('custom-cols').value);
  let m = parseInt(document.getElementById('custom-mines').value);
  const t = parseInt(document.getElementById('custom-timer').value);
  m = Math.min(m, r * c - 9);
  DIFFS.custom = { rows: r, cols: c, mines: m, countdown: t };
  closeModal('custom-modal');
  setDifficulty('custom', document.querySelector('[data-diff="custom"]'));
}

// ===================== SAVE SCORE =====================

function saveScore() {
  if (!pendingScore) { closeModal('name-modal'); return; }
  const name = document.getElementById('player-name').value.trim() || 'Anonim';
  Scores.addScore(pendingScore.diff, name, pendingScore.score, pendingScore.time);
  pendingScore = null;
  closeModal('name-modal');
}

// Init
G.diff = 'easy';
