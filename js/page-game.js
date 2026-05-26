'use strict';

const config = JSON.parse(localStorage.getItem('anzan_pending_game') || 'null');

let _gs = null;

// ---- キャラ表示 ----
function setCharaState(state) {
  const user    = getCurrentUser();
  const charaId = user ? user.charaId : 'kirby';
  const img     = document.getElementById('game-chara-img');
  const fb      = document.getElementById('game-chara-fallback');
  img.src = `images/chara/${charaId}/${state}.png`;
  img.onerror = () => {
    img.style.display = 'none';
    const ch = CHAR_LIST.find(c => c.id === charaId);
    fb.textContent = ch ? ch.emoji : '⭐';
    fb.style.display = '';
  };
  img.onload = () => { img.style.display = ''; fb.style.display = 'none'; };
}

// ---- タイマー ----
function _fmt(s) {
  return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
}

function _updateTimerDisplay() {
  const s = config.mode === 'count' ? _gs.elapsed : _gs.remaining;
  document.getElementById('game-timer').textContent = _fmt(s);
}

// ---- 問題 ----
function _nextQuestion() {
  if (_gs.finished) return;
  if (config.mode === 'count' && _gs.answered >= config.countOrTime) { _endGame(); return; }

  _gs.currentQ       = generateQuestion(config.calcTypeId);
  _gs.answerInput    = '';
  _gs.remainderInput = '';
  _gs.activeField    = 'answer';

  document.getElementById('game-question').textContent = _gs.currentQ.expr;

  const hasRem = _gs.currentQ.hasRem;
  document.getElementById('game-remainder-row').classList.toggle('hidden', !hasRem);
  document.getElementById('btn-switch-field').classList.toggle('hidden',   !hasRem);

  if (config.mode === 'count') {
    document.getElementById('game-progress').textContent =
      `${_gs.answered + 1} / ${config.countOrTime} もん`;
  } else {
    document.getElementById('game-progress').textContent = `${_gs.correct} もん正解`;
  }
  _updateAnswerDisplay();
}

