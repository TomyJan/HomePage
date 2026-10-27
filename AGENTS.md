# 项目约定

本项目是 Astro + TypeScript 纯静态主页。旧站在 `legacy`，新站在 `master`，许可证保持 MPL-2.0。

- 工具版本写在配置中：pnpm 由 `package.json#packageManager` 指定，Node 由 `.nvmrc` 与 `edgeone.json#nodeVersion` 对齐，兼容范围写在 `package.json#engines`。安装、构建命令不重复写版本号；升级前确认 EdgeOne 支持，并用实际部署版本验证 CI。
- 开工先读 `docs/design/specification.md`；当前视觉基准为 `docs/design/prototypes/video-first-v2.html`。初次定稿保留作历史，废弃探索不保留在工作树中。
- 冻结原型与其图片、校验和不得随正式代码修改。只在用户批准新版设计后另建快照。
- 视频优先：不要扩大遮罩、移动布局、改写个人介绍或引入设计外功能。只保留一个视频元素；初始化随机一次，其后原视频循环，换页与隐藏 UI 不重置媒体。
- 媒体等待、缓冲或没有原生 MediaError 的通知不能隐藏已经显示的画面。真实错误先停止音频，再对同一地址有限恢复，保留位置、静音和用户暂停意图。背景分层必须明确，资源未就绪时保持纯黑。
- 所有文字使用 MiSans，三处头像保持 35% 大圆角矩形。保持渐变透明边缘、阴影留白、四行同高面板和导航底边对齐。
- 加载壳必须先显示，最短 1200ms，字体最多等待 1800ms；视频、图片、文章 API、统计不能阻塞入场。兼顾减少动态效果、键盘、触屏和外部资源失败。
- 备案分类和域名匹配集中于 `src/lib/domains.ts`，不能给其他域名借用备案号。版本在启动/构建时注入，不能在浏览器查 GitHub。
- 内容及外部地址集中于 `src/data/site.ts`。新 UI 优先使用原生语义 HTML、CSS、Web Animations，保持静态输出，不添加 SSR 或 React/Vue 运行时。
- 修改前阅读相关模块。重要行为先写能复现问题的测试；不要给散文、琐碎样式或实现细节写同义反复测试。
- 提交前运行 `pnpm verify` 和 `pnpm test:e2e`。涉及布局时在桌面、390px 和 320px 对照冻结原型，检查溢出、动画与底边对齐。外网测试需与确定性 CI 区分。
- 原子提交，描述实际交付物。提交标题建议使用中文 Conventional Commits，例如 `feat(主页): 实现视频背景控制`、`fix(页脚): 修复窄屏链接收纳`；类型保留英文，scope 和描述优先中文。不要提交构建产物、测试报告、凭据或私人环境配置。部署操作遵循用户授权，部署配置说明见 `docs/deployment.md`。
- 仅在用户授权且签名不可用时临时绕过签名，不更改全局签名设置。绕过签名产生的提交必须留在本地，补签前不得推送包含这些提交的分支。

## CodeGraph

若根目录存在 `.codegraph/`，理解或定位代码时先用 `codegraph_explore` MCP 或 `codegraph explore`。未索引时不主动建立索引，使用 `rg`。
