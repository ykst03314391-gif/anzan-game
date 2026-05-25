'use strict';

// ============================================================
// 画面管理
// ============================================================

const SCREENS = ['top', 'game', 'result', 'ranking', 'mission', 'collection', 'settings'];

function showScreen(id) {
  SCREENS.forEach(s => {
    document.getElementById(`screen-${s}`).classList.toggle('active', s === id);
  });
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

function getCharaPath(charaId, state) {
  return `images/chara/${charaId}/${state}.png`;
}

function setCharaState(state) {
  const user = getCurrentUser();
  if (!user) return;
  const img = document.getElementById('game-chara-img');
  const fb  = document.getElementById('game-chara-fallback');
  const charaId = user.charaId;
  const src = getCharaPath(charaId, state);
  img.src = src;
  img.onerror = () => {
    img.style.display = 'none';
    const ch = CHAR_LIST.find(c => c.id === charaId);
    fb.textContent = ch ? ch.emoji : '⭐';
    fb.style.display = '';
  };
  img.onload = () => {
    img.style.display = '';
    fb.style.display = 'none';
  };
}

// ============================================================
// ゲーム状態
// ============================================================

let _gs = null; // game state

function _initGameState(calcTypeId, mode, countOrTime) {
  _gs = {
    calcTypeId,
    mode,
    countOrTime,
    currentQ: null,
    answered: 0,
    correct: 0,
    startTime: Date.now(),
    elapsed: 0,
    remaining: mode === 'time' ? countOrTime : null,
    finished: false,
    timerInterval: null,
    charaTimer: null,
    answerInput: '',       // quotient input
    remainderInput: '',    // remainder input (わり算のみ)
    activeField: 'answer', // 'answer' | 'remainder'
  };
}

// ============================================================
// トップ画面
// ============================================================

let _selectedCalcId = null;
let _selectedMode   = null;
let _selectedCount  = null;

function initTopScreen() {
  const user = getCurrentUser();

  // ユーザー表示
  const userBadge = document.getElementById('top-user-badge');
  if (user) {
    const ch = CHAR_LIST.find(c => c.id === user.charaId);
    userBadge.textContent = `${ch ? ch.emoji : '⭐'} ${user.name}`;
    userBadge.classList.remove('hidden');
  } else {
    userBadge.classList.add('hidden');
  }

  // タブ
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

  // モードボタン
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _selectedMode = btn.dataset.mode;
      // count/time options 切替
      document.getElementById('count-options').classList.toggle('hidden', _selectedMode !== 'count');
      document.getElementById('time-options').classList.toggle('hidden',  _selectedMode !== 'time');
      _selectedCount = null;
      document.querySelectorAll('.count-btn, .time-btn').forEach(b => b.classList.remove('active'));
      _updateStartBtn();
    });
  });

  // 問題数ボタン
  document.querySelectorAll('.count-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _selectedCount = parseInt(btn.dataset.value);
      _updateStartBtn();
    });
  });

  // 時間ボタン
  document.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _selectedCount = parseInt(btn.dataset.value) * 60; // 秒に変換
      _updateStartBtn();
    });
  });

  // スタートボタン
  document.getElementById('btn-start').addEventListener('click', () => {
    if (!_canStart()) return;
    if (!getCurrentUser()) {
      alert('設定画面でユーザーを登録してください。');
      return;
    }
    startGame();
  });

  // ナビボタン
  document.getElementById('btn-go-ranking').addEventListener('click', () => { initRankingScreen(); showScreen('ranking'); });
  document.getElementById('btn-go-mission').addEventListener('click', () => { initMissionScreen(); showScreen('mission'); });
  document.getElementById('btn-go-collection').addEventListener('click', () => { initCollectionScreen(); showScreen('collection'); });
  document.getElementById('btn-go-settings').addEventListener('click', () => { initSettingsScreen(); showScreen('settings'); });
}

function _canStart() {
  return _selectedCalcId && _selectedMode && _selectedCount;
}

function _updateStartBtn() {
  document.getElementById('btn-start').disabled = !_canStart();
}

