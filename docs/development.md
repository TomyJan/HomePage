# 开发与验证

## 隐私与告知

隐私政策与告知版本由 `src/data/site.ts#privacyPolicy` 提供；`PrivacyContent.astro` 共用正文，`Privacy.astro` 提供主页弹窗与告知，`privacy.astro` 输出独立页面。修改政策时同步核对 `version` 与 `updated`；旧版本记录会触发重新告知。确认只用于已读状态，不代表统计授权，统计初始化由 `boot.ts` 独立负责。不要因提示未确认阻塞主页或媒体。

浏览器存储失败时保留本次内存确认，重新访问可能再次显示；本地记录与政策版本不匹配时重新告知。页脚入口使用事件委托，移入“更多”后也能打开弹窗，关闭时把焦点送回可用的入口。政策弹窗没有眉题和底栏，仅用关闭按钮、Esc 或背景点击关闭；独立页在顶部返回主页。底部告知以 bottom: 12px 保留适度悬浮间距，设备安全区加入自身底部 padding，不为页脚或媒体操作增加外部空隙，不测量或预留布局高度，不移动导航、内容、页脚或媒体按钮，不隐藏运行时长。政策链接放在解释正文中，右侧仅保留“知道了”，不暗示提供统计授权选择；短屏仅收紧告知自身间距和字号。跨标签确认或清除记录要取消旧淡出计时器；恢复焦点只选择可见且非 inert 的入口。相关回归在 tests/e2e/privacy.spec.ts，既有测试通过真实“知道了”操作进入正常状态。

## 工具链

使用 `.nvmrc` 指定的 Node.js 和 `package.json#packageManager` 指定的 pnpm，提交 `pnpm-lock.yaml`，不混用 npm/yarn 锁文件。依赖与兼容范围以 `package.json`、锁文件为准，命令中不重复指定版本。升级需核对 Astro 检查工具与 EdgeOne 运行时兼容性；TypeScript 与 Node 类型定义的限制见 `.github/dependabot.yml`。

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

本项目的部署环境通过 Corepack 读取 `packageManager`。本地也可使用已配置的同版本 pnpm；不要为了本项目修改其他项目的工具链。

## 代码地图

| 路径                                | 职责                                             |
| ----------------------------------- | ------------------------------------------------ |
| `src/pages/index.astro`             | 构建完整主页 HTML，加载主页交互模块              |
| `src/components/Favicon.astro`      | CDN 原图图标与非阻塞的浏览器圆角裁剪             |
| `src/components/Navigation.astro`   | 首页介绍和四个内容面板的 HTML                    |
| `src/components/TextBackdrop.astro` | 正文轮廓合并、柔化和单次着色的共用 SVG 滤镜      |
| `src/components/Footer.astro`       | 版本、站点地图、服务状态和隐私入口               |
| `src/components/`                   | 图标、子卡片、媒体栏、加载壳与共用政策正文       |
| `src/data/site.ts`                  | SEO、服务、联系、视频池、外部运行资源与隐私数据  |
| `src/styles/home.css`               | 复用定稿的全局样式、响应式和动画                 |
| `src/styles/privacy.css`            | 政策弹窗、独立政策页与底部告知样式               |
| `src/styles/elevation.css`          | 弹出式与悬浮表面共用的标准、紧凑四周阴影         |
| `src/scripts/navigation.ts`         | 面板过渡、尺寸与滚动指示                         |
| `src/scripts/blog.ts`               | 懒加载、分页、重试、固定底部链接                 |
| `src/scripts/footer.ts`             | 域名备案渲染、popup 与动态收纳                   |
| `src/scripts/media.ts`              | 媒体按钮状态与隐藏 UI 模式                       |
| `src/scripts/video.ts`              | 单视频播放意图、实际帧显示与有限错误恢复         |
| `src/scripts/boot.ts`               | 首次绘制后启动字体、视频与兜底图，控制 UI 入场   |
| `src/scripts/privacy.ts`            | 告知版本、跨标签同步和政策弹窗                   |
| `src/scripts/origin.ts`             | HostLoc 自定义提示                               |
| `src/lib/`                          | 可独立测试的域名、收纳、时间、文章校验和版本规则 |
| `public/`                           | 原样复制到静态输出的爬虫与兼容资源               |
| `docs/design/`                      | 最终规格与已确认设计快照                         |

版本由 `src/lib/version.ts#resolveRevision` 统一解析，Astro 配置在启动/构建时通过 Vite 注入，产物校验脚本复用同一规则：先取 checkout 的完整 SHA；Git 不可用时依次接受 `SITE_REVISION`、`GITHUB_SHA`、`CI_COMMIT_SHA`、`COMMIT_SHA`，均要求完整 40 位十六进制。没有有效版本就拒绝构建或校验；产物中的提交地址必须与解析结果一致。开发中提交代码后重启开发服务更新版本。

头像直接使用 `resources.avatar` 的 public-cdn 地址，主页、加载壳、404 和付款跳转页统一引用。图片与直接 favicon 在 HTML 解析时即可加载，不加入入场等待。CDN 需保留 `Access-Control-Allow-Origin`，使有 `[data-avatar]` 的页面在图片载入后复用到 canvas，为 favicon 裁剪 35% 圆角；裁剪逻辑不另发图片请求。裁剪不可用、无脚本或没有页面头像的独立政策页保留 CDN 原图图标。`public/` 不保留头像副本，冻结设计与测试夹具中的图片保持不变。

## 门禁

```sh
corepack pnpm verify
corepack pnpm exec playwright install chromium
corepack pnpm test:e2e
```

