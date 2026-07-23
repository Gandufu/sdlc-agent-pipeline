# ADR-0002：阶段调度用共享 model-invoked SOP，不复制 body 也不强行合并 user-invoked skill

- **状态**：已采纳
- **日期**：2026-07-23
- **相关**：`skills/stage-dispatch/`、ADR-0001

## 背景

`design` / `code` / `test` 三个 user-invoked skill 的 body 曾高度同构（90%）：都是"门禁检查 → 派发对应 agent → 汇报"，只差阶段名、前置阶段、agent 名、汇报措辞。同时 `/pipeline` 直接按路径引用这四个 user-invoked skill（含 grill），违反"user-invoked 不得调用 user-invoked"的约定（一个 user-invoked skill 可调 model-invoked skill，但不应把另一个 user-invoked skill 当子例程）。

"skill 数量要不要合并"是一个容易被反复重议的点：合并会损失命令面的清晰入口，不合并又显得重复。

## 约束

- 每个 user-invoked skill 对应一个 `/xxx` 命令入口，数量由命令面决定、不可压缩（`/design` `/code` `/test` 必须各自存在）。
- user-invoked skill 之间不得互相调用（mattpocock 约定，避免触发与职责循环）。
- 重复 body 是维护负担（改门禁逻辑要同步三处）。

## 决策

抽出一个 **model-invoked 共享 SOP**：`skills/stage-dispatch/`。它承载"门禁检查 → 派发子代理 → 汇报"的通用骨架，参数化为 `phase / prev / agent / input`。

- `design` / `code` / `test` 三个 user-invoked skill 的 body 瘦身为：引用 stage-dispatch + 四个参数 + 一行阶段特定信息（产出文件、汇报要点）。
- `/pipeline` 编排时：需求阶段引用 model-invoked 的 `requirement-clarification`（与 `/init` 一致），设计/编码/测试阶段引用 `stage-dispatch` —— `/pipeline` 不再调用任何 user-invoked skill。
- **不合并** `design`/`code`/`test` 为一个 skill：命令面入口必须保留。

## 不变量

- **"门禁检查 → 派发 → 汇报"逻辑只存在于 stage-dispatch 一处**。若发现它在别处再现，视为漂移，应回到 stage-dispatch。
- **新增"派发 agent 的阶段"**（如未来加原型/UI 阶段）：优先复用 stage-dispatch，只在 user-invoked skill 里给四个参数，不要复制 body。
- **user-invoked skill 不得引用其他 user-invoked skill**；编排类 skill（pipeline）只能引用 model-invoked skill。
