# 开发与验证

## 隐私与告知

隐私政策与告知版本由 src/data/site.ts 统一提供；PrivacyContent.astro 共用正文，Privacy.astro 提供主页的原生弹窗与底部告知，privacy.astro 输出可独立访问的静态页面。确认记录只用于已读状态，不代表统计授权；统计初始化仍由原有 boot.ts 负责。不要把“知道了”改写成概括同意条款，也不要因提示未确认阻塞主页或媒体。

浏览器存储失败时保留本次内存确认，重新访问可能再次显示；本地记录与政策版本不匹配时重新告知。页脚入口使用事件委托，移入“更多”后也能打开弹窗，关闭时把焦点送回可用的入口。底部空间通过告知实际高度计算；短屏使用单行告知，极短屏在提示期间暂隐藏运行时长，确认后恢复原布局。跨标签确认或清除记录要取消旧淡出计时器；恢复焦点只选择可见且非 inert 的入口。相关回归在 tests/e2e/privacy.spec.ts，既有测试通过真实“知道了”操作进入正常状态。

## 工具链

使用 `.nvmrc` 指定的 Node.js 版本（与 EdgeOne 支持的部署版本一致）和 `package.json#packageManager` 指定的 pnpm，提交 `pnpm-lock.yaml`，不混用 npm/yarn 锁文件。`package.json#engines` 声明兼容范围，命令中不重复指定版本。Astro、检查工具、Playwright、Vitest 和格式工具采用当前稳定版本；TypeScript 使用 Astro 检查工具支持的最新 6.0.3，待上游支持后再升 7。`@types/node` 与 Node 24 基线一致。

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Node.js 24.18.0 附带 Corepack 0.35.0。若系统不带 Corepack，先通过 pnpm 官方安装方式安装 `packageManager` 对应版本。不要为了本项目修改其他项目的工具链。

## 代码地图

| 路径                           | 职责                                             |
| ------------------------------ | ------------------------------------------------ |
| `src/pages/index.astro`        | 构建完整主页 HTML，加载主页交互模块              |
| `src/components/Favicon.astro` | CDN 原图图标与非阻塞的浏览器圆角裁剪             |
| `src/components/`              | 图标、导航面板、子卡片、页脚、媒体栏与加载壳     |
| `src/data/site.ts`             | 服务、联系、三视频池和外部资源地址               |
| `src/styles/home.css`          | 复用定稿的全局样式、响应式和动画                 |
| `src/scripts/navigation.ts`    | 面板过渡、尺寸与滚动指示                         |
| `src/scripts/blog.ts`          | 懒加载、分页、重试、固定底部链接                 |
| `src/scripts/footer.ts`        | 域名备案渲染、popup 与动态收纳                   |
| `src/scripts/media.ts`         | 媒体按钮状态与隐藏 UI 模式                       |
| `src/scripts/video.ts`         | 单视频播放意图、实际帧显示与有限错误恢复         |
| `src/scripts/boot.ts`          | 首次绘制后加载资源、有限字体等待与 UI 入场       |
| `src/scripts/privacy.ts`       | 告知版本、跨标签同步和政策弹窗                   |
| `src/scripts/origin.ts`        | HostLoc 自定义提示                               |
| `src/lib/`                     | 可独立测试的域名、收纳、时间、文章校验和版本规则 |
| `public/`                      | 原样复制到静态输出的爬虫与兼容资源               |
| `docs/design/`                 | 最终规格与已确认设计快照                         |

版本在 Astro 配置首次执行时读取 checkout 的完整 SHA，Vite 注入页面构建。Git 不可用时依次接受 `SITE_REVISION`、`GITHUB_SHA`、`CI_COMMIT_SHA`、`COMMIT_SHA`，均要求完整 40 位十六进制。没有有效版本就明确拒绝构建，避免发布指向错误提交的链接。开发中提交代码后重启开发服务更新版本。

头像直接使用 `resources.avatar` 的旧版 public-cdn 地址，主页、加载壳、404 和付款跳转页统一引用。CDN 需保留 `Access-Control-Allow-Origin`，以便匿名跨域图片在载入后复用到 canvas，为 favicon 裁剪 35% 圆角；不另发图片请求，不加入加载门禁。裁剪不可用时保留原图图标，无脚本时也使用原图。`public/` 不保留头像文件，冻结设计与测试夹具中的历史图片保持不变。

