'use strict';

document.addEventListener('DOMContentLoaded', () => {
  startBgmOnInteraction('main');
  renderSettingsScreen();

  document.getElementById('btn-settings-back').addEventListener('click', () => {
    window.location.href = 'main.html';
  });

  document.getElementById('btn-add-user').addEventListener('click', () => showUserForm(null));

  document.querySelectorAll('.input-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.input-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setInputMode(btn.dataset.mode);
    });
  });

  document.getElementById('btn-reset-ranking').addEventListener('click', () => {
    if (!confirm('ランキングをすべてリセットしますか？')) return;
    resetAllRankings();
    alert('ランキングをリセットしました。');
  });
});

function renderSettingsScreen() {
  renderUserList();
  const mode = getInputMode();
  document.querySelectorAll('.input-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

function renderUserList() {
  const users     = loadUsers();
  const currentId = getCurrentUserId();
  const container = document.getElementById('user-list');

  if (!users.length) {
    container.innerHTML = '<p class="empty-msg">ユーザーがいません</p>';
    return;
  }
  container.innerHTML = users.map(u => {
    const ch       = CHAR_LIST.find(c => c.id === u.charaId);
    const isActive = u.id === currentId;
    return `<div class="user-item ${isActive ? 'current' : ''}">
      <span class="user-chara">${ch ? ch.emoji : '⭐'}</span>
      <span class="user-name">${u.name}</span>
      <span class="user-correct">正解${u.totalCorrect}もん</span>
      <div class="user-actions">
        <button class="btn btn-sm btn-primary  btn-select-user" data-id="${u.id}">${isActive ? '選択中' : '選択'}</button>
        <button class="btn btn-sm btn-secondary btn-edit-user"   data-id="${u.id}">編集</button>
        <button class="btn btn-sm btn-danger    btn-delete-user" data-id="${u.id}">削除</button>
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('.btn-select-user').forEach(btn => {
    btn.addEventListener('click', () => { setCurrentUserId(btn.dataset.id); renderUserList(); });
  });
  container.querySelectorAll('.btn-edit-user').forEach(btn => {
    btn.addEventListener('click', () => showUserForm(btn.dataset.id));
  });
  container.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const u = loadUsers().find(x => x.id === btn.dataset.id);
      if (!confirm(`「${u.name}」を削除しますか？\nランキング・実績データも削除されます。`)) return;
      deleteUser(btn.dataset.id);
      renderUserList();
    });
  });
}

function showUserForm(userId) {
  const modal = document.getElementById('user-form-modal');
  const user  = userId ? loadUsers().find(u => u.id === userId) : null;
  const unlocked = user ? (user.unlockedCharas || ['kirby']) : ['kirby'];

  document.getElementById('user-form-title').textContent = user ? 'ユーザー編集' : 'ユーザー登録';
  document.getElementById('user-name-input').value = user ? user.name : '';

  const sel = document.getElementById('user-chara-select');
  sel.innerHTML = CHAR_LIST
    .filter(ch => unlocked.includes(ch.id))
    .map(ch => `<option value="${ch.id}" ${user && user.charaId === ch.id ? 'selected' : ''}>${ch.emoji} ${ch.name}</option>`)
    .join('');

  modal.classList.remove('hidden');

  const saveBtn   = document.getElementById('btn-user-form-save');
  const cancelBtn = document.getElementById('btn-user-form-cancel');

  const onSave = () => {
    const name = document.getElementById('user-name-input').value.trim();
    if (!name) { alert('なまえを入力してください'); return; }
    const charaId = sel.value;
    if (user) {
      updateUser(userId, { name, charaId });
    } else {
      const newUser = createUser(name, charaId);
      if (!getCurrentUserId()) setCurrentUserId(newUser.id);
    }
    modal.classList.add('hidden');
    renderUserList();
    saveBtn.removeEventListener('click', onSave);
    cancelBtn.removeEventListener('click', onCancel);
  };
  const onCancel = () => {
    modal.classList.add('hidden');
    saveBtn.removeEventListener('click', onSave);
    cancelBtn.removeEventListener('click', onCancel);
  };
  saveBtn.addEventListener('click', onSave);
  cancelBtn.addEventListener('click', onCancel);
}
