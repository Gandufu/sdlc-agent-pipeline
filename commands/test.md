---
description: 触发测试工程师，基于需求验收标准与设计接口产出测试计划与用例
argument-hint: [feature名称或相关文档路径]
---

请调用 `tester` 子代理（定义见 `${CLAUDE_PLUGIN_ROOT}/agents/tester.md`），针对以下 feature 产出测试计划与用例：

$ARGUMENTS

读取对应的 `requirement-spec.md`（验收标准）与 `design-doc.md`（接口定义）。执行前请先按 `${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/SKILL.md` 检查编码阶段是否已确认。产出 `test-plan.md`（模板见 `${CLAUDE_PLUGIN_ROOT}/templates/docs/test-plan.md`）并回填追溯矩阵 `docs/traceability-matrix.md` 的 TC 编号与测试结论列。
