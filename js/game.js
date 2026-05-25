'use strict';

// ---- 計算タイプ定義 ----

const CALC_TYPES = [
  // たし算
  { id: 'add_1_1', label: '1＋1', group: 'たし算', op: 'add', dA: 1, dB: 1 },
  { id: 'add_2_1', label: '2＋1', group: 'たし算', op: 'add', dA: 2, dB: 1 },
  { id: 'add_2_2', label: '2＋2', group: 'たし算', op: 'add', dA: 2, dB: 2 },
  { id: 'add_3_1', label: '3＋1', group: 'たし算', op: 'add', dA: 3, dB: 1 },
  { id: 'add_3_2', label: '3＋2', group: 'たし算', op: 'add', dA: 3, dB: 2 },
  { id: 'add_3_3', label: '3＋3', group: 'たし算', op: 'add', dA: 3, dB: 3 },
  { id: 'add_4_1', label: '4＋1', group: 'たし算', op: 'add', dA: 4, dB: 1 },
  { id: 'add_4_2', label: '4＋2', group: 'たし算', op: 'add', dA: 4, dB: 2 },
  { id: 'add_4_3', label: '4＋3', group: 'たし算', op: 'add', dA: 4, dB: 3 },
  { id: 'add_4_4', label: '4＋4', group: 'たし算', op: 'add', dA: 4, dB: 4 },
  // ひき算
  { id: 'sub_1_1', label: '1－1', group: 'ひき算', op: 'sub', dA: 1, dB: 1 },
  { id: 'sub_2_1', label: '2－1', group: 'ひき算', op: 'sub', dA: 2, dB: 1 },
  { id: 'sub_2_2', label: '2－2', group: 'ひき算', op: 'sub', dA: 2, dB: 2 },
  { id: 'sub_3_1', label: '3－1', group: 'ひき算', op: 'sub', dA: 3, dB: 1 },
  { id: 'sub_3_2', label: '3－2', group: 'ひき算', op: 'sub', dA: 3, dB: 2 },
  { id: 'sub_3_3', label: '3－3', group: 'ひき算', op: 'sub', dA: 3, dB: 3 },
  { id: 'sub_4_1', label: '4－1', group: 'ひき算', op: 'sub', dA: 4, dB: 1 },
  { id: 'sub_4_2', label: '4－2', group: 'ひき算', op: 'sub', dA: 4, dB: 2 },
  { id: 'sub_4_3', label: '4－3', group: 'ひき算', op: 'sub', dA: 4, dB: 3 },
  { id: 'sub_4_4', label: '4－4', group: 'ひき算', op: 'sub', dA: 4, dB: 4 },
  // かけ算
  { id: 'mul_kuku', label: '九九',  group: 'かけ算', op: 'mul', dA: 1, dB: 1 },
  { id: 'mul_2_1',  label: '2×1',  group: 'かけ算', op: 'mul', dA: 2, dB: 1 },
  { id: 'mul_2_2',  label: '2×2',  group: 'かけ算', op: 'mul', dA: 2, dB: 2 },
  { id: 'mul_3_1',  label: '3×1',  group: 'かけ算', op: 'mul', dA: 3, dB: 1 },
  { id: 'mul_3_2',  label: '3×2',  group: 'かけ算', op: 'mul', dA: 3, dB: 2 },
  // わり算
  { id: 'div_1_1_no', label: '1÷1（あまりなし）', group: 'わり算', op: 'div', dA: 1, dB: 1, rem: false },
  { id: 'div_1_1_r',  label: '1÷1（あまりあり）', group: 'わり算', op: 'div', dA: 1, dB: 1, rem: true  },
  { id: 'div_2_1_no', label: '2÷1（あまりなし）', group: 'わり算', op: 'div', dA: 2, dB: 1, rem: false },
  { id: 'div_2_1_r',  label: '2÷1（あまりあり）', group: 'わり算', op: 'div', dA: 2, dB: 1, rem: true  },
  { id: 'div_3_1_no', label: '3÷1（あまりなし）', group: 'わり算', op: 'div', dA: 3, dB: 1, rem: false },
  { id: 'div_3_1_r',  label: '3÷1（あまりあり）', group: 'わり算', op: 'div', dA: 3, dB: 1, rem: true  },
  // ランダム
  { id: 'rand_1', label: 'ランダム（1桁）', group: 'ランダム', op: 'rand', digitLevel: 1 },
  { id: 'rand_2', label: 'ランダム（2桁）', group: 'ランダム', op: 'rand', digitLevel: 2 },
  { id: 'rand_3', label: 'ランダム（3桁）', group: 'ランダム', op: 'rand', digitLevel: 3 },
];

