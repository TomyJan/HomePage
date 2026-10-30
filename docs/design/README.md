# 冻结设计基线

- [当前视觉定稿 v3](prototypes/video-first-v3.html) 用于正式页面的视觉回归。
- [正式规格](specification.md) 说明当前行为；原型未包含的后续要求以该文档和行为测试为准。
- [初次定稿](prototypes/video-first.html) 与 [v2](prototypes/video-first-v2.html) 是已批准的冻结资产，与图片一起受摘要校验保护，不作为当前实现指引。
- `frozen-sha256.json` 记录冻结资产校验和（文本统一 LF 后校验）；冻结 HTML 不随正式实现修改。若以后批准改版，另建版本。

预览：在仓库根运行 `python -m http.server 4181 --directory docs/design/prototypes`，打开 `http://127.0.0.1:4181/video-first-v3.html`。这是独立视觉原型，不进入正式构建产物；生产媒体恢复、原生媒体入口限制与错误处理以 TypeScript 实现和行为测试为准。

不在此目录维护探索过程、实施计划或更改流水；这些内容从 Git 历史查阅。
