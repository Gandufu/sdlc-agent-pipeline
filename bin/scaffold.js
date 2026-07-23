#!/usr/bin/env node
/**
 * 脚手架拷贝脚本（零依赖）
 *
 * 用法：scaffold --stack <java-spring|vue|full> --target <目录>
 *
 * 从 ${CLAUDE_PLUGIN_ROOT}/templates/scaffold/<stack>/ 拷贝项目骨架到目标目录。
 * 不覆盖已有文件。插件启用后本脚本经 bin/ 加入 PATH，可直接 `scaffold` 调用。
 */
'use strict';

const fs = require('fs');
const path = require('path');

// 解析参数
const args = process.argv.slice(2);
let stack = null;
let target = '.';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--stack' && args[i + 1]) { stack = args[++i]; }
  else if (args[i] === '--target' && args[i + 1]) { target = args[++i]; }
}

if (!stack || !['java-spring', 'vue', 'full'].includes(stack)) {
  console.error('用法: scaffold --stack <java-spring|vue|full> [--target <目录>]');
  process.exit(1);
}

// 定位模板目录：优先 CLAUDE_PLUGIN_ROOT，否则相对本脚本
const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
const templateBase = path.join(pluginRoot, 'templates', 'scaffold');

const stacks = stack === 'full' ? ['java-spring', 'vue'] : [stack];
const targetDir = path.resolve(target);

let copied = 0;
let skipped = 0;

// 把单个模板目录递归拷到 dest（dest 为该模板对应的目标根，已在调用前算好）。
// full 模式下 vue 的 frontend/ 前缀在调用前拼进 destRoot，递归内部不再关心它——
// 否则前缀会在每层递归被重复拼接，产生 src/frontend/frontend/App.vue 这类嵌套路径，
// 且首层因 frontend/ 目录尚不存在而直接 ENOENT 崩溃。
function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`[error] 模板目录不存在: ${src}`);
    process.exit(2);
  }
  // 无条件保证目标根存在：单栈模式 targetDir 可能尚未创建，full 模式 vue 的 frontend/ 也要在此落盘
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else if (fs.existsSync(destPath)) {
      console.log(`[skip] ${path.relative(targetDir, destPath)}`);
      skipped++;
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`[copy] ${path.relative(targetDir, destPath)}`);
      copied++;
    }
  }
}

for (const s of stacks) {
  const srcDir = path.join(templateBase, s);
  // full 模式下 vue 进 frontend/ 子目录，java-spring 仍平铺到 targetDir；单栈模式直接拷到 targetDir
  const destRoot = (stack === 'full' && s === 'vue') ? path.join(targetDir, 'frontend') : targetDir;
  copyRecursive(srcDir, destRoot);
}

console.log(`\n完成：拷贝 ${copied} 个文件，跳过 ${skipped} 个已有文件。`);
process.exit(0);