function getCalcType(id) { return CALC_TYPES.find(c => c.id === id) || null; }

// ---- 問題生成 ----

function _rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function _dMin(d) { return d === 1 ? 1 : Math.pow(10, d - 1); }
function _dMax(d) { return Math.pow(10, d) - 1; }

function generateQuestion(calcTypeId) {
  const ct = getCalcType(calcTypeId);
  if (!ct) return null;
  if (ct.op === 'rand') return _genRand(ct.digitLevel);
  return _genByType(ct);
}

function _genByType(ct) {
  const { op, dA, dB } = ct;

  if (op === 'add') {
    const a = _rand(_dMin(dA), _dMax(dA));
    const b = _rand(_dMin(dB), _dMax(dB));
    return { expr: `${a} ＋ ${b} ＝`, answer: a + b, hasRem: false };
  }

  if (op === 'sub') {
    let a = _rand(_dMin(dA), _dMax(dA));
    const bMax = Math.min(_dMax(dB), a);
    const bMin = _dMin(dB);
    if (bMax < bMin) return _genByType(ct);
    const b = _rand(bMin, bMax);
    return { expr: `${a} － ${b} ＝`, answer: a - b, hasRem: false };
  }

  if (op === 'mul') {
    const a = _rand(_dMin(dA), _dMax(dA));
    const b = _rand(_dMin(dB), _dMax(dB));
    return { expr: `${a} × ${b} ＝`, answer: a * b, hasRem: false };
  }

  if (op === 'div') {
    if (!ct.rem) {
      const b = _rand(_dMin(dB), _dMax(dB));
      const qMin = Math.ceil(_dMin(dA) / b);
      const qMax = Math.floor(_dMax(dA) / b);
      if (qMin > qMax || qMin < 1) return _genByType(ct);
      const q = _rand(Math.max(1, qMin), qMax);
      const a = b * q;
      return { expr: `${a} ÷ ${b} ＝`, answer: q, hasRem: false };
    } else {
      const a = _rand(_dMin(dA), _dMax(dA));
      const bMax = Math.min(_dMax(dB), a - 1);
      const bMin = _dMin(dB);
      if (bMax < bMin) return _genByType(ct);
      const b = _rand(bMin, bMax);
      const q = Math.floor(a / b);
      const r = a % b;
      if (r === 0) return _genByType(ct);
      return { expr: `${a} ÷ ${b} ＝`, answer: q, remainder: r, hasRem: true };
    }
  }

  return null;
}

const _RAND_POOLS = {
  1: { add: ['add_1_1'], sub: ['sub_1_1'], mul: ['mul_kuku'],         div: ['div_1_1_no', 'div_1_1_r'] },
  2: { add: ['add_2_1', 'add_2_2'], sub: ['sub_2_1', 'sub_2_2'], mul: ['mul_2_1', 'mul_2_2'], div: ['div_2_1_no', 'div_2_1_r'] },
  3: { add: ['add_3_1', 'add_3_2', 'add_3_3'], sub: ['sub_3_1', 'sub_3_2', 'sub_3_3'], mul: ['mul_3_1', 'mul_3_2'], div: ['div_3_1_no', 'div_3_1_r'] },
};

function _genRand(level) {
  const ops = ['add', 'sub', 'mul', 'div'];
  const op  = ops[_rand(0, 3)];
  const pool = _RAND_POOLS[level][op];
  const id  = pool[_rand(0, pool.length - 1)];
  return generateQuestion(id);
}
