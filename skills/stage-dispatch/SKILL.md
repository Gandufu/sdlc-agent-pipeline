---
name: stage-dispatch
description: 当 design/code/test 阶段 skill 或 /pipeline 编排到这三阶段、需要复用统一的门禁检查→派发子代理→汇报调度骨架时使用。不要在用户只是询问设计/编码/测试问题、但不进入阶段调度时使用。
---

# 阶段调度 SOP

本 SOP 被 `design` / `code` / `test` 三个 user-invoked 阶段 skill 与 `/pipeline` 复用，承载"门禁检查 → 派发子代理 → 汇报"的通用骨架。调用方提供四个参数：

| 参数 | 含义 | 取值 |
| --- | --- | --- |
| `phase` | 当前阶段 | `design` \| `code` \| `test` |
| `prev` | 前置阶段（门禁检查对象） | `requirement` \| `design` \| `code` |
| `agent` | 派发的子代理 | `architect` \| `developer` \| `tester` |
| `input` | 传给子代理的输入描述 | 文档路径或 feature 引用 |

## 1. 门禁检查

若 `.sdlc/pipeline-state.json` 存在（编排模式），运行：

```
node "${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/scripts/sdlc-state.js" status
```

> 在用户项目根目录运行该命令；脚本读取的是项目内的 `.sdlc/pipeline-state.json`，与插件目录无关。

确认 `${prev}` 阶段为 `confirmed`。未确认 → **停止**，提示用户先执行 `/approve ${prev}`。
状态文件不存在（交互模式）→ 跳过门禁，直接派发。

## 2. 派发子代理

通过 Task 工具调用 `${agent}` 子代理，传入 `input`。

- 子代理的工具限制与上下文隔离理由见 `${CLAUDE_PLUGIN_ROOT}/agents/${agent}.md`。
- 子代理已预加载 `context-handoff`（交接块格式）与 `traceability-matrix`（矩阵回填）skill；产出须含结构化交接块并回填追溯矩阵对应列。

## 3. 汇报

子代理返回后，按其交接块向用户汇报产出摘要，并提示：

> 请确认后执行 `/approve ${phase}` 写入确认态，再进入下一阶段。

---

> 本 SOP 只承载"门禁 + 派发 + 汇报"的通用骨架。阶段特定的产出要求（设计要列接口/表、编码要列文件数、测试要列未覆盖 REQ）由调用方在 `input` 或汇报补充中给出，不在此重复——这正是把三个阶段 skill 的重复 body 收敛到此处的目的。
