# Changelog

本项目所有值得注意的变更都记录在此文件中。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。
发版时须同步 `.claude-plugin/plugin.json` 与 `.claude-plugin/marketplace.json` 两处版本号（见 CLAUDE.md）。

## [Unreleased]

### Changed

- **marketplace.json 加 `skills` 数组**：利用官方「source 解析为 marketplace 根时，`skills` 声明替换默认目录扫描」的例外规则，显式圈定分发清单。**实测确认 replace 语义生效**（探针 `/_probe-test` 不在数组里即不分发）——新增 skill 必须同步加入数组。
- **`karpathy-guidelines` 物理移出 `skills/` → `contrib/`**：不再仅靠 marketplace 白名单排除——改为移出分发扫描路径，无论白名单字段是否生效都不随插件分发。
- **agent 不再依赖 `skills:` 预加载**：`claude --print --plugin-dir ... --agent architect` 探针实测发现，agent 的 `skills:` frontmatter 未把 SKILL.md 正文注入上下文（静默失效，呼应 Claude Code issue #25834）。architect/developer/tester 定稿步骤改为显式 Read `context-handoff/SKILL.md`，不再写「已预加载」；`skills:` 字段保留但不依赖。
- **pipeline-overview 瘦身**：第6节「组件架构说明」（维护者向设计背景）移除；运行时硬约束「grill 必须在主会话——子代理不能用 AskUserQuestion」并入第2节。维护背景统一指向 README。
- **19 个 skill 的 description 改写**：按 obra/superpowers 原则只写「何时用」、删除「是什么」摘要——避免模型照 description 概括走捷径而跳读正文。
- **抽取 `skills/stage-dispatch/`（model-invoked）**：承载 design/code/test 共享的「门禁检查→派发子代理→汇报」骨架；三个 user-invoked skill 瘦身为「引用 + 四个参数（phase/prev/agent/input）」。`/pipeline` 随之改为只引用 model-invoked skill（需求走 requirement-clarification、设计/编码/测试走 stage-dispatch），不再调用任何 user-invoked skill（曾违反「user-invoked 不得调 user-invoked」）。决策见 ADR-0002。
- **karpathy-guidelines 调整**：保留为仓库内 model-invoked skill，但从分发表排除（见首条）。

### Added

- **`skills/setup/`（`/setup`）**：扫描项目现有代码线索（Java `@RestController`/`@PreAuthorize`、Vue 路由/store 等）→ AskUserQuestion 逐项确认 → 写入 `rules/existing-framework.md`，替代 README 里「手工替换示例」的纯人工步骤。
- **`skills/traceability-matrix/scripts/check-matrix.py`**：把矩阵一致性检查（空 DES/代码位置/TC 列未标 N/A、REQ 编号复用或占位）机器化；退出码非 0 在 `/approve`（design/code/test）时阻断确认（evidence over claims）。配套 `tests/check-matrix.test.js`（9 用例）。
- **`tests/scaffold.test.js`**：覆盖 java-spring/vue/full 三种拷贝模式与不覆盖语义（6 用例），回归 full 模式 bug。
- **`docs/adr/`**：ADR-0001（保留 agent 层——工具限制/上下文隔离是不可替代的刚需）、ADR-0002（阶段调度共享 SOP 而非合并/复制）。

### Fixed

- `bin/scaffold.js` `--stack full`：vue 的 `frontend/` 前缀曾在递归中重复拼接，导致首层 ENOENT 崩溃与 `src/frontend/frontend/` 嵌套；改为顶层一次性算好目标根目录。
- `skills/baseline-gate/scripts/sdlc-state.js`：`PHASE_CMD.requirement` 从不存在的 `/requirement` 改为 `/grill`（SessionStart 钩子曾提示幽灵命令）。

### Fixed（plugin-dev 评估后）

