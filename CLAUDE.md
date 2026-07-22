# CLAUDE.md — sdlc-agent-pipeline 开发工作区入口

> 本仓库是一个 Claude Code 插件的开发工作区，同时也是插件源码本身。**流水线规则与硬性约束的唯一权威来源**是 `skills/pipeline-overview/SKILL.md`（插件安装后为 `${CLAUDE_PLUGIN_ROOT}/skills/pipeline-overview/SKILL.md`）——本文件不复制规则内容，避免双份维护导致规则漂移。

## 使用本流水线

- 唯一加载方式：`/plugin marketplace add <本目录>` 并启用插件，然后使用 `/init` `/grill` `/design` `/code` `/test` `/approve` `/reject` `/pipeline`，或自然语言触发评审（reviewer skill）。
- `/init`：选技术栈→拷贝脚手架→初始化门禁→grill 澄清→需求定稿（一站式）。
- `/grill`：独立需求拷问→定稿（可不经 /init 单独使用）。
- `/design` `/code` `/test`：分别派发 architect / developer / tester 子代理（带工具限制与上下文隔离）。
- 插件根 CLAUDE.md 不会被 Claude Code 自动加载——规则经 `pipeline-overview` skill 按需加载，这是刻意设计（避免上下文膨胀）。
- 不支持"复制到项目 `.claude/` 下"的安装方式：那样门禁钩子不会被注册，硬约束 #1 将静默失效。详见 README.md。

## 维护本仓库

- 目录速查：`agents/` 4 个角色定义（architect/developer/tester/reviewer，各带工具限制）· `skills/` user-invoked 命令 + model-invoked SOP · `rules/` 技术栈规约 · `hooks/` 阶段门禁与状态注入 · `templates/` 文档/代码/脚手架模板 · `bin/` 脚手架脚本 · `tests/` 脚本测试 · `CHANGELOG.md` 变更日志
- 分发前必须把 `rules/existing-framework.md` 的示例内容替换为平台真实能力清单。
- 新增技术栈：只改 `rules/<stack>.md` + `skills/pipeline-overview/SKILL.md` 第 4 节路由表 + `templates/scaffold/<stack>/`。
- 新增/修改 skill/agent：遵循 `skills/writing-pipeline-skills/SKILL.md` 规范。
- 发版时同步 `plugin.json` 与 `marketplace.json` 两处版本号。
- 设计理念、社区实践参考与平台架构衔接见 README.md。
