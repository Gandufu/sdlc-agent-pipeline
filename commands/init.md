---
description: 流水线初始化：读入既有需求文档（或描述）→ grill 式逐轮澄清 → 按模板定稿需求规格说明书并进入编排模式
argument-hint: <需求文档路径 或 需求描述>
allowed-tools: Bash(node *sdlc-state.js*)
---

# 流水线初始化（需求文档 → 需求规格基线）

适用于「已有一份需求文档/PRD，需要转换为本流水线约定格式」的场景：完成需求阶段的初始化与定稿，并进入编排模式（确定性门禁生效），后续阶段由 `/design` → `/code` → `/test` 接力。若没有既有文档、只有口头描述，直接使用 `/requirement` 即可。

## 0. 读入输入并初始化门禁状态

1. 判断 `$ARGUMENTS` 形态：
   - 若为已存在的文件路径（md/txt 等）：用 Read 读取全文作为原始需求输入；文件不存在则停下提示用户检查路径，不要猜测内容。
   - 否则整体视为自然语言需求描述。
2. 从需求内容提炼 `feature-slug`（英文 kebab-case），通过 Bash 初始化流水线状态（四阶段均为 pending；追溯矩阵 `docs/traceability-matrix.md` 会从模板自动初始化，已存在则跳过）：

   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/sdlc-state.js" init <feature-slug>
   ```

   若报错“状态已存在”：说明上一次流水线的状态还在。**不要自动重置**——向用户说明情况，由其选择：执行 `reset` 清除重来（会丢失此前 feature 的全部确认态），或沿用现有状态继续初始化。

## 1. Grill 式澄清（在本会话执行，不要交给子代理）

requirements-analyst 子代理无法与用户交互，澄清必须在本会话对话中完成。按 `${CLAUDE_PLUGIN_ROOT}/skills/requirement-clarification/SKILL.md` 的 SOP 对原始需求输入分轮追问：

- **先查后问**：先读 `${CLAUDE_PLUGIN_ROOT}/rules/existing-framework.md` 与项目内历史 `docs/requirements/*.md`，框架已提供的能力不再追问。
- **每轮最多 1–2 个关键问题**，优先给选项式确认，不要一次抛一长串；优先问影响架构与排期的：P0 范围、性能/并发量级、安全合规、与已有框架的集成方式。
- 直到 SOP 的**收敛标准**满足才结束追问：每个需求点都有可测试的验收标准；非功能性要求要么有明确取值、要么显式标注「待确认」（禁止编造数字）；与已有框架能力、历史需求无未解决冲突。

## 2. 调用 requirements-analyst 定稿

澄清收敛后，调用 `requirements-analyst` 子代理（定义见 `${CLAUDE_PLUGIN_ROOT}/agents/requirements-analyst.md`），把原始需求输入**连同本会话的澄清结论**（含用户对每轮追问的回答）一并交给它，要求其：

- 严格按 `${CLAUDE_PLUGIN_ROOT}/templates/docs/requirement-spec.md` 模板产出 `docs/requirements/<feature-slug>-requirement-spec.md`（REQ 编号规则、优先级、验收标准、范围外说明齐全）；
- 回填追溯矩阵 `docs/traceability-matrix.md`（见 `${CLAUDE_PLUGIN_ROOT}/skills/traceability-matrix/SKILL.md`）；
- 定稿时在文档末尾追加机器可读的 stage-handoff 交接块（见 `${CLAUDE_PLUGIN_ROOT}/skills/context-handoff/SKILL.md`，stage: requirement）。

若子代理仍判断有关键信息缺失，应让它一次性列出问题清单返回，由本会话向用户补充追问后再重新调用定稿——不要让子代理编造或含糊带过。

## 3. 等待确认（强制门禁点，不得自动推进）

明确告知用户：需求规格已产出，请核对 REQ 编号与验收标准；确认后执行 `/approve requirement` 写入确认态，再用 `/design` 进入设计阶段（门禁状态已初始化，确定性门禁生效）。**不要自行调用 architect 等后续阶段 agent**——`${CLAUDE_PLUGIN_ROOT}/hooks/scripts/gate-check.js` 会对未经确认的跨阶段调用做确定性阻断（规则见 `${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/SKILL.md`）。
