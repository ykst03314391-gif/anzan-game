'use strict';

const SETTINGS_KEY     = 'anzan_settings';
const USERS_KEY        = 'anzan_users';
const CURRENT_USER_KEY = 'anzan_current_user';

// ---- 設定 ----

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; }
}
function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }
function getInputMode() { return loadSettings().inputMode || 'touch'; }
function setInputMode(mode) { saveSettings({ ...loadSettings(), inputMode: mode }); }

// ---- ユーザー ----

function loadUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch { return []; }
}
function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

function getCurrentUserId() { return localStorage.getItem(CURRENT_USER_KEY) || null; }
function setCurrentUserId(id) {
  if (id) localStorage.setItem(CURRENT_USER_KEY, id);
  else localStorage.removeItem(CURRENT_USER_KEY);
}
function getCurrentUser() {
  const id = getCurrentUserId();
  return id ? (loadUsers().find(u => u.id === id) || null) : null;
}

function createUser(name, charaId = 'kirby') {
  const users = loadUsers();
  const user = {
    id: Date.now().toString(),
    name,
    charaId,
    totalCorrect: 0,
    unlockedCharas:   ['kirby'],
    earnedBadgeIds:   [],
    unlockedIllustIds: [],
  };
  users.push(user);
  saveUsers(users);
  return user;
}

function updateUser(id, fields) {
  const users = loadUsers().map(u => u.id === id ? { ...u, ...fields } : u);
  saveUsers(users);
  return users.find(u => u.id === id);
}

function deleteUser(id) {
  saveUsers(loadUsers().filter(u => u.id !== id));
  localStorage.removeItem(`anzan_missions_${id}`);
  if (getCurrentUserId() === id) setCurrentUserId(null);
}

function addCorrectCount(userId, count) {
  const users = loadUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return null;
  user.totalCorrect = (user.totalCorrect || 0) + count;
  saveUsers(users);
  return user;
}

// ---- ミッション ----

const MISSIONS = [
  { id: 'any_100',    label: 'なんでもいいから100もん正解',     type: 'total_correct', goal: 100 },
  { id: 'add_clear',  label: '足し算をクリア',                 type: 'calc_clear',    group: 'add' },
  { id: 'sub_clear',  label: 'ひき算をクリア',                 type: 'calc_clear',    group: 'sub' },
  { id: 'mul_clear',  label: 'かけ算をクリア',                 type: 'calc_clear',    group: 'mul' },
  { id: 'div_clear',  label: '割り算をクリア',                 type: 'calc_clear',    group: 'div' },
  { id: 'rand_clear', label: 'ランダムをクリア',               type: 'calc_clear',    group: 'rand' },
  { id: 'any_10',     label: 'なんでもいいから10回クリア',     type: 'total_clears',  goal: 10 },
  { id: 'count_3',    label: 'もんだいすうモードを3回クリア', type: 'mode_clears',   mode: 'count', goal: 3 },
  { id: 'time_3',     label: 'せいげん時間モードを3回クリア', type: 'mode_clears',   mode: 'time',  goal: 3 },
];

function _todayStr() {
  return new Date().toLocaleDateString('ja-JP');
}

function loadMissionData(userId) {
  try {
    const data = JSON.parse(localStorage.getItem(`anzan_missions_${userId}`)) || {};
    if (data._date !== _todayStr()) {
      const reset = { _date: _todayStr() };
      saveMissionData(userId, reset);
      return reset;
    }
    return data;
  } catch {
    return { _date: _todayStr() };
  }
}
function saveMissionData(userId, data) {
  localStorage.setItem(`anzan_missions_${userId}`, JSON.stringify(data));
}

function getMissionProgress(userId) {
  const data = loadMissionData(userId);
  return MISSIONS.map(m => {
    const state = data[m.id] || { progress: 0, achieved: false };
    let progress = state.progress;
    if (!state.achieved) {
      if (m.type === 'total_correct')
        progress = Math.min(m.goal, data._dailyCorrect || 0);
      else if (m.type === 'total_clears')
        progress = Math.min(m.goal, data._clears || 0);
      else if (m.type === 'mode_clears')
        progress = Math.min(m.goal, data[`_${m.mode}_clears`] || 0);
    }
    return { ...m, progress, achieved: state.achieved };
  });
}

function updateMissionsAfterGame(userId, { calcTypeId, mode, gameCorrect }) {
  const data = loadMissionData(userId);
  const calcGroup = calcTypeId.split('_')[0];
  const newlyAchieved = [];

  data._dailyCorrect = (data._dailyCorrect || 0) + gameCorrect;
  data._clears        = (data._clears || 0) + 1;
  data[`_${mode}_clears`] = (data[`_${mode}_clears`] || 0) + 1;

  MISSIONS.forEach(m => {
    const state = data[m.id] || { progress: 0, achieved: false };
    if (state.achieved) { data[m.id] = state; return; }

    if (m.type === 'total_correct') {
      state.progress = Math.min(m.goal, data._dailyCorrect);
      if (state.progress >= m.goal) { state.achieved = true; newlyAchieved.push(m.id); }
    } else if (m.type === 'calc_clear') {
      if (calcGroup === m.group) {
        state.progress = 1;
        state.achieved = true;
        newlyAchieved.push(m.id);
      }
    } else if (m.type === 'total_clears') {
      state.progress = Math.min(m.goal, data._clears);
      if (state.progress >= m.goal) { state.achieved = true; newlyAchieved.push(m.id); }
    } else if (m.type === 'mode_clears') {
      if (m.mode === mode) {
        state.progress = Math.min(m.goal, data[`_${m.mode}_clears`]);
        if (state.progress >= m.goal) { state.achieved = true; newlyAchieved.push(m.id); }
      }
    }
    data[m.id] = state;
  });

  saveMissionData(userId, data);
  return newlyAchieved;
}
