---
name: writing-pipeline-skills
description: 当用户要求"加一个新阶段""新增技术栈规则""扩展流水线"、需要新增或修改本插件的 skill/agent 时使用。不要在用户只是想使用现有 skill 时使用。
---

# 在本插件中新增/修改组件的规范

## 组件分类（官方规范）

| 类型 | 位置 | 触发方式 | 用途 |
|------|------|---------|------|
| **user-invoked skill** | `skills/<name>/SKILL.md` | 用户 `/xxx`（`disable-model-invocation: true`） | 编排、门禁操作、阶段入口 |
| **model-invoked skill** | `skills/<name>/SKILL.md` | Claude 按 description 自动匹配 | SOP、规则、共享知识 |
| **agent** | `agents/<name>.md` | Claude 自动委派 / skill 派发 | 需要工具限制或上下文隔离的执行单元 |

> 官方：commands/ 是遗留格式，新插件用 skills/。

## 新增 Skill 的步骤

1. 创建 `skills/<name>/SKILL.md`（kebab-case）。
2. frontmatter：`description`（第三人称 + 触发短语 + anti-trigger 反例）；user-invoked 加 `disable-model-invocation: true` + `argument-hint`。
3. body：祈使语气写给 Claude。
4. 阶段 skill 首步必须检查门禁（`sdlc-state.js status`）。
5. 定稿引用 context-handoff 定稿协议，不重复流程。
6. 登记到 pipeline-overview 路由表。

## 新增 Agent 的步骤

1. 创建 `agents/<name>.md`。
2. frontmatter 必填：`name`、`description`（含 `<example>` 正/反例）。
3. **`tools:` 必须有意义**——限制是 agent 存在的理由。全工具集 agent 仅在上下文隔离有明确收益时使用。
4. 用 `skills:` 预加载需要的 SOP（如 context-handoff、traceability-matrix），不在 body 里重复。
5. 插件 agent 不支持 `hooks`、`mcpServers`、`permissionMode`（官方安全限制）。

## 新增技术栈

只改 `rules/<stack>.md` + pipeline-overview 第 4 节路由表，不动 skill/agent。

## 禁止事项

- 不在 skill/agent 中复制 pipeline-overview 硬约束原文——引用即可。
- 不自创编号体系——REQ/DES/TC 规则见 traceability-matrix skill。
- grill 相关逻辑不放 agent——子代理不能 AskUserQuestion。
