'use strict';

document.addEventListener('DOMContentLoaded', () => {
  startBgmOnInteraction('main');
  renderCollectionScreen();

  document.getElementById('btn-collection-back').addEventListener('click', () => {
    window.location.href = 'main.html';
  });
});

function renderCollectionScreen() {
  const user    = getCurrentUser();
  const earned  = user ? (user.earnedBadgeIds    || []) : [];
  const unlIllu = user ? (user.unlockedIllustIds || []) : [];

  document.getElementById('badge-grid').innerHTML = BADGE_LIST.map(b => {
    const got = earned.includes(b.id);
    return `<div class="badge-item ${got ? 'earned' : 'locked'}">
      <div class="badge-icon">${got ? b.icon : '🔒'}</div>
      <div class="badge-label">${b.label}</div>
      <div class="badge-desc">${got ? b.desc : '？？？'}</div>
    </div>`;
  }).join('');

  document.getElementById('illust-grid').innerHTML = ILLUST_LIST.map(il => {
    const got = unlIllu.includes(il.id);
    if (got) {
      return `<div class="illust-item">
        <img src="images/illustrations/${il.file}" alt="${il.label}"
          onerror="this.style.display='none';this.nextElementSibling.style.display=''">
        <div class="illust-placeholder" style="display:none">🖼</div>
        <div class="illust-label">${il.label}</div>
      </div>`;
    }
    return `<div class="illust-item locked">
      <div class="illust-placeholder">🔒</div>
      <div class="illust-label">${il.requiredCount}もん正解でゲット</div>
    </div>`;
  }).join('');
}
