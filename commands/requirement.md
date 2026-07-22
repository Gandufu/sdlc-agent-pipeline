---
description: 触发需求分析师，将自然语言需求转化为结构化需求规格说明书
argument-hint: [需求描述]
---

请调用 `requirements-analyst` 子代理（定义见 `${CLAUDE_PLUGIN_ROOT}/agents/requirements-analyst.md`），处理以下需求：

$ARGUMENTS

按 `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-overview/SKILL.md` 路由表执行：先读取 `${CLAUDE_PLUGIN_ROOT}/rules/existing-framework.md`，产出 `docs/requirements/` 下的需求规格说明书（模板见 `${CLAUDE_PLUGIN_ROOT}/templates/docs/requirement-spec.md`），并按 `${CLAUDE_PLUGIN_ROOT}/skills/traceability-matrix/SKILL.md` 回填追溯矩阵 `docs/traceability-matrix.md`。完成后明确等待用户确认，不要自行调用后续阶段。
