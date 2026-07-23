---
description: 当用户要求"配置已有框架能力""初始化 existing-framework""扫描现有能力"时使用。该文件已配置完毕时不要使用；常规首次接入流水线请用 /init。
argument-hint: [项目根目录，留空则当前目录]
disable-model-invocation: true
---

# 已有框架能力探测与配置

把 README 里"必须手工替换 `rules/existing-framework.md` 示例"的纯人工步骤，变成扫描+交互确认：探测项目现有代码线索 → 汇总候选能力 → 逐项确认 → 写入。

## 1. 读取目标结构

先 Read `${CLAUDE_PLUGIN_ROOT}/rules/existing-framework.md`，了解要填充的"能力域 | 已提供的功能 | 复用方式/扩展点 | 禁止事项"四列，以及各阶段接入规则段落（这些段落保留，只替换能力清单表）。

## 2. 探测线索

用 Glob/Grep 扫描 `$ARGUMENTS`（留空则当前目录）下的项目代码，按技术栈找"已有能力"迹象：

**Java / Spring**
- `@RestController` / `@Controller` / `@*Mapping` → 既有的业务接口域
- `@PreAuthorize` / `@Secured` / `@RequiresAuth` / 自定义鉴权注解 → 鉴权机制与**注解名**（复用关键）
- `@SpringBootApplication` → 确认 Spring Boot 栈
- `enum` / 字典表 / `@Dict` → 字典与枚举管理方式
- `extends ServiceImpl` / `*Mapper.java` → 数据访问层约定

**Vue**
- `router/index.*` 路由表 → 路由约定
- pinia/vuex store → 状态管理方式
- `api/*.js` / `request.*` → 请求封装层
- `v-permission` 等指令 → 前端鉴权

> 只读扫描，不改任何项目文件。把每条线索记下出处（文件路径），便于用户核对。
>
> 目前覆盖 Java/Spring 与 Vue。新增技术栈时需在此节补充该栈的扫描启发式（或抽取到 `references/<stack>-scan.md`），否则 `/setup` 对新栈无探测能力——这是 pipeline-overview「新增技术栈只改路由表+rules」不变量的一个例外，需显式维护。

## 3. 汇总候选能力

把探测结果整理成候选清单：能力域 + 线索出处 + 推断的"复用方式/禁止事项"。无法确定的标"待确认"。

## 4. 逐项确认（AskUserQuestion）

用 AskUserQuestion 分轮与用户确认（每轮一组相关问题）：
- 这是否是平台既有能力？（是 / 否 / 需补充）
- 推断的复用方式与禁止事项是否准确？让用户补充或修正。

**grill 式追问原则**：给候选项让用户勾选/修正，而非开放式提问；已明确的能力不再追问。

## 5. 写入 existing-framework.md

把确认后的内容按原表结构写入 `${CLAUDE_PLUGIN_ROOT}/rules/existing-framework.md`：
- 保留标题改为真实项目名（去掉"模板"字样）。
- 能力清单表每行填齐四列；未涉及的能力域删除，不要留空行。
- 保留"需求分析/设计/编码阶段的接入规则"与"维护提示"段落。
- 若插件目录只读导致写入失败：降级写入项目本地 `.sdlc/existing-framework.local.md`，并明确提示用户手动复制到插件 rules/ 下（否则 requirement-clarification 与 code 仍会读到模板示例）。

## 6. 后续

告知用户：能力清单已写入，后续 `requirement-clarification` 与 `code` 将以此为准、避免重复造轮子。可执行 `/init` 正式接入流水线；能力变化时重跑 `/setup` 或手工维护该文件。
