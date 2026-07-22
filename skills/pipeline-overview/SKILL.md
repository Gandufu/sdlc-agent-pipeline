---
name: pipeline-overview
description: SDLC 四阶段流水线（需求分析→设计→编码→测试）的总控路由与硬性约束。当使用 /pipeline 编排全流程、任一阶段命令（/requirement /design /code /test /review /approve /reject）流转、或需要判断某阶段该调用哪个 agent、加载哪些技术栈规则时使用。所有 agent 与命令必须遵守本文件的硬约束。
---

# SDLC 流水线总控路由与硬约束

> 本 skill 是流水线规则的唯一权威来源。仓库根的 CLAUDE.md 仅作开发工作区入口说明，不重复规则内容——避免双份维护导致规则漂移。

## 1. 流水线总览

```
用户需求
   │
   ▼
[需求分析师 requirements-analyst] → docs/requirements/*.md（基线①）
   │  等待用户确认 / reviewer 通过
   ▼
[架构设计师 architect] → docs/design/*.md + docs/traceability-matrix.md（基线②）
   │  等待用户确认 / reviewer 通过
   ▼
[开发工程师 developer] → 代码 + 单元测试骨架（基线③）
   │  等待用户确认 / reviewer 通过
   ▼
[测试工程师 tester] → docs/test/*.md + 测试结论（基线④）
```

## 2. 硬性约束（对所有 Agent 与命令生效，优先级最高）

1. **禁止跳过确认自动推进阶段**——即使用户用 `/pipeline` 一键触发，阶段之间也必须暂停等待确认。该约束由**确定性门禁**强制执行（`${CLAUDE_PLUGIN_ROOT}/hooks/scripts/gate-check.js` 读取 `.sdlc/pipeline-state.json`，拦截未经确认的跨阶段调用；确认态经 `/approve <phase>` 写入），判断规则见 `${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/SKILL.md`。
2. **接口与代码风格必须与 rules/ 中的约定一致**，任何 agent 不允许自创命名或分层方式。规则文件位于插件目录 `${CLAUDE_PLUGIN_ROOT}/rules/` 下。
3. 涉及 `${CLAUDE_PLUGIN_ROOT}/rules/existing-framework.md` 中已列出的能力（登录鉴权、系统管理等）时，只做扩展接入，**不允许重新实现**。
4. 每个阶段产出后必须回填**用户项目内**的 `docs/traceability-matrix.md` 对应列（见 `${CLAUDE_PLUGIN_ROOT}/skills/traceability-matrix/SKILL.md`）。该活文档由 `/pipeline` 初始化时从插件模板 `${CLAUDE_PLUGIN_ROOT}/templates/docs/traceability-matrix.md` 复制而来，勿直接修改模板本身。
5. 当前阶段目标：**先打通四阶段流水线闭环，暂不引入原型/UI设计环节**（原型设计留待后续版本接入，不要提前实现）。

## 3. 角色路由表

| 触发方式                  | 调用的Agent                             | 主要输入                                               | 产出模板                           |
| ------------------------- | --------------------------------------- | ------------------------------------------------------ | ---------------------------------- |
| `/init <需求文档路径或描述>` | 主会话 grill 澄清 → agents/requirements-analyst.md 定稿 | 既有需求文档 + rules/existing-framework.md | templates/docs/requirement-spec.md（并初始化 `.sdlc/pipeline-state.json`） |
| `/requirement <需求描述>` | agents/requirements-analyst.md          | 用户原始需求 + rules/existing-framework.md             | templates/docs/requirement-spec.md |
| `/design [需求文档路径]`  | agents/architect.md                     | 已确认的 requirement-spec.md + 对应技术栈 rules/*.md   | templates/docs/design-doc.md       |
| `/code [设计文档路径]`    | agents/developer.md                     | 已确认的 design-doc.md + 对应技术栈 rules/*.md         | templates/code/**                  |
| `/test [feature]`         | agents/tester.md                        | requirement-spec.md（验收标准）+ design-doc.md（接口） | templates/docs/test-plan.md        |
| `/pipeline <需求描述>`    | 依次调用以上四个agent，阶段间保留确认点 | —                                                      | 汇总四个基线 + 追溯矩阵            |
| `/review <阶段>`          | agents/reviewer.md                      | 对应阶段产出 + docs/traceability-matrix.md             | 通过 / 退回结论                    |
| `/approve <阶段>`         | （不调用agent，写门禁确认态）           | 用户显式确认的阶段                                     | .sdlc/pipeline-state.json（确认态） |
| `/reject <阶段>`          | （不调用agent，写门禁退回态）           | reviewer 的退回结论                                    | .sdlc/pipeline-state.json（退回态） |

> 上表中 `agents/`、`templates/` 均指插件目录（`${CLAUDE_PLUGIN_ROOT}/` 下）；`docs/`、`.sdlc/` 指用户项目目录。

## 4. 技术栈规则路由表（可扩展，新增技术栈只改这里）

| 场景                                                         | 需要加载的规则文件                                           |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| Java 后端通用规范（命名、分层、异常、日志）                  | `${CLAUDE_PLUGIN_ROOT}/rules/java.md`                        |
| Spring / Spring Boot 专项（统一响应体、全局异常、接口路径、配置约定） | `${CLAUDE_PLUGIN_ROOT}/rules/spring.md`                      |
| Vue 前端规范（组件结构、状态管理、API封装）                  | `${CLAUDE_PLUGIN_ROOT}/rules/vue.md`                         |
| 涉及登录鉴权 / 系统管理 / 菜单权限等已有能力                 | `${CLAUDE_PLUGIN_ROOT}/rules/existing-framework.md`（**所有阶段必读，禁止重复实现**） |
| 新增技术栈（如 Go / React / uni-app）                        | 在插件 `rules/` 下新增 `<stack>.md` 并在本表新增一行，参见 `${CLAUDE_PLUGIN_ROOT}/rules/README.md` |

## 5. 共享技能（跨阶段复用，避免每个 agent 各写一套）

| Skill                      | 用途                                   |
| -------------------------- | -------------------------------------- |
| skills/traceability-matrix | 需求-设计-代码-测试追溯矩阵的维护SOP   |
| skills/baseline-gate       | 判断某阶段是否已确认、能否推进下一阶段（含退回协议） |
| skills/context-handoff       | 阶段间交接 + **定稿协议**（矩阵回填→交接块→校验，唯一源；编排/交互双档义务） |
| skills/requirement-clarification | 需求澄清与追问SOP             |
| skills/review-checklist    | 分阶段完整性评审清单（reviewer 用）    |

> 以上 skill 均位于 `${CLAUDE_PLUGIN_ROOT}/skills/<name>/SKILL.md`。
