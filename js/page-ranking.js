'use strict';

document.addEventListener('DOMContentLoaded', () => {
  startBgmOnInteraction('main');

  const calcSelect = document.getElementById('ranking-calc-select');
  calcSelect.innerHTML = CALC_TYPES.map(ct =>
    `<option value="${ct.id}">${ct.group}：${ct.label}</option>`
  ).join('');
  calcSelect.addEventListener('change', renderRankingTable);

  document.querySelectorAll('.rank-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rank-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.rank-count-btn, .rank-time-btn').forEach(b => b.classList.remove('active'));
      renderRankingTable();
    });
  });
  document.querySelectorAll('.rank-count-btn, .rank-time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rank-count-btn, .rank-time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderRankingTable();
    });
  });

  document.getElementById('btn-ranking-back').addEventListener('click', () => {
    window.location.href = 'main.html';
  });

  renderRankingTable();
});

function renderRankingTable() {
  const calcId     = document.getElementById('ranking-calc-select').value;
  const activeMode = document.querySelector('.rank-mode-btn.active')?.dataset.mode || 'count';
  const activeVal  = document.querySelector(
    activeMode === 'count' ? '.rank-count-btn.active' : '.rank-time-btn.active'
  )?.dataset.value;
  const countOrTime = activeVal
    ? (activeMode === 'time' ? parseInt(activeVal) * 60 : parseInt(activeVal))
    : null;

  document.getElementById('rank-count-options').classList.toggle('hidden', activeMode !== 'count');
  document.getElementById('rank-time-options').classList.toggle('hidden',  activeMode !== 'time');

  // 列ヘッダーをモードに合わせて更新
  const thead = document.querySelector('.ranking-table thead tr');
  if (activeMode === 'count') {
    thead.innerHTML = '<th>順位</th><th>正答率</th><th>タイム</th><th>日付</th>';
  } else {
    thead.innerHTML = '<th>順位</th><th>正解数</th><th>正答率</th><th>日付</th>';
  }

  const colspan = 4;
  if (!countOrTime) {
    document.getElementById('ranking-table-body').innerHTML =
      `<tr><td colspan="${colspan}">もんだいすうか時間を選んでください</td></tr>`;
    return;
  }

  const list = getTopRanking(calcId, activeMode, countOrTime);
  if (!list.length) {
    document.getElementById('ranking-table-body').innerHTML =
      `<tr><td colspan="${colspan}">記録なし</td></tr>`;
    return;
  }

  const _fmt = s => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  const _pct = e => e.answered > 0 ? Math.round(e.correct / e.answered * 100) + '%' : '0%';

  document.getElementById('ranking-table-body').innerHTML = list.map((e, i) => {
    if (activeMode === 'count') {
      return `<tr>
        <td>${i+1}位</td>
        <td>${e.correct}/${e.answered}</td>
        <td>${_fmt(e.elapsed)}</td>
        <td>${e.date}</td>
      </tr>`;
    } else {
      return `<tr>
        <td>${i+1}位</td>
        <td>${e.correct}もん</td>
        <td>${_pct(e)}</td>
        <td>${e.date}</td>
      </tr>`;
    }
  }).join('');
}
