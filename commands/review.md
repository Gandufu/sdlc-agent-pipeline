---
description: 触发评审守门人，对某阶段产出做完整性检查，给出通过/退回结论
argument-hint: [requirement|design|code|test] [产出文档路径]
---

请调用 `reviewer` 子代理（定义见 `${CLAUDE_PLUGIN_ROOT}/agents/reviewer.md`），对阶段 “$ARGUMENTS” 的产出做完整性检查：

- 第一个参数为阶段（requirement|design|code|test 之一）；第二个参数（若有）为该阶段产出文档路径
- 未提供路径时，取 `docs/requirements/`、`docs/design/`、`docs/code/`、`docs/test/` 下对应阶段最近的基线文档

按 `${CLAUDE_PLUGIN_ROOT}/skills/review-checklist/SKILL.md`（通用项 + 对应阶段组）逐项检查，并对照用户项目的追溯矩阵 `docs/traceability-matrix.md`。给出「通过」或「退回」结论：退回时逐条列出不通过项（引用具体编号），并提示用户经 `/reject <阶段>` 写退回态、把清单交回该阶段责任 agent 重做（退回协议见 `${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/SKILL.md`）。
