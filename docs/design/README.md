# 冻结设计基线

2026-10-27，用户结束设计阶段并批准进入正式开发。

- [最终可运行 HTML](prototypes/video-first.html) 是布局、配色、内容和动画的视觉基准；同目录图片是其必需资源。
- [探索记录](2026-10-27-homepage-exploration.md) 保存讨论过程，前面的提案与中间状态不代表最终要求。
- [正式规格](specification.md) 汇总最终规则与开发阶段确认的迁移决策。
- `frozen-sha256.json` 记录冻结资产校验和（文本统一 LF 后校验）；冻结 HTML 不随正式实现修改。若以后批准改版，另建版本。

预览：在仓库根运行 `python -m http.server 4181 --directory docs/design/prototypes`，打开 `http://127.0.0.1:4181/video-first.html`。这是独立原型，不进入正式构建产物。

旧站原分支 `master` 原样改名为 `legacy`，末次提交为 `58bfb88d87ec7eb1eaa5f24e0afca0a9634af8e4`。新 `master` 使用独立历史，根提交仅复制 MPL-2.0 许可证。
