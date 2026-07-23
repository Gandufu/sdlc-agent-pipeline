---
description: 当用户要求进入编码阶段、提到"开始写代码""按设计实现"时使用（基于已确认的设计说明书生成代码与单元测试骨架）。不要在用户只是想讨论代码风格但不进入本流水线编码阶段时使用。
argument-hint: [设计说明书文件路径，留空则取最近一次已确认的 design-doc]
disable-model-invocation: true
---

# 编码阶段

按 `${CLAUDE_PLUGIN_ROOT}/skills/stage-dispatch/SKILL.md` 调度，参数：

- `phase`=code，`prev`=design，`agent`=developer
- `input`：$ARGUMENTS（设计说明书路径；留空则取最近一次已确认的 design-doc）

**阶段特定**：developer 拥有全部工具，在独立上下文执行（编码产出隔离出主会话）；产出代码 + `docs/code/<feature>-code-handoff.md`，汇报时说明涉及文件数。
