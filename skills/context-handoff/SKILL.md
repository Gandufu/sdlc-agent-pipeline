---
name: context-handoff
description: 当某阶段完成、需要把结构化产出交给下一阶段（需求→设计→编码→测试），或编排模式需要机器可读的阶段产物时使用。
---

# 阶段上下文交接协议

## 目的

每个阶段除了产出**人读文档**（docs/ 下的基线文件），还必须在文档末尾追加一段**机器可读的交接块**。作用有二：

1. 下一阶段只读交接块即可获得最小必要上下文，不必全文解析上一阶段文档，减少上下文丢失与 token 浪费。
2. 编排模式（Workflow Engine 经 Claude Code SDK 按阶段调用）可直接解析该块，把阶段产物落入配置管理体系。

## 定稿协议（四阶段共用，唯一源）

各阶段 skill 定稿时执行本协议，只提供**本阶段参数**：`stage` 值、基线文档路径、`items` 内容、`next_stage_needs`。**修改定稿流程只需改本节**，skill 侧不重复流程细节。

**双档义务**——与门禁共用同一模式信号：`.sdlc/pipeline-state.json` 存在 = 编排模式（全套义务）；不存在 = 交互模式（轻量义务）。

### 步骤 1：回填追溯矩阵（两档均必须）

按 `${CLAUDE_PLUGIN_ROOT}/skills/traceability-matrix/SKILL.md` 回填用户项目 `docs/traceability-matrix.md` 对应列（需求：新增 REQ 行；设计：DES→REQ 关联；编码：代码位置；测试：TC 编号与结论）。

### 步骤 2：追加交接块

- **编排模式（必须）**：在基线文档末尾追加下述格式的 stage-handoff 块。编码阶段无单一基线文档：创建 `docs/code/<feature>-code-handoff.md` 承载（`baseline_doc` 即该路径）。
- **交互模式（建议）**：建议追加以便日后接编排引擎；也可跳过。若先交互、后转入编排（经 `/init` 或 `/pipeline`），所缺交接块在 `/review` 时补写并复检。

### 步骤 3：机器校验（evidence over claims）

```
node "${CLAUDE_PLUGIN_ROOT}/skills/context-handoff/scripts/validate-handoff.js" <基线文档路径>
```

- **编排模式**：退出码 0 才算定稿完成；失败按 stderr 列出的问题逐条修正后重跑——定稿以脚本结果为准，不以「我认为已写好」为准。
- **交互模式**：不强制；reviewer 评审时若块存在则复检（见 `${CLAUDE_PLUGIN_ROOT}/skills/review-checklist/SKILL.md`）。

退出码约定与门禁脚本一致：0 通过、2 校验失败、1 用法/文件错误。编排引擎解析前校验同以此脚本为准。

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

## 操作规则

1. **谁产出谁负责**：交接块由该阶段 skill 在定稿时写入（按上文定稿协议），不允许由下一阶段补写。
2. **与门禁联动**：编排模式下 `/approve <phase>` 写入确认态前，应确认交接块已存在且 `matrix_updated: true`（否则 reviewer 应判退回，见 `${CLAUDE_PLUGIN_ROOT}/skills/review-checklist/SKILL.md`）。
3. **向后兼容**：交接块是追加内容，不改变 docs/ 文档既有结构。
4. **open_questions 不编造结论**：未决项如实列出，下一阶段不得无视，须先澄清或显式承接。
