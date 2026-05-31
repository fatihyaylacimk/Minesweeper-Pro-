// ===================== SCORE SYSTEM =====================

const Scores = (() => {
  const KEY = 'minesweeper_scores_v2';
  const MAX_PER_DIFF = 10;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { easy: [], medium: [], hard: [], custom: [] };
    } catch { return { easy: [], medium: [], hard: [], custom: [] }; }
  }

  function save(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }

  function calcScore(diff, timeSeconds, revealed, totalCells, mines, hintsUsed) {
    const base = { easy: 1000, medium: 3000, hard: 6000, custom: 2000 };
    const b = base[diff] || 2000;
    const timePenalty = timeSeconds * (diff === 'easy' ? 3 : diff === 'medium' ? 5 : 8);
    const hintPenalty = hintsUsed * 200;
    const coverageBonus = Math.round((revealed / totalCells) * 500);
    return Math.max(0, b - timePenalty - hintPenalty + coverageBonus);
  }

  function isRecord(diff, score) {
    const data = load();
    const list = data[diff] || [];
    if (list.length < MAX_PER_DIFF) return true;
    return score > (list[list.length - 1]?.score || 0);
  }

  function addScore(diff, name, score, timeSeconds) {
    const data = load();
    if (!data[diff]) data[diff] = [];
    data[diff].push({ name, score, time: timeSeconds, date: Date.now() });
    data[diff].sort((a, b) => b.score - a.score);
    data[diff] = data[diff].slice(0, MAX_PER_DIFF);
    save(data);
  }

  function getScores(diff) {
    return (load()[diff] || []);
  }

  function clearAll() {
    save({ easy: [], medium: [], hard: [], custom: [] });
  }

  return { calcScore, isRecord, addScore, getScores, clearAll };
})();

// ===================== SCOREBOARD UI =====================

let currentScoreTab = 'easy';

function showScoreTab(diff, btn) {
  currentScoreTab = diff;
  document.querySelectorAll('.score-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderScoreList(diff);
}

function renderScoreList(diff) {
  const list = Scores.getScores(diff);
  const el = document.getElementById('score-list');
  if (!list.length) {
    el.innerHTML = '<div class="score-empty">Henüz skor yok. Oynamaya başla!</div>';
    return;
  }
  const medals = ['gold', 'silver', 'bronze'];
  el.innerHTML = list.map((s, i) => `
    <div class="score-row">
      <span class="score-rank ${medals[i] || ''}">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1)}</span>
      <span class="score-name">${escapeHtml(s.name)}</span>
      <span class="score-pts">${s.score.toLocaleString()}</span>
      <span class="score-time">${s.time}s</span>
    </div>
  `).join('');
}

function showScoreboard() {
  document.getElementById('scoreboard-modal').classList.add('show');
  renderScoreList(currentScoreTab);
}

function clearScores() {
  if (confirm('Tüm skorlar silinsin mi?')) {
    Scores.clearAll();
    renderScoreList(currentScoreTab);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
}
