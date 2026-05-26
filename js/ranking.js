'use strict';

const RANKING_KEY = 'anzan_rankings';

function loadRankings() {
  try { return JSON.parse(localStorage.getItem(RANKING_KEY)) || {}; } catch { return {}; }
}
function saveRankings(r) { localStorage.setItem(RANKING_KEY, JSON.stringify(r)); }

function _rankKey(calcId, mode, countOrTime) {
  return `${calcId}__${mode}__${countOrTime}`;
}

function _rate(e) { return e.answered > 0 ? e.correct / e.answered : 0; }

// count: 正答率 降順 → 同率ならタイム 昇順
// time:  正解数 降順 → 同数なら正答率 降順
function _sortEntries(list, mode) {
  if (mode === 'count') {
    list.sort((a, b) => {
      const diff = _rate(b) - _rate(a);
      return diff !== 0 ? diff : a.elapsed - b.elapsed;
    });
  } else {
    list.sort((a, b) => {
      if (a.correct !== b.correct) return b.correct - a.correct;
      return _rate(b) - _rate(a);
    });
  }
  return list;
}

function getTopRanking(calcId, mode, countOrTime) {
  return (loadRankings()[_rankKey(calcId, mode, countOrTime)] || [])
    .filter(e => e.correct !== undefined)
    .slice(0, 10);
}

function checkRankIn(calcId, mode, countOrTime, correct, answered, elapsed) {
  const list = getTopRanking(calcId, mode, countOrTime);
  if (list.length < 10) return true;
  const candidate = { correct, answered, elapsed };
  const testList = [...list, candidate];
  _sortEntries(testList, mode);
  return testList.indexOf(candidate) < 10;
}

function addRankingEntry(calcId, mode, countOrTime, correct, answered, elapsed) {
  const rankings = loadRankings();
  const key = _rankKey(calcId, mode, countOrTime);
  const list = rankings[key] || [];
  list.push({ correct, answered, elapsed, date: new Date().toLocaleDateString('ja-JP') });
  _sortEntries(list, mode);
  rankings[key] = list.slice(0, 10);
  saveRankings(rankings);
}

function resetAllRankings() {
  localStorage.removeItem(RANKING_KEY);
}