// ============================================================
// ゲーム画面
// ============================================================

function startGame() {
  const calcType = getCalcType(_selectedCalcId);
  _initGameState(_selectedCalcId, _selectedMode, _selectedCount);

  // ヘッダー
  document.getElementById('game-calc-label').textContent = calcType.label;
  document.getElementById('game-mode-label').textContent =
    _selectedMode === 'count'
      ? `${_selectedCount}もん`
      : `${_selectedCount / 60}ふん`;

  // 入力欄リセット
  _resetInput();

  // キャラ
  setCharaState('normal');

  showScreen('game');
  playSe('start');
  playBgm('game');

  // タイマー開始
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
  if (_selectedMode === 'count') {
    const s = _gs.elapsed;
    el.textContent = `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  } else {
    const s = _gs.remaining;
    el.textContent = `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
  }
}

function _nextQuestion() {
  if (_gs.finished) return;
  if (_selectedMode === 'count' && _gs.answered >= _selectedCount) {
    _endGame();
    return;
  }
  _gs.currentQ = generateQuestion(_gs.calcTypeId);
  _gs.answerInput = '';
  _gs.remainderInput = '';
  _gs.activeField = 'answer';
  _renderQuestion();
  _resetInput();

  // 問題数進捗
  if (_selectedMode === 'count') {
    document.getElementById('game-progress').textContent =
      `${_gs.answered + 1} / ${_selectedCount} もん`;
  } else {
    document.getElementById('game-progress').textContent =
      `${_gs.correct} もん正解`;
  }
}

function _renderQuestion() {
  const q = _gs.currentQ;
  document.getElementById('game-question').textContent = q.expr;
  const remRow = document.getElementById('game-remainder-row');
  if (q.hasRem) {
    remRow.classList.remove('hidden');
  } else {
    remRow.classList.add('hidden');
  }
  _updateAnswerDisplay();
}

function _resetInput() {
  _updateAnswerDisplay();
}

function _updateAnswerDisplay() {
  const q = _gs.currentQ;
  const ansEl  = document.getElementById('game-answer-display');
  const remEl  = document.getElementById('game-remainder-display');

  ansEl.textContent  = _gs.answerInput  || '　';
  if (q && q.hasRem) {
    remEl.textContent = _gs.remainderInput || '　';
    ansEl.classList.toggle('input-active',  _gs.activeField === 'answer');
    remEl.classList.toggle('input-active',  _gs.activeField === 'remainder');
  } else {
    ansEl.classList.add('input-active');
  }
}

function _inputDigit(d) {
  if (_gs.activeField === 'answer') {
    if (_gs.answerInput.length < 6) _gs.answerInput += d;
  } else {
    if (_gs.remainderInput.length < 4) _gs.remainderInput += d;
  }
  _updateAnswerDisplay();
}

function _inputClear() {
  if (_gs.activeField === 'answer') _gs.answerInput = '';
  else _gs.remainderInput = '';
  _updateAnswerDisplay();
}

function _switchField() {
  if (!_gs.currentQ || !_gs.currentQ.hasRem) return;
  _gs.activeField = _gs.activeField === 'answer' ? 'remainder' : 'answer';
  _updateAnswerDisplay();
}

function _submitAnswer() {
  const q = _gs.currentQ;
  if (!q) return;
  if (!_gs.answerInput) return;
  if (q.hasRem && !_gs.remainderInput) {
    _switchField();
    return;
  }

  const userAns = parseInt(_gs.answerInput, 10);
  const userRem = q.hasRem ? parseInt(_gs.remainderInput, 10) : null;

  const correct = q.hasRem
    ? (userAns === q.answer && userRem === q.remainder)
    : (userAns === q.answer);

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
  if (_gs.finished) return;
  _gs.finished = true;
  clearInterval(_gs.timerInterval);
  _gs.elapsed = Math.floor((Date.now() - _gs.startTime) / 1000);

  stopBgm();
  setTimeout(() => showResultScreen(), 300);
}

