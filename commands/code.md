---
description: 触发开发工程师，基于已确认的设计说明书生成代码
argument-hint: [设计说明书文件路径，留空则取最近一次已确认的design-doc]
---

请调用 `developer` 子代理（定义见 `${CLAUDE_PLUGIN_ROOT}/agents/developer.md`），基于以下输入编码：

- 设计说明书：$ARGUMENTS（未提供时，使用最近一次已确认的 `design-doc.md`）

执行前请先按 `${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/SKILL.md` 检查设计阶段是否已确认。根据涉及的技术栈加载对应 `${CLAUDE_PLUGIN_ROOT}/rules/*.md` 与 `${CLAUDE_PLUGIN_ROOT}/templates/code/**` 模板。完成后运行 developer 定义中的自检清单，回填追溯矩阵 `docs/traceability-matrix.md` 的代码位置列，并按 `${CLAUDE_PLUGIN_ROOT}/skills/context-handoff/SKILL.md` 产出编码交接文档。完成后等待用户确认，不要自行进入测试阶段。
