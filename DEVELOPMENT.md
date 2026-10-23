# 开发说明

当前依赖、平台边界与验证步骤见 [兼容性说明](COMPATIBILITY.md)。

```bash
pnpm install
pnpm test
pnpm build
pnpm install:local
```

`pnpm build` 先做类型检查，再打包 `dist/tau.image-gallery-<版本>.zip`。组件的 Tailwind 类由 `src/tailwind.css` 在构建时编译，接在轮播组件的样式之后写入 `main.css`。

类名一律带 `ig:` 前缀（如 `ig:flex ig:md:hidden`）。插件样式和 Tau、博客模板的样式在同一页面里，不带前缀的工具类会排在宿主的响应式写法之后把它们覆盖掉。开启前缀后，不带前缀的类不会生成样式；构建产物里出现不带前缀的类选择器会直接报错。

## SDK

依赖公开的 `@xiongtao.xt/tau-plugins@0.33.0` 与 `@xiongtao.xt/tau-ui@0.3.0`（经 npm 别名安装为 `@tau/plugins`、`@tau/ui`），运行时由 Tau 提供。图册用到的外框 `frame`、`useElement`、`BlockToolbar`、`MediaImage`、`useResourceUpload`、`useMediaViewer`、资源声明 `resources` 与 `Sortable` 从这个版本开始提供。

## 数据

节点类型 `image-gallery` 与字段沿用 Tau 内置图册，已有文档不需要迁移。`mode` 的取值（1 横排、2 瀑布流、3 轮播）与字段名不能改。
