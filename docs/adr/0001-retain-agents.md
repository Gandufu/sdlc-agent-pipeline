# ADR-0001：保留 agent 层（工具限制 + 上下文隔离），不全 skill 化

- **状态**：已采纳
- **日期**：2026-07-23
- **相关**：CHANGELOG v0.1.0 / v0.2.0 / v0.3.0

## 背景

本插件的"执行角色"层在三个版本间反复过：

- **v0.1.0**：5 个子代理（architect/developer/tester/reviewer + 1）+ 9 个命令。
- **v0.2.0**：删除 4 个"伪子代理"与 5 个薄命令，改为 6 个 skill —— 动机是"skill 优先、更轻"。
- **v0.3.0**：基于官方文档重新恢复 4 个 agent，每个带明确的工具限制或上下文隔离收益。

也就是说，"要不要 agent"这件事已经被推翻过一次。不记录理由，下一次还会被再翻一遍。

## 约束

官方文档列出 agent 的五大用途，其中两条对本插件是**刚需、skill 替代不了**：

1. **Enforce constraints（强制工具约束）**：`tester` 不能 `Edit`（不能改被测代码）、`reviewer` 只读、`architect` 无 Bash/Edit。skill 跑在主会话、共享主会话全部工具，无法做到"这个角色就是不能碰某类工具"。
2. **Preserve context（上下文隔离）**：`developer` 编码会产出/修改大量文件，放进独立 agent 上下文才不会把主会话塞爆。skill 在主会话内执行，无隔离。

另有官方硬约束：**子代理不能使用 AskUserQuestion** —— 这反而要求 `grill`（需求拷问）必须在主会话，不能派 agent（这条是"何时必须用 skill 而非 agent"的对照）。

## 决策

保留 4 个 agent，每个存在的理由都必须能对应到上面两条刚需之一：

| agent | 理由 |
| --- | --- |
| architect | Enforce constraints：无 Bash/Edit |
| developer | Preserve context：编码产出隔离 |
| tester | Enforce constraints：无 Edit（核心约束） |
| reviewer | Enforce constraints：只读 |

没有刚需工具限制/隔离需求的角色，不立 agent，用 skill 承载（如 grill、各阶段 user-invoked 入口）。

## 不变量

- **新增 agent 必须在 description/ADR 里写清它对应的"Enforce constraints 或 Preserve context"收益**，否则不立（避免 agent 扩散）。
- **需要 AskUserQuestion 的角色不得派 agent**（grill 模式永远在主会话）。
- agent 的 `tools` 字段是硬约束、不是建议；改某 agent 的工具集前必须更新本 ADR 或新增 ADR。
