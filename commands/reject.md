---
description: 退回某阶段、撤销其门禁确认态（reviewer 判定退回时使用）
argument-hint: <requirement|design|code|test>
allowed-tools: Bash(node *sdlc-state.js*)
---

reviewer 已判定阶段 “$ARGUMENTS” 退回。请按以下步骤执行：

1. 校验 `$ARGUMENTS` 是否为 `{requirement, design, code, test}` 之一；若不是，停止并告知用户正确取值。
2. 通过 Bash 运行以下命令写入退回态（该阶段变为 returned，其后阶段门禁关闭）：

   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/sdlc-state.js" revoke "$ARGUMENTS"
   ```

3. 向用户报告：该阶段已退回、后续阶段门禁已关闭；需把退回清单交回该阶段责任 agent 重做，重做后重新评审并 `/approve`。

**重要约束**：退回结论应来自 `reviewer` 的完整性检查（见 `${CLAUDE_PLUGIN_ROOT}/skills/review-checklist/SKILL.md`），不要无故执行。
