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
- 有效 Foxit License（SN / Key）

核心库通过 npm 安装（与[官方 Vue3 示例](https://github.com/foxitsoftware/FoxitPDFSDKForWeb-Vue3-Example)相同）：

```bash
npm install @foxitsoftware/foxit-pdf-sdk-for-web-library
```

本仓库已将该包列入 `dependencies`，执行 `npm install` 即可拉取。若该包的生命周期脚本干扰安装，可参考官方示例使用 `--ignore-scripts`：

```bash
npm install --ignore-scripts
npm install --ignore-scripts -S @foxitsoftware/foxit-pdf-sdk-for-web-library
```

`ensure-sdk` 会把 `node_modules/@foxitsoftware/foxit-pdf-sdk-for-web-library/lib` 链接到 `public/foxit-lib`。可用环境变量 `FOXIT_SDK_LIB` 覆盖为本地 lib 目录。

npm 包不含 `external/brotli`。默认与官方 Vue3 示例一致，使用官方 webfonts 作为 `jr.fontPath`。若需离线中文字体，设置 `FOXIT_SDK_EXTERNAL` 指向完整 SDK 的 `external` 目录。

## 快速开始

```bash
npm install
npm run dev
```

- **桌面窗口（推荐）**：`npm run dev` 会同时拉起 Electron，具备系统文件对话框与真实路径。
- **浏览器调试**：也可打开 `http://localhost:5173/`。无 Electron API 时会自动注入浏览器替身，支持选择/拖入 PDF；刷新后需重新选择文件。

`predev` / `postinstall` 会：

1. 将 SDK `lib` 链接或复制到 `public/foxit-lib`
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

安装包体积说明：

- SDK 核心库只通过 `extraResources` 带一份 `foxit-lib`，不会再打进 `app.asar`
- 图章 / 词条只保留 `zh-CN`、`zh-TW`、`en-US`
- 若存在本地 `foxit-external`，会一并打进安装包，`jr.fontPath` 指向其中的 `brotli`；否则使用官方 webfonts
- Electron 语言包同样只保留中英文

代码签名/Apple 公证未强制启用，可按发布需要补充证书环境变量。

## 官方参考

- Vue3 示例：https://github.com/foxitsoftware/FoxitPDFSDKForWeb-Vue3-Example
- 学习仓 Appearance / Fragments 文档：`FoxitWebSDKStudy/docs/examples/UIExtension/`

## 合规说明

分发需具备 Foxit 商业授权。请勿将 License 明文提交到公开仓库。
