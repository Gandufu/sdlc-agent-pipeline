---
name: traceability-matrix
description: 维护需求(REQ)-设计(DES)-代码-测试用例(TC)追溯矩阵的标准操作流程。当任意阶段agent需要新增或回填用户项目的 docs/traceability-matrix.md 时使用。
---

# 追溯矩阵维护 SOP

## 矩阵位置

- **活文档**（持续写入）：用户项目内的 `docs/traceability-matrix.md`。由 `/pipeline` 初始化时从插件模板自动复制；若不存在（非编排模式），先手动从 `${CLAUDE_PLUGIN_ROOT}/templates/docs/traceability-matrix.md` 复制一份。
- `${CLAUDE_PLUGIN_ROOT}/templates/docs/traceability-matrix.md` 是**只读模板**，不要把阶段产出回填进模板文件。

## 矩阵结构

| REQ编号 | 需求摘要 | DES编号 | 设计摘要 | 代码位置(文件路径/类名) | TC编号 | 测试结论 | 阶段状态 |
|---|---|---|---|---|---|---|---|

## 操作规则

1. **新增行**：仅由 `requirements-analyst` 在需求阶段新增，REQ编号一旦分配不可更改或复用。
2. **回填 DES**：`architect` 完成设计后，在对应 REQ 行填入 DES编号；若某 REQ 判定为"复用已有框架能力，无需新增设计"，DES列填 `N/A(复用)` 并简述原因，不留空。
3. **回填代码位置**：`developer` 完成编码后填入实际文件路径/类名，不使用模糊描述如"已完成"。
4. **回填 TC 与测试结论**：`tester` 完成用例设计与执行后填入。
5. **阶段状态列**取值固定为：`需求已确认` / `设计已确认` / `编码已确认` / `测试已通过` / `退回`，不使用自由文本。

## 一致性检查（每次回填后自查）

- 是否存在空的 DES/TC 列且未标注 `N/A(复用)` 或原因？→ 说明该需求尚未被后续阶段处理，禁止标记该 feature 为"闭环完成"。
- 是否存在编号复用（同一个REQ编号被用于两个不同需求）？→ 视为严重错误，必须停止并向用户报告。
