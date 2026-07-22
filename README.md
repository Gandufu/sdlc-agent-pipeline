# sdlc-agent-pipeline

需求分析 → 设计 → 编码 → 测试，四阶段闭环的 Claude Code 插件脚手架。本 README 面向人类维护者，不是 Claude 自动加载的内容。

## 这是什么

一个通过 `/plugin marketplace add <你的仓库>` 安装的 Claude Code 插件骨架。核心思路：

- **规则唯一源是 `skills/pipeline-overview/SKILL.md`**（总控路由表 + 硬性约束），按需加载，避免上下文膨胀和"规则被稀释"。根 CLAUDE.md/AGENTS.md 只做开发工作区入口——插件根 CLAUDE.md 本来就不会被 Claude Code 自动加载，这正是规则要沉成 skill 的原因。
- **agents/** 承载四个SDLC角色的persona与工作流程（需求分析师/架构师/开发/测试 + 一个评审守门人）。
- **rules/** 承载技术栈规约（java/spring/vue），按需加载、可无限扩展新技术栈。
- **skills/** 承载跨角色复用的SOP（追溯矩阵维护、阶段门禁判断等），避免四个agent各写一套。
- **templates/** 承载文档模板与代码骨架，保证产出风格统一。
- 阶段之间**强制人工确认门禁**，由**确定性门禁**执行：`hooks/scripts/gate-check.js`（PreToolUse，matcher `Task|Agent`，新旧两代子代理工具名同时命中）读取状态文件 `.sdlc/pipeline-state.json`，前置阶段未确认就直接阻断对下一阶段 agent 的调用——不依赖模型自觉。确认态经 `/approve <阶段>` 写入，退回态经 `/reject <阶段>` 写入，门禁判断规则见 skills/baseline-gate。不因为"一键跑完"就自动放行——这是有意为之的保守设计。
- **阶段间结构化交接**（skills/context-handoff）：每阶段产出附带机器可读交接块，供下一阶段读取最小必要上下文，也供编排引擎（Workflow Engine）直接解析。

## 安装与启用（唯一支持方式）

```
/plugin marketplace add <本目录或仓库地址>
```

随后在 `/plugin` 中启用 `sdlc-agent-pipeline`。**必须经插件机制加载**，agents/commands/skills/hooks 才会一次性注册：

- 未启用插件时，`/requirement` 等斜杠命令与子代理**均不可用**——cd 进本仓库也不行（根目录的 `agents/`、`commands/`、`skills/` 只作为插件组件被识别；项目级 hooks 的注册位置是 `.claude/settings.json` 的 `hooks` 字段，而非 `.claude/hooks/hooks.json`）。
- **不要复制到项目的 `.claude/` 下使用**：该方式不会注册门禁钩子，硬约束「禁止跳过确认」会静默失效，只剩模型自觉。
- 安装后命令全名为 `sdlc-agent-pipeline:requirement` 等；`/code`、`/test`、`/init` 这类短名可能与内置命令或其他插件/项目命令撞名，撞名时用全名。
- 本仓库的 `.claude/` 目录是维护者的开发工作区配置（插件启用项等），**不是插件内容**，对安装者不生效。

## 门禁与状态机制

门禁状态存于**项目目录**的 `.sdlc/pipeline-state.json`（不在插件内），由 `scripts/sdlc-state.js` 管理：

```
node scripts/sdlc-state.js init <feature> [--force]  # 初始化（四阶段 pending），进入编排模式；
                                                     # 默认不覆盖已有状态，--force 强制覆盖；
                                                     # 初始化时会顺带从模板生成 docs/traceability-matrix.md
node scripts/sdlc-state.js confirm <phase>    # 确认某阶段（/approve 写入）
node scripts/sdlc-state.js revoke <phase>     # 退回某阶段（/reject 写入）
node scripts/sdlc-state.js status             # 查看状态
node scripts/sdlc-state.js reset              # 重置（退出编排模式，门禁不干预）
```

设计要点：

- **确定性**：钩子读状态文件的二元状态（confirmed 与否），而非模型"自觉"。
- **不误伤**：状态文件不存在时视为非编排模式（单独跑 `/requirement` `/design` 等），门禁不干预。
- **退回可回滚**：reviewer 退回时 `/reject` 回滚该阶段确认态，后续阶段门禁关闭，重做复评后再 `/approve`。
- **覆写保护**：重复执行 `/pipeline` 不会静默清掉上一个 feature 的已确认状态——`init` 遇到已有状态会报错退出（除非 `--force`）。当前版本状态为单 feature，多 feature 并行留待后续版本。

## 参考的社区实践

- **BMAD-METHOD**（github.com/bmad-code-org/BMAD-METHOD）：多角色persona化agent（PM/Architect/Dev/QA等）+ 阶段质量门 + 通过"故事文件"在agent间传递上下文，是目前最主流的多智能体敏捷开发框架之一。本插件的 agents/ 分工直接借鉴了这一思路，但把BMAD面向敏捷迭代的"故事(story)"换成了更贴近你们现有流程的"需求规格/设计说明书/测试计划"三段式文档基线。
- **GitHub Spec-Kit**（github.com/github/spec-kit）：specify → plan → tasks → implement 的四阶段闭环，每阶段产出一个文档作为下一阶段唯一输入，并用一个 `constitution.md` 固化"不可协商"的项目原则。本插件的 pipeline-overview skill（路由表 + 硬约束）+ rules/ 就是这个 constitution 理念的展开版——把"不可协商原则"进一步拆分成按技术栈可扩展的独立文件。
- **Claude Code 官方插件体系**（2026）：Plugin = Skills（按需加载的SOP） + Subagents（独立上下文的角色） + Hooks（确定性校验） + Commands（斜杠命令编排），是当前打包分发这套东西的标准方式。

## 与你现有"四层解耦"平台架构的衔接建议

结合此前确定的方案（Agent Runtime + Workflow Engine 自建 / Java-Spring Boot，LLM Gateway 自建，Claude Code headless/SDK 模式作为默认编码引擎），本插件可以有两种运行形态，复用同一套 prompt 资产：

1. **交互模式**：团队成员在本地 Claude Code 里安装本插件，手动执行 `/init`（把既有需求文档转换为约定格式并初始化流水线）、`/requirement` `/design` `/code` `/test` 或一键 `/pipeline`。
2. **编排模式**：Workflow Engine 通过 Claude Code SDK/headless 方式，按阶段分别调用（每次调用只带该阶段需要的 agent + rules 上下文），把返回的结构化产物（建议约定输出为 JSON 或结构化 Markdown）落入你们的配置管理体系——即把 `docs/requirements/*.md`、`docs/design/*.md` 等视为"开发库"草稿，`skills/baseline-gate` 判定通过后再转入"受控库"，与你熟悉的三库模式自然对应。

## 使用前必须做的事

1. **替换 `rules/existing-framework.md`**：把里面的示例行换成你们平台真实的登录/权限/系统管理能力清单，否则 agent 无法正确判断"哪些不用重新做"。
2. **按需增删 rules/**：新增技术栈只需要新增一个 `rules/<stack>.md` 文件 + 在 `skills/pipeline-overview/SKILL.md` 第 4 节路由表加一行，不用改动其他文件。
3. 当前版本**刻意不包含原型/UI设计环节**，如需引入，建议作为 `agents/ui-designer.md` + 独立命令新增，不要塞进 architect 的职责里。
4. **发版时同步版本号**：`plugin.json` 与 `marketplace.json` 两处 version 需保持一致。
5. **钩子配置注记**：`hooks/hooks.json` 顶层 `description` 为可选字段；`timeout` 单位为秒。

## 目录结构

```
sdlc-agent-pipeline/
├── .claude-plugin/
│   ├── plugin.json             # 插件清单
│   └── marketplace.json        # 市场清单（支持 /plugin marketplace add）
├── CLAUDE.md / AGENTS.md       # 开发工作区入口（规则唯一源为 skills/pipeline-overview）
├── agents/
│   ├── requirements-analyst.md
│   ├── architect.md
│   ├── developer.md
│   ├── tester.md
│   └── reviewer.md
├── rules/
│   ├── README.md
│   ├── java.md
│   ├── spring.md
│   ├── vue.md
│   └── existing-framework.md   ← 需替换为真实内容
├── skills/
│   ├── pipeline-overview/SKILL.md    # 总控路由 + 硬约束（规则唯一源）
│   ├── traceability-matrix/SKILL.md
│   ├── baseline-gate/SKILL.md
│   ├── context-handoff/SKILL.md
│   ├── requirement-clarification/SKILL.md
│   └── review-checklist/SKILL.md
├── commands/
│   ├── init.md                 # 流水线初始化：既有需求文档 → grill 澄清 → 需求规格定稿
│   ├── requirement.md
│   ├── design.md
│   ├── code.md
│   ├── test.md
│   ├── pipeline.md
│   ├── review.md               # 阶段完整性评审
│   ├── approve.md              # 写门禁确认态
│   └── reject.md               # 写门禁退回态
├── hooks/
│   ├── hooks.json              # 门禁钩子配置（PreToolUse matcher: Task|Agent）
│   └── scripts/gate-check.js   # 确定性门禁脚本
├── scripts/
│   └── sdlc-state.js           # 流水线状态管理（init/confirm/revoke/status/reset）
└── templates/
    ├── docs/
    │   ├── requirement-spec.md
    │   ├── design-doc.md
    │   ├── test-plan.md
    │   └── traceability-matrix.md  # 只读模板，活矩阵在项目 docs/traceability-matrix.md
    └── code/
        ├── java/*.template
        ├── spring/*.template
        └── vue/*.template
```
