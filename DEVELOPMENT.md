# 开发说明

```bash
pnpm install
pnpm test
pnpm build
pnpm install:local
```

`pnpm build` 先做类型检查，再打包 `dist/tau.image-gallery-<版本>.zip`。组件的 Tailwind 类由 `src/tailwind.css` 在构建时编译，接在轮播组件的样式之后写入 `main.css`。

## SDK

图册用到的 `useElement`、外框 `frame`、`BlockToolbar`、`MediaImage`、`useResourceUpload`、`useMediaViewer`、节点资源声明 `resources` 与 `@tau/ui` 的 `Sortable` 尚未发布到 npm。`vendor/` 下是从 Tau 主仓库打包的开发版 SDK，SDK 发布后把 `package.json` 里的 `@tau/plugins`、`@tau/ui` 改为对应的 npm 版本并删除 `vendor/`，同时把 `manifest.json` 的 `minAppVersion` 提到包含这些能力的客户端版本。

## 数据

节点类型 `image-gallery` 与字段沿用 Tau 内置图册，已有文档不需要迁移。`mode` 的取值（1 横排、2 瀑布流、3 轮播）与字段名不能改。
