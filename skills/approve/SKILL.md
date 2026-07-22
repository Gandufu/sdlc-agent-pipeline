---
description: 确认某阶段产出、写入门禁确认态。须在用户真实确认后执行。
argument-hint: [requirement|design|code|test]
disable-model-invocation: true
---

用户正在确认阶段 "$ARGUMENTS"。按以下步骤执行：

1. 校验 `$ARGUMENTS` 是否为 `{requirement, design, code, test}` 之一；若不是，停止并告知用户正确取值。
2. 运行：

   ```
   node "${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/scripts/sdlc-state.js" confirm "$ARGUMENTS"
   ```

3. 向用户报告：该阶段确认态已写入、后续阶段门禁已开启。

**重要约束**：在用户尚未明确确认（见 `${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/SKILL.md`）之前，不要代为执行。
