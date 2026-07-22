'use strict';
/**
 * sdlc-state.js（流水线状态管理）行为测试。
 * 覆盖状态机跃迁、覆写保护、--brief 上下文注入模式与损坏处理。
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { STATE, mkProject, run, writeState, stateWith } = require('./helpers');

const state = (args, projectDir) => run(STATE, args, { projectDir });
const stateFile = (dir) => path.join(dir, '.sdlc', 'pipeline-state.json');
const readState = (dir) => JSON.parse(fs.readFileSync(stateFile(dir), 'utf8'));

test('init：创建四阶段 pending 状态并从模板初始化追溯矩阵', () => {
  const dir = mkProject();
  const r = state(['init', 'user-points'], dir);
  assert.strictEqual(r.status, 0);
  const s = readState(dir);
  assert.strictEqual(s.feature, 'user-points');
  for (const p of ['requirement', 'design', 'code', 'test']) {
    assert.strictEqual(s.phases[p].status, 'pending');
  }
  assert.ok(fs.existsSync(path.join(dir, 'docs', 'traceability-matrix.md')), '追溯矩阵应从模板初始化');
});

test('init：已有状态时默认不覆盖（覆写保护）', () => {
  const dir = mkProject();
  state(['init', 'f1'], dir);
  state(['confirm', 'requirement'], dir);
  const r = state(['init', 'f2'], dir);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /已存在/);
  assert.strictEqual(readState(dir).feature, 'f1', '原状态不得被覆盖');
  assert.strictEqual(readState(dir).phases.requirement.status, 'confirmed', '已确认态不得丢失');
});

test('init --force：强制覆盖', () => {
  const dir = mkProject();
  state(['init', 'f1'], dir);
  state(['confirm', 'requirement'], dir);
  const r = state(['init', 'f2', '--force'], dir);
  assert.strictEqual(r.status, 0);
  assert.strictEqual(readState(dir).feature, 'f2');
  assert.strictEqual(readState(dir).phases.requirement.status, 'pending');
});

test('confirm：写入 confirmed 与时间戳', () => {
  const dir = mkProject();
  state(['init', 'f1'], dir);
  const r = state(['confirm', 'design'], dir);
  assert.strictEqual(r.status, 0);
  const ph = readState(dir).phases.design;
  assert.strictEqual(ph.status, 'confirmed');
  assert.ok(ph.confirmed_at);
});

test('confirm：无效阶段报错退出', () => {
  const dir = mkProject();
  state(['init', 'f1'], dir);
  const r = state(['confirm', 'bogus'], dir);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /无效阶段/);
});

test('revoke：confirmed → returned，其后门禁应关闭', () => {
  const dir = mkProject();
  state(['init', 'f1'], dir);
  state(['confirm', 'requirement'], dir);
  const r = state(['revoke', 'requirement'], dir);
  assert.strictEqual(r.status, 0);
  const ph = readState(dir).phases.requirement;
  assert.strictEqual(ph.status, 'returned');
  assert.ok(ph.returned_at);
});

test('revoke：无状态文件时报错', () => {
  const r = state(['revoke', 'requirement'], mkProject());
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /无可撤销/);
});

test('reset：删除状态文件（退出编排模式）', () => {
  const dir = mkProject();
  state(['init', 'f1'], dir);
  assert.ok(fs.existsSync(stateFile(dir)));
  const r = state(['reset'], dir);
  assert.strictEqual(r.status, 0);
  assert.ok(!fs.existsSync(stateFile(dir)));
});

test('损坏状态：confirm 走 load() 路径报错退出', () => {
  const dir = mkProject();
  writeState(dir, '{oops');
  const r = state(['confirm', 'requirement'], dir);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /损坏/);
});

test('status：无状态时提示非编排模式', () => {
  const r = state(['status'], mkProject());
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /非编排模式/);
});

test('status：有状态时输出完整 JSON', () => {
  const dir = mkProject();
  state(['init', 'f1'], dir);
  const r = state(['status'], dir);
  assert.strictEqual(r.status, 0);
  assert.strictEqual(JSON.parse(r.stdout).feature, 'f1');
});

test('status --brief：无状态时零输出（不干扰非编排模式会话）', () => {
  const r = state(['status', '--brief'], mkProject());
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout.trim(), '');
});

test('status --brief：有状态时输出 feature、阶段标记与下一步建议', () => {
  const dir = mkProject();
  state(['init', 'user-points'], dir);
  state(['confirm', 'requirement'], dir);
  const r = state(['status', '--brief'], dir);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /feature=user-points/);
  assert.match(r.stdout, /requirement: confirmed ✓/);
  assert.match(r.stdout, /design: pending\s+← 当前/);
  assert.match(r.stdout, /\/design/);
  assert.match(r.stdout, /\/approve design/);
});

test('status --brief：存在退回阶段时建议重做', () => {
  const dir = mkProject();
  state(['init', 'f1'], dir);
  state(['confirm', 'requirement'], dir);
  state(['revoke', 'requirement'], dir);
  const r = state(['status', '--brief'], dir);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /returned ✗/);
  assert.match(r.stdout, /重做/);
});

test('status --brief：四阶段全部确认时提示闭环完成', () => {
  const dir = mkProject();
  state(['init', 'f1'], dir);
  for (const p of ['requirement', 'design', 'code', 'test']) state(['confirm', p], dir);
  const r = state(['status', '--brief'], dir);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /闭环完成/);
});

test('status --brief：状态损坏时警告但 exit 0（不阻塞会话启动）', () => {
  const dir = mkProject();
  writeState(dir, '{oops');
  const r = state(['status', '--brief'], dir);
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /损坏/);
});

test('无效命令：打印用法并退出 1', () => {
  const r = state(['frobnicate'], mkProject());
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /用法/);
});
