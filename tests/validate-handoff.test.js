'use strict';
/**
 * validate-handoff.js（stage-handoff 交接块校验）行为测试。
 * 规则依据 skills/context-handoff/SKILL.md 的格式约定。
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', 'skills', 'context-handoff', 'scripts', 'validate-handoff.js');
const { run } = require('./helpers');

const VALID_BLOCK = [
  '```yaml',
  '# stage-handoff',
  'stage: requirement          # requirement | design | code | test',
  'feature: user-login',
  'status: done                # done | returned',
  'baseline_doc: docs/requirements/user-login-requirement-spec.md',
  'matrix_updated: true',
  'items:',
  '  - id: REQ-USR-001',
  '    summary: 用户名密码登录',
  '    key_constraint: 登录成功返回 token',
  '  - id: REQ-USR-002',
  '    summary: 退出登录',
  'next_stage_needs:',
  '  - 技术栈：Java + Spring Boot',
  'open_questions: []',
  '```',
].join('\n');

/** 写一个带「正文 + 交接块」的临时基线文档，返回路径。 */
function writeDoc(body, handoff = VALID_BLOCK) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdlc-handoff-'));
  const file = path.join(dir, 'baseline.md');
  fs.writeFileSync(file, `# 某基线文档\n\n${body}\n\n${handoff}\n`, 'utf8');
  return file;
}

const check = (file) => run(SCRIPT, [file], {});

test('合法交接块 → 通过并输出摘要', () => {
  const r = check(writeDoc('正文内容'));
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /\[handoff\] OK/);
  assert.match(r.stdout, /stage=requirement/);
  assert.match(r.stdout, /items=2/);
});

test('缺失交接块 → 阻断并指出缺失', () => {
  const r = check(writeDoc('只有正文', ''));
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /未找到 stage-handoff 交接块/);
});

test('文档含其他 yaml 围栏但无 stage-handoff → 不误判为存在', () => {
  const r = check(writeDoc('```yaml\nstage: requirement\nother: thing\n```', ''));
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /未找到/);
});

test('多个交接块时取最后一个（定稿追加语义）', () => {
  const stale = VALID_BLOCK.replace('status: done', 'status: returned');
  const r = check(writeDoc(`早期版本块：\n\n${stale}`, VALID_BLOCK));
  assert.strictEqual(r.status, 0, r.stderr);
});

test('stage 取值非法 → 阻断', () => {
  const r = check(writeDoc('', VALID_BLOCK.replace('stage: requirement', 'stage: coding')));
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /stage 非法/);
});

test('matrix_updated 为 false → 阻断（定稿即应已回填矩阵）', () => {
  const r = check(writeDoc('', VALID_BLOCK.replace('matrix_updated: true', 'matrix_updated: false')));
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /matrix_updated 必须为 true/);
});

test('items 为空数组 → 阻断', () => {
  const block = VALID_BLOCK.replace(/items:\n(  .*\n)+/, 'items: []\n');
  const r = check(writeDoc('', block));
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /items 至少需要一条/);
});

test('item 缺 summary → 阻断并定位下标', () => {
  const block = VALID_BLOCK.replace('    summary: 退出登录\n', '');
  const r = check(writeDoc('', block));
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /items\[1\] 缺少 summary/);
});

test('id 前缀与阶段不符（requirement 阶段用 DES- 编号）→ 阻断', () => {
  const r = check(writeDoc('', VALID_BLOCK.replace('id: REQ-USR-002', 'id: DES-USR-002')));
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /前缀不符合 requirement 阶段约定/);
});

test('code 阶段 id 为文件路径 → 不限前缀，通过', () => {
  const block = [
    '```yaml',
    '# stage-handoff',
    'stage: code',
    'feature: user-login',
    'status: done',
    'baseline_doc: docs/code/user-login-code-handoff.md',
    'matrix_updated: true',
    'items:',
    '  - id: src/main/java/com/x/LoginController.java',
    '    summary: 登录接口实现',
    'next_stage_needs:',
    '  - 测试重点：token 过期路径',
    'open_questions: []',
    '```',
  ].join('\n');
  const r = check(writeDoc('', block));
  assert.strictEqual(r.status, 0, r.stderr);
});

test('status 非法 → 阻断', () => {
  const r = check(writeDoc('', VALID_BLOCK.replace('status: done', 'status: finished')));
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /status 非法/);
});

test('open_questions 有未决项（非空数组）→ 通过', () => {
  const r = check(writeDoc('', VALID_BLOCK.replace('open_questions: []', 'open_questions:\n  - 并发量级待确认')));
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /open_questions=1/);
});

test('一次性列出全部问题而非只报第一个', () => {
  const bad = VALID_BLOCK
    .replace('stage: requirement', 'stage: coding')
    .replace('matrix_updated: true', 'matrix_updated: false');
  const r = check(writeDoc('', bad));
  assert.strictEqual(r.status, 2);
  assert.match(r.stderr, /stage 非法/);
  assert.match(r.stderr, /matrix_updated 必须为 true/);
});

test('文件不存在 → 退出码 1', () => {
  const r = run(SCRIPT, [path.join(os.tmpdir(), 'no-such-file-sdlc.md')], {});
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /文件不存在/);
});

test('缺少参数 → 打印用法，退出码 1', () => {
  const r = run(SCRIPT, [], {});
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /用法/);
});

test('官方示例 examples/*.yaml 均可通过校验（锁定示例与格式约定的一致性）', () => {
  const examplesDir = path.join(__dirname, '..', 'skills', 'context-handoff', 'examples');
  for (const f of ['handoff-design.yaml', 'handoff-code.yaml', 'handoff-test.yaml']) {
    const r = run(SCRIPT, [path.join(examplesDir, f)], {});
    assert.strictEqual(r.status, 0, `${f} 应通过校验：${r.stderr}`);
  }
});
