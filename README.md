# 荼蘼 TomyJan 的主页

以视频为背景的个人主页，使用 Astro + TypeScript 构建，输出纯静态文件。包含服务导航、WordPress 文章、联系入口与播放器式沉浸模式。

正式站：[www.tomys.top](https://www.tomys.top/)。旧实现保留在 [`legacy`](https://github.com/TomyJan/HomePage/tree/legacy)，新实现使用 `master`。

## 开发

使用 Node.js 24 LTS（见 `.nvmrc`）和 pnpm：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

```sh
pnpm verify       # 格式、类型、单元测试、构建、产物检查
pnpm exec playwright install chromium
pnpm test:e2e     # 浏览器功能与定稿视觉对照
pnpm preview     # 预览 dist/
```

内容和资源地址在 `src/data/site.ts`，备案域名在 `src/lib/domains.ts`。页脚版本在开发服务启动或构建时注入，不在浏览器请求 GitHub。

## 设计与部署

- [最终规格](docs/design/specification.md) · [冻结原型](docs/design/README.md)
- [开发与验证](docs/development.md) · [EdgeOne Makers 部署](docs/deployment.md)
- [重写验收记录](docs/verification.md)
- [迁移与实施计划](docs/superpowers/plans/2026-10-27-homepage-rewrite.md)

EdgeOne Makers 导入仓库后选择 `master`，根目录 `edgeone.json` 已定义构建和旧地址跳转，发布目录为 `dist/`。实际发布状态以平台为准。

许可证：[MPL-2.0](LICENSE)，从旧站原样保留。头像、视频和外部字体的权利归各自权利人。
