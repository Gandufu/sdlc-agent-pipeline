# Spring / Spring Boot 专项规范

## 统一响应体

所有 Controller 返回值必须包装为：

```java
public class ApiResponse<T> {
    private int code;      // 0 表示成功，非0为业务错误码
    private String message;
    private T data;
}
```

禁止直接返回裸 DTO/VO 或裸字符串。参考模板：`${CLAUDE_PLUGIN_ROOT}/templates/code/java/UnifiedResponse.java.template`（`${CLAUDE_PLUGIN_ROOT}` 指向插件安装目录）。

## 全局异常处理

使用 `@RestControllerAdvice` 统一捕获：

- `BusinessException` → 返回对应业务错误码
- 参数校验异常（`MethodArgumentNotValidException`）→ 统一格式化字段级错误信息
- 未捕获异常 → 统一包装为 `code=500`，不暴露堆栈给前端

参考模板：`${CLAUDE_PLUGIN_ROOT}/templates/code/spring/GlobalExceptionHandler.java.template`。

## 接口路径规范

- RESTful 风格：`/api/<module>/<resource>`，资源名用复数小写连字符，如 `/api/user/accounts`。
- 查询参数用于过滤/分页（`page`, `size`, `keyword`），路径参数用于资源定位（`/accounts/{id}`）。

## 配置约定

- 所有可变配置（连接串、超时时间、开关）放入 `application-<env>.yml`，禁止硬编码。
- 鉴权相关配置统一复用 `${CLAUDE_PLUGIN_ROOT}/rules/existing-framework.md` 中描述的鉴权模块，不新建鉴权配置。

## 事务与并发

- 涉及多表写操作的 Service 方法必须显式标注 `@Transactional`，并注明传播行为（如非默认）。