// ゲーム画面ボタン初期化（一度だけ）
function initGameButtons() {
  // タッチ数字ボタン
  document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _getCtx(); // iOS unlock
      _inputDigit(btn.dataset.num);
    });
  });
  document.getElementById('btn-num-clear').addEventListener('click', _inputClear);
  document.getElementById('btn-num-ok').addEventListener('click', _submitAnswer);
  document.getElementById('btn-switch-field').addEventListener('click', _switchField);

  // キーボード入力
  document.addEventListener('keydown', e => {
    const screen = document.getElementById('screen-game');
    if (!screen.classList.contains('active')) return;
    if (e.key >= '0' && e.key <= '9') _inputDigit(e.key);
    else if (e.key === 'Backspace') _inputClear();
    else if (e.key === 'Enter') _submitAnswer();
    else if (e.key === 'Tab') { e.preventDefault(); _switchField(); }
  });

  // 入力欄クリックで切替
  document.getElementById('game-answer-display').addEventListener('click', () => {
    _gs.activeField = 'answer'; _updateAnswerDisplay();
  });
  document.getElementById('game-remainder-display').addEventListener('click', () => {
    if (_gs.currentQ && _gs.currentQ.hasRem) { _gs.activeField = 'remainder'; _updateAnswerDisplay(); }
  });

  // やめるボタン
  document.getElementById('btn-game-quit').addEventListener('click', () => {
    if (!confirm('ゲームをやめますか？')) return;
    clearInterval(_gs.timerInterval);
    _gs.finished = true;
    stopBgm();
    showScreen('top');
    playBgm('main');
  });
}

// ============================================================
// 結果画面
// ============================================================

function showResultScreen() {
  const ct   = getCalcType(_gs.calcTypeId);
  const mode = _gs.mode;
  const score = mode === 'count' ? _gs.elapsed : _gs.correct;

  // スコア表示
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

  // BGM
  const bgmName = _gs.mode === 'time' && _gs.remaining <= 0 ? 'result_end' : 'result_clear';
  playBgm(bgmName);

  // ランキング
  const rankIn = checkRankIn(_gs.calcTypeId, mode, _gs.countOrTime, score);
  const rankSection = document.getElementById('result-rank-section');
  rankSection.innerHTML = '';
  if (rankIn) {
    rankSection.innerHTML = `<p class="rank-in-msg">🎉 ランキング入り！</p>`;
    const row = document.createElement('div');
    row.className = 'rank-input-row';
    row.innerHTML = `<input id="rank-name-input" type="text" placeholder="なまえを入力" maxlength="10">
                     <button id="btn-register-rank" class="btn btn-primary">登録</button>`;
    rankSection.appendChild(row);
    const user = getCurrentUser();
    if (user) document.getElementById('rank-name-input').value = user.name;
    document.getElementById('btn-register-rank').addEventListener('click', () => {
      const name = document.getElementById('rank-name-input').value.trim() || '名なし';
      addRankingEntry(_gs.calcTypeId, mode, _gs.countOrTime, name, score);
      playSe('ranking');
      rankSection.innerHTML = `<p class="rank-registered">✅ 登録しました！</p>`;
      // バッジ: ランキング入り
      _checkAndGrantBadge('ranking_entry');
    });
  }

  // ご褒美チェック
  _checkRewards();

  showScreen('result');
}