`verify` 依次执行 Prettier、Astro/TypeScript 检查、单元测试、静态构建和产物检查。产物检查校验冻结设计摘要、版本、四个静态页面（首页、404、付款跳转与隐私政策）、旧跳转、单视频元素与客户端脚本 gzip 预算（25 kB）。CSS 内联以保证加载壳立即绘制；主页客户端脚本应保持轻量。

浏览器测试先构建真实 `dist/`，用测试专用静态服务验证。外部网络由视频、文章 API 与图片夹具替代，阻止真实统计；部分媒体故障时序通过受控 MediaError 和 Promise 注入，实际加载、定位与解码仍由 Chromium 执行。无运行时测试开关或生产调试接口，测试工具不进入 `dist/`。

视觉测试在同一浏览器进程、同一视口和字体回退条件下加载冻结原型与正式页面，消除鼠标悬停和随机视频差异后比较截图；避免把不同操作系统的字体光栅化误认为改版。正文衬底与字形投影由独立像素回归约束，冻结截图通过测试辅助方法在两页上仅移除这两项，其余布局与样式仍严格比较。测试覆盖 1440、390、320px，对齐、透明边缘、滚动、控制栏与 popup 还使用真实 DOM 几何检查。

确定性 CI 不能替代真实外部资源检查。发布前用不拦截网络的浏览器确认三个视频、MiSans、随机兜底图和文章 API；外部服务故障应与页面故障分别记录。

## 更新与回归

提交建议使用中文 Conventional Commits：`type(scope): 中文描述`。例如 `feat(主页): 增加背景视频控制`、`ci(检查): 完善浏览器回归测试`。每个提交对应一个可理解、可审查的交付物，正文写清必要原因与验证，不将无关变动混在一起。

Dependabot 的 npm 生态（包括 pnpm）每日检查，Actions 每周检查；Astro/TypeScript、测试、格式工具分别分组。安全更新和普通更新都必须经过 CI，本仓库未配置自动合并流程。锁文件变化后运行冻结安装和完整门禁。

`pnpm-lock.yaml` 是包管理器生成文件，pnpm 和 Dependabot 的 YAML 排版不必与 Prettier 一致，因此从格式检查中排除；冻结安装继续检查清单与锁文件的一致性，不通过手工重排或关闭冻结检查绕过失败。TypeScript 7 当前会被 `astro check` 明确拒绝，Dependabot 暂时忽略 7 及以上版本；`@types/node` 限于部署的 Node 24 主版本，忽略 25 及以上版本。升级 Astro 类型检查工具或 EdgeOne 运行时后，先验证兼容性，再同步调整这些规则。

改 UI 先对照最终规格，改规则先添加能捕获真实破坏的测试。冻结原型不能随实现一并改动，否则视觉对照失去意义。新增设计须得到用户明确要求并保存新版本。

媒体回归使用支持 HTTP Range 的真实视频夹具，验证画面帧、同一视频 URL 的重载、播放位置和暂停意图。仅派发 error 事件且没有 MediaError 状态时不得触发恢复；网络/解码错误才自动重试，其他真实错误进入兜底。不要通过无条件隐藏视频处理缓冲。

异常恢复需要同时覆盖成功的自动重载与自动重载耗尽后的手动重试，后者仍须保留中断前的位置。触屏休眠回归必须直接触摸隐藏按钮后等待，不得先触摸背景绕开首次进入状态。无脚本回归使用真正关闭 JavaScript 的浏览器上下文，检查正文、可点击链接和键盘焦点；仅检查 HTML 包含 `noscript` 不足以验证降级。

网页标题与描述由 `siteMetadata` 提供，并同步到 Open Graph。canonical 使用 `astro.config.mjs#site`；调整正式主域时一并核对元信息输出。冻结原型中的历史标题与描述不随 SEO 文案更新。

阴影另有独立像素回归：在平坦白色场景中采样服务和联系卡片的上、中、下间隙，检查核心透明度一致、外缘渐隐到完全透明、正常页脚空白无暗斑。这样可避免仅复制视觉快照时把叠加问题一起复制。右键回归使用真实鼠标操作，确认普通模式、隐藏 UI 与控制栏休眠时的右键事件均未取消且不命中视频，同时验证媒体属性、自定义按钮、正文和普通链接菜单。

正文衬底在首页 `.text-surface` 与文章页 `.posts-layout` 各应用一次 `TextBackdrop.astro` 中的 SVG 滤镜。先取整组渲染结果的 `SourceAlpha`，用 alpha 阈值排除淡色分隔线、控件底色及边框，再扩张并柔化轮廓，以一次 `feFlood` / `feComposite` 将黑色透明度限制在 14% 内，最后合并原文字。阈值只影响衬底来源，原文字与装饰仍原样绘制。没有矩形底板，不逐行或逐篇投影；列表自身的滚动裁切与渐隐先参与轮廓，固定底部链接也包含在同一组内。不克隆文字，不用 JavaScript 逐帧测量，字体、内容和换行变化由浏览器重绘。`text-shadows.spec.ts` 检查桌面与窄屏的字边衬底、短句后方透明、文字缩短后无旧轮廓残留、分隔线不带阴影，并限制密集区的最大暗化。

浮层阴影由 `elevation.css` 提供低透明度、零偏移的标准与紧凑档，主页与独立政策样式分别导入。`overlay-shadows.spec.ts` 在各表面四边采样实际像素，并与仅去掉该表面阴影的同页截图比较，验证阴影环绕、强度均衡、轻量且向外衰减；不要用全屏遮罩替代外缘阴影。
