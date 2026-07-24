// Webアセットを www/ に集約する（Capacitor の webDir 用）。
// 既存のファイルはリポジトリのルートに置いたまま、ビルド時にここへコピーする。
import { readdirSync, rmSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(root, 'www');

// コピー対象のディレクトリ
const dirs = ['css', 'js', 'images', 'sounds'];
// コピー対象の拡張子（ルート直下）
const rootFileExts = ['.html'];

// www/ をクリーンに作り直す
rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

// ルート直下の .html をコピー
for (const name of readdirSync(root)) {
  if (rootFileExts.some((ext) => name.endsWith(ext))) {
    cpSync(join(root, name), join(www, name));
  }
}

// アセットディレクトリをコピー
for (const dir of dirs) {
  const src = join(root, dir);
  if (existsSync(src)) {
    cpSync(src, join(www, dir), { recursive: true });
  }
}

console.log('www/ を生成しました:', www);
