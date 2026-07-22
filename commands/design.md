---
description: 触发架构设计师，基于已确认的需求规格产出设计说明书
argument-hint: [需求规格文件路径，留空则取最近一次已确认的requirement-spec]
---

请调用 `architect` 子代理（定义见 `${CLAUDE_PLUGIN_ROOT}/agents/architect.md`），基于以下输入产出设计说明书：

- 需求规格：$ARGUMENTS（未提供时，使用 `docs/requirements/` 下最近一次已确认的文件）

执行前请先按 `${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/SKILL.md` 检查需求阶段是否已确认；未确认则停止并提示用户缺口。确认后按 `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-overview/SKILL.md` 第 4 节技术栈路由表加载对应规则（`${CLAUDE_PLUGIN_ROOT}/rules/*.md`），产出 `design-doc.md`（模板见 `${CLAUDE_PLUGIN_ROOT}/templates/docs/design-doc.md`），并回填追溯矩阵 `docs/traceability-matrix.md`。完成后等待用户确认，不要自行进入编码阶段。