function _checkRewards() {
  const user = getCurrentUser();
  if (!user) return;

  // 正解数加算
  const updated = addCorrectCount(user.id, _gs.correct);

  // ミッション更新
  const missionState = addMissionCorrect(user.id, _gs.correct);
  if (missionState.achieved && !missionState._notified) {
    missionState._notified = true;
    saveMission(user.id, missionState);
    playSe('mission');
    _showRewardToast('📅 ミッションクリア！');
    _checkAndGrantBadge('mission_clear');
    // 履歴記録
    const ct = getCalcType(_gs.calcTypeId);
    const modeLabel = _gs.mode === 'count'
      ? `${_gs.countOrTime}もんチャレンジ`
      : `${_gs.countOrTime/60}ふんチャレンジ`;
    recordMissionHistory(user.id, modeLabel, ct.label);
  }

  // キャラアンロック確認
  CHAR_LIST.forEach(ch => {
    if (!updated.unlockedCharas.includes(ch.id) && updated.totalCorrect >= ch.requiredCount) {
      updated.unlockedCharas.push(ch.id);
      updateUser(updated.id, { unlockedCharas: updated.unlockedCharas });
      playSe('unlock');
      _showRewardToast(`🎉 ${ch.name} が使えるようになった！`);
    }
  });

  // イラストアンロック確認
  ILLUST_LIST.forEach(il => {
    if (!updated.unlockedIllustIds.includes(il.id) && updated.totalCorrect >= il.requiredCount) {
      updated.unlockedIllustIds.push(il.id);
      updateUser(updated.id, { unlockedIllustIds: updated.unlockedIllustIds });
      playSe('unlock');
      _showRewardToast(`🖼 「${il.label}」のイラストをゲット！`);
    }
  });

  // バッジチェック（正解数系）
  BADGE_LIST.forEach(b => {
    if (b.condition.type === 'total_correct' && updated.totalCorrect >= b.condition.count) {
      _checkAndGrantBadge(b.id);
    }
  });

  // パーフェクト
  if (_gs.answered > 0 && _gs.correct === _gs.answered) _checkAndGrantBadge('perfect');

  // スピードスター（10問チャレンジで60秒以内）
  if (_gs.mode === 'count' && _gs.countOrTime === 10 && _gs.elapsed <= 60) _checkAndGrantBadge('speed_star');

  // 全キャラ制覇
  const latestUser = getCurrentUser();
  if (latestUser && latestUser.unlockedCharas.length >= CHAR_LIST.length) _checkAndGrantBadge('all_chara');
  if (latestUser && latestUser.unlockedIllustIds.length >= ILLUST_LIST.length) _checkAndGrantBadge('all_illust');
}

function _checkAndGrantBadge(badgeId) {
  const user = getCurrentUser();
  if (!user) return;
  if (user.earnedBadgeIds.includes(badgeId)) return;
  const badge = BADGE_LIST.find(b => b.id === badgeId);
  if (!badge) return;
  user.earnedBadgeIds.push(badgeId);
  updateUser(user.id, { earnedBadgeIds: user.earnedBadgeIds });
  _showRewardToast(`${badge.icon} バッジ獲得：${badge.label}`);
}

let _toastTimer = null;
function _showRewardToast(msg) {
  const el = document.getElementById('reward-toast');
  el.textContent = msg;
  el.classList.add('show');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ============================================================
// ランキング画面
// ============================================================

function initRankingScreen() {
  const sel = document.getElementById('ranking-calc-select');
  sel.innerHTML = CALC_TYPES.map(ct =>
    `<option value="${ct.id}">${ct.group}：${ct.label}</option>`
  ).join('');

  const renderRanking = () => {
    const calcId = sel.value;
    const mode   = document.querySelector('.rank-mode-btn.active')?.dataset.mode || 'count';
    const ct     = document.querySelector('.rank-count-btn.active, .rank-time-btn.active')?.dataset.value;
    const countOrTime = ct ? (mode === 'time' ? parseInt(ct)*60 : parseInt(ct)) : null;

    document.getElementById('rank-count-options').classList.toggle('hidden', mode !== 'count');
    document.getElementById('rank-time-options').classList.toggle('hidden',  mode !== 'time');

    if (!countOrTime) { document.getElementById('ranking-table-body').innerHTML = '<tr><td colspan="3">条件を選んでください</td></tr>'; return; }

    const list = getTopRanking(calcId, mode, countOrTime);
    if (!list.length) {
      document.getElementById('ranking-table-body').innerHTML = '<tr><td colspan="3">記録なし</td></tr>';
      return;
    }
    document.getElementById('ranking-table-body').innerHTML = list.map((e, i) => {
      const score = mode === 'count'
        ? `${Math.floor(e.score/60).toString().padStart(2,'0')}:${(e.score%60).toString().padStart(2,'0')}`
        : `${e.score}もん`;
      return `<tr><td>${i+1}位</td><td>${e.name}</td><td>${score}</td></tr>`;
    }).join('');
  };

  sel.onchange = renderRanking;

  document.querySelectorAll('.rank-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rank-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.rank-count-btn, .rank-time-btn').forEach(b => b.classList.remove('active'));
      renderRanking();
    });
  });

  document.querySelectorAll('.rank-count-btn, .rank-time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rank-count-btn, .rank-time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderRanking();
    });
  });

  document.getElementById('btn-ranking-back').addEventListener('click', () => showScreen('top'));
  renderRanking();
}

