'use strict';

const CHAR_LIST = [
  { id: 'kirby',      name: 'カービィ',   emoji: '⭐', requiredCount: 0   },
  { id: 'metaknight', name: 'メタナイト', emoji: '🌙', requiredCount: 50  },
  { id: 'waddledee',  name: 'ワドルディ', emoji: '🎀', requiredCount: 150 },
  { id: 'dedede',     name: 'デデデ大王', emoji: '👑', requiredCount: 300 },
  { id: 'elfilin',    name: 'エフィリン', emoji: '✨', requiredCount: 500 },
];

const BADGE_LIST = [
  { id: 'first_correct', label: 'はじめの一歩',    icon: '⭐', desc: 'はじめて1もん正解',         condition: { type: 'total_correct', count: 1    } },
  { id: 'correct_10',    label: '10もんクリア',     icon: '🌟', desc: '正解数が10もんになった',     condition: { type: 'total_correct', count: 10   } },
  { id: 'correct_100',   label: '100もんクリア',    icon: '💫', desc: '正解数が100もんになった',    condition: { type: 'total_correct', count: 100  } },
  { id: 'correct_1000',  label: '1000もんクリア',   icon: '🏆', desc: '正解数が1000もんになった',   condition: { type: 'total_correct', count: 1000 } },
  { id: 'speed_star',    label: 'スピードスター',   icon: '⚡', desc: '10問を60秒以内にクリア',     condition: { type: 'speed_clear', seconds: 60   } },
  { id: 'perfect',       label: 'パーフェクト',     icon: '💯', desc: '1ゲームで全問正解',          condition: { type: 'perfect'                    } },
  { id: 'all_chara',     label: '全キャラ制覇',     icon: '🎮', desc: '全キャラクターをアンロック', condition: { type: 'all_chara'                  } },
  { id: 'all_illust',    label: 'コレクター',       icon: '🖼', desc: '全イラストをアンロック',     condition: { type: 'all_illust'                 } },
  { id: 'ranking_entry', label: 'ランキング入り',   icon: '📊', desc: 'はじめてランキングに入る',   condition: { type: 'ranking_entry'              } },
  { id: 'mission_clear', label: 'ミッションクリア', icon: '📅', desc: 'ミッションをはじめてクリア', condition: { type: 'mission_clear'              } },
];

const ILLUST_LIST = [
  { id: 'illust_01', label: 'カービィ お祝い',  file: 'kirby_01.png',      requiredCount: 30   },
  { id: 'illust_02', label: 'メタナイト 登場',  file: 'metaknight_01.png', requiredCount: 100  },
  { id: 'illust_03', label: 'ワドルディ',       file: 'waddledee_01.png',  requiredCount: 200  },
  { id: 'illust_04', label: 'デデデ大王 豪快',  file: 'dedede_01.png',     requiredCount: 400  },
  { id: 'illust_05', label: 'エフィリン',       file: 'elfilin_01.png',    requiredCount: 600  },
  { id: 'illust_06', label: '全員集合！',       file: 'all_01.png',        requiredCount: 1000 },
];
