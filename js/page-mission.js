'use strict';

document.addEventListener('DOMContentLoaded', () => {
  startBgmOnInteraction('main');
  renderMissionScreen();

  document.getElementById('btn-mission-back').addEventListener('click', () => {
    window.location.href = 'main.html';
  });
});

function renderMissionScreen() {
  const user  = getCurrentUser();
  const state = user ? getMissionState(user.id) : { todayCorrect: 0, achieved: false, history: [] };
  const count = state.todayCorrect || 0;
  const pct   = Math.min(100, Math.round(count / MISSION_GOAL * 100));

  document.getElementById('mission-progress-bar').style.width = `${pct}%`;
  document.getElementById('mission-progress-text').textContent = `${count} / ${MISSION_GOAL} もん`;
  document.getElementById('mission-achieved').classList.toggle('hidden', !state.achieved);

  const history = state.history || [];
  document.getElementById('mission-history-body').innerHTML = history.length
    ? history.map(h => `<tr><td>${h.date}</td><td>${h.mode}</td><td>${h.calc}</td></tr>`).join('')
    : '<tr><td colspan="3">まだ記録がありません</td></tr>';
}