## 门禁

```sh
pnpm verify
pnpm exec playwright install chromium
pnpm test:e2e
```

`verify` 依次执行 Prettier、Astro/TypeScript 检查、单元测试、静态构建和产物检查。产物检查校验冻结设计摘要、版本、四个静态页面（首页、404、付款跳转与隐私政策）、旧跳转、单视频元素与客户端脚本 gzip 预算（25 kB）。CSS 内联以保证加载壳立即绘制；主页客户端脚本应保持轻量。

浏览器测试先构建真实 `dist/`，用测试专用静态服务验证。CI 仅替换外部网络：使用自制 1 秒纯色 WebM、受控文章 API 和图片，阻止真实统计。无运行时测试开关或生产调试接口。测试工具不进入 `dist/`。

视觉测试在同一浏览器进程、同一视口和字体回退条件下加载冻结原型与正式页面，消除鼠标悬停和随机视频差异后比较截图；避免把不同操作系统的字体光栅化误认为改版。测试覆盖 1440、390、320px，对齐、透明边缘、滚动、控制栏与 popup 还使用真实 DOM 几何检查。

确定性 CI 不能替代真实外部资源检查。发布前用不拦截网络的浏览器确认三个视频、MiSans、随机兜底图和文章 API；外部服务故障应与页面故障分别记录。

## 更新与回归

提交建议使用中文 Conventional Commits：`type(scope): 中文描述`。例如 `feat(主页): 增加背景视频控制`、`ci(检查): 完善浏览器回归测试`。每个提交对应一个可理解、可审查的交付物，正文写清必要原因与验证，不将无关变动混在一起。

Dependabot 参考同级 `MoeURL`、`UptimePage`：npm 生态（包括 pnpm）每日检查，Actions 每周检查；Astro/TypeScript、测试、格式工具分别分组。安全更新和普通更新都必须经过 CI，不自动合并。锁文件变化后运行冻结安装和完整门禁。

`pnpm-lock.yaml` 是包管理器生成文件，pnpm 和 Dependabot 的 YAML 排版不必与 Prettier 一致，因此从格式检查中排除；冻结安装继续检查清单与锁文件的一致性，不通过手工重排或关闭冻结检查绕过失败。TypeScript 7 当前会被 `astro check` 明确拒绝，Dependabot 暂时忽略 7 及以上版本；`@types/node` 限于部署的 Node 24 主版本，忽略 25 及以上版本。升级 Astro 类型检查工具或 EdgeOne 运行时后，先验证兼容性，再同步调整这些规则。

改 UI 先对照最终规格，改规则先添加能捕获真实破坏的测试。冻结原型不能随实现一并改动，否则视觉对照失去意义。新增设计须得到用户明确要求并保存新版本。

媒体回归使用支持 HTTP Range 的真实视频夹具，验证画面帧、同源重载、播放位置和暂停意图。派发错误事件不等同于原生媒体故障，只有原生 MediaError 才触发恢复；不通过无条件隐藏视频来处理缓冲。

异常恢复需要同时覆盖成功的自动重载与自动重载耗尽后的手动重试，后者仍须保留中断前的位置。触屏休眠回归必须直接触摸隐藏按钮后等待，不得先触摸背景绕开首次进入状态。无脚本回归使用真正关闭 JavaScript 的浏览器上下文，检查正文、可点击链接和键盘焦点；仅检查 HTML 包含 `noscript` 不足以验证降级。

网页标题与描述由 `siteMetadata` 提供，并同步到 Open Graph。canonical 使用 `astro.config.mjs#site`；调整正式主域时一并核对元信息输出。冻结原型中的历史标题与描述不随 SEO 文案更新。

阴影另有独立像素回归：在平坦白色场景中采样服务和联系卡片的上、中、下间隙，检查核心透明度一致、外缘渐隐到完全透明、正常页脚空白无暗斑。这样可避免仅复制视觉快照时把叠加问题一起复制。右键回归使用真实鼠标操作，确认普通模式、隐藏 UI 与控制栏休眠时的右键事件均未取消且不命中视频，同时验证媒体属性、自定义按钮、正文和普通链接菜单。
