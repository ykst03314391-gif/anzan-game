'use strict';

// ---- ユーザーバッジ ----
function renderUserBadge() {
  const user  = getCurrentUser();
  const badge = document.getElementById('top-user-badge');
  if (user) {
    const ch = CHAR_LIST.find(c => c.id === user.charaId);
    badge.textContent = `${ch ? ch.emoji : '⭐'} ${user.name}`;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// ---- 計算選択 ----
let _selectedCalcId = null;
let _selectedMode   = null;
let _selectedCount  = null;

function _canStart() { return _selectedCalcId && _selectedMode && _selectedCount; }
function _updateStartBtn() {
  document.getElementById('btn-start').disabled = !_canStart();
}

document.addEventListener('DOMContentLoaded', () => {
  renderUserBadge();
  startBgmOnInteraction('main');

  // ユーザー未登録なら設定へ
  if (!loadUsers().length) {
    window.location.href = 'settings.html';
    return;
  }

  // 計算タブ
  document.querySelectorAll('.calc-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.calc-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.calc-group').forEach(g => g.classList.add('hidden'));
      document.getElementById(`calc-group-${tab.dataset.group}`).classList.remove('hidden');
      _selectedCalcId = null;
      document.querySelectorAll('.calc-btn').forEach(b => b.classList.remove('active'));
      _updateStartBtn();
    });
  });

  // 計算ボタン
  document.querySelectorAll('.calc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.calc-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _selectedCalcId = btn.dataset.calcId;
      _updateStartBtn();
    });
  });

  // モード
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _selectedMode  = btn.dataset.mode;
      _selectedCount = null;
      document.getElementById('count-options').classList.toggle('hidden', _selectedMode !== 'count');
      document.getElementById('time-options').classList.toggle('hidden',  _selectedMode !== 'time');
      document.querySelectorAll('.count-btn, .time-btn').forEach(b => b.classList.remove('active'));
      _updateStartBtn();
    });
  });

  // 問題数
  document.querySelectorAll('.count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _selectedCount = parseInt(btn.dataset.value);
      _updateStartBtn();
    });
  });

  // 制限時間
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _selectedCount = parseInt(btn.dataset.value) * 60;
      _updateStartBtn();
    });
  });

  // スタート
  document.getElementById('btn-start').addEventListener('click', () => {
    if (!_canStart()) return;
    localStorage.setItem('anzan_pending_game', JSON.stringify({
      calcTypeId: _selectedCalcId,
      mode: _selectedMode,
      countOrTime: _selectedCount,
    }));
    window.location.href = 'game.html';
  });

  // ナビ
  document.getElementById('btn-go-ranking').addEventListener('click',    () => { window.location.href = 'ranking.html';    });
  document.getElementById('btn-go-mission').addEventListener('click',    () => { window.location.href = 'mission.html';    });
  document.getElementById('btn-go-collection').addEventListener('click', () => { window.location.href = 'collection.html'; });
  document.getElementById('btn-go-settings').addEventListener('click',   () => { window.location.href = 'settings.html';  });
});
