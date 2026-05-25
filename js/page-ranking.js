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

  if (!countOrTime) {
    document.getElementById('ranking-table-body').innerHTML =
      '<tr><td colspan="3">問題数か時間を選んでください</td></tr>';
    return;
  }
  const list = getTopRanking(calcId, activeMode, countOrTime);
  if (!list.length) {
    document.getElementById('ranking-table-body').innerHTML = '<tr><td colspan="3">記録なし</td></tr>';
    return;
  }
  document.getElementById('ranking-table-body').innerHTML = list.map((e, i) => {
    const score = activeMode === 'count'
      ? `${Math.floor(e.score/60).toString().padStart(2,'0')}:${(e.score%60).toString().padStart(2,'0')}`
      : `${e.score}もん`;
    return `<tr><td>${i+1}位</td><td>${e.name}</td><td>${score}</td></tr>`;
  }).join('');
}
