---
description: 测试阶段。基于需求验收标准与设计接口生成测试脚本并执行测试。当用户要求进入测试阶段、提到"出测试计划""写测试用例""跑测试"时使用。不要在用户只是想运行已有测试但不进入本流水线测试阶段时使用。
argument-hint: [feature 名称或相关文档路径]
disable-model-invocation: true
---

# 测试阶段

1. **门禁检查**
   - 若 `.sdlc/pipeline-state.json` 存在，运行 `node "${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/scripts/sdlc-state.js" status`，确认 code 阶段为 `confirmed`；未确认则停止并提示用户先执行 `/approve code`。
   - 状态文件不存在（交互模式）→ 跳过。

2. **派发 tester 子代理**
   - 通过 Task 工具调用 `tester` 子代理，传入 feature 名称或相关文档路径。
   - 该子代理工具集为 Read/Write/Bash/Grep/Glob（**无 Edit**——不能修改被测源代码），已预加载 context-handoff 与 traceability-matrix skill。

3. **汇报结论**
   - 子代理返回后，向用户报告测试结论（通过/不通过/部分通过）、未覆盖的 REQ（如有），并提示闭环是否完整。
