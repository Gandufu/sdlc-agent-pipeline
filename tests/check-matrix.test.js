'use strict';
/**
 * check-matrix.py（追溯矩阵一致性检查）行为测试。
 * 用 Node 子进程调 Python，与现有 tests/ 风格一致。
 *
 * 运行：node --test tests/*.test.js （需 PATH 中有 python 或 python3）
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'skills', 'traceability-matrix', 'scripts', 'check-matrix.py');

// 探测 python 可执行名（Windows 常为 python，其它平台常为 python3）
function pyBin() {
  for (const bin of ['python', 'python3']) {
    const r = spawnSync(bin, ['--version'], { encoding: 'utf8', shell: true });
    if (r.status === 0 || (r.stdout && r.stdout.includes('Python'))) return bin;
  }
  return 'python3';
}
const PY = pyBin();

function mkdtemp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-matrix-'));
}

/** 写一份矩阵文件；rows 为数据行数组（不含表头/分隔行）。 */
function writeMatrix(dir, rows) {
  const p = path.join(dir, 'matrix.md');
  const header = '| REQ编号 | 需求摘要 | DES编号 | 设计摘要 | 代码位置 | TC编号 | 测试结论 | 阶段状态 |\n|---|---|---|---|---|---|---|---|\n';
  const body = rows.map((r) => '| ' + r.join(' | ') + ' |').join('\n');
  fs.writeFileSync(p, header + body + '\n', 'utf8');
  return p;
}

function runCheck(args) {
  const res = spawnSync(PY, [SCRIPT, ...args], { encoding: 'utf8' });
  return { status: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}

const FULL_ROW = ['REQ-USER-001', '用户登录', 'DES-001', '登录设计', 'UserController.login', 'TC-001', '通过', '测试已通过'];

test('完整矩阵（test 阶段）：退出码 0', () => {
  const dir = mkdtemp();
  const m = writeMatrix(dir, [FULL_ROW]);
  const r = runCheck(['--matrix', m, '--phase', 'test']);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /完整/);
});

test('DES 列允许 N/A(复用) 作为合法非空值', () => {
  const dir = mkdtemp();
  const m = writeMatrix(dir, [
    ['REQ-USER-001', '用户登录', 'N/A(复用)', '复用既有鉴权', 'UserController.login', 'TC-001', '通过', '测试已通过'],
  ]);
  const r = runCheck(['--matrix', m, '--phase', 'test']);
  assert.strictEqual(r.status, 0);
});

test('test 阶段缺 TC 列：退出码 1 并报告', () => {
  const dir = mkdtemp();
  const m = writeMatrix(dir, [
    ['REQ-USER-001', '用户登录', 'DES-001', '登录设计', 'UserController.login', '', '', '编码已确认'],
  ]);
  const r = runCheck(['--matrix', m, '--phase', 'test']);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /TC编号/);
});

test('design 阶段不要求 TC：缺 TC 仍退出码 0', () => {
  const dir = mkdtemp();
  const m = writeMatrix(dir, [
    ['REQ-USER-001', '用户登录', 'DES-001', '登录设计', '', '', '', '设计已确认'],
  ]);
  const r = runCheck(['--matrix', m, '--phase', 'design']);
  assert.strictEqual(r.status, 0);
});

test('REQ 编号复用：退出码 1', () => {
  const dir = mkdtemp();
  const m = writeMatrix(dir, [FULL_ROW, FULL_ROW]);
  const r = runCheck(['--matrix', m, '--phase', 'test']);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /重复/);
});

test('REQ 编号为占位（XXX）：退出码 1', () => {
  const dir = mkdtemp();
  const m = writeMatrix(dir, [
    ['REQ-XXX-001', '用户登录', 'DES-001', '登录设计', 'UserController.login', 'TC-001', '通过', '测试已通过'],
  ]);
  const r = runCheck(['--matrix', m, '--phase', 'test']);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /占位/);
});

test('requirement 阶段缺需求摘要：退出码 1', () => {
  const dir = mkdtemp();
  const m = writeMatrix(dir, [['REQ-USER-001', '', '', '', '', '', '', '需求已确认']]);
  const r = runCheck(['--matrix', m, '--phase', 'requirement']);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /需求摘要/);
});

test('矩阵文件不存在：退出码 2', () => {
  const r = runCheck(['--matrix', path.join(mkdtemp(), 'nope.md'), '--phase', 'test']);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /不存在/);
});

test('非法阶段状态值：退出码 1', () => {
  const dir = mkdtemp();
  const m = writeMatrix(dir, [
    ['REQ-USER-001', '用户登录', 'DES-001', '登录设计', 'UserController.login', 'TC-001', '通过', '搞定了'],
  ]);
  const r = runCheck(['--matrix', m, '--phase', 'test']);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /阶段状态/);
});
