# EdgeOne Makers 部署与回滚

## 构建配置

本项目只发布 `dist/` 静态文件，不需要适配器、云函数、服务端环境或部署密钥。

1. 在 EdgeOne Makers 导入 `TomyJan/HomePage`，选择生产分支 `master`，根目录为仓库根。
2. 根目录 `edgeone.json` 指定 Node.js 24.22.1、pnpm 冻结安装、构建命令和输出 `dist`。平台需能安装指定 Node 版本。
3. 配置正式域名并检查部署日志。构建来自 Git checkout 时自动携带提交版本；源码压缩包没有 `.git` 时必须设置 `SITE_REVISION` 为源提交完整 SHA。
4. 预览域名通常属于未知域名，将展示未知域名提示；正式备案按浏览器实际域名独立匹配，见最终规格。

安装命令通过 `npx` 引导已固定版本的 pnpm，依赖安装仍由 pnpm 执行，不生成 npm 锁文件。这样不依赖平台预装的 pnpm 版本。构建命令同样明确使用该版本。若升级 pnpm，核对 `packageManager`、锁文件与平台命令。

配置字段依据 [EdgeOne Makers edgeone.json 文档](https://pages.edgeone.ai/document/edgeone-json)。源配置声明了旧地址跳转和指纹资源缓存，未配置所有路径回退到主页，未知路径应返回真正的 404。

## 保留的旧入口

| 请求                       | 行为                                                                         |
| -------------------------- | ---------------------------------------------------------------------------- |
| `/pay.php*`                | 301 到 `/pay.html?from=old_paycode`                                          |
| `/feed*`                   | 301 到 `https://donate.tomys.top/?from=old_feed`                             |
| `/pay.html`                | 5 秒后到旧收款码新地址 `https://web-static.tomys.top/paycode/`，提供直接链接 |
| 不存在的路径               | 独立 `404.html`，返回首页入口                                                |
| `/ads.txt`、`/sitemap.txt` | 保留旧内容                                                                   |

`/_astro/*` 为构建指纹资源，缓存一年并标记 immutable。其他资源沿用平台策略。响应带 `nosniff` 和 `strict-origin-when-cross-origin`。不禁止 iframe，因为原域名判断明确支持嵌入情形。

## CI 与发布边界

GitHub Actions 在 master push、PR 和手动触发时运行：

- 格式、类型、单元测试、生产依赖高危审计、静态构建与产物校验；成功后保存 `dist` artifact。
- 单独运行 Playwright 浏览器行为与冻结设计对照，始终保存报告。
- checkout 不持久化凭据，默认只读权限，冻结锁文件，并取消同分支过时检查。

CI 不直接发布，也不创建部署凭据。EdgeOne 的 Git 集成可按平台配置触发部署；CI 成功、平台部署成功和正式域名验收是不同证据，必须分别查看。建议平台启用“检查通过后发布”或相应的部署保护。

## 验收与回滚

发布后检查首屏加载、视频循环与手动暂停、声音、隐藏 UI、四页内容和文章分页；分别核对正式域名备案、窄屏页脚、404 与旧跳转。MiSans 和 Umami 在各自 CDN，随机图来自旧 API，均允许独立失败；视频和图片不阻塞 UI。

需要回滚新实现时，在 EdgeOne 控制台回滚到已验证部署，或重新部署新 master 的已验证提交。需要恢复旧站时选择 `legacy` 的 `58bfb88d87ec7eb1eaa5f24e0afca0a9634af8e4`。两个分支历史独立，不通过 merge 旧站进行回滚，不重写已有历史。
