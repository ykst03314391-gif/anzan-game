'use strict';

document.addEventListener('DOMContentLoaded', () => {
  startBgmOnInteraction('main');
  renderMissionScreen();

  document.getElementById('btn-mission-back').addEventListener('click', () => {
    window.location.href = 'main.html';
  });
});

function renderMissionScreen() {
  const user = getCurrentUser();
  const missions = user
    ? getMissionProgress(user.id)
    : MISSIONS.map(m => ({ ...m, progress: 0, achieved: false }));

  document.getElementById('mission-list').innerHTML = missions.map(m => {
    let progressText = '';
    let pct = 0;
    let showBar = true;

    if (m.type === 'total_correct') {
      progressText = `${m.progress} / ${m.goal} もん`;
      pct = Math.min(100, Math.round(m.progress / m.goal * 100));
    } else if (m.type === 'calc_clear') {
      progressText = m.achieved ? 'クリア済み' : 'まだ';
      pct = m.achieved ? 100 : 0;
      showBar = false;
    } else if (m.type === 'total_clears') {
      progressText = `${m.progress} / ${m.goal} 回`;
      pct = Math.min(100, Math.round(m.progress / m.goal * 100));
    } else if (m.type === 'mode_clears') {
      progressText = `${m.progress} / ${m.goal} 回`;
      pct = Math.min(100, Math.round(m.progress / m.goal * 100));
    }

    const barHtml = showBar
      ? `<div class="mission-progress-wrap">
           <div class="mission-progress-bar" style="width:${pct}%"></div>
         </div>`
      : '';

    return `<div class="mission-item ${m.achieved ? 'achieved' : ''}">
      <div class="mission-label">${m.achieved ? '✅' : '🎯'} ${m.label}</div>
      ${barHtml}
      <div class="mission-progress-text">${progressText}</div>
    </div>`;
  }).join('');
}
