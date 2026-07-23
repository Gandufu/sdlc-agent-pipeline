---
description: 当用户要求进入测试阶段、提到"出测试计划""写测试用例""跑测试"时使用（基于需求验收标准与设计接口生成测试脚本并执行）。不要在用户只是想运行已有测试但不进入本流水线测试阶段时使用。
argument-hint: [feature 名称或相关文档路径]
disable-model-invocation: true
---

# 测试阶段

按 `${CLAUDE_PLUGIN_ROOT}/skills/stage-dispatch/SKILL.md` 调度，参数：

- `phase`=test，`prev`=code，`agent`=tester
- `input`：$ARGUMENTS（feature 名称或相关文档路径）

**阶段特定**：tester 工具集 Read/Write/Bash/Grep/Glob（**无 Edit**——不能改被测源代码）；产出 `docs/test/*.md`，汇报时说明通过/不通过/部分通过及未覆盖的 REQ。
