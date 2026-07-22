#!/usr/bin/env node
/**
 * stage-handoff 交接块机器校验（skills/context-handoff 定义的格式）
 *
 * 「evidence over claims」：agent 声称定稿 ≠ 交接块真的合法。本脚本把
 * 交接块的格式约定变成可执行断言——定稿前自检、reviewer 评审复检、
 * 编排引擎解析前校验，都以此脚本结果为准。
 *
 * 用法：
 *   node validate-handoff.js <基线文档路径>
 *
 * 校验规则（与 skills/context-handoff/SKILL.md 一一对应）：
 *   - 存在 stage-handoff 交接块：基线文档中为 ```yaml 围栏、首行 `# stage-handoff`（多个取最后一个）；
 *     独立交接块文件（examples/、编排模式产物）全文无围栏时，首个非空行为 `# stage-handoff` 即视为交接块
 *   - stage ∈ requirement|design|code|test；status ∈ done|returned
 *   - feature / baseline_doc 非空；matrix_updated 为 true（定稿即应已回填矩阵）
 *   - items 至少一条，每条 id/summary 非空；id 前缀符合阶段约定
 *     （requirement→REQ-、design→DES-、test→TC-、code→文件路径/类名不限前缀）
 *   - next_stage_needs 为数组；open_questions 若存在须为数组
 *
 * 退出码：0 通过；2 校验失败（stderr 一次性列出全部问题，供 agent 自行修正）；
 *         1 用法/文件错误。与门禁脚本保持同一退出码约定。
 */
'use strict';

const fs = require('fs');

const STAGES = ['requirement', 'design', 'code', 'test'];
const ID_PREFIX = { requirement: 'REQ-', design: 'DES-', test: 'TC-' }; // code 阶段不限前缀

function fail(errors) {
  console.error('[handoff] 交接块校验未通过：');
  for (const e of errors) console.error(`  - ${e}`);
  console.error('[handoff] 请按 skills/context-handoff/SKILL.md 的格式修正后重新校验。');
  process.exit(2);
}

// 提取最后一个 stage-handoff yaml 围栏块（定稿追加在文档末尾，末个为准）；
// 兼容独立交接块文件（examples/、编排模式独立产物）：全文无围栏时，
// 文件首个非空行即 `# stage-handoff` 则视整个文件为交接块
function extractHandoffBlock(text) {
  const fenceRe = /```ya?ml[^\n]*\n([\s\S]*?)```/g;
  let match;
  let found = null;
  while ((match = fenceRe.exec(text)) !== null) {
    const body = match[1];
    const firstLine = (body.split('\n').find((l) => l.trim() !== '') || '').trim();
    if (firstLine === '# stage-handoff') found = body;
  }
  if (found) return found;
  const firstLine = (text.split('\n').find((l) => l.trim() !== '') || '').trim();
  return firstLine === '# stage-handoff' ? text : null;
}

// 去掉行尾 ` # 注释`（值本身含「 # 」的概率极低，格式示例均带注释，必须剥离）
const stripComment = (v) => v.replace(/\s+#.*$/, '').trim();

// 行式解析交接块：顶层 key: value / key: + 缩进数组；items 元素再解析子字段
function parseHandoff(block) {
  const lines = block.split('\n');
  const data = {};
  let currentKey = null; // 当前正在收集数组的顶层 key
  let currentItem = null; // items 数组中正在收集的对象元素
  for (const raw of lines) {
    const line = raw.replace(/\r$/, '');
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const topLevel = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (topLevel) {
      currentKey = topLevel[1];
      currentItem = null;
      const value = stripComment(topLevel[2]);
      if (value === '' || value === '[]') {
        data[currentKey] = []; // 数组头（或 YAML 行内空数组记法 []）
      } else {
        data[currentKey] = value;
        currentKey = null;
      }
      continue;
    }
    const itemStart = line.match(/^\s+-\s+(.*)$/);
    if (itemStart && currentKey && Array.isArray(data[currentKey])) {
      const content = stripComment(itemStart[1]);
      if (currentKey === 'items') {
        const kv = content.match(/^([A-Za-z_]+):\s*(.*)$/);
        if (kv) {
          currentItem = { [kv[1]]: stripComment(kv[2]) };
          data.items.push(currentItem);
        } else {
          data.items.push(content); // 容错：纯字符串元素
          currentItem = null;
        }
      } else {
        data[currentKey].push(content);
        currentItem = null;
      }
      continue;
    }
    const subField = line.match(/^\s+([A-Za-z_]+):\s*(.*)$/);
    if (subField && currentItem) {
      currentItem[subField[1]] = stripComment(subField[2]);
    }
  }
  return data;
}

function validate(data) {
  const errors = [];
  if (!STAGES.includes(data.stage)) {
    errors.push(`stage 非法：「${data.stage ?? '（缺失）'}」，应为 ${STAGES.join(' | ')} 之一`);
  }
  if (!data.feature || typeof data.feature !== 'string') errors.push('feature 缺失或为空（应与 .sdlc/pipeline-state.json 中 feature 一致）');
  if (!['done', 'returned'].includes(data.status)) {
    errors.push(`status 非法：「${data.status ?? '（缺失）'}」，应为 done | returned`);
  }
  if (!data.baseline_doc || typeof data.baseline_doc !== 'string') errors.push('baseline_doc 缺失或为空');
  if (data.matrix_updated !== 'true') {
    errors.push(`matrix_updated 必须为 true（定稿前应已回填追溯矩阵），当前为「${data.matrix_updated ?? '（缺失）'}」`);
  }
  if (!Array.isArray(data.items) || data.items.length === 0) {
    errors.push('items 至少需要一条本阶段关键条目');
  } else {
    const prefix = data.stage ? ID_PREFIX[data.stage] : null;
    data.items.forEach((item, i) => {
      const it = typeof item === 'object' ? item : { id: item };
      if (!it.id) errors.push(`items[${i}] 缺少 id`);
      if (!it.summary) errors.push(`items[${i}] 缺少 summary`);
      if (prefix && it.id && !String(it.id).startsWith(prefix)) {
        errors.push(`items[${i}].id「${it.id}」前缀不符合 ${data.stage} 阶段约定（应以 ${prefix} 开头）`);
      }
    });
  }
  if (!Array.isArray(data.next_stage_needs)) errors.push('next_stage_needs 缺失或不是数组');
  if (data.open_questions !== undefined && !Array.isArray(data.open_questions)) {
    errors.push('open_questions 存在但不是数组（无未决问题请留空数组 []）');
  }
  return errors;
}

const file = process.argv[2];
if (!file) {
  console.error('用法: node validate-handoff.js <基线文档路径>');
  process.exit(1);
}
if (!fs.existsSync(file)) {
  console.error(`[handoff] 文件不存在：${file}`);
  process.exit(1);
}

const text = fs.readFileSync(file, 'utf8');
const block = extractHandoffBlock(text);
if (!block) {
  fail(['未找到 stage-handoff 交接块——基线文档须含 ```yaml 围栏且首行为 # stage-handoff（独立块文件则首个非空行为 # stage-handoff），格式见 skills/context-handoff/SKILL.md']);
}
const data = parseHandoff(block);
const errors = validate(data);
if (errors.length) fail(errors);

const itemCount = Array.isArray(data.items) ? data.items.length : 0;
const openCount = Array.isArray(data.open_questions) ? data.open_questions.length : 0;
console.log(`[handoff] OK: ${file} (stage=${data.stage}, feature=${data.feature}, items=${itemCount}, open_questions=${openCount})`);
process.exit(0);
