---
name: review-checklist
description: 分阶段完整性评审清单。当 reviewer agent 对任一阶段（需求/设计/编码/测试）产出做完整性检查、给出通过或退回结论时使用，保证评审可复现、不遗漏。
---

# 分阶段评审清单

## 通用项（所有阶段必查）

- [ ] 产出存在且非空，路径符合约定：需求/设计/测试阶段为 `docs/requirements|design|test/` 下的基线文档；编码阶段为代码本身 + `docs/code/<feature>-code-handoff.md`。
- [ ] 追溯矩阵（用户项目 `docs/traceability-matrix.md`）对应列已回填（见 `${CLAUDE_PLUGIN_ROOT}/skills/traceability-matrix/SKILL.md`），无空列且未标注原因。
- [ ] 交接块通过机器校验：运行 `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-handoff.js" <基线文档路径>` 退出码为 0（块存在、字段完整、`matrix_updated: true`、items 编号前缀符合阶段约定）；校验失败即判退回，格式见 `${CLAUDE_PLUGIN_ROOT}/skills/context-handoff/SKILL.md`。
- [ ] 编号唯一、无复用（REQ/DES/TC 各自不重复）。

## 需求阶段

- [ ] 每个 REQ 有可测试的验收标准。
- [ ] 非功能性要求有明确取值或显式「待确认」，无编造数字。
- [ ] 未把 `${CLAUDE_PLUGIN_ROOT}/rules/existing-framework.md` 已有能力重新定义为新需求。

## 设计阶段

- [ ] DES 与 REQ 一一对应，或标注 `N/A(复用)` 并简述原因。
- [ ] 「关键决策」节逐条记录重要取舍：每条有备选方案与选择理由（不接受只有结论的"合理"），纯复用项未滥竽充数。
- [ ] 接口定义/分层/命名符合对应技术栈 `${CLAUDE_PLUGIN_ROOT}/rules/*.md`。
- [ ] 数据模型、接口路径、统一响应体、错误码约定完整。

## 编码阶段

- [ ] 矩阵代码位置为具体文件/类名（非「已完成」等模糊描述）。
- [ ] 命名与分层符合 `${CLAUDE_PLUGIN_ROOT}/rules/*.md`，未自创风格。
- [ ] 单元测试骨架到位，覆盖关键路径。

## 测试阶段

- [ ] TC 覆盖全部验收标准，可追溯到 REQ。
- [ ] 测试结论明确（通过 / 失败 / 阻塞）。
- [ ] 失败项有缺陷描述与复现步骤。

## 评审结论

- **通过** → 给出「通过」结论；随后由用户执行 `/approve <phase>` 落确认态。
- **退回** → 逐条列出不通过项，按退回协议处理（见 `${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/SKILL.md` 的「退回协议」一节）。
