'use strict';

// ============================================================
// 画面管理
// ============================================================

const SCREENS = ['top', 'game', 'result', 'ranking', 'mission', 'collection', 'settings'];

function showScreen(id) {
  SCREENS.forEach(s => {
    document.getElementById(`screen-${s}`).classList.toggle('active', s === id);
  });
  // 画面表示時にコンテンツを更新
  if      (id === 'top')        renderTopScreen();
  else if (id === 'settings')   renderSettingsScreen();
  else if (id === 'ranking')    renderRankingTable();
  else if (id === 'mission')    renderMissionScreen();
  else if (id === 'collection') renderCollectionScreen();
}

// ============================================================
// 音声
// ============================================================

let _audioCtx = null;
function _getCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

const _seCache = {};
async function playSe(name) {
  try {
    const ctx = _getCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    const path = `sounds/se/${name}.mp3`;
    if (!_seCache[path]) {
      const res = await fetch(path);
      if (!res.ok) return;
      _seCache[path] = await ctx.decodeAudioData(await res.arrayBuffer());
    }
    const src = ctx.createBufferSource();
    src.buffer = _seCache[path];
    src.connect(ctx.destination);
    src.start();
  } catch {}
}

let _bgmNode = null, _bgmGain = null;
const _bgmCache = {};
async function playBgm(name) {
  stopBgm();
  try {
    const ctx = _getCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    const path = `sounds/bgm/${name}.mp3`;
    if (!_bgmCache[path]) {
      const res = await fetch(path);
      if (!res.ok) return;
      _bgmCache[path] = await ctx.decodeAudioData(await res.arrayBuffer());
    }
    _bgmGain = ctx.createGain();
    _bgmGain.gain.value = 0.5;
    _bgmGain.connect(ctx.destination);
    const loop = () => {
      _bgmNode = ctx.createBufferSource();
      _bgmNode.buffer = _bgmCache[path];
      _bgmNode.connect(_bgmGain);
      _bgmNode.onended = () => { if (_bgmNode) loop(); };
      _bgmNode.start();
    };
    loop();
  } catch {}
}

function stopBgm() {
  if (_bgmNode) {
    try { _bgmNode.onended = null; _bgmNode.stop(); } catch {}
    _bgmNode = null;
  }
  _bgmGain = null;
}

// ============================================================
// キャラクター表示
// ============================================================

function setCharaState(state) {
  const user = getCurrentUser();
  const img  = document.getElementById('game-chara-img');
  const fb   = document.getElementById('game-chara-fallback');
  const charaId = user ? user.charaId : 'kirby';
  img.src = `images/chara/${charaId}/${state}.png`;
  img.onerror = () => {
    img.style.display = 'none';
    const ch = CHAR_LIST.find(c => c.id === charaId);
    fb.textContent = ch ? ch.emoji : '⭐';
    fb.style.display = '';
  };
  img.onload = () => { img.style.display = ''; fb.style.display = 'none'; };
}

// ============================================================
// トップ画面：コンテンツ更新
// ============================================================

