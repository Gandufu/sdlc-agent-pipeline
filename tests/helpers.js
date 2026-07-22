'use strict';
/**
 * 测试公共辅助：在隔离的临时项目目录中以子进程方式运行插件脚本，
 * 断言退出码与 stdout/stderr —— 与 Claude Code 调用脚本的真实方式一致
 * （hook 通过 stdin 传 JSON、以退出码判定放行/阻断）。
 *
 * 运行：node --test tests/
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const GATE = path.join(ROOT, 'hooks', 'scripts', 'gate-check.js');
const STATE = path.join(ROOT, 'scripts', 'sdlc-state.js');

/** 创建一个隔离的临时「用户项目」目录（留在 os tmpdir，由操作系统清理）。 */
function mkProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-test-'));
}

/**
 * 以子进程运行脚本。
 * @param script 脚本绝对路径
 * @param args   命令行参数
 * @param opts.projectDir 作为 CLAUDE_PROJECT_DIR 传入（不传则新建临时目录）
 * @param opts.stdin      经 stdin 传入的字符串（hook 事件 JSON）
 */
function run(script, args, { projectDir, stdin = '' } = {}) {
  const res = spawnSync(process.execPath, [script, ...args], {
    input: stdin,
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir || mkProject() },
    encoding: 'utf8',
  });
  return { status: res.status, stdout: res.stdout || '', stderr: res.stderr || '' };
}

/** 向临时项目写入状态文件；state 为对象则序列化，为字符串则原样写入（用于构造损坏文件）。 */
function writeState(projectDir, state) {
  const dir = path.join(projectDir, '.sdlc');
  fs.mkdirSync(dir, { recursive: true });
  const body = typeof state === 'string' ? state : JSON.stringify(state);
  fs.writeFileSync(path.join(dir, 'pipeline-state.json'), body, 'utf8');
}

/** 构造合法状态对象；phases 覆盖默认 pending，如 { requirement: { status: 'confirmed' } }。 */
function stateWith(phases = {}, feature = 'test-feature') {
  const full = {};
  for (const p of ['requirement', 'design', 'code', 'test']) full[p] = { status: 'pending' };
  for (const [p, v] of Object.entries(phases)) full[p] = v;
  return { feature, started_at: '2026-07-22T00:00:00.000Z', phases: full };
}

module.exports = { GATE, STATE, mkProject, run, writeState, stateWith };
