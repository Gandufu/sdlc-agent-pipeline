---
description: 编码阶段。基于已确认的设计说明书生成代码与单元测试骨架。当用户要求进入编码阶段、提到"开始写代码""按设计实现"时使用。不要在用户只是想讨论代码风格但不进入本流水线编码阶段时使用。
argument-hint: [设计说明书文件路径，留空则取最近一次已确认的 design-doc]
disable-model-invocation: true
---

# 编码阶段

1. **门禁检查**
   - 若 `.sdlc/pipeline-state.json` 存在，运行 `node "${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/scripts/sdlc-state.js" status`，确认 design 阶段为 `confirmed`；未确认则停止并提示用户先执行 `/approve design`。
   - 状态文件不存在（交互模式）→ 跳过。

2. **派发 developer 子代理**
   - 通过 Task 工具调用 `developer` 子代理，传入设计说明书路径（$ARGUMENTS 或最近已确认的 design-doc）。
   - 该子代理拥有全部工具（Read/Write/Edit/Bash/Grep/Glob），已预加载 context-handoff 与 traceability-matrix skill。
   - 子代理在独立上下文中执行编码，避免大量文件操作塞满主会话。

3. **汇报结论**
   - 子代理返回后，向用户报告："代码已生成，涉及 N 个文件，已通过自检清单，请确认后执行 `/approve code`，再用 `/test` 进入测试阶段。"
