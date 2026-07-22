---
name: context-handoff
description: 阶段间上下文交接协议。当某阶段完成、需要把结构化产出交给下一阶段（需求→设计→编码→测试），或编排模式（Workflow Engine）需要机器可读的阶段产物时使用。
---

# 阶段上下文交接协议

## 目的

每个阶段除了产出**人读文档**（docs/ 下的基线文件），还必须在文档末尾追加一段**机器可读的交接块**。作用有二：

1. 下一阶段只读交接块即可获得最小必要上下文，不必全文解析上一阶段文档，减少上下文丢失与 token 浪费。
2. 编排模式（Workflow Engine 经 Claude Code SDK 按阶段调用）可直接解析该块，把阶段产物落入配置管理体系。

## 交接块格式

放在基线文档末尾，用 ```yaml 围栏包裹，首行固定为 `# stage-handoff`：

```yaml
# stage-handoff
stage: requirement          # requirement | design | code | test
feature: user-login         # 与 .sdlc/pipeline-state.json 中 feature 一致
status: done                # done | returned
baseline_doc: docs/requirements/user-login-requirement-spec.md
matrix_updated: true        # 是否已回填追溯矩阵（见 ${CLAUDE_PLUGIN_ROOT}/skills/traceability-matrix/SKILL.md）
items:                      # 本阶段关键条目，编号唯一、可追溯
  - id: REQ-USR-001
    summary: 用户名密码登录
    key_constraint: 登录成功返回 token；接入已有鉴权，不重新实现
next_stage_needs:           # 下一阶段所需的最小上下文（技术栈、可复用能力、前置结论）
  - 技术栈：Java + Spring Boot（后端）、Vue（前端）
  - 复用框架能力：登录接口 /login、token 校验拦截器
open_questions:             # 未决问题；无则留空数组 []
  - 并发量级待确认
```

> 各阶段完整示例见 `examples/`（可照抄适配，且均可被本 skill 的 `scripts/validate-handoff.js` 校验通过）：`handoff-design.yaml` / `handoff-code.yaml` / `handoff-test.yaml`；requirement 阶段以上文格式围栏为例。

## 各阶段 items 的编号约定

| 阶段 | items.id 前缀 | 含义 |
|---|---|---|
| requirement | `REQ-` | 需求条目 |
| design | `DES-` | 设计单元（对应一个或多个 REQ） |
| code | 文件路径/类名 | 代码落点（不用"已完成"等模糊描述） |
| test | `TC-` | 测试用例（追溯到 REQ 验收标准） |

> 编码阶段没有单一基线文档，交接块承载于 developer 创建的 `docs/code/<feature>-code-handoff.md`（`baseline_doc` 字段即指向它）；其余阶段的交接块追加在各自基线文档末尾。

## 操作规则

1. **谁产出谁负责**：交接块由该阶段 agent 在定稿时写入，不允许由下一阶段补写。
2. **与门禁联动**：`/approve <phase>` 写入确认态前，应确认交接块已存在且 `matrix_updated: true`（否则 reviewer 应判退回，见 `${CLAUDE_PLUGIN_ROOT}/skills/review-checklist/SKILL.md`）。
3. **向后兼容**：交接块是追加内容，不改变 docs/ 文档既有结构；单独运行某阶段命令（非编排模式）时同样建议产出，便于后续接编排引擎。
4. **open_questions 不编造结论**：未决项如实列出，下一阶段不得无视，须先澄清或显式承接。
5. **机器校验为准（evidence over claims）**：追加交接块后必须运行 `node "${CLAUDE_PLUGIN_ROOT}/skills/context-handoff/scripts/validate-handoff.js" <基线文档路径>`，退出码 0 才视为定稿完成；失败时按 stderr 列出的问题逐条修正后重跑。reviewer 评审复检、编排引擎解析前同样以该脚本结果为准。退出码约定与门禁脚本一致：0 通过、2 校验失败、1 用法/文件错误。