function _updateAnswerDisplay() {
  if (!_gs) return;
  const ansEl = document.getElementById('game-answer-display');
  const remEl = document.getElementById('game-remainder-display');
  ansEl.textContent = _gs.answerInput    || '　';
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
  setTimeout(() => {
    el.className = 'feedback';
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
  setTimeout(_showResult, 400);
}

// ---- ランキングテーブル描画（結果画面用） ----
function _renderResultRanking() {
  const mode = config.mode;
  const list = getTopRanking(config.calcTypeId, mode, config.countOrTime);
  const pct  = e => e.answered > 0 ? Math.round(e.correct / e.answered * 100) + '%' : '0%';

  if (mode === 'count') {
    document.getElementById('result-ranking-thead').innerHTML =
      '<th>順位</th><th>正答率</th><th>タイム</th><th>日付</th>';
  } else {
    document.getElementById('result-ranking-thead').innerHTML =
      '<th>順位</th><th>正解数</th><th>正答率</th><th>日付</th>';
  }

  document.getElementById('result-ranking-body').innerHTML = list.length
    ? list.map((e, i) => {
        if (mode === 'count') {
          return `<tr><td>${i+1}位</td><td>${e.correct}/${e.answered}</td><td>${_fmt(e.elapsed)}</td><td>${e.date}</td></tr>`;
        } else {
          return `<tr><td>${i+1}位</td><td>${e.correct}もん</td><td>${pct(e)}</td><td>${e.date}</td></tr>`;
        }
      }).join('')
    : `<tr><td colspan="4">まだ記録がありません</td></tr>`;
}

// ---- 結果 ----
function _showResult() {
  document.getElementById('section-game').classList.add('hidden');
  document.getElementById('section-result').classList.remove('hidden');

  const ct   = getCalcType(config.calcTypeId);
  const mode = config.mode;

  document.getElementById('result-calc-label').textContent = ct.label;
  if (mode === 'count') {
    document.getElementById('result-score-label').textContent = 'タイム';
    document.getElementById('result-score-value').textContent = _fmt(_gs.elapsed);
  } else {
    document.getElementById('result-score-label').textContent = '正解数';
    document.getElementById('result-score-value').textContent = `${_gs.correct} もん`;
  }
  document.getElementById('result-correct-count').textContent =
    `正解 ${_gs.correct} / ${_gs.answered} もん`;

  playBgm('result_clear');
  _checkRewards();

  // ランキング登録判定
  const notify = document.getElementById('result-rank-notify');
  notify.innerHTML = '';
  if (checkRankIn(config.calcTypeId, mode, config.countOrTime, _gs.correct, _gs.answered, _gs.elapsed)) {
    notify.innerHTML = `<p class="rank-in-msg">🎉 ランキング入り！</p>
      <button id="btn-register-rank" class="btn btn-primary" style="margin-bottom:12px;">登録</button>`;
    document.getElementById('btn-register-rank').addEventListener('click', () => {
      addRankingEntry(config.calcTypeId, mode, config.countOrTime, _gs.correct, _gs.answered, _gs.elapsed);
      playSe('ranking');
      notify.innerHTML = `<p class="rank-registered" style="margin-bottom:8px;">✅ 登録しました！</p>`;
      _checkAndGrantBadge('ranking_entry');
      _renderResultRanking();
    }, { once: true });
  }
  _renderResultRanking();
}

// ---- ご褒美 ----
let _toastTimer = null;
function _showToast(msg) {
  const el = document.getElementById('reward-toast');
  el.textContent = msg;
  el.classList.add('show');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
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

function _checkRewards() {
  const user = getCurrentUser();
  if (!user) return;
  const updated = addCorrectCount(user.id, _gs.correct);

  // ミッション
  const newlyAchieved = updateMissionsAfterGame(user.id, {
    calcTypeId:  config.calcTypeId,
    mode:        config.mode,
    gameCorrect: _gs.correct,
  });
  if (newlyAchieved.length > 0) {
    playSe('mission');
    newlyAchieved.forEach(id => {
      const m = MISSIONS.find(x => x.id === id);
      if (m) _showToast(`📅 ミッション達成：${m.label}`);
    });
    _checkAndGrantBadge('mission_clear');
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

  // バッジ
  BADGE_LIST.forEach(b => {
    if (b.condition.type === 'total_correct' && updated.totalCorrect >= b.condition.count)
      _checkAndGrantBadge(b.id);
  });
  if (_gs.answered > 0 && _gs.correct === _gs.answered) _checkAndGrantBadge('perfect');
  if (config.mode === 'count' && config.countOrTime === 10 && _gs.elapsed <= 60) _checkAndGrantBadge('speed_star');
  const latest = getCurrentUser();
  if (latest) {
    if (latest.unlockedCharas.length >= CHAR_LIST.length)      _checkAndGrantBadge('all_chara');
    if (latest.unlockedIllustIds.length >= ILLUST_LIST.length) _checkAndGrantBadge('all_illust');
  }
}

// ---- 初期化 ----
document.addEventListener('DOMContentLoaded', () => {
  if (!config) { window.location.href = 'main.html'; return; }

  // ヘッダー表示
  const ct = getCalcType(config.calcTypeId);
  document.getElementById('game-calc-label').textContent = ct.label;
  document.getElementById('game-mode-label').textContent =
    config.mode === 'count' ? `${config.countOrTime}もん` : `${config.countOrTime/60}ふん`;

  // 入力モード
  const inputMode = getInputMode();
  document.getElementById('game-numpad').classList.toggle('hidden',   inputMode === 'keyboard');
  document.getElementById('game-kb-hint').classList.toggle('hidden',  inputMode === 'touch');

  // ゲーム状態初期化
  _gs = {
    currentQ: null, answered: 0, correct: 0,
    startTime: Date.now(), elapsed: 0,
    remaining: config.mode === 'time' ? config.countOrTime : null,
    finished: false, timerInterval: null, charaTimer: null,
    answerInput: '', remainderInput: '', activeField: 'answer',
  };

  setCharaState('normal');
  startBgmOnInteraction('game');
  playSe('start');

  // タイマー
  if (config.mode === 'count') {
    _gs.timerInterval = setInterval(() => {
      _gs.elapsed = Math.floor((Date.now() - _gs.startTime) / 1000);
      _updateTimerDisplay();
    }, 200);
  } else {
    _gs.timerInterval = setInterval(() => {
      _gs.remaining = Math.max(0, config.countOrTime - Math.floor((Date.now() - _gs.startTime) / 1000));
      _updateTimerDisplay();
      if (_gs.remaining <= 0) _endGame();
    }, 200);
  }

  _nextQuestion();

  // ボタン
  document.querySelectorAll('.num-btn[data-num]').forEach(btn => {
    btn.addEventListener('click', () => { getAudioCtx(); _inputDigit(btn.dataset.num); });
  });
  document.getElementById('btn-num-clear').addEventListener('click', _inputClear);
  document.getElementById('btn-num-ok').addEventListener('click', _submitAnswer);
  document.getElementById('btn-switch-field').addEventListener('click', _switchField);

  document.getElementById('game-answer-display').addEventListener('click', () => {
    if (_gs) { _gs.activeField = 'answer'; _updateAnswerDisplay(); }
  });
  document.getElementById('game-remainder-display').addEventListener('click', () => {
    if (_gs && _gs.currentQ?.hasRem) { _gs.activeField = 'remainder'; _updateAnswerDisplay(); }
  });

  document.addEventListener('keydown', e => {
    if (document.getElementById('section-result') &&
        !document.getElementById('section-result').classList.contains('hidden')) return;
    if (e.key >= '0' && e.key <= '9') _inputDigit(e.key);
    else if (e.key === 'Backspace')   _inputClear();
    else if (e.key === 'Enter')       _submitAnswer();
    else if (e.key === 'Tab')       { e.preventDefault(); _switchField(); }
  });

  document.getElementById('btn-game-quit').addEventListener('click', () => {
    if (!confirm('ゲームをやめますか？')) return;
    clearInterval(_gs.timerInterval);
    if (_gs.charaTimer) clearTimeout(_gs.charaTimer);
    _gs.finished = true;
    stopBgm();
    window.location.href = 'main.html';
  });

  // 結果ボタン
  document.getElementById('btn-result-top').addEventListener('click', () => {
    window.location.href = 'main.html';
  });
  document.getElementById('btn-result-retry').addEventListener('click', () => {
    window.location.href = 'game.html';
  });
});
