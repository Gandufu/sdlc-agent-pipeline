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

使用 `@RestControllerAdvice` **继承 `ResponseEntityExceptionHandler`** 统一收口：

- Spring MVC 标准异常（405 方法不支持 / 404 路径不存在 / 400 请求体不可读 等）由父类按正确 HTTP 状态处理；**禁止**用裸 `@ExceptionHandler(Exception.class)` 捕获后直接返回响应体——那会把协议异常改写为 HTTP 200（body code=500），破坏 HTTP 状态语义并使监控误判（e2e 实证 P0，勿蹈覆辙）。
- `BusinessException` → HTTP 200 + 统一响应体业务错误码（业务错误以 body code 区分）。
- 参数校验异常（`MethodArgumentNotValidException`）→ 覆写父类对应方法，保留 HTTP 400 的同时换成统一响应体。
- 真正未知的异常 → 兜底 handler 经 `ResponseEntity` 显式返回 HTTP 500；**HTTP 状态必须与 body code 语义一致**（监控读 HTTP 状态），不暴露堆栈给前端。
- Controller 层测试必须包含**协议边缘状态**的端到端断言（错误方法 → 405、不存在路径 → 404 等），且用发真实 HTTP 请求的方式（`@SpringBootTest(webEnvironment = RANDOM_PORT)` + `TestRestTemplate`）——仅 MockMvc 断言不一定暴露状态码被改写的问题。

参考模板：`${CLAUDE_PLUGIN_ROOT}/templates/code/spring/GlobalExceptionHandler.java.template`。

## 接口路径规范

- RESTful 风格：`/api/<module>/<resource>`，资源名用复数小写连字符，如 `/api/user/accounts`。
- 查询参数用于过滤/分页（`page`, `size`, `keyword`），路径参数用于资源定位（`/accounts/{id}`）。

## 配置约定

- 所有可变配置（连接串、超时时间、开关）放入 `application-<env>.yml`，禁止硬编码。
- 鉴权相关配置统一复用 `${CLAUDE_PLUGIN_ROOT}/rules/existing-framework.md` 中描述的鉴权模块，不新建鉴权配置。

## 事务与并发

- 涉及多表写操作的 Service 方法必须显式标注 `@Transactional`，并注明传播行为（如非默认）。