// ============================================================
// 毎日ミッション画面
// ============================================================

function initMissionScreen() {
  const user = getCurrentUser();
  const state = user ? getMissionState(user.id) : { todayCorrect: 0, achieved: false, history: [] };

  const count = state.todayCorrect || 0;
  const goal  = MISSION_GOAL;
  const pct   = Math.min(100, Math.round(count / goal * 100));

  document.getElementById('mission-progress-bar').style.width = `${pct}%`;
  document.getElementById('mission-progress-text').textContent = `${count} / ${goal} もん`;

  const achieveEl = document.getElementById('mission-achieved');
  achieveEl.classList.toggle('hidden', !state.achieved);

  const history = state.history || [];
  const tbody = document.getElementById('mission-history-body');
  if (!history.length) {
    tbody.innerHTML = '<tr><td colspan="3">まだ記録がありません</td></tr>';
  } else {
    tbody.innerHTML = history.map(h =>
      `<tr><td>${h.date}</td><td>${h.mode}</td><td>${h.calc}</td></tr>`
    ).join('');
  }

  document.getElementById('btn-mission-back').addEventListener('click', () => showScreen('top'));
}

// ============================================================
// コレクション画面
// ============================================================

function initCollectionScreen() {
  const user = getCurrentUser();
  const earned  = user ? (user.earnedBadgeIds || []) : [];
  const unlIllu = user ? (user.unlockedIllustIds || []) : [];

  // バッジ
  const badgeGrid = document.getElementById('badge-grid');
  badgeGrid.innerHTML = BADGE_LIST.map(b => {
    const got = earned.includes(b.id);
    return `<div class="badge-item ${got ? 'earned' : 'locked'}">
      <div class="badge-icon">${got ? b.icon : '🔒'}</div>
      <div class="badge-label">${b.label}</div>
      <div class="badge-desc">${got ? b.desc : '？？？'}</div>
    </div>`;
  }).join('');

  // イラスト
  const illustGrid = document.getElementById('illust-grid');
  illustGrid.innerHTML = ILLUST_LIST.map(il => {
    const got = unlIllu.includes(il.id);
    if (got) {
      return `<div class="illust-item">
        <img src="images/illustrations/${il.file}" alt="${il.label}" onerror="this.style.display='none';this.nextElementSibling.style.display=''">
        <div class="illust-placeholder" style="display:none">🖼</div>
        <div class="illust-label">${il.label}</div>
      </div>`;
    } else {
      return `<div class="illust-item locked">
        <div class="illust-placeholder">🔒</div>
        <div class="illust-label">${il.requiredCount}もん正解でゲット</div>
      </div>`;
    }
  }).join('');

  document.getElementById('btn-collection-back').addEventListener('click', () => showScreen('top'));
}

// ============================================================
// 設定画面
// ============================================================

function initSettingsScreen() {
  renderUserList();

  // 入力方法
  const inputMode = getInputMode();
  document.querySelectorAll('.input-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === inputMode);
    btn.addEventListener('click', () => {
      document.querySelectorAll('.input-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setInputMode(btn.dataset.mode);
      applyInputMode();
    });
  });

  // ランキングリセット
  document.getElementById('btn-reset-ranking').addEventListener('click', () => {
    if (!confirm('ランキングをすべてリセットしますか？')) return;
    resetAllRankings();
    alert('ランキングをリセットしました。');
  });

  // 新規ユーザー
  document.getElementById('btn-add-user').addEventListener('click', () => {
    showUserForm(null);
  });

  document.getElementById('btn-settings-back').addEventListener('click', () => {
    initTopScreen();
    showScreen('top');
    playBgm('main');
  });
}

