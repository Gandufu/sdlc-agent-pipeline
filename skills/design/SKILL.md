---
description: 设计阶段。基于已确认的需求规格产出规范化设计说明书。当用户要求进入设计阶段、提到"开始设计""出设计方案"时使用。不要在用户只是想讨论技术选型但不进入本流水线设计阶段时使用。
argument-hint: [需求规格文件路径，留空则取最近一次已确认的 requirement-spec]
disable-model-invocation: true
---

# 设计阶段

1. **门禁检查**
   - 若 `.sdlc/pipeline-state.json` 存在，运行 `node "${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/scripts/sdlc-state.js" status`，确认 requirement 阶段为 `confirmed`；未确认则停止并提示用户先执行 `/approve requirement`。
   - 状态文件不存在（交互模式）→ 跳过。

2. **派发 architect 子代理**
   - 通过 Task 工具调用 `architect` 子代理，传入需求规格路径（$ARGUMENTS 或最近已确认的 requirement-spec）。
   - 该子代理工具集为 Read/Write/Grep/Glob（无 Bash/Edit），已预加载 context-handoff 与 traceability-matrix skill。

3. **汇报结论**
   - 子代理返回后，向用户报告："设计说明书已产出，包含 N 个接口 / M 张表变更，请确认后执行 `/approve design`，再用 `/code` 进入编码阶段。"
