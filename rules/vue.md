# Vue 前端规范

## 目录/组件结构

```
src/
  views/<module>/<Feature>.vue     # 页面级组件
  components/<module>/<Xxx>.vue    # 可复用组件
  api/<module>.js                  # 接口封装（按模块聚合，不允许在组件里直接写axios）
  store/<module>.js                # 状态管理（按模块拆分）
```

## 命名约定

- 组件文件名：大驼峰，如 `UserList.vue`。
- API 方法名：动词+资源，如 `fetchUserList`、`createUser`。

## API 封装规范

- 所有接口调用必须通过 `api/<module>.js` 统一封装，禁止在组件内直接写 `axios.get(...)`。
- 统一在拦截器中处理 `rules/spring.md` 中定义的统一响应体（判断 `code` 是否为0，非0统一走错误提示）。

参考模板：`${CLAUDE_PLUGIN_ROOT}/templates/code/vue/api.js.template`（`${CLAUDE_PLUGIN_ROOT}` 指向插件安装目录）。

## 组件规范

- 优先使用 `<script setup>` 组合式写法（如项目 Vue 版本支持）。
- 涉及权限控制的入口（按钮/菜单）统一复用 `${CLAUDE_PLUGIN_ROOT}/rules/existing-framework.md` 中的权限指令/组件，不自行实现权限判断逻辑。

参考模板：`${CLAUDE_PLUGIN_ROOT}/templates/code/vue/Component.vue.template`。

## 反模式（禁止）

- 组件内直接发起网络请求。
- 全局状态散落在各组件 `data` 中，未收敛到 store。
