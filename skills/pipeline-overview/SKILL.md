---
name: pipeline-overview
description: 当使用 /pipeline 或 /init 编排全流程、任一阶段 skill/agent 流转、需要判断某阶段该加载哪个 skill 与哪些技术栈规则、或用户询问"接下来该做什么"时使用。
---

# SDLC 流水线总控路由与硬约束

> 本 skill 是流水线规则的唯一权威来源。仓库根的 CLAUDE.md 仅作开发工作区入口说明，不重复规则内容——避免双份维护导致规则漂移。

## 1. 流水线总览

```
用户需求
   │
   ▼
[/init 或 /grill]（主会话） → docs/requirements/*.md（基线①）
   │  等待用户确认 / reviewer 通过
   ▼
[/design → architect agent] → docs/design/*.md + docs/traceability-matrix.md（基线②）
   │  等待用户确认 / reviewer 通过
   ▼
[/code → developer agent] → 代码 + 单元测试骨架（基线③）
   │  等待用户确认 / reviewer 通过
   ▼
[/test → tester agent] → docs/test/*.md + 测试结论（基线④）
```

## 2. 硬性约束（对所有 Skill、Agent 与命令生效，优先级最高）

1. **禁止跳过确认自动推进阶段**——即使用户用 `/pipeline` 一键触发，阶段之间也必须暂停等待确认。该约束由**确定性门禁**强制执行（`${CLAUDE_PLUGIN_ROOT}/hooks/scripts/gate-check.js` 读取 `.sdlc/pipeline-state.json`，拦截未经确认的跨阶段子代理调用；确认态经 `/approve <phase>` 写入）。各阶段 skill 自身也在 body 首步运行 `sdlc-state.js status` 做前置检查（双重保障）。判断规则见 `${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/SKILL.md`。
2. **接口与代码风格必须与 rules/ 中的约定一致**，任何 skill/agent 不允许自创命名或分层方式。规则文件位于插件目录 `${CLAUDE_PLUGIN_ROOT}/rules/` 下。
3. 涉及 `${CLAUDE_PLUGIN_ROOT}/rules/existing-framework.md` 中已列出的能力（登录鉴权、系统管理等）时，只做扩展接入，**不允许重新实现**。
4. 每个阶段产出后必须回填**用户项目内**的 `docs/traceability-matrix.md` 对应列（见 `${CLAUDE_PLUGIN_ROOT}/skills/traceability-matrix/SKILL.md`）。该活文档由 `/pipeline` 或 `/init` 初始化时从插件模板复制而来，勿直接修改模板本身。
5. 当前阶段目标：**先打通四阶段流水线闭环，暂不引入原型/UI设计环节**。
6. **需求拷问（grill）必须在主会话执行**：子代理不能使用 AskUserQuestion（官方硬约束），故 grill 类追问不得派发到 agent。

## 3. 角色路由表

| 触发方式 | 执行组件 | 主要输入 | 产出 |
| --- | --- | --- | --- |
| `/init <需求文档或描述>` | skills/init（主会话：选技术栈→scaffold→grill→定稿） | 需求 + rules/existing-framework.md | requirement-spec.md + 脚手架 + `.sdlc/pipeline-state.json` |
| `/grill <需求文档或描述>` | skills/grill（主会话：grill→定稿） | 需求 + rules/existing-framework.md | requirement-spec.md |
| `/setup [项目根]` | skills/setup（主会话：探测→确认→写 existing-framework.md） | 项目代码线索 | rules/existing-framework.md |
| `/design [需求文档路径]` | skills/design → agents/architect（Read/Write/Grep/Glob） | 已确认 requirement-spec.md + rules/*.md | design-doc.md |
| `/code [设计文档路径]` | skills/code → agents/developer（全工具，上下文隔离） | 已确认 design-doc.md + rules/*.md | 代码 + code-handoff.md |
| `/test [feature]` | skills/test → agents/tester（Read/Write/Bash/Grep/Glob，无Edit） | requirement-spec.md + design-doc.md + 代码 | test-plan.md + 测试结果 |
| `/pipeline <需求描述>` | skills/pipeline（依次编排四阶段，阶段间确认） | — | 汇总四个基线 + 追溯矩阵 |
| 自然语言"评审XX阶段" | skills/reviewer → agents/reviewer（Read/Grep/Glob） | 阶段产出 + traceability-matrix.md | 通过 / 退回结论 |
| `/approve <阶段>` | skills/approve（写门禁确认态） | 用户确认的阶段 | pipeline-state.json |
| `/reject <阶段>` | skills/reject（写门禁退回态） | reviewer 退回结论 | pipeline-state.json |
| "接下来做什么" | skills/ask-pipeline | pipeline-state.json | 下一步指引 |

> `skills/`、`agents/`、`templates/` 均指插件目录（`${CLAUDE_PLUGIN_ROOT}/`）；`docs/`、`.sdlc/` 指用户项目目录。

## 4. 技术栈规则路由表（可扩展，新增技术栈只改这里）

| 场景 | 需要加载的规则文件 |
| --- | --- |
| Java 后端通用规范 | `${CLAUDE_PLUGIN_ROOT}/rules/java.md` |
| Spring / Spring Boot 专项 | `${CLAUDE_PLUGIN_ROOT}/rules/spring.md` |
| Vue 前端规范 | `${CLAUDE_PLUGIN_ROOT}/rules/vue.md` |
| 已有框架能力（所有阶段必读） | `${CLAUDE_PLUGIN_ROOT}/rules/existing-framework.md` |
| 新增技术栈 | `rules/<stack>.md` + 本表新增一行 |

## 5. 共享技能

| Skill | 用途 |
| --- | --- |
| skills/traceability-matrix | 追溯矩阵维护 SOP |
| skills/baseline-gate | 门禁判断 + sdlc-state.js |
| skills/context-handoff | 交接块 + 定稿协议（唯一源） |
| skills/requirement-clarification | grill 追问 SOP |
| skills/review-checklist | 分阶段评审清单 |
| skills/scaffold | 脚手架初始化规范 |
| skills/stage-dispatch | 阶段调度 SOP（门禁+派发+汇报，design/code/test 复用） |
| skills/writing-pipeline-skills | 元技能：如何新增/修改 skill |

> `karpathy-guidelines`（通用编码行为准则）与本插件"四阶段闭环"身份不匹配，已移出 `skills/` 到仓库根 `contrib/`（待拆为独立插件）。它不在分发扫描路径上，无论 `.claude-plugin/marketplace.json` 的 `skills` 白名单字段是否生效，都不会随本插件分发。

> 组件架构与设计依据（为什么选 skill 优先、agent 工具限制的官方出处、参考的社区实践）见仓库 `README.md`——本文件只保留运行时路由与硬约束，维护者向背景不在此重复。新增/修改 skill 的规范见 `${CLAUDE_PLUGIN_ROOT}/skills/writing-pipeline-skills/SKILL.md`。
