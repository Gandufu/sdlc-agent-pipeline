#!/usr/bin/env node
/**
 * SDLC 流水线状态管理（门禁状态文件 .sdlc/pipeline-state.json）
 *
 * 该状态文件是「阶段门禁」(hooks/scripts/gate-check.js) 的确定性依据：
 * 只有前置阶段被标记为 confirmed，门禁才会放行对下一阶段子代理的调用。
 *
 * 用法：
 *   node sdlc-state.js init <feature> [--force]  初始化流水线（四阶段均为 pending），进入编排模式；
 *                                                默认不覆盖已有状态文件（避免误清已确认阶段），--force 强制覆盖
 *   node sdlc-state.js confirm <phase>    确认某阶段（phase: requirement|design|code|test），开启后续门禁
 *   node sdlc-state.js revoke <phase>     撤销某阶段确认并标记为 returned（reviewer 退回时使用）
 *   node sdlc-state.js status             查看当前状态
 *   node sdlc-state.js reset              删除状态文件（退出编排模式，门禁回到不干预）
 *
 * init 时会顺带把追溯矩阵模板初始化到用户项目 docs/traceability-matrix.md（已存在则跳过）。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const PHASES = ['requirement', 'design', 'code', 'test'];
const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const SDLC_DIR = path.join(PROJECT_DIR, '.sdlc');
const STATE_FILE = path.join(SDLC_DIR, 'pipeline-state.json');
// 追溯矩阵「活文档」位于用户项目内（docs/traceability-matrix.md），init 时从插件模板初始化
const MATRIX_TARGET = path.join(PROJECT_DIR, 'docs', 'traceability-matrix.md');
const MATRIX_TEMPLATE = path.join(__dirname, '..', 'templates', 'docs', 'traceability-matrix.md');

const cliArgs = process.argv.slice(2);
const cmd = cliArgs[0];
const force = cliArgs.includes('--force');
const arg = cliArgs.slice(1).filter((a) => a !== '--force')[0];

function load() {
  if (!fs.existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) {
    // 状态文件损坏 ≠ 不存在：不能静默重建（会丢失已确认阶段），与门禁 gate-check.js 的"损坏即阻断"保持一致
    console.error(
      `[sdlc-state] 状态文件损坏：${e.message}。\n` +
        `[sdlc-state] 请修复 ${STATE_FILE} 后重试，或执行 reset 清除后重新 init（会丢失当前确认态）。`
    );
    process.exit(1);
  }
}

function save(state) {
  fs.mkdirSync(SDLC_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

// 用户项目内 docs/traceability-matrix.md 不存在时，从插件模板复制一份（已存在不覆盖）
function bootstrapMatrix() {
  if (fs.existsSync(MATRIX_TARGET)) return;
  try {
    fs.mkdirSync(path.dirname(MATRIX_TARGET), { recursive: true });
    fs.copyFileSync(MATRIX_TEMPLATE, MATRIX_TARGET);
    console.log(`[sdlc-state] 已从模板初始化追溯矩阵：${MATRIX_TARGET}`);
  } catch (e) {
    console.error(
      `[sdlc-state] 警告：追溯矩阵初始化失败（${e.message}）。` +
        `请手动将插件 templates/docs/traceability-matrix.md 复制到项目 docs/ 下。`
    );
  }
}

function blankState(feature) {
  const phases = {};
  for (const p of PHASES) phases[p] = { status: 'pending' };
  return { feature, started_at: new Date().toISOString(), phases };
}

function assertPhase(phase) {
  if (!PHASES.includes(phase)) {
    console.error(`[sdlc-state] 无效阶段 "${phase}"，应为 ${PHASES.join(' | ')} 之一。`);
    process.exit(1);
  }
}

switch (cmd) {
  case 'init': {
    const feature = arg || 'default';
    if (fs.existsSync(STATE_FILE) && !force) {
      console.error(
        `[sdlc-state] 流水线状态已存在：${STATE_FILE}\n` +
          `[sdlc-state] 为防止误清已确认阶段，init 默认不覆盖已有状态。\n` +
          `[sdlc-state] 如要重新开始：先执行 "reset" 清除（退出编排模式）；或加 --force 强制覆盖。`
      );
      process.exit(1);
    }
    save(blankState(feature));
    console.log(`[sdlc-state] 已初始化流水线状态（feature=${feature}）。`);
    console.log(`[sdlc-state] 状态文件：${STATE_FILE}`);
    bootstrapMatrix();
    break;
  }
  case 'confirm': {
    assertPhase(arg);
    const state = load() || blankState('default');
    state.phases[arg] = { status: 'confirmed', confirmed_at: new Date().toISOString() };
    save(state);
    console.log(`[sdlc-state] 阶段 "${arg}" 已确认，后续阶段门禁开启。`);
    break;
  }
  case 'revoke': {
    assertPhase(arg);
    const state = load();
    if (!state) {
      console.error('[sdlc-state] 状态文件不存在，无可撤销。');
      process.exit(1);
    }
    state.phases[arg] = { status: 'returned', returned_at: new Date().toISOString() };
    save(state);
    console.log(`[sdlc-state] 阶段 "${arg}" 已标记为退回（returned），其后阶段门禁关闭。`);
    break;
  }
  case 'status': {
    const state = load();
    if (!state) {
      console.log('[sdlc-state] 无流水线状态（当前为非编排模式，门禁不干预）。');
      break;
    }
    console.log(JSON.stringify(state, null, 2));
    break;
  }
  case 'reset': {
    if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
    console.log('[sdlc-state] 已重置状态（门禁回到不干预模式）。');
    break;
  }
  default:
    console.error(
      '用法: node sdlc-state.js <init|confirm|revoke|status|reset> [arg]\n' +
        '       init <feature> [--force]   初始化（四阶段 pending），进入编排模式；默认不覆盖已有状态\n' +
        '       confirm|revoke <phase>     phase: requirement|design|code|test\n' +
        '       status                     查看当前状态\n' +
        '       reset                      删除状态文件（退出编排模式，门禁不干预）'
    );
    process.exit(1);
}
