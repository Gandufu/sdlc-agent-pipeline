---
description: 当用户已真实确认某阶段产出、需要写入门禁确认态以放行下一阶段时使用。
argument-hint: [requirement|design|code|test]
disable-model-invocation: true
---

用户正在确认阶段 "$ARGUMENTS"。按以下步骤执行：

1. 校验 `$ARGUMENTS` 是否为 `{requirement, design, code, test}` 之一；若不是，停止并告知用户正确取值。
2. **矩阵完整性检查（仅 design/code/test）**：若用户项目 `docs/traceability-matrix.md` 存在，运行：

   ```
   python "${CLAUDE_PLUGIN_ROOT}/skills/traceability-matrix/scripts/check-matrix.py" --phase "$ARGUMENTS"
   ```

   退出码非 0 → **停止，不写确认态**，把脚本列出的问题交回对应阶段 skill 重做。requirement 阶段跳过此步（矩阵后续列尚未回填）。
3. 运行：

   ```
   node "${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/scripts/sdlc-state.js" confirm "$ARGUMENTS"
   ```

4. 向用户报告：该阶段确认态已写入、后续阶段门禁已开启。

**重要约束**：在用户尚未明确确认（见 `${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/SKILL.md`）之前，不要代为执行。
