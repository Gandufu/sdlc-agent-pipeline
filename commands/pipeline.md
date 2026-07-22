---
description: 一键串联 需求分析→设计→编码→测试 全流程，阶段间保留确认点（确定性门禁拦截，不可跳过）
argument-hint: [需求描述]
allowed-tools: Bash(node *sdlc-state.js*)
---

# 一键闭环编排（阶段间强制确认）

## 0. 初始化门禁状态

先通过 Bash 初始化流水线状态（进入编排模式，四阶段均为 pending）。`feature-slug` 从需求描述提炼，用英文 kebab-case：

```
node "${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/scripts/sdlc-state.js" init <feature-slug>
```

若报错"状态已存在"：说明上一次流水线的状态还在。**不要自动重置**——向用户说明情况，由其选择：执行 `reset` 清除重来（会丢失此前 feature 的全部确认态），或沿用现有状态继续编排。初始化成功时，追溯矩阵 `docs/traceability-matrix.md` 会从模板自动初始化（已存在则跳过）。

## 1-4. 依次编排四个阶段

**每个阶段完成后必须暂停，等待用户显式确认**；确认后执行 `/approve <phase>` 写入确认态，再进入下一阶段。不要因为是「一键」命令就跳过确认——`${CLAUDE_PLUGIN_ROOT}/hooks/scripts/gate-check.js` 会对未经确认的跨阶段子代理调用做**确定性阻断**（见 `${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/SKILL.md`）。

1. 调用 `requirements-analyst` 处理需求：$ARGUMENTS → 产出 `docs/requirements/*.md`
   - 【等待确认】→ `/approve requirement`
2. 调用 `architect` 产出设计 → `docs/design/*.md`
   - 【等待确认】→ `/approve design`
3. 调用 `developer` 编码 → 代码 + 单元测试骨架 + `docs/code/<feature>-code-handoff.md`
   - 【等待确认】→ `/approve code`
4. 调用 `tester` 出具测试结论 → `docs/test/*.md`
   - 【等待确认】→ `/approve test`

每个阶段产出须附带结构化交接块（见 `${CLAUDE_PLUGIN_ROOT}/skills/context-handoff/SKILL.md`），并回填追溯矩阵 `docs/traceability-matrix.md`（见 `${CLAUDE_PLUGIN_ROOT}/skills/traceability-matrix/SKILL.md`）。任一阶段都可经 `/review <阶段>` 调用 `reviewer` 做完整性检查（见 `${CLAUDE_PLUGIN_ROOT}/agents/reviewer.md`）；评审退回时按 `${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/SKILL.md` 的退回协议处理。

## 5. 收尾

全部完成后，汇总四个基线文件路径与追溯矩阵状态，向用户报告本次闭环是否完整。可运行以下命令附上门禁状态快照：

```
node "${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/scripts/sdlc-state.js" status
```
