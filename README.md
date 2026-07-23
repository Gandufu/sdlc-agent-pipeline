# sdlc-agent-pipeline

需求分析 → 设计 → 编码 → 测试，四阶段闭环的 Claude Code 插件。本 README 面向人类维护者，不是 Claude 自动加载的内容。

## 这是什么

一个通过 `/plugin marketplace add <你的仓库>` 安装的 Claude Code 插件。核心思路：

- **规则唯一源是 `skills/pipeline-overview/SKILL.md`**（总控路由表 + 硬性约束），按需加载，避免上下文膨胀。
- **对齐官方插件规范**（code.claude.com/docs/zh-CN/plugins）：全部用 `skills/`（官方推荐，`commands/` 是遗留格式）；4 个 agent 各有工具限制或上下文隔离收益；agent 的 `skills:` frontmatter 预加载 SOP 消除内容重复。
- **agents/**：4 个角色定义，每个都有明确的工具限制（architect 无 Bash/Edit、tester 无 Edit、reviewer 只读）或上下文隔离收益（developer 编码产出隔离）。
- **skills/**：10 个 user-invoked skill（创建 `/xxx` 命令）+ 8 个 model-invoked skill（SOP 与共享知识）。
- **rules/** 承载技术栈规约（java/spring/vue），按需加载、可无限扩展。
- **templates/** 承载文档模板、代码骨架与项目脚手架。
- **bin/scaffold.js** 脚手架拷贝脚本（Node.js 零依赖，插件启用后加入 PATH）。
- 阶段之间**强制人工确认门禁**，由确定性脚本 `hooks/scripts/gate-check.js` 执行，各阶段 skill 自身也做前置检查（双重保障）。
- **阶段间结构化交接**（skills/context-handoff）：交接块 + `validate-handoff.js` 机器校验（evidence over claims）。
- **会话启动即知进度**：SessionStart 钩子自动注入当前流水线状态。

## 安装与启用

```
/plugin marketplace add <本目录或仓库地址>
```

随后在 `/plugin` 中启用 `sdlc-agent-pipeline`。**必须经插件机制加载**，agents/skills/hooks 才会注册。

## 命令与触发方式

| 命令 | 用途 |
|------|------|
| `/init <需求文档或描述>` | 选技术栈→拷贝脚手架→初始化门禁→grill→需求定稿 |
| `/grill <需求文档或描述>` | 独立需求拷问→定稿（可不经 /init） |
| `/design [需求文档路径]` | 门禁检查→派发 architect agent→设计文档 |
| `/code [设计文档路径]` | 门禁检查→派发 developer agent→代码 |
| `/test [feature]` | 门禁检查→派发 tester agent→测试脚本+执行 |
| `/approve <阶段>` | 写门禁确认态 |
| `/reject <阶段>` | 写门禁退回态 |
| `/pipeline <需求描述>` | 一键编排四阶段（阶段间强制确认） |
| 自然语言"评审XX阶段" | 派发 reviewer agent（Read-only） |
| 自然语言"接下来做什么" | ask-pipeline 状态路由 |

## 架构设计依据

| Agent | 工具限制 | 官方依据 |
|-------|---------|---------|
| architect | Read,Write,Grep,Glob（无Bash/Edit） | Enforce constraints：设计师不跑命令、不改已有文件 |
| developer | 全工具 | Preserve context：编码产出隔离，主会话只看汇报 |
| tester | Read,Write,Bash,Grep,Glob（无Edit） | Enforce constraints：不能改被测代码 |
| reviewer | Read,Grep,Glob | Enforce constraints：评审员不改业务内容 |

grill（需求拷问）在主会话执行：官方硬约束——子代理不能使用 AskUserQuestion。

## 门禁与状态机制

门禁状态存于项目目录 `.sdlc/pipeline-state.json`，由 `skills/baseline-gate/scripts/sdlc-state.js` 管理：

```
sdlc-state.js init <feature> [--force]   # 初始化
sdlc-state.js confirm <phase>            # /approve 写入
sdlc-state.js revoke <phase>             # /reject 写入
sdlc-state.js status [--brief]           # 查看状态
sdlc-state.js reset                      # 重置
```

## 使用前必须做的事

1. **配置 `rules/existing-framework.md`**：执行 `/setup`，插件会扫描项目现有代码线索并交互式生成能力清单（替代手工填写示例）。若插件目录只读或偏好手写，也可直接编辑该文件。
2. **按需增删 rules/**：新增技术栈只需 `rules/<stack>.md` + pipeline-overview 路由表 + `templates/scaffold/<stack>/`。
3. **发版时同步版本号**：`plugin.json` 与 `marketplace.json`。
4. **改完脚本跑测试**：`node --test tests/*.test.js`。

## 维护规则（插件开发）

- **新增 skill 必须加白名单**：在 `skills/<name>/` 建 `SKILL.md` 后，**必须**把路径加进 `.claude-plugin/marketplace.json` 的 `skills` 数组。实测确认：marketplace-root（`source: "./"`）下该字段是 **replace 语义**——不在数组里的 skill 不分发（探针 `/_probe-test` 实测验证：它在 `skills/` 下但不在数组里，重新加载后不出现）。漏加 = 新 skill 静默不分发。注意：`plugin.json` 的 `skills` 字段是 Adds 语义（不替代），只有 marketplace entry 的才是 replace。
- **不要依赖 agent `skills:` 预加载**：实测（`claude --print --plugin-dir … --agent architect` 探针）发现 plugin agent 的 `skills:` frontmatter 不会把 SKILL.md 正文注入 agent 上下文（呼应 Claude Code issue #25834）。agent 正文需要某协议时，用显式 `Read ${CLAUDE_PLUGIN_ROOT}/skills/<x>/SKILL.md`，**不要写"已预加载"**。
- **新增 agent 必须有刚需**：能对应「Enforce constraints（工具限制）」或「Preserve context（上下文隔离）」之一，否则用 skill 承载（见 `docs/adr/0001-retain-agents.md`）。
- **阶段调度复用 stage-dispatch**：新增"派发 agent 的阶段"时，复用 `skills/stage-dispatch/`，只给四参数（phase/prev/agent/input），不要复制「门禁→派发→汇报」body（见 `docs/adr/0002-stage-dispatch-shared-sop.md`）。
- **新增技术栈**：`rules/<stack>.md` + `pipeline-overview` 第 4 节路由表 + `templates/scaffold/<stack>/`；若要 `/setup` 能探测新栈，再补 `skills/setup/SKILL.md` §2 的扫描启发式。

## 参考的社区实践

- **obra/superpowers**：零 agents/ 零 commands/ 全 skill 化 + "Mandatory workflows" + "evidence over claims"。
- **mattpocock/skills**：user-invoked 编排 / model-invoked 纪律二分法 + grill 沉淀 + 元 skill。
- **BMAD-METHOD**：多角色 persona + 阶段质量门 + 文档基线。
- **Claude Code 官方插件体系**：skills/ 替代 commands/、agent `skills:` 预加载、`bin/` PATH 注入。

## 目录结构

```
sdlc-agent-pipeline/
├── .claude-plugin/
│   ├── plugin.json             # 插件清单（v0.3.0）
│   └── marketplace.json
├── agents/
│   ├── architect.md            # tools: Read,Write,Grep,Glob
│   ├── developer.md            # tools: 全部（上下文隔离）
│   ├── tester.md               # tools: Read,Write,Bash,Grep,Glob（无Edit）
│   └── reviewer.md             # tools: Read,Grep,Glob
├── skills/
│   ├── init/ grill/ design/ code/ test/     # 用户命令（/xxx）
│   ├── approve/ reject/ pipeline/           # 门禁与编排
│   ├── reviewer/ ask-pipeline/              # 评审与路由
│   ├── pipeline-overview/                   # 总控路由+硬约束（规则唯一源）
│   ├── requirement-clarification/           # grill SOP
│   ├── scaffold/                            # 脚手架规范
│   ├── baseline-gate/                       # 门禁 + sdlc-state.js
│   ├── context-handoff/                     # 交接块 + validate-handoff.js
│   ├── traceability-matrix/                 # 矩阵维护
│   ├── review-checklist/                    # 评审清单
│   └── writing-pipeline-skills/             # 元 skill
├── bin/
│   └── scaffold.js             # 脚手架拷贝（Node.js 零依赖，加入 PATH）
├── hooks/
│   ├── hooks.json
│   └── scripts/gate-check.js
├── rules/                      # 技术栈规约
├── templates/
│   ├── docs/                   # 文档模板
│   ├── code/                   # 代码骨架
│   └── scaffold/               # 项目脚手架（java-spring / vue）
├── tests/                      # node --test tests/*.test.js
├── CHANGELOG.md
└── LICENSE
```
