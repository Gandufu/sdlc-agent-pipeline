'use strict';
/**
 * bin/scaffold.js（脚手架拷贝脚本）行为测试。
 *
 * 重点回归：full 模式曾因 prefix 在递归中重复拼接而崩溃（首层 frontend/ 不存在 → ENOENT）
 * 且产生 src/frontend/frontend/App.vue 嵌套路径——这里直接断言这两点不再发生。
 *
 * 运行：node --test tests/
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SCAFFOLD = path.join(ROOT, 'bin', 'scaffold.js');

/** 创建隔离的临时目标目录。 */
function mkTarget() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-scaffold-'));
}

/** 运行 scaffold；env 可覆盖（如把 CLAUDE_PLUGIN_ROOT 指向空目录以触发模板缺失）。 */
function runScaffold(args, { env = {} } = {}) {
  const res = spawnSync(process.execPath, [SCAFFOLD, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  return { status: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}

const exists = (dir, rel) => fs.existsSync(path.join(dir, ...rel.split('/')));
const read = (dir, rel) => fs.readFileSync(path.join(dir, ...rel.split('/')), 'utf8');

test('java-spring 单栈：模板平铺拷贝到 target 根，不产生 frontend/', () => {
  const dir = mkTarget();
  const r = runScaffold(['--stack', 'java-spring', '--target', dir]);
  assert.strictEqual(r.status, 0);
  assert.ok(exists(dir, 'pom.xml'));
  assert.ok(exists(dir, 'src/main/java/com/example/Application.java'));
  assert.ok(exists(dir, 'src/main/resources/application.yml'));
  assert.ok(!exists(dir, 'frontend'), '单栈模式不得创建 frontend/ 目录');
});

test('vue 单栈：模板平铺拷贝到 target 根，不进 frontend/', () => {
  const dir = mkTarget();
  const r = runScaffold(['--stack', 'vue', '--target', dir]);
  assert.strictEqual(r.status, 0);
  assert.ok(exists(dir, 'package.json'));
  assert.ok(exists(dir, 'vite.config.js'));
  assert.ok(exists(dir, 'src/App.vue'));
  assert.ok(exists(dir, 'src/router/index.js'));
  assert.ok(!exists(dir, 'frontend'), 'vue 单栈不应落入 frontend/');
});

test('full 模式：java-spring 平铺、vue 落入 frontend/ 且只套一层（回归 ENOENT 崩溃与嵌套）', () => {
  const dir = mkTarget();
  const r = runScaffold(['--stack', 'full', '--target', dir]);
  assert.strictEqual(r.status, 0);
  // java-spring 仍在 target 根
  assert.ok(exists(dir, 'pom.xml'), 'java-spring 应平铺到 target 根');
  assert.ok(exists(dir, 'src/main/java/com/example/Application.java'));
  // vue 进 frontend/，只一层
  assert.ok(exists(dir, 'frontend/package.json'));
  assert.ok(exists(dir, 'frontend/src/App.vue'));
  assert.ok(exists(dir, 'frontend/src/router/index.js'));
  // 关键回归点：不得出现 frontend/src/frontend/... 的重复嵌套
  assert.ok(
    !exists(dir, 'frontend/src/frontend/App.vue'),
    'vue 子目录不得再嵌套一层 frontend/（曾因 prefix 在递归中重复拼接而出错）'
  );
});

test('不覆盖已有文件：预置文件被保留并记为 [skip]', () => {
  const dir = mkTarget();
  // 预先放一个 package.json，内容应原样保留
  fs.mkdirSync(path.join(dir), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), 'PROTECTED');
  const r = runScaffold(['--stack', 'vue', '--target', dir]);
  assert.strictEqual(r.status, 0);
  assert.strictEqual(read(dir, 'package.json'), 'PROTECTED', '已有文件不得被覆盖');
  assert.match(r.stdout, /\[skip\].*package\.json/);
  // 未冲突的文件仍正常拷贝
  assert.ok(exists(dir, 'vite.config.js'));
});

test('无效 stack：打印用法并退出 1', () => {
  const dir = mkTarget();
  const r = runScaffold(['--stack', 'bogus', '--target', dir]);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /用法/);
});

test('模板目录缺失：报错并退出 2（不静默失败）', () => {
  const dir = mkTarget();
  // 把 CLAUDE_PLUGIN_ROOT 指向一个不含 templates/scaffold/ 的空目录
  const fakeRoot = mkTarget();
  const r = runScaffold(['--stack', 'vue', '--target', dir], { env: { CLAUDE_PLUGIN_ROOT: fakeRoot } });
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /模板目录不存在/);
});
