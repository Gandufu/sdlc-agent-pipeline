---
name: ask-pipeline
description: 流水线状态路由。当用户询问"接下来该做什么""我卡住了""下一步是什么""当前进度"时使用——读取 .sdlc/pipeline-state.json 判断当前门禁态，给出下一步指引。不要在用户已经明确知道要做什么（如"开始设计"）时使用。
---

# 流水线状态路由

1. **读取状态**
   - 运行 `node "${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/scripts/sdlc-state.js" status`。
   - 若状态文件不存在（非编排模式），告知用户当前不在编排模式，建议执行 `/init` 或 `/pipeline` 初始化。

2. **判断下一步**
   - 找到第一个非 `confirmed` 的阶段：
     - `pending` → 提示用户触发对应命令（如"需求阶段待完成，请执行 /grill 或 /init"）。
     - `returned` → 提示用户查看退回清单并重做。
   - 所有阶段均 `confirmed` → 提示闭环完成，汇总四个基线文件路径。

3. **给出指引**
   - 明确告知：当前阶段、需要做什么、触发方式、前置条件是否满足。
   - 引用 `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-overview/SKILL.md` 路由表中的对应行。
