# Java 后端通用规范

## 命名规范

- 包名：全小写，按 `com.<company>.<project>.<module>` 组织。
- 类名：大驼峰，`Controller` / `Service` / `ServiceImpl` / `Mapper` / `DTO` / `VO` / `Entity` 后缀固定，不使用同义变体。
- 方法名：小驼峰，动词开头（`get` / `list` / `create` / `update` / `remove` ...），禁止拼音命名。

## 分层结构（固定，不允许自创）

```
controller/   # 只做参数校验 + 调用service + 包装统一响应，不写业务逻辑
service/      # 接口定义
service/impl/ # 业务逻辑实现
mapper/       # 数据访问层
dto/          # 接口入参/出参对象
vo/           # 面向前端展示的视图对象（与DTO字段不同时使用）
entity/       # 数据库实体
```

## 异常处理

- 业务异常统一继承自 `BusinessException`（全局异常处理约定见 `rules/spring.md`），禁止在 Controller/Service 中直接 `throw new RuntimeException(...)`。
- 异常信息必须包含错误码 + 可读信息，错误码维护在统一枚举中，禁止硬编码字符串错误码。

## 日志规范

- 使用 SLF4J，禁止 `System.out.println`。
- 关键业务操作（新增/删除/权限变更）必须记录操作日志，格式：`[模块][操作] 操作人={} 对象={} 结果={}`。

## 反模式（禁止）

- Controller 直接操作 Mapper（跳过 Service 层）。
- 在 Service 层直接构造 HTTP 响应对象。
- 吞掉异常（catch 后不记录也不抛出）。

## 对应模板

> 路径中的 `${CLAUDE_PLUGIN_ROOT}` 指向本插件安装目录（在 agent/命令正文中会自动展开为绝对路径）。

- `${CLAUDE_PLUGIN_ROOT}/templates/code/java/Controller.java.template`
- `${CLAUDE_PLUGIN_ROOT}/templates/code/java/Service.java.template`
- `${CLAUDE_PLUGIN_ROOT}/templates/code/java/ServiceImpl.java.template`
- `${CLAUDE_PLUGIN_ROOT}/templates/code/java/DTO.java.template`
