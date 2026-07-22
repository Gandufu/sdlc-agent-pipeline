'use strict';
/**
 * gate-check.js（阶段门禁 PreToolUse 钩子）行为测试。
 * 覆盖设计取舍的全部分支：放行路径不误伤、阻断路径确定性生效。
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { GATE, mkProject, run, writeState, stateWith } = require('./helpers');

const event = (subagent_type) => JSON.stringify({ tool_name: 'Task', tool_input: { subagent_type } });
const gate = (stdin, projectDir) => run(GATE, [], { stdin, projectDir });

test('非阶段子代理（如 general-purpose）→ 放行', () => {
  const dir = mkProject();
  writeState(dir, stateWith()); // 即便处于编排模式也不干预
  const r = gate(event('general-purpose'), dir);
  assert.strictEqual(r.status, 0);
});

test('首阶段 requirements-analyst 与守门人 reviewer → 豁免放行', () => {
  const dir = mkProject();
  writeState(dir, stateWith());
  assert.strictEqual(gate(event('requirements-analyst'), dir).status, 0);
  assert.strictEqual(gate(event('reviewer'), dir).status, 0);
});

test('状态文件不存在（非编排模式）→ 不干预', () => {
  const r = gate(event('architect'), mkProject());
  assert.strictEqual(r.status, 0);
});

test('stdin 不可解析 → 不干预', () => {
  const dir = mkProject();
  writeState(dir, stateWith());
  const r = gate('not-json{{{', dir);
  assert.strictEqual(r.status, 0);
});

test('状态文件损坏 → 阻断并提示修复', () => {
  const dir = mkProject();
  writeState(dir, '{broken json');
  const r = gate(event('architect'), dir);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /无法解析状态文件/);
});

test('前置阶段未开始（pending）→ 阻断下一阶段子代理', () => {
  const dir = mkProject();
  writeState(dir, stateWith()); // 全 pending
  const r = gate(event('architect'), dir);
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /阶段门禁未通过/);
  assert.match(r.stderr, /requirement/);
});

test('前置阶段已退回（returned）→ 阻断', () => {
  const dir = mkProject();
  writeState(dir, stateWith({ design: { status: 'returned' } , requirement: { status: 'confirmed' } }));
  const r = gate(event('developer'), dir);
  assert.strictEqual(r.status, 2);
});

test('前置阶段已确认（confirmed）→ 放行', () => {
  const dir = mkProject();
  writeState(dir, stateWith({ requirement: { status: 'confirmed', confirmed_at: '2026-07-22T01:00:00.000Z' } }));
  assert.strictEqual(gate(event('architect'), dir).status, 0);

  writeState(dir, stateWith({ requirement: { status: 'confirmed' }, design: { status: 'confirmed' } }));
  assert.strictEqual(gate(event('developer'), dir).status, 0);

  writeState(dir, stateWith({ requirement: { status: 'confirmed' }, design: { status: 'confirmed' }, code: { status: 'confirmed' } }));
  assert.strictEqual(gate(event('tester'), dir).status, 0);
});

test('跨阶段阻断不误伤更远阶段的依赖判断（developer 只依赖 design）', () => {
  const dir = mkProject();
  // design 已确认但 code 未确认：developer 应放行，tester 应阻断
  writeState(dir, stateWith({ requirement: { status: 'confirmed' }, design: { status: 'confirmed' } }));
  assert.strictEqual(gate(event('developer'), dir).status, 0);
  assert.strictEqual(gate(event('tester'), dir).status, 2);
});
