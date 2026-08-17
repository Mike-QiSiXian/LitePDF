# LitePDF

基于 **Electron + Vue 3 + Foxit PDF SDK for Web（UIExtension）** 的轻量多标签个人 PDF 阅读器。

## 功能（V1）

- 常驻工作台：打开 PDF、拖入打开、最近文件（失效/移除/清空）
- 多 PDF 标签 + 工作台切换
- 预览、缩放/翻页、缩略图、搜索、常用注释、另存
- 自定义 Layout Template + Fragments 裁剪功能面
- SDK 适配层隔离：业务组件不直接调用全局 `PDFUI`

## 环境要求

- Node.js 18+
- 本地 Foxit WebSDK `lib`（默认读取学习仓路径）
- 有效 Foxit License（SN / Key）

默认 SDK 路径：

`C:\WorkSpaceForOpenCode\FoxitWebSDKStudy\sdk\lib`

可通过环境变量 `FOXIT_SDK_LIB` 覆盖。

## 快速开始

```bash
npm install
npm run dev
```

- **桌面窗口（推荐）**：`npm run dev` 会同时拉起 Electron，具备系统文件对话框与真实路径。
- **浏览器调试**：也可打开 `http://localhost:5173/`。无 Electron API 时会自动注入浏览器替身，支持选择/拖入 PDF；刷新后需重新选择文件。

`predev` 会：

1. 将 SDK `lib` junction/复制到 `public/foxit-lib`
2. 同步 `public/license-key.js` → `.env`（已 gitignore）

**授权文件**：请把正式/最新 License 放到 [`public/license-key.js`](public/license-key.js)。  
应用运行时**优先读取该文件**；`.env` 仅作回退。替换后需重启开发进程。

## 打包

```bash
# Windows 安装包（NSIS）
npm run pack:win

# macOS 安装包（需在 macOS 环境）
npm run pack:mac
```

产物目录：`release/`

- Windows: `LitePDF-Setup-<version>.exe`
- macOS: `LitePDF-<version>-<arch>.dmg`

代码签名/Apple 公证未强制启用，可按发布需要补充证书环境变量。

## 官方参考

- Vue3 示例：https://github.com/foxitsoftware/FoxitPDFSDKForWeb-Vue3-Example
- 学习仓 Appearance / Fragments 文档：`FoxitWebSDKStudy/docs/examples/UIExtension/`

## 合规说明

分发需具备 Foxit 商业授权。请勿将 License 明文提交到公开仓库。