function renderUserList() {
  const users = loadUsers();
  const container = document.getElementById('user-list');
  if (!users.length) {
    container.innerHTML = '<p class="empty-msg">ユーザーがいません</p>';
    return;
  }
  const currentId = getCurrentUserId();
  container.innerHTML = users.map(u => {
    const ch = CHAR_LIST.find(c => c.id === u.charaId);
    const isActive = u.id === currentId;
    return `<div class="user-item ${isActive ? 'current' : ''}">
      <span class="user-chara">${ch ? ch.emoji : '⭐'}</span>
      <span class="user-name">${u.name}</span>
      <span class="user-correct">正解${u.totalCorrect}もん</span>
      <div class="user-actions">
        <button class="btn btn-sm btn-primary btn-select-user" data-id="${u.id}">${isActive ? '選択中' : '選択'}</button>
        <button class="btn btn-sm btn-secondary btn-edit-user" data-id="${u.id}">編集</button>
        <button class="btn btn-sm btn-danger btn-delete-user" data-id="${u.id}">削除</button>
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll('.btn-select-user').forEach(btn => {
    btn.addEventListener('click', () => {
      setCurrentUserId(btn.dataset.id);
      renderUserList();
    });
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
  const unlockedCharas = user ? (user.unlockedCharas || ['kirby']) : ['kirby'];

  document.getElementById('user-form-title').textContent = user ? 'ユーザー編集' : 'ユーザー登録';
  document.getElementById('user-name-input').value = user ? user.name : '';

  const charaSelect = document.getElementById('user-chara-select');
  charaSelect.innerHTML = '';
  CHAR_LIST.forEach(ch => {
    if (!unlockedCharas.includes(ch.id)) return;
    const opt = document.createElement('option');
    opt.value = ch.id;
    opt.textContent = `${ch.emoji} ${ch.name}`;
    if (user && user.charaId === ch.id) opt.selected = true;
    charaSelect.appendChild(opt);
  });

  modal.classList.remove('hidden');

  document.getElementById('btn-user-form-save').onclick = () => {
    const name = document.getElementById('user-name-input').value.trim();
    if (!name) { alert('なまえを入力してください'); return; }
    const charaId = charaSelect.value;
    if (user) {
      updateUser(userId, { name, charaId });
    } else {
      const newUser = createUser(name, charaId);
      if (!getCurrentUserId()) setCurrentUserId(newUser.id);
    }
    modal.classList.add('hidden');
    renderUserList();
  };

  document.getElementById('btn-user-form-cancel').onclick = () => {
    modal.classList.add('hidden');
  };
}

// ============================================================
// 入力モード切替
// ============================================================

function applyInputMode() {
  const mode = getInputMode();
  const numpad  = document.getElementById('game-numpad');
  const kbHint  = document.getElementById('game-kb-hint');
  numpad.classList.toggle('hidden', mode === 'keyboard');
  kbHint.classList.toggle('hidden', mode === 'touch');
}

// ============================================================
// 結果画面ボタン
// ============================================================

function initResultButtons() {
  document.getElementById('btn-result-top').addEventListener('click', () => {
    stopBgm();
    initTopScreen();
    showScreen('top');
    playBgm('main');
  });
  document.getElementById('btn-result-retry').addEventListener('click', () => {
    stopBgm();
    startGame();
  });
  document.getElementById('btn-result-ranking').addEventListener('click', () => {
    stopBgm();
    initRankingScreen();
    showScreen('ranking');
  });
}

// ============================================================
// 初期化
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initGameButtons();
  initResultButtons();

  // スタートアップオーバーレイ：ユーザー操作後にAudioContextを初期化
  const overlay = document.getElementById('startup-overlay');
  overlay.addEventListener('click', () => {
    _getCtx(); // AudioContext をユーザー操作タイミングで作成
    overlay.style.display = 'none';

    initTopScreen();
    playBgm('main');

    if (!loadUsers().length) {
      initSettingsScreen();
      showScreen('settings');
    }
  }, { once: true });
});
