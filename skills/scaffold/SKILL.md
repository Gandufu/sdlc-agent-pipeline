---
name: scaffold
description: 技术栈脚手架初始化规范。当 /init 需要选择技术栈并拷贝项目骨架时使用。定义了 scaffold 命令的调用方式、模板目录结构与拷贝规则。
---

# 脚手架初始化规范

## 调用方式

插件启用后，`bin/scaffold.js` 自动加入 Bash tool 的 PATH，可直接调用：

```
scaffold --stack <技术栈> --target <目标目录>
```

| 参数 | 取值 | 说明 |
|------|------|------|
| `--stack` | `java-spring` / `vue` / `full`（java-spring+vue） | 技术栈选择 |
| `--target` | 目录路径（默认 `.`） | 拷贝目标 |

## 模板目录

```
${CLAUDE_PLUGIN_ROOT}/templates/scaffold/
├── java-spring/          # Spring Boot 后端骨架
│   ├── pom.xml
│   ├── src/main/java/com/example/
│   │   ├── Application.java
│   │   ├── controller/
│   │   ├── service/
│   │   ├── dto/
│   │   └── config/
│   └── src/main/resources/
│       └── application.yml
└── vue/                  # Vue 前端骨架
    ├── package.json
    ├── src/
    │   ├── main.js
    │   ├── App.vue
    │   ├── api/
    │   ├── views/
    │   ├── components/
    │   └── router/
    └── vite.config.js
```

`--stack full` 时拷贝两个目录的并集（后端放根目录，前端放 `frontend/` 子目录）。

## 拷贝规则

1. **不覆盖已有文件**：目标路径已存在同名文件时跳过，输出 `[skip]` 标记。
2. **输出拷贝清单**：每个拷贝/跳过的文件打印一行，便于用户确认。
3. **退出码**：0 成功（含部分跳过）、1 参数错误、2 模板目录不存在。
