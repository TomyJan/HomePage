# 冻结设计基线

2026-10-27，用户结束设计阶段并批准进入正式开发。

- [当前视觉定稿 v2](prototypes/video-first-v2.html) 包含用户在正式开发后提出的阴影、字号、黑色背景修订，是当前视觉对照基准。
- [初次定稿](prototypes/video-first.html) 保留历史原貌。两者均为已选定方案；废弃的探索记录与未使用旧图标已按用户要求移除，可从 Git 历史查阅。
- [正式规格](specification.md) 汇总最终规则与开发阶段确认的迁移决策。
- `frozen-sha256.json` 记录冻结资产校验和（文本统一 LF 后校验）；冻结 HTML 不随正式实现修改。若以后批准改版，另建版本。

预览：在仓库根运行 `python -m http.server 4181 --directory docs/design/prototypes`，打开 `http://127.0.0.1:4181/video-first-v2.html`。这是独立视觉原型，不进入正式构建产物；生产媒体恢复与错误处理以 TypeScript 实现和行为测试为准。

旧站原分支 `master` 原样改名为 `legacy`，末次提交为 `58bfb88d87ec7eb1eaa5f24e0afca0a9634af8e4`。新 `master` 使用独立历史，根提交仅复制 MPL-2.0 许可证。
