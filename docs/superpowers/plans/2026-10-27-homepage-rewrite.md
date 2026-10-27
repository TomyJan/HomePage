# 静态主页重写实现计划

> **面向 AI 代理的工作者：** 使用 executing-plans 逐任务实现，用户已要求独立完成开发验证，无需再次确认执行方式。

**目标：** 将冻结 HTML 迁移为效果一致、可维护、可验证、适配 EdgeOne Makers 的纯静态 Astro 主页。

**架构：** Astro 在构建时生成完整 HTML，组件按可见区域划分。TypeScript 模块管理加载、导航、文章、备案和媒体；纯函数负责域名、收纳和版本，浏览器不重挂视频。

**技术栈：** Node.js 24 LTS、Astro 7、TypeScript、原生 CSS/Web Animations、Vitest、Playwright、Prettier。

**规格：** `docs/design/specification.md` 与 `docs/design/prototypes/video-first.html`。

## 全局约束

- 视频优先；定稿布局、文案、35% 头像圆角原样迁移。
- 纯静态，无 SSR；加载壳最短 1200ms、字体上限 1800ms，非关键资源异步。
- 独立 master 历史；旧站 legacy 不改写。许可证原样复制，设计冻结，按交付物原子提交。
- 用户确认仅保留随机动漫兜底图和 Umami，不迁移 GA4、动态一言、Mastodon。

## 审查重点

1. CDN、字体、视频均失败或迟缓时，页面仍在限定时间入场，文章重试有效。
2. 域名伪后缀、IDN 与跨域 iframe 不得套用错误备案；HostLoc 伪来源不弹声明。
3. 320px、390px、短屏、触屏、快速换页时，内容/指示条不溢出，版本与媒体按钮同一行。
4. 换页、隐藏/恢复、自动播放拒绝与手动暂停，均不得重新选择视频或改变暂停意图。
5. API 返回空、重复、错误、恶意标题/地址时，分页不死循环、不重复、不插入脚本，固定底部链接可用。

## 文件与任务

### 1. 分支与冻结资产

- [x] 备份旧站 Git bundle、文档和关键静态资源到工作区外。
- [x] 远端 GitHub 原生 rename master → legacy，本地跟随；建立 orphan master。
- [x] 根提交仅 LICENSE，随后提交冻结 HTML、图片、探索与校验和。
- [x] 提交 AGENTS、精简 README、最终规格与计划。

### 2. 可验证静态基础与规则

文件：`package.json`、`astro.config.mjs`、`tsconfig.json`、`src/data/site.ts`、`src/lib/{domains,footer-layout,version,uptime,posts}.ts`、`tests/unit/`。

- [x] 配置锁定依赖、格式工具、类型检查、Vitest、版本注入；读取本地 Git 或 CI 提交，拒绝无效 SHA。
- [x] 为真子域/伪后缀、独立备案、IDN、本地来源、两级收纳、固定版本和分页异常先写失败测试。
- [x] 迁移并实现最少规则，跑单元套件到全绿。
- [x] 提交静态基础和规则。

### 3. 定稿页面与交互

文件：`src/pages/index.astro`、`src/components/`、`src/styles/`、`src/scripts/`、`public/`、`tests/e2e/`。

- [x] 先写浏览器行为测试，验证当前没有页面时失败。
- [x] 按区域拆分原型 HTML 与原样 CSS；头像使用同一资产，内容数据集中管理。
- [x] 迁移导航/滚动、备案 popup、HostLoc dialog、播放器、暗色加载与分页；只选择一次视频。
- [x] 异步随机兜底图，资源失败不阻塞入场；尊重减少动态效果，保留手动控制。
- [x] 跑功能与三尺寸视觉对照，实测底边、指示条、阴影与 popup 动画。
- [x] 提交正式主页交付物。

### 4. 迁移兼容与交付流水线

文件：`src/pages/{404,pay}.astro`、`public/{ads.txt,sitemap.txt,robots.txt}`、`edgeone.json`、`.github/`、`scripts/verify-build.mjs`、`docs/{development,deployment}.md`。

- [x] 保留旧付款地址与 feed 跳转、404、ads 与 sitemap，新增必要的爬虫入口。
- [x] EdgeOne 明确安装/构建/输出/Node 版本、缓存与必要响应头；避免 SPA 全路径回退。
- [x] CI 最小权限、锁文件安装、格式/类型/单元/构建/产物/E2E、报告和依赖更新。
- [x] 验证 `pnpm verify`、`pnpm test:e2e`；审查冻结资产完整性和许可证相同。
- [x] 提交兼容、部署、CI 和运维文档。

### 5. 最终审查与远端同步

- [x] 全分支独立审查，修复实质问题并补回归测试。
- [x] 最终全套验证、真实外部资源烟测；文档记录验证范围和外部限制。
- [x] 推送新 master，将 GitHub 默认分支改回新 master；不修改其他分支，不触发未经授权的手动发布。
- [x] 确认新旧分支、默认分支、提交粒度、干净工作区，报告预览和验证结果。

## 实施记录

- 分支迁移：旧站完整保留于 legacy，原 SHA `58bfb88d87ec7eb1eaa5f24e0afca0a9634af8e4`。新 master 根提交 `ccb1cce` 只含 LICENSE，设计冻结提交 `be2c251`。
- 开发直接在用户指定的新 master 执行，未额外创建工作树；旧站已通过分支和外部 bundle 隔离保存。
- 本机全局 Node 22.21 不满足当前 Astro 要求，使用工作区外安装的 Node 24.22.1，不修改用户全局版本。

- 本地验证：32 个单元测试、14 个生产静态产物浏览器用例通过；主页内容在三个尺寸与冻结原型逐像素一致。客户端脚本 7219 B gzip。pnpm 生产依赖审计未发现已知漏洞。
- TypeScript 7 与最新 Astro 检查工具的 peer 范围不兼容，因此使用受支持的最新 6.0.3；其余主要工具使用安装时稳定最新版。

## 最终审查记录

- Final: fixed 视频首帧和错误状态遮住兜底图 — reduced motion / media errors RED→GREEN，全套 32 unit / 21 browser 通过。
- Final: fixed 横屏控制栏被最小舞台高度裁切 — landscape 360/390px RED→GREEN，全套通过。
- Final: fixed 字体迟到后滚动指示不更新 — late font metrics RED→GREEN，全套通过。
- Final: fixed 文章日期与定稿不一致 — 三尺寸全页面视觉对照 RED→GREEN。
- Final: fixed pnpm 文档命令笔误；无延后 Minor。
- Final: Ruling: EdgeOne 实际发布验证留在平台部署步骤 — 本次要求构建与部署配置，未操作平台发布 — 若托管环境不支持 Node 24.22.1，需调整平台构建环境。
- Final: Ruling: 外部服务实时状态以现场烟测为界 — 三视频、字体、随机图片与文章已验证，不能保证外部服务持续在线 — 失败时继续使用独立入场和回退机制。
- 中文重写提交、独立历史、许可证与冻结摘要已验证；远端 master 已建立，默认分支已恢复为新 master。
- 本地最终验证详见 docs/verification.md，远端 CI 以最终提交的运行结果为准。

## 部署反馈修正

用户确认 EdgeOne 支持的最高 Node 版本为 24.18.0。已同步部署与 CI 的实际运行版本，pnpm 版本集中到 packageManager，命令使用 Corepack 解析。该版本下冻结安装、格式、类型、32 个单元测试、静态构建与产物检查、21 个浏览器用例均通过；原关于 Node 平台兼容性的待确认项已根据实际反馈修正。
