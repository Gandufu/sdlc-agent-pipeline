# Changelog

本项目所有值得注意的变更都记录在此文件中。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。
发版时须同步 `.claude-plugin/plugin.json` 与 `.claude-plugin/marketplace.json` 两处版本号（见 CLAUDE.md）。

## [Unreleased]

### Added

- **handoff 交接块机器校验** `scripts/validate-handoff.js`：把 `skills/context-handoff` 的格式约定变成可执行断言（evidence over claims）——四个阶段 agent 定稿时自检、reviewer 评审复检、编排引擎解析前校验均以此脚本退出码为准。校验项：交接块存在、stage/status 枚举、`matrix_updated` 必须为 true、items 非空且 id 前缀符合阶段约定（REQ-/DES-/TC-，code 阶段不限）、next_stage_needs 为数组；失败 exit 2 并一次性列出全部问题。配套 15 个单元测试。
- **设计决策记录机制**：`design-doc.md` 模板新增「关键决策」节（决策项 / 备选方案 / 选择与理由 / 影响），architect SOP 要求影响架构/排期/可维护性的取舍逐条登记、不允许只写结论；评审清单设计组增加对应检查项。
- **grill 澄清结论文件化持久**：`requirement-clarification` SOP 新增「结论沉淀」节——每轮澄清结论增量写入 `docs/requirements/<feature>-clarification-notes.md`（只追加、不重写历史轮次），防上下文压缩丢失澄清细节；`init.md` 与 requirements-analyst SOP 改为以该笔记文件为定稿依据。
- **handoff 块三阶段完整示例** `skills/context-handoff/examples/`：design/code/test 各一份可照抄的交接块范例（示例自身可通过 `validate-handoff.js` 校验，配套单元测试永久锁定其与格式约定的一致性）。
- **SessionStart 钩子**：会话启动时自动把当前流水线状态注入会话上下文（feature、各阶段确认情况、「← 当前」标记与下一步建议）。无状态文件时零输出，不干扰非编排模式会话；状态损坏时输出修复指引但不阻塞会话启动。对应命令：`sdlc-state.js status --brief`。
- **单元测试套件** `tests/`：基于 `node:test`（零依赖），以子进程 + 隔离临时目录方式覆盖门禁 `gate-check.js` 的全部放行/阻断分支，与状态管理 `sdlc-state.js` 的状态机跃迁、覆写保护、`--brief` 各输出形态。运行：`node --test`。
- `plugin.json` 增加 `license` 字段（MIT），仓库根新增 `LICENSE` 文件。
- `marketplace.json` 插件条目增加 `category` 与 `tags`（marketplace 发现性）。
- 5 个 agent 的 frontmatter 增加 `color` 字段与 `<example>` 触发示例块（官方 agent 规范，提升子代理路由准确度与多代理会话辨识度）。

### Changed

- 命令 `argument-hint` 统一为官方 frontmatter 规范推荐的 `[...]` 方括号写法（approve / reject / review / init）。
- `plugin.json` keywords 调整：泛化的 `agent` 换为 `agent-pipeline`、`code-review` 等功能类关键词。
- `hooks/hooks.json` 钩子命令的 `${CLAUDE_PLUGIN_ROOT}` 路径加引号，防安装路径含空格时失效。
- **脚本内聚迁移（skill 自包含，官方 skill-development 范式）**：skill 专属脚本住进各自 skill 的 `scripts/`——`validate-handoff.js` → `skills/context-handoff/scripts/`、`sdlc-state.js` → `skills/baseline-gate/scripts/`；hook 实现脚本 `gate-check.js` 按惯例留在 `hooks/scripts/`。全部引用点（hooks.json、4 个命令、4 个 agent、2 个 skill、README、tests）同步替换，顶层 `scripts/` 目录撤销。

## [0.1.0] - 2026-07-22

### Added

- 需求分析 → 设计 → 编码 → 测试四阶段闭环流水线：5 个子代理角色（requirements-analyst / architect / developer / tester / reviewer 守门人）。
- **确定性阶段门禁** `hooks/scripts/gate-check.js`（PreToolUse，matcher `Task|Agent` 兼容新旧两代子代理工具名）：前置阶段未经用户确认即阻断对下一阶段子代理的调用；状态文件不存在视为非编排模式不干预，状态损坏即阻断。
- 状态管理 `scripts/sdlc-state.js`（init / confirm / revoke / status / reset）：含覆写保护（默认不覆盖已有状态，`--force` 强制）、init 时从模板初始化追溯矩阵。
- 9 个斜杠命令：`/init` `/requirement` `/design` `/code` `/test` `/review` `/approve` `/reject` `/pipeline`。
- 6 个共享 skill：`pipeline-overview`（总控路由表 + 硬性约束，规则唯一源）、`baseline-gate`、`context-handoff`、`requirement-clarification`、`review-checklist`、`traceability-matrix`。
- 技术栈规约 `rules/`：java / spring / vue / existing-framework，按「新增文件 + 路由表加一行」方式可扩展新技术栈。
- 文档与代码模板 `templates/`：需求规格 / 设计说明书 / 测试计划 / 追溯矩阵模板与 Java/Spring/Vue 代码骨架。
- marketplace 清单（支持 `/plugin marketplace add`）。
