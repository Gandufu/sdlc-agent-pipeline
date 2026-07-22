---
description: 确认某阶段产出、写入门禁确认态（编排模式下使用；须在用户真实确认后执行）
argument-hint: [requirement|design|code|test]
allowed-tools: Bash(node *sdlc-state.js*)
---

用户正在确认阶段 “$ARGUMENTS”。请按以下步骤执行：

1. 校验 `$ARGUMENTS` 是否为 `{requirement, design, code, test}` 之一；若不是，停止执行并告知用户正确取值，不要猜测。
2. 通过 Bash 运行以下命令写入确认态（开启后续阶段门禁）：

   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/sdlc-state.js" confirm "$ARGUMENTS"
   ```

3. 依据输出向用户报告：该阶段确认态已写入、后续阶段门禁已开启，可进入下一阶段。

**重要约束**：本命令是「用户确认」这一门禁信号的正式落点。在用户尚未明确确认（见 `${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/SKILL.md` 的确认信号判定）之前，不要代为执行——否则确定性门禁会被绕过，失去意义。
