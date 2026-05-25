'use strict';

const RANKING_KEY = 'anzan_rankings';

function loadRankings() {
  try { return JSON.parse(localStorage.getItem(RANKING_KEY)) || {}; } catch { return {}; }
}
function saveRankings(r) { localStorage.setItem(RANKING_KEY, JSON.stringify(r)); }

function _rankKey(calcId, mode, countOrTime) {
  return `${calcId}__${mode}__${countOrTime}`;
}

function getTopRanking(calcId, mode, countOrTime) {
  return (loadRankings()[_rankKey(calcId, mode, countOrTime)] || []).slice(0, 10);
}

// score: mode='count' → 秒数（低いほど良い）, mode='time' → 正解数（高いほど良い）
function checkRankIn(calcId, mode, countOrTime, score) {
  const list = getTopRanking(calcId, mode, countOrTime);
  if (list.length < 10) return true;
  const worst = list[list.length - 1].score;
  return mode === 'count' ? score < worst : score > worst;
}

function addRankingEntry(calcId, mode, countOrTime, name, score) {
  const rankings = loadRankings();
  const key = _rankKey(calcId, mode, countOrTime);
  const list = rankings[key] || [];
  const entry = { name, score, date: new Date().toLocaleDateString('ja-JP') };
  list.push(entry);
  list.sort((a, b) => mode === 'count' ? a.score - b.score : b.score - a.score);
  rankings[key] = list.slice(0, 10);
  saveRankings(rankings);
  return rankings[key].findIndex(e => e === rankings[key].find(x => x.name === name && x.score === score && x.date === entry.date)) + 1;
}

function resetAllRankings() {
  localStorage.removeItem(RANKING_KEY);
}
