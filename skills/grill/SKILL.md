---
description: 需求拷问与定稿。通过 grill 式分轮追问将自然语言需求或既有文档转化为规范化需求规格说明书。当用户提出新功能需求、需求变更、需要澄清范围、或提到"做个XX功能""我有个需求""帮我整理需求"时使用。不要在用户只是想查看已有需求文档但不需要产出新文档时使用。
argument-hint: [需求文档路径 或 需求描述]
---

# 需求拷问与定稿

## 1. 读取输入

判断 `$ARGUMENTS` 形态：
- 若为已存在的文件路径（md/txt 等）：Read 读取全文作为原始需求输入。
- 否则整体视为自然语言需求描述。

先读 `${CLAUDE_PLUGIN_ROOT}/rules/existing-framework.md` 与项目内历史 `docs/requirements/*.md`，框架已提供的能力不再追问。

## 2. Grill 式追问

按 `${CLAUDE_PLUGIN_ROOT}/skills/requirement-clarification/SKILL.md` 的 SOP 执行：

- 每轮最多 1-2 个关键问题，优先给选项式确认。
- 优先问影响架构与排期的：P0 范围、性能/并发量级、安全合规、与已有框架的集成方式。
- 每轮结论增量写入 `docs/requirements/<feature-slug>-clarification-notes.md`。
- 直到收敛标准满足：每个 REQ 有可测试验收标准；非功能性要求有取值或标注「待确认」；无未解决冲突。

## 3. 定稿

按 `${CLAUDE_PLUGIN_ROOT}/templates/docs/requirement-spec.md` 模板产出 `docs/requirements/<feature-slug>-requirement-spec.md`，并执行 `${CLAUDE_PLUGIN_ROOT}/skills/context-handoff/SKILL.md` 定稿协议（stage=requirement）。

## 4. 等待确认

告知用户："需求规格已产出，请确认后执行 `/approve requirement`，再用 `/design` 进入设计阶段。"
