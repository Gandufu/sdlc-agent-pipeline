#!/usr/bin/env node
/**
 * 阶段门禁钩子（PreToolUse，matcher: Task|Agent —— Task 为旧版工具名、Agent 为现名，同时命中以兼容新旧版本）
 *
 * 硬约束「禁止跳过确认自动推进阶段」的确定性实现：
 * 当编排逻辑试图启动「下一阶段」子代理（architect / developer / tester）时，
 * 读取 .sdlc/pipeline-state.json，确认前置阶段已 confirmed，否则阻断（exit 2）。
 *
 * 设计取舍（保持最小、不误伤）：
 * - 状态文件不存在 → 视为非编排模式（用户单独跑 /requirement /design 等），直接放行。
 * - requirements-analyst（首阶段）与 reviewer（守门人）不受门禁约束，直接放行。
 * - stdin 输入不可解析 → 放行（无法判断调用意图时不干预）。
 * - 状态文件存在但损坏 → 阻断（exit 2）并提示修复：门禁依据不可信时宁可停下，
 *   由用户 reset 或修复状态文件后继续。
 */
'use strict';

const fs = require('fs');
const path = require('path');

// 下一阶段子代理 -> 其前置阶段
const PREREQ = {
  architect: 'requirement',
  developer: 'design',
  tester: 'code',
};

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let event;
  try {
    event = JSON.parse(raw || '{}');
  } catch (_e) {
    process.exit(0); // 输入不可解析 -> 不干预
  }

  const subagent = ((event.tool_input || {}).subagent_type || '').toString();
  const required = PREREQ[subagent];
  if (!required) {
    process.exit(0); // 首阶段 / reviewer / 非阶段子代理 -> 放行
  }

  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const stateFile = path.join(projectDir, '.sdlc', 'pipeline-state.json');

  if (!fs.existsSync(stateFile)) {
    process.exit(0); // 非编排模式 -> 不干预
  }

  let state;
  try {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (e) {
    console.error(
      `[sdlc-gate] 无法解析状态文件 ${stateFile}: ${e.message}。` +
        `请重新执行 /pipeline 初始化，或检查该文件是否损坏。`
    );
    process.exit(2);
  }

  const phase = ((state.phases || {})[required]) || {};
  if (phase.status === 'confirmed') {
    process.exit(0); // 前置阶段已确认 -> 放行
  }

  console.error(
    `[sdlc-gate] 阶段门禁未通过：不能启动 "${subagent}"。\n` +
      `原因：前置阶段 "${required}" 当前为 "${phase.status || '未开始'}"，尚未达到 "confirmed"。\n` +
      `处理：先完成该阶段产出并经用户确认，然后执行 /approve ${required} 写入确认态，再进入下一阶段。\n` +
      `门禁规则见 skills/baseline-gate。`
  );
  process.exit(2);
});
