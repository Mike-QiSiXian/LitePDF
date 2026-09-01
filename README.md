# LitePDF

基于 **Electron + Vue 3 + Foxit PDF SDK for Web（UIExtension）** 的轻量多标签个人 PDF 阅读器。

[最新版本 v0.1.9](https://github.com/Mike-QiSiXian/LitePDF/releases/latest) · [全部 Release](https://github.com/Mike-QiSiXian/LitePDF/releases)

## 下载安装包

当前最新正式版：**v0.1.9**

| 平台 | 安装包 | 说明 |
| --- | --- | --- |
| Windows x64 | [LitePDF-Setup-0.1.9.exe](https://github.com/Mike-QiSiXian/LitePDF/releases/download/v0.1.9/LitePDF-Setup-0.1.9.exe) | 推荐；安装后可用右键「使用 LitePDF 打开」 |
| macOS Apple Silicon | [LitePDF-0.1.9-arm64.dmg](https://github.com/Mike-QiSiXian/LitePDF/releases/download/v0.1.9/LitePDF-0.1.9-arm64.dmg) | Apple 芯片 |
| macOS Intel | [LitePDF-0.1.9-x64.dmg](https://github.com/Mike-QiSiXian/LitePDF/releases/download/v0.1.9/LitePDF-0.1.9-x64.dmg) | Intel |

也可打开 [GitHub Releases](https://github.com/Mike-QiSiXian/LitePDF/releases/latest) 查看完整更新说明与校验哈希。Windows 安装包未做 Authenticode 签名，系统可能提示「未知发布者」。macOS 未签名时，可按住 Control 点击后选择打开，或执行 `xattr -cr /Applications/LitePDF.app`。

## 功能（V1）

- 常驻工作台：打开 PDF、拖入打开、最近文件（失效/移除/清空）
- 多 PDF 标签 + 工作台切换
- 系统右键「使用 LitePDF 打开」、可设为默认 PDF 阅读器
- 预览、缩放/翻页、缩略图、搜索、常用注释、另存
- 自定义 Layout Template + Fragments 裁剪功能面
- SDK 适配层隔离：业务组件不直接调用全局 `PDFUI`

## 当前版本

### v0.1.9

- **中英文界面切换**：关于窗口提供简体中文 / English；欢迎页、标签栏、菜单与阅读器工具栏跟随切换
- **文件名不被翻译**：已打开 PDF 时顶栏显示真实文件名，切语言后不再变成「未打开文件」
- **开发态可检测默认 PDF 应用**：`npm run dev` 会读取本机是否已将安装版 LitePDF 设为默认；未默认时可打开系统设置
- Windows 开发控制台切换 UTF-8，减少中文日志乱码

### v0.1.8

- **修复默认 PDF 状态识别**：Windows 11 已在系统设置中将 `.pdf` 指定为 LitePDF 时，欢迎页与关于窗口会显示「已是默认 PDF 应用」并禁用按钮
- 判定改为优先读取 `UserChoiceLatest`，并核对 ProgId 的打开命令是否指向 `LitePDF.exe`（含 electron-builder 的 `PDF Document`）
- 设为默认后的提示改为应用内对话框；窗口重新获得焦点时刷新关联状态

### v0.1.7

- **PDF 右键菜单**：安装后资源管理器右键 PDF 出现「使用 LitePDF 打开」
- **设为默认 PDF 阅读器**：开始页、关于窗口与 macOS 文件菜单提供入口；Windows 会打开系统默认应用设置完成确认
- 安装/启动时自动注册 PDF 文件关联，卸载时清理注册项

### v0.1.6

- **修复多标签切换闪烁与回到第 1 页**：非活跃标签改用叠层隐藏，切换时保存/恢复页码、缩放与视图模式
- 已打开的标签切回时不再重复显示「正在加载 PDF…」遮罩
- **修复更新对话框布局**：Release 说明过长时更新内容区域可滚动，下载按钮始终可见

### v0.1.5

- **修复安装版无法打开 PDF**：生产环境改为通过本机 `127.0.0.1` HTTP 静态服务提供应用与 Foxit SDK，避免 `file://` / 自定义协议导致 JR Worker 与 addon 加载失败
- 打开失败且无具体文案时，应用层给出「PDF 打开失败，请重试。」兜底提示，避免空白遮罩

### v0.1.4

- **修复多标签共用 `readyWorker`**：每个 PDFUI 实例独立创建 JR Worker，避免第二个 PDF 报 `reading 'sources'`
- 欢迎页后台预创建首个 Worker（仅首个实例认领），兼顾首开速度与多实例隔离
- 关于页仅在确实有可下载新版本时展示 Release 说明，避免本地已更新却仍显示旧版更新内容
- 授权解析同时支持 `var licenseSN = "..."` 与 `licenseSN: "..."`；可用 `npm run sync:license` 同步 `.env`
- 打开失败时不再用应用层遮罩展示 `-3` 等纯错误码，避免挡住 WebSDK 的「授权无效」弹窗
- 改善 SDK 返回空错误时的提示文案

### v0.1.3

- 修复安装版打开 PDF 时报 `Cannot read properties of undefined (reading 'sources')`（**未完全解决**：曾错误地全局复用 `readyWorker`）
- 开始页仅预热 SDK 脚本与 License；JR Worker 延至首次打开 PDF 时再创建（与官方示例一致）
- 移除有问题的 `isSupportFileType` 自定义逻辑，恢复稳定打开流程

### v0.1.2

- 开始页后台预热 Foxit SDK、License 和 JR Worker，首次打开 PDF 时复用预热结果
- 使用 SDK 官方 `waitForInitialization()` 判断 PDFUI 就绪，修复安装版初始化超时
- 改进 PDF 打开失败提示和超时处理
- 安装版启动后静默检查更新，并在关于窗口中展示 Release 说明
- 增加 LitePDF 品牌图标及 Windows/macOS 打包图标配置
- 更新检查按操作系统和架构选择安装包，避免 macOS 错选 Windows 附件

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

字体：预加载 JR Worker 时使用官方 webfonts（与 Vue3 示例一致）；Electron 内再通过 `grantQueryLocalFontsPermission` 读取本机字体，安装包不携带 `foxit-external`。

## 快速开始

```bash
npm install
npm run dev
```

- **桌面窗口（推荐）**：`npm run dev` 会同时拉起 Electron，具备系统文件对话框与真实路径。
- **浏览器调试**：也可打开 `http://localhost:5173/`。无 Electron API 时会自动注入浏览器替身，支持选择/拖入 PDF；刷新后需重新选择文件。
- **更新检查**：安装版启动后会静默检查 GitHub Release；仅当远端版本高于当前版本且有对应安装包时提示，并展示该新版本的更新内容。
- **首开预热**：工作台空闲时后台加载 Foxit SDK 脚本与 License，并预创建首个 JR Worker；每个 PDF 标签页仍使用独立 Worker，不可共用。

`predev` / `postinstall` 会：

1. 将 SDK `lib` 链接或复制到 `public/foxit-lib`
2. 同步 `public/license-key.js` → `.env`（已 gitignore）

**授权文件**：请把正式/最新 License 放到 `public/license-key.js`（已 gitignore，勿提交仓库）。  
支持 `var licenseSN = "..."` 与 `licenseSN: "..."` 两种写法。修改后执行 `npm run sync:license` 或重启 `npm run dev`（`predev` 会自动同步 `.env`）。应用运行时优先读取该文件，`.env` 仅作回退。

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

- 安装版启动后在本机 `127.0.0.1` 提供静态资源，使 Worker / addon 与开发环境一样走 HTTP
- SDK 核心库只通过 `extraResources` 带一份 `foxit-lib`；npm 包本身不打进 `app.asar`
- 图章 / 词条只保留 `zh-CN`、`zh-TW`、`en-US`
- 不打包 `foxit-external`：回退字体用官方 webfonts，文档字体走本机 Local Font Access
- Electron 语言包同样只保留中英文

### 文件关联

安装版会注册 PDF 文件类型：

- Windows：资源管理器右键出现「使用 LitePDF 打开」；应用会出现在「设置 → 应用 → 默认应用」中。Windows 10/11 不允许程序静默抢占默认应用，需在系统设置中确认将 `.pdf` 指定给 LitePDF。开始页和关于窗口提供「设为默认 PDF 阅读器」入口。
- macOS：出现在访达「打开方式」中；应用内按钮会尝试将 LitePDF 设为默认。若系统拒绝，可在「显示简介 → 打开方式 → 全部更改」中指定。

开发模式（`npm run dev`）不会把开发态 Electron 注册为系统关联，但仍会检测本机是否已将安装版 LitePDF 设为默认，并可打开系统默认应用设置。

### 代码签名

Windows 安装界面的“发行商”来自 Authenticode 证书主体，不能通过 `productName`、`author` 或任意配置字符串指定。未签名包会显示“未知发布者”。

取得受信任 CA 颁发的 OV/EV 代码签名证书后，在本地或 CI 注入下列变量，electron-builder 会自动签名应用、卸载程序和安装包：

```bash
WIN_CSC_LINK=/path/to/certificate.pfx
WIN_CSC_KEY_PASSWORD=certificate-password
```

证书与密码不得提交到仓库。macOS 分发还需 Developer ID 签名与 Apple 公证。

## 官方参考

- Vue3 示例：https://github.com/foxitsoftware/FoxitPDFSDKForWeb-Vue3-Example
- 学习仓 Appearance / Fragments 文档：`FoxitWebSDKStudy/docs/examples/UIExtension/`

## 合规说明

分发需具备 Foxit 商业授权。请勿将 License 明文提交到公开仓库。
