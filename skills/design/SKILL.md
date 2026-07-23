---
description: 当用户要求进入设计阶段、提到"开始设计""出设计方案"时使用。不要在用户只是想讨论技术选型但不进入本流水线设计阶段时使用。
argument-hint: [需求规格文件路径，留空则取最近一次已确认的 requirement-spec]
disable-model-invocation: true
---

# 设计阶段

按 `${CLAUDE_PLUGIN_ROOT}/skills/stage-dispatch/SKILL.md` 调度，参数：

- `phase`=design，`prev`=requirement，`agent`=architect
- `input`：$ARGUMENTS（需求规格路径；留空则取最近一次已确认的 requirement-spec）

**阶段特定**：architect 工具集 Read/Write/Grep/Glob（无 Bash/Edit）；产出 `docs/design/*.md`，汇报时说明接口数与表变更。
