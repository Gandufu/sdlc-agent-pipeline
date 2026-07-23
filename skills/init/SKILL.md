---
description: 当用户首次接入新项目、或提到"初始化流水线""开始新项目"时使用（依次完成选技术栈→拷脚手架→初始化门禁→需求拷问→需求定稿）。
argument-hint: [需求文档路径 或 需求描述]
disable-model-invocation: true
---

# 流水线初始化

## 1. 选择技术栈

询问用户选择技术栈（使用 AskUserQuestion）：

- **java-spring**：Java + Spring Boot 后端
- **vue**：Vue 前端
- **java-spring + vue**：全栈（后端 + 前端）

选择决定脚手架模板集与后续加载的 rules 文件。

## 2. 拷贝项目脚手架

根据所选技术栈，运行脚手架脚本把项目骨架拷贝到当前目录（不覆盖已有文件）：

```
scaffold --stack <所选技术栈> --target .
```

> `scaffold` 命令由插件 `bin/scaffold.js` 提供，插件启用后自动加入 PATH。脚本规范见 `${CLAUDE_PLUGIN_ROOT}/skills/scaffold/SKILL.md`。

## 3. 初始化门禁状态

从需求内容提炼 `feature-slug`（英文 kebab-case），初始化流水线状态（四阶段均为 pending；追溯矩阵从模板自动初始化）：

```
node "${CLAUDE_PLUGIN_ROOT}/skills/baseline-gate/scripts/sdlc-state.js" init <feature-slug>
```

若报错"状态已存在"：向用户说明情况，由其选择 `reset` 清除重来或沿用现有状态。

## 4. 需求拷问与定稿

判断 `$ARGUMENTS` 形态：
- 若为已存在的文件路径：Read 读取全文作为原始需求输入。
- 否则整体视为自然语言需求描述。

按 `${CLAUDE_PLUGIN_ROOT}/skills/requirement-clarification/SKILL.md` 的 grill SOP 分轮追问（每轮 1-2 个关键问题，先查后问，结论落文件）。收敛后按 `${CLAUDE_PLUGIN_ROOT}/templates/docs/requirement-spec.md` 模板定稿 `docs/requirements/<feature-slug>-requirement-spec.md`。

## 5. 等待确认（强制门禁点）

明确告知用户：需求规格已产出，请核对 REQ 编号与验收标准；确认后执行 `/approve requirement` 写入确认态，再用 `/design` 进入设计阶段。**不要自行进入后续阶段**。