function renderTopScreen() {
  const user    = getCurrentUser();
  const badge   = document.getElementById('top-user-badge');
  if (user) {
    const ch = CHAR_LIST.find(c => c.id === user.charaId);
    badge.textContent = `${ch ? ch.emoji : '⭐'} ${user.name}`;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

// ============================================================
// ゲーム状態
// ============================================================

let _selectedCalcId = null;
let _selectedMode   = null;
let _selectedCount  = null;
let _gs = null;

function _canStart() {
  return _selectedCalcId && _selectedMode && _selectedCount;
}
function _updateStartBtn() {
  document.getElementById('btn-start').disabled = !_canStart();
}

// ============================================================
// ゲーム開始
// ============================================================

function startGame() {
  if (!getCurrentUser()) {
    alert('設定画面でユーザーを登録してください。');
    return;
  }
  _gs = {
    calcTypeId:  _selectedCalcId,
    mode:        _selectedMode,
    countOrTime: _selectedCount,
    currentQ:    null,
    answered:    0,
    correct:     0,
    startTime:   Date.now(),
    elapsed:     0,
    remaining:   _selectedMode === 'time' ? _selectedCount : null,
    finished:    false,
    timerInterval: null,
    charaTimer:  null,
    answerInput:    '',
    remainderInput: '',
    activeField:    'answer',
  };

  const calcType = getCalcType(_selectedCalcId);
  document.getElementById('game-calc-label').textContent = calcType.label;
  document.getElementById('game-mode-label').textContent =
    _selectedMode === 'count' ? `${_selectedCount}もん` : `${_selectedCount / 60}ふん`;

  _resetAnswerInput();
  setCharaState('normal');
  applyInputMode();

  showScreen('game');
  playSe('start');
  stopBgm();
  playBgm('game');

  if (_selectedMode === 'count') {
    _gs.timerInterval = setInterval(() => {
      _gs.elapsed = Math.floor((Date.now() - _gs.startTime) / 1000);
      _updateTimerDisplay();
    }, 200);
  } else {
    _gs.timerInterval = setInterval(() => {
      _gs.remaining = Math.max(0, _gs.countOrTime - Math.floor((Date.now() - _gs.startTime) / 1000));
      _updateTimerDisplay();
      if (_gs.remaining <= 0) _endGame();
    }, 200);
  }

  _nextQuestion();
}

function _updateTimerDisplay() {
  const el = document.getElementById('game-timer');
  const s  = _selectedMode === 'count' ? _gs.elapsed : _gs.remaining;
  el.textContent = `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
}

function _nextQuestion() {
  if (_gs.finished) return;
  if (_selectedMode === 'count' && _gs.answered >= _selectedCount) { _endGame(); return; }

  _gs.currentQ       = generateQuestion(_gs.calcTypeId);
  _gs.answerInput    = '';
  _gs.remainderInput = '';
  _gs.activeField    = 'answer';

  document.getElementById('game-question').textContent = _gs.currentQ.expr;
  const remRow = document.getElementById('game-remainder-row');
  const swBtn  = document.getElementById('btn-switch-field');
  if (_gs.currentQ.hasRem) { remRow.classList.remove('hidden'); swBtn.classList.remove('hidden'); }
  else                     { remRow.classList.add('hidden');    swBtn.classList.add('hidden'); }

  if (_selectedMode === 'count') {
    document.getElementById('game-progress').textContent = `${_gs.answered + 1} / ${_selectedCount} もん`;
  } else {
    document.getElementById('game-progress').textContent = `${_gs.correct} もん正解`;
  }

  _updateAnswerDisplay();
}

function _resetAnswerInput() {
  _gs && (_gs.answerInput = '', _gs.remainderInput = '', _gs.activeField = 'answer');
  _updateAnswerDisplay();
}

function _updateAnswerDisplay() {
  const ansEl = document.getElementById('game-answer-display');
  const remEl = document.getElementById('game-remainder-display');
  if (!_gs) return;
  ansEl.textContent = _gs.answerInput  || '　';
  remEl.textContent = _gs.remainderInput || '　';
  const hasRem = _gs.currentQ && _gs.currentQ.hasRem;
  ansEl.classList.toggle('input-active', !hasRem || _gs.activeField === 'answer');
  remEl.classList.toggle('input-active',  hasRem && _gs.activeField === 'remainder');
}

function _inputDigit(d) {
  if (!_gs || _gs.finished) return;
  if (_gs.activeField === 'answer') {
    if (_gs.answerInput.length < 6) _gs.answerInput += d;
  } else {
    if (_gs.remainderInput.length < 4) _gs.remainderInput += d;
  }
  _updateAnswerDisplay();
}

function _inputClear() {
  if (!_gs) return;
  if (_gs.activeField === 'answer') _gs.answerInput = '';
  else _gs.remainderInput = '';
  _updateAnswerDisplay();
}

function _switchField() {
  if (!_gs || !_gs.currentQ || !_gs.currentQ.hasRem) return;
  _gs.activeField = _gs.activeField === 'answer' ? 'remainder' : 'answer';
  _updateAnswerDisplay();
}

function _submitAnswer() {
  if (!_gs || _gs.finished || !_gs.currentQ) return;
  if (!_gs.answerInput) return;
  const q = _gs.currentQ;
  if (q.hasRem && !_gs.remainderInput) { _switchField(); return; }

  const correct = q.hasRem
    ? (parseInt(_gs.answerInput) === q.answer && parseInt(_gs.remainderInput) === q.remainder)
    : (parseInt(_gs.answerInput) === q.answer);

  _gs.answered++;
  if (correct) {
    _gs.correct++;
    playSe('correct');
    setCharaState('happy');
    _showFeedback(true, q);
  } else {
    playSe('wrong');
    setCharaState('sad');
    _showFeedback(false, q);
  }

  if (_gs.charaTimer) clearTimeout(_gs.charaTimer);
  _gs.charaTimer = setTimeout(() => setCharaState('normal'), 1000);
}

function _showFeedback(correct, q) {
  const el = document.getElementById('game-feedback');
  if (correct) {
    el.textContent = '⭕ せいかい！';
    el.className = 'feedback correct';
  } else {
    let ans = q.answer.toString();
    if (q.hasRem) ans += ` あまり ${q.remainder}`;
    el.textContent = `❌ こたえは ${ans}`;
    el.className = 'feedback wrong';
  }
  el.classList.remove('hidden');
  setTimeout(() => {
    el.classList.add('hidden');
    if (!_gs.finished) _nextQuestion();
  }, 900);
}

function _endGame() {
  if (!_gs || _gs.finished) return;
  _gs.finished = true;
  clearInterval(_gs.timerInterval);
  if (_gs.charaTimer) clearTimeout(_gs.charaTimer);
  _gs.elapsed = Math.floor((Date.now() - _gs.startTime) / 1000);
  stopBgm();
  setTimeout(() => _showResultScreen(), 300);
}

// ============================================================
// 結果画面
// ============================================================

function _showResultScreen() {
  const ct    = getCalcType(_gs.calcTypeId);
  const mode  = _gs.mode;
  const score = mode === 'count' ? _gs.elapsed : _gs.correct;

  document.getElementById('result-calc-label').textContent = ct.label;
  if (mode === 'count') {
    const s = _gs.elapsed;
    document.getElementById('result-score-label').textContent = 'タイム';
    document.getElementById('result-score-value').textContent =
      `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  } else {
    document.getElementById('result-score-label').textContent = '正解数';
    document.getElementById('result-score-value').textContent = `${_gs.correct} もん`;
  }
  document.getElementById('result-correct-count').textContent =
    `正解 ${_gs.correct} / ${_gs.answered} もん`;

  playBgm('result_clear');

  // ランキング
  const rankIn     = checkRankIn(_gs.calcTypeId, mode, _gs.countOrTime, score);
  const rankSection = document.getElementById('result-rank-section');
  rankSection.innerHTML = '';
  if (rankIn) {
    rankSection.innerHTML = `<p class="rank-in-msg">🎉 ランキング入り！</p>
      <div class="rank-input-row">
        <input id="rank-name-input" type="text" placeholder="なまえを入力" maxlength="10">
        <button id="btn-register-rank" class="btn btn-primary">登録</button>
      </div>`;
    const user = getCurrentUser();
    if (user) document.getElementById('rank-name-input').value = user.name;
    document.getElementById('btn-register-rank').addEventListener('click', () => {
      const name = document.getElementById('rank-name-input').value.trim() || '名なし';
      addRankingEntry(_gs.calcTypeId, mode, _gs.countOrTime, name, score);
      playSe('ranking');
      rankSection.innerHTML = `<p class="rank-registered">✅ 登録しました！</p>`;
      _checkAndGrantBadge('ranking_entry');
    }, { once: true });
  }

  // ご褒美チェック
  _checkRewards();

  // screen-game は active を外してから result を表示
  SCREENS.forEach(s => document.getElementById(`screen-${s}`).classList.remove('active'));
  document.getElementById('screen-result').classList.add('active');
}

// ============================================================
// ご褒美
// ============================================================

function _checkRewards() {
  const user = getCurrentUser();
  if (!user) return;
  const updated = addCorrectCount(user.id, _gs.correct);

  // ミッション
  const ms = addMissionCorrect(user.id, _gs.correct);
  if (ms.achieved && !ms._notified) {
    ms._notified = true;
    saveMission(user.id, ms);
    playSe('mission');
    _showToast('📅 ミッションクリア！');
    _checkAndGrantBadge('mission_clear');
    const ct = getCalcType(_gs.calcTypeId);
    const modeLabel = _gs.mode === 'count'
      ? `${_gs.countOrTime}もんチャレンジ` : `${_gs.countOrTime/60}ふんチャレンジ`;
    recordMissionHistory(user.id, modeLabel, ct.label);
  }

  // キャラアンロック
  CHAR_LIST.forEach(ch => {
    if (!updated.unlockedCharas.includes(ch.id) && updated.totalCorrect >= ch.requiredCount) {
      updated.unlockedCharas.push(ch.id);
      updateUser(updated.id, { unlockedCharas: updated.unlockedCharas });
      playSe('unlock');
      _showToast(`🎉 ${ch.name} が使えるようになった！`);
    }
  });

  // イラストアンロック
  ILLUST_LIST.forEach(il => {
    if (!updated.unlockedIllustIds.includes(il.id) && updated.totalCorrect >= il.requiredCount) {
      updated.unlockedIllustIds.push(il.id);
      updateUser(updated.id, { unlockedIllustIds: updated.unlockedIllustIds });
      playSe('unlock');
      _showToast(`🖼 「${il.label}」のイラストをゲット！`);
    }
  });

  // バッジ（正解数）
  BADGE_LIST.forEach(b => {
    if (b.condition.type === 'total_correct' && updated.totalCorrect >= b.condition.count)
      _checkAndGrantBadge(b.id);
  });
  if (_gs.answered > 0 && _gs.correct === _gs.answered) _checkAndGrantBadge('perfect');
  if (_gs.mode === 'count' && _gs.countOrTime === 10 && _gs.elapsed <= 60) _checkAndGrantBadge('speed_star');
  const latest = getCurrentUser();
  if (latest) {
    if (latest.unlockedCharas.length >= CHAR_LIST.length)     _checkAndGrantBadge('all_chara');
    if (latest.unlockedIllustIds.length >= ILLUST_LIST.length) _checkAndGrantBadge('all_illust');
  }
}

function _checkAndGrantBadge(badgeId) {
  const user = getCurrentUser();
  if (!user || user.earnedBadgeIds.includes(badgeId)) return;
  const badge = BADGE_LIST.find(b => b.id === badgeId);
  if (!badge) return;
  user.earnedBadgeIds.push(badgeId);
  updateUser(user.id, { earnedBadgeIds: user.earnedBadgeIds });
  _showToast(`${badge.icon} バッジ獲得：${badge.label}`);
}

let _toastTimer = null;
function _showToast(msg) {
  const el = document.getElementById('reward-toast');
  el.textContent = msg;
  el.classList.add('show');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ============================================================
// ランキング画面：コンテンツ更新
// ============================================================

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

// ============================================================
// ミッション画面：コンテンツ更新
// ============================================================

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

// ============================================================
// コレクション画面：コンテンツ更新
// ============================================================

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

// ============================================================
// 設定画面：コンテンツ更新
// ============================================================

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

// ============================================================
// 入力モード
// ============================================================

function applyInputMode() {
  const mode = getInputMode();
  document.getElementById('game-numpad').classList.toggle('hidden', mode === 'keyboard');
  document.getElementById('game-kb-hint').classList.toggle('hidden', mode === 'touch');
}

// ============================================================
// 全ボタン初期化（1回のみ）
// ============================================================

function initAllButtons() {

  // ---- スタートアップ ----
  document.getElementById('startup-overlay').addEventListener('click', () => {
    _getCtx();
    document.getElementById('startup-overlay').style.display = 'none';
    showScreen('top');
    playBgm('main');
    if (!loadUsers().length) showScreen('settings');
  }, { once: true });

  // ---- トップ：計算タブ ----
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

  // ---- トップ：計算ボタン ----
  document.querySelectorAll('.calc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.calc-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _selectedCalcId = btn.dataset.calcId;
      _updateStartBtn();
    });
  });

  // ---- トップ：モード ----
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

  // ---- トップ：問題数 ----
  document.querySelectorAll('.count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _selectedCount = parseInt(btn.dataset.value);
      _updateStartBtn();
    });
  });

  // ---- トップ：制限時間 ----
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _selectedCount = parseInt(btn.dataset.value) * 60;
      _updateStartBtn();
    });
  });

  // ---- トップ：スタート ----
  document.getElementById('btn-start').addEventListener('click', () => {
    if (_canStart()) startGame();
  });

  // ---- トップ：ナビ ----
  document.getElementById('btn-go-ranking').addEventListener('click', () => {
    stopBgm(); showScreen('ranking');
  });
  document.getElementById('btn-go-mission').addEventListener('click', () => {
    showScreen('mission');
  });
  document.getElementById('btn-go-collection').addEventListener('click', () => {
    showScreen('collection');
  });
  document.getElementById('btn-go-settings').addEventListener('click', () => {
    showScreen('settings');
  });

  // ---- 各画面の戻るボタン ----
  document.getElementById('btn-ranking-back').addEventListener('click', () => {
    showScreen('top'); playBgm('main');
  });
  document.getElementById('btn-mission-back').addEventListener('click', () => {
    showScreen('top');
  });
  document.getElementById('btn-collection-back').addEventListener('click', () => {
    showScreen('top');
  });
  document.getElementById('btn-settings-back').addEventListener('click', () => {
    showScreen('top'); playBgm('main');
  });

  // ---- ゲーム：テンキー ----
  document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => _inputDigit(btn.dataset.num));
  });
  document.getElementById('btn-num-clear').addEventListener('click', _inputClear);
  document.getElementById('btn-num-ok').addEventListener('click', _submitAnswer);
  document.getElementById('btn-switch-field').addEventListener('click', _switchField);

  // ---- ゲーム：キーボード ----
  document.addEventListener('keydown', e => {
    if (!document.getElementById('screen-game').classList.contains('active')) return;
    if (e.key >= '0' && e.key <= '9') _inputDigit(e.key);
    else if (e.key === 'Backspace')   _inputClear();
    else if (e.key === 'Enter')       _submitAnswer();
    else if (e.key === 'Tab')       { e.preventDefault(); _switchField(); }
  });

  // ---- ゲーム：答え欄クリック ----
  document.getElementById('game-answer-display').addEventListener('click', () => {
    if (_gs) { _gs.activeField = 'answer'; _updateAnswerDisplay(); }
  });
  document.getElementById('game-remainder-display').addEventListener('click', () => {
    if (_gs && _gs.currentQ && _gs.currentQ.hasRem) { _gs.activeField = 'remainder'; _updateAnswerDisplay(); }
  });

  // ---- ゲーム：やめる ----
  document.getElementById('btn-game-quit').addEventListener('click', () => {
    if (!confirm('ゲームをやめますか？')) return;
    clearInterval(_gs.timerInterval);
    if (_gs.charaTimer) clearTimeout(_gs.charaTimer);
    _gs.finished = true;
    stopBgm();
    showScreen('top');
    playBgm('main');
  });

  // ---- 結果 ----
  document.getElementById('btn-result-top').addEventListener('click', () => {
    stopBgm(); showScreen('top'); playBgm('main');
  });
  document.getElementById('btn-result-retry').addEventListener('click', () => {
    stopBgm(); startGame();
  });
  document.getElementById('btn-result-ranking').addEventListener('click', () => {
    stopBgm(); showScreen('ranking');
  });

  // ---- ランキング：フィルター ----
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

  // ---- 設定：ユーザー追加 ----
  document.getElementById('btn-add-user').addEventListener('click', () => showUserForm(null));

  // ---- 設定：入力方法 ----
  document.querySelectorAll('.input-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.input-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setInputMode(btn.dataset.mode);
    });
  });

  // ---- 設定：ランキングリセット ----
  document.getElementById('btn-reset-ranking').addEventListener('click', () => {
    if (!confirm('ランキングをすべてリセットしますか？')) return;
    resetAllRankings();
    alert('ランキングをリセットしました。');
  });
}

// ============================================================
// 初期化
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initAllButtons();
});
