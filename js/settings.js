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
  localStorage.removeItem(`anzan_mission_${id}`);
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

// ---- 毎日ミッション ----

const MISSION_GOAL = 10;

function loadMission(userId) {
  try { return JSON.parse(localStorage.getItem(`anzan_mission_${userId}`)) || {}; } catch { return {}; }
}
function saveMission(userId, data) {
  localStorage.setItem(`anzan_mission_${userId}`, JSON.stringify(data));
}

function getTodayStr() {
  return new Date().toLocaleDateString('ja-JP');
}

function getMissionState(userId) {
  const data = loadMission(userId);
  const today = getTodayStr();
  if (data.date !== today) {
    return { date: today, todayCorrect: 0, achieved: false, history: data.history || [] };
  }
  return data;
}

function addMissionCorrect(userId, count) {
  const state = getMissionState(userId);
  if (state.achieved) return state;
  state.todayCorrect = Math.min(MISSION_GOAL, (state.todayCorrect || 0) + count);
  if (state.todayCorrect >= MISSION_GOAL) state.achieved = true;
  saveMission(userId, state);
  return state;
}

function recordMissionHistory(userId, modeLabel, calcLabel) {
  const state = getMissionState(userId);
  state.history = state.history || [];
  state.history.unshift({ date: state.date, mode: modeLabel, calc: calcLabel });
  if (state.history.length > 50) state.history = state.history.slice(0, 50);
  saveMission(userId, state);
}
