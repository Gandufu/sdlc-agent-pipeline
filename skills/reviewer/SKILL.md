---
name: reviewer
description: 阶段完整性评审。对需求、设计、编码、测试四个阶段产出做完整性检查，给出通过或退回结论。当用户要求评审某阶段产出、提到"检查需求文档""评审设计""review 一下"时使用。不要在用户只是想查看文档内容、讨论设计思路但不需要正式评审结论时使用。
argument-hint: [requirement|design|code|test] [产出文档路径]
disable-model-invocation: true
---

# 评审流程

1. **解析参数**
   - 第一个参数为阶段（requirement|design|code|test 之一）；第二个参数（若有）为该阶段产出文档路径。
   - 未提供路径时，取 `docs/requirements/`、`docs/design/`、`docs/code/`、`docs/test/` 下对应阶段最近的基线文档。

2. **派发评审子代理**
   - 通过 Task 工具调用 `reviewer` 子代理（定义见 `${CLAUDE_PLUGIN_ROOT}/agents/reviewer.md`），传入阶段名与文档路径。
   - 该子代理工具集为 Read/Grep/Glob（无 Write/Edit/Bash），已预加载 review-checklist skill。

3. **汇报结论**
   - **通过** → 告知用户可执行 `/approve <阶段>` 写入确认态。
   - **退回** → 逐条列出不通过项（引用具体编号），提示用户经 `/reject <阶段>` 写退回态（退回协议见 `${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/SKILL.md`）。