- `skills/grill/SKILL.md`：补 `disable-model-invocation: true`——它是 user-invoked（有 argument-hint、登记为 /grill 命令）却唯独缺此字段，是 user-invoked 集合的一致性回归。现 10 个 user-invoked skill 全部具备。
- `skills/reviewer/SKILL.md`：删除冗余 `name:` 行（user-invoked 按惯例从目录名推导，且与 `agents/reviewer.md` 同名易混）。
- `skills/karpathy-guidelines/SKILL.md`：删除冗余 `license: MIT`（license 已在 plugin.json 声明）。
- 若干 skill description 进一步去除「是什么」残留（stage-dispatch/setup/pipeline-overview/design）；stage-dispatch §1 补「在用户项目根目录运行」工作目录说明；setup §2 标注「新增技术栈需补扫描启发式」以维持 pipeline-overview 不变量。

## [0.3.0] - 2026-07-23

### Changed（架构重构 v3：对齐官方插件规范）

基于 Claude Code 官方插件文档（code.claude.com/docs/zh-CN/plugins）全面对齐：

- **删除 `commands/` 目录**：官方明确 "Skills as flat Markdown files. Use `skills/` for new plugins"。全部 9 个命令迁移为 user-invoked skill（`skills/<name>/SKILL.md` + `disable-model-invocation: true`），`/xxx` 触发方式不变。
- **恢复 4 个 agent（全部带工具限制）**：
  - `architect`：tools: Read,Write,Grep,Glob（无 Bash/Edit——设计师不跑命令、不改已有文件）+ `skills:` 预加载 context-handoff / traceability-matrix。
  - `developer`：tools: 全部（**上下文隔离**——编码产出大量文件不塞主会话，官方 agent 五大用途之首 "Preserve context"）+ `skills:` 预加载。
  - `tester`：tools: Read,Write,Bash,Grep,Glob（**无 Edit——不能改被测代码**，核心约束）+ `skills:` 预加载。
  - `reviewer`：tools: Read,Grep,Glob（只读）+ `skills:` 预加载 review-checklist。
- **Agent `skills:` 预加载**（官方 frontmatter 字段）：消除 agent body 与 skill 的内容重复——定稿协议、矩阵 SOP、评审清单自动注入子代理上下文。
- **用户命令体系（5+2）**：`/init`（技术栈→脚手架→门禁初始化→grill→定稿）、`/grill`（独立需求拷问→定稿）、`/design`（门禁→architect agent）、`/code`（门禁→developer agent）、`/test`（门禁→tester agent）+ `/approve` `/reject`（门禁操作）。
- **grill 在主会话执行**：官方硬约束——子代理不能使用 AskUserQuestion，需求拷问必须与用户交互。
- **版本号 0.2.0 → 0.3.0**。

### Added

- **脚手架机制**：`bin/scaffold.js`（Node.js 零依赖，插件启用后加入 PATH 可裸命令调用）+ `templates/scaffold/java-spring/` 与 `templates/scaffold/vue/` 项目骨架模板 + `skills/scaffold/` 规范。`/init` 首步选技术栈后自动拷贝。
- **`skills/init/`**：一站式初始化（选技术栈→scaffold→门禁初始化→grill→需求定稿）。
- **`skills/grill/`**：独立需求拷问与定稿（可不经 /init 单独使用）。
- **`skills/design/` / `skills/code/` / `skills/test/`**：user-invoked 阶段入口（门禁检查→派发对应 agent→汇报）。
- **`skills/approve/` / `skills/reject/` / `skills/pipeline/`**：门禁操作与编排（替代旧 commands/）。

### Removed

- `commands/` 整个目录（9 个文件）——官方：commands/ 是遗留格式。
- v0.2.0 的 `skills/design/`、`skills/code/`、`skills/test/`（model-invoked 版本）——内容回到 agent，阶段入口改为 user-invoked skill 派发 agent。

## [0.2.0] - 2026-07-23

### Changed（架构重构 v2：skill 优先，已被 v3 取代）

- 删除 4 个伪子代理与 5 个薄命令，新增 6 个 skill。（此版本的架构决策在 v3 中基于官方文档重新修正。）

## [0.1.0] - 2026-07-22

### Added

- 需求分析 → 设计 → 编码 → 测试四阶段闭环流水线：5 个子代理角色。
- 确定性阶段门禁 `hooks/scripts/gate-check.js`。
- 状态管理 `scripts/sdlc-state.js`。
- 9 个斜杠命令、6 个共享 skill、技术栈规约 `rules/`、文档与代码模板 `templates/`。
- marketplace 清单。
