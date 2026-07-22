# Changelog

本项目所有值得注意的变更都记录在此文件中。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。
发版时须同步 `.claude-plugin/plugin.json` 与 `.claude-plugin/marketplace.json` 两处版本号（见 CLAUDE.md）。

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
