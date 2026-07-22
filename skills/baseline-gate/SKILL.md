---
name: baseline-gate
description: 判断某个阶段产出是否已确认、能否推进到下一阶段的门禁判断流程。当 /pipeline 命令编排四阶段流转，或某个agent准备读取上一阶段产出作为输入时使用。
---

# 基线门禁判断 SOP

参考配置管理"评审通过才建立基线"的理念：任何阶段产出在**用户显式确认**或 `reviewer` agent 给出"通过"结论之前，都只是草稿，不允许作为下一阶段的可信输入。

## 判断步骤

1. 检查目标产出文件（如 `requirement-spec.md`）是否存在且非空。
2. 检查该产出对应的追溯矩阵行是否完整（参见 `${CLAUDE_PLUGIN_ROOT}/skills/traceability-matrix/SKILL.md`）。
3. 检查确认态：编排模式下（存在 `.sdlc/pipeline-state.json`）以对应阶段为 `confirmed` 为正式信号（经 `/approve <phase>` 写入）；非编排模式下以用户显式确认信号（消息含"确认"/"通过"/"可以进入下一步"等）或 `reviewer` agent 的"通过"结论为准。
4. 三项皆满足 → 允许下一阶段 agent 读取该产出作为输入；否则 → 停止，并向用户明确说明缺口（缺哪一项、具体哪个编号未完整）。

## 在 /pipeline 一键闭环中的应用

`/pipeline` 命令依次加载 需求→设计→编码→测试 四个阶段 skill，但**每个阶段之间必须暂停等待门禁通过**，不能因为命令是"一键"就跳过确认。一键的含义是"减少手动切换阶段的操作成本"，而不是"取消人工确认"——这是当前阶段（先打通闭环、再谈智能化）刻意保留的保守设计，避免连锁性错误在无人把关的情况下传递到后续阶段。

编排模式下，门禁由 `${CLAUDE_PLUGIN_ROOT}/hooks/scripts/gate-check.js` **确定性执行**：它读取 `.sdlc/pipeline-state.json`，前置阶段非 `confirmed` 时直接阻断对下一阶段子代理的调用——不依赖模型自觉。各阶段 skill（design/code/test）自身也在 body 首步运行 `sdlc-state.js status` 做前置检查（双重保障）。确认态经 `/approve <phase>` 写入，退回态经 `/reject <phase>` 写入。

## 退回协议（reviewer 判定退回时）

当 `reviewer` 对某阶段给出"退回"结论（标准见 `${CLAUDE_PLUGIN_ROOT}/skills/review-checklist/SKILL.md`），按以下步骤处理：

1. **写退回态**：执行 `/reject <phase>` 命令，将该阶段标记为 `returned`，其后阶段门禁随之关闭。
2. **带清单退回**：把评审不通过项清单原样交回该阶段责任 skill（requirement-clarification / design / code / test），明确指出需重做的范围。
3. **重做与复评**：责任 skill 重做后更新基线文档、追溯矩阵与交接块，由 reviewer 复评；通过后用户再执行 `/approve <phase>`。
4. **更新矩阵状态**：该阶段状态列置为 `退回`，复评通过后恢复为对应确认值。

注意：退回只回滚该阶段的确认态，不删除基线文档本身；重做是增量修正，不是推倒重来。
