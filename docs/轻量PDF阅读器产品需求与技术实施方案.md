# 轻量 PDF 阅读器产品需求与技术实施方案


| 项    | 内容                                                                                   |
| ---- | ------------------------------------------------------------------------------------ |
| 产品名称 | LitePDF                                                                              |
| 文档性质 | 根据当前代码与发布状态反向整理（As-Built）                                                            |
| 当前版本 | v0.1.6                                                                               |
| 仓库   | [https://github.com/Mike-QiSiXian/LitePDF](https://github.com/Mike-QiSiXian/LitePDF) |
| 产品定位 | 面向个人使用的轻量、多标签桌面 PDF 阅读器                                                              |

本文描述的是 **已经落地的 V1 能力与实现路径**，不是从零规划的愿景稿。后续演进应在此基线上增量修改。

---

## 1. 背景与目标

### 1.1 要解决的问题

通用的福昕高级PDF编辑器套件功能面宽导致客户端整体太重了（安装包体积大、功能繁琐、启动缓慢），日常阅读场景需要：

- 快速打开本地 PDF，支持多文档并行阅读
- 常用阅读与批注能力齐全，但不暴露编辑、表单、保护等重型模块
- 安装包相对可控，开发与安装版行为一致
- 业务层与 Foxit WebSDK 解耦，便于裁剪界面与替换 License

### 1.2 产品目标

| 编号  | 目标                            | 当前达成情况       |
| --- | ----------------------------- | ------------ |
| G1  | 常驻工作台：打开、拖入、最近文件              | 已实现          |
| G2  | 多标签阅读，切换不丢进度、不明显闪烁            | v0.1.6 已实现   |
| G3  | 预览、缩放、翻页、缩略图、搜索、常用注释、另存       | 已实现          |
| G4  | 自定义 Layout Template 裁剪功能面     | 已实现（主页 + 批注） |
| G5  | SDK 适配层隔离，业务组件不直接持有全局 `PDFUI` | 已实现          |
| G6  | Windows / macOS 可安装分发，并支持检查更新 | 已实现          |
| G7  | 安装版打开 PDF 与开发环境行为一致           | v0.1.5 起已实现  |

### 1.3 明确不做（V1 范围外）

- 云同步、账号体系、文档协作
- 自动静默安装升级（当前是「下载安装包 → 用户手动运行」）
- PDF 编辑（文字改写、页面重组）、表单设计、文档保护 / 加密制作
- Linux 官方安装包（代码中有资产选择兜底，但未作为发布目标）
- 代码签名 / Apple 公证（文档已说明，当前未接入证书）

---

## 2. 用户与使用场景

### 2.1 目标用户

个人用户：在 Windows 或 macOS 上阅读、批注本地 PDF。不面向企业管控、也不面向纯浏览器 SaaS。

### 2.2 核心场景

1. **打开阅读**：从工作台、系统对话框、拖放、关联打开或二次实例传入路径，打开一个或多个 PDF。
2. **多文档切换**：在标签间切换，各自保留页码、缩放、旋转与视图模式。
3. **批注后另存**：高亮、画笔、图章等修改后，通过「另存为」写出新文件；标签显示未保存标记。
4. **找回文件**：从最近文件列表按时间 / 名称 / 大小排序后再次打开；失效项可识别。
5. **升级**：启动后静默检查 GitHub Release；也可在关于页手动检查并下载对应平台安装包。

---



## 3. 产品需求（功能）



### 3.1 工作台（开始页）


| ID   | 需求                      | 验收要点                       |
| ---- | ----------------------- | -------------------------- |
| P-W1 | 常驻「开始页」标签，可与 PDF 标签互切   | 首页图标始终存在；关闭最后一个 PDF 后回到开始页 |
| P-W2 | 「打开 PDF」走系统文件对话框，支持多选   | 仅 `.pdf`；可一次打开多个           |
| P-W3 | 拖入窗口打开                  | 拖入 `.pdf` 即打开；窗口有释放提示      |
| P-W4 | 最近文件：最多 20 条，持久化到用户数据目录 | 打开后置顶；支持移除、清空              |
| P-W5 | 最近文件可排序                 | 最近打开、文件名、文件大小，升/降序         |
| P-W6 | 缺失文件可识别                 | 列表项标记缺失，避免当成正常文件打开         |
| P-W7 | 关于 LitePDF              | 展示版本、检查更新、版权               |


浏览器无 Electron 时注入替身 API，可选择/拖入 PDF 做调试；刷新后需重新选择文件（不作为正式交付路径）。

### 3.2 窗口与标签


| ID   | 需求                    | 验收要点                             |
| ---- | --------------------- | -------------------------------- |
| P-T1 | 无边框客户区，标签栏充当拖拽区       | Windows Overlay 系统按钮；macOS 红绿灯避让 |
| P-T2 | 多 PDF 标签，同路径不重复开新标签   | 再开同一文件则激活已有标签                    |
| P-T3 | 关闭标签销毁对应阅读会话          | 内存与 Worker 随标签释放                 |
| P-T4 | 切换标签不闪「正在加载」、不回到第 1 页 | 非活跃面板叠层隐藏；切回恢复视图快照               |
| P-T5 | 单实例（安装版）              | 第二次启动把 PDF 路径交给已有窗口              |


快捷键：

- `Ctrl/Cmd+O` 打开
- `Ctrl/Cmd+S` 另存为
- Windows：`Ctrl+R` 重载、`Ctrl+Shift+I` 开发者工具（无菜单栏）
- macOS：应用菜单保留文件 / 视图项



### 3.3 阅读与导航


| ID   | 需求                             | 实现位置                              |
| ---- | ------------------------------ | --------------------------------- |
| P-R1 | 手型、缩放（缩小/放大/下拉比例）              | 主页 paddle                         |
| P-R2 | 首页/上页/页码/下页/末页                 | 主页 paddle                         |
| P-R3 | 上一视图 / 下一视图                    | 自研 `ViewHistory`，快照含页码、缩放、旋转、视图模式 |
| P-R4 | 单页 / 连续 / 对开 / 连续对开            | 主页页面布局组                           |
| P-R5 | 侧栏：缩略图、书签（bookmark-v2）、注释列表、搜索 | 自定义 layout                        |
| P-R6 | 滚轮缩放、双击缩放、捏合缩放                 | viewer 指令                         |




### 3.4 批注与工具

批注集中在「批注」Tab，V1 包含：

- 撤销 / 重做（自研控制器，避免官方 `lock()` 挡住 tooltip）
- 文本高亮、区域高亮
- 画笔、局部擦除
- 打字机、文本框、标注
- 绘图下拉
- 下划线、删除线、波浪线、插入、替换
- 图章、墨迹签名

顶栏右侧：搜索、打印、另存为、更多。更多菜单：

- 注解：打开注释侧栏
- 播放：切单页 + 适合高度 + 全屏演示
- 文档属性：Foxit 文件属性对话框



### 3.5 文件与安全打开


| ID   | 需求           | 验收要点                                     |
| ---- | ------------ | ---------------------------------------- |
| P-F1 | 以真实本地路径读写    | 主进程 `fs:readFile` / `fs:writeFile`       |
| P-F2 | 加密 PDF 弹窗要密码 | `window.prompt`，取消则打开失败                  |
| P-F3 | 打开失败文案       | 不向用户展示纯错误码（如 `-3`）；无文案时兜底「PDF 打开失败，请重试。」 |
| P-F4 | 授权失败         | 让 WebSDK 自带弹窗可见，应用层遮罩不抢焦点                |




### 3.6 更新


| ID   | 需求              | 验收要点                                                      |
| ---- | --------------- | --------------------------------------------------------- |
| P-U1 | 安装版启动约 4 秒后静默检查 | 仅当远端版本更高且有对应安装包时弹窗                                        |
| P-U2 | 关于页可手动检查        | `up-to-date` / `available` / `error` / `unavailable` 四种状态 |
| P-U3 | 按 OS + 架构选资产    | Windows `.exe`；macOS `.dmg` 匹配 `arm64` / `x64`            |
| P-U4 | 下载更新            | 校验 GitHub 下载域名后 `shell.openExternal`，不内嵌安装                |
| P-U5 | 更新说明过长          | 说明区滚动，下载按钮始终可见（v0.1.6）                                    |


---



## 4. 非功能需求


| 类别  | 要求                                     | 落地方式                                                                 |
| --- | -------------------------------------- | -------------------------------------------------------------------- |
| 性能  | 首次打开尽量快                                | 工作台预热 SDK 脚本与 License；后台预创建 **仅供首个实例认领** 的 JR Worker                 |
| 正确性 | 多 PDF 互不影响                             | 每标签独立 `PDFUI` + 独立 `readyWorker`，禁止共用 Worker                         |
| 体积  | 安装包不含重复 SDK                            | `foxit-lib` 只走 `extraResources`；不打 `foxit-external`；Electron 语言包仅中英文 |
| 字体  | 不内嵌完整字体包                               | JR 预热用官方 webfonts；Electron 授予 Local Font Access                      |
| 安全  | 渲染进程无 Node 集成                          | `contextIsolation` + preload；更新 URL 白名单                              |
| 合规  | 分发需 Foxit 商业授权                         | License 不进 git；优先级见第 6.5 节                                           |
| 兼容  | Win10+ x64；macOS Intel / Apple Silicon | NSIS + 双架构 dmg                                                       |
| 体验  | 窗口最小 900×600，默认 1280×840               | `BrowserWindow` 配置                                                   |


---



## 5. 总体架构

```
┌─────────────────────────────────────────────────────────────┐
│  Electron 主进程（dist-electron/main.js）                     │
│  窗口 / 菜单 / IPC / 最近文件 / 更新检查 / 本机 HTTP 静态服务   │
└───────────────────────────┬─────────────────────────────────┘
                            │ contextBridge: window.litepdf
┌───────────────────────────▼─────────────────────────────────┐
│  Vue 3 渲染进程                                              │
│  App.vue · TabBar · WelcomePage · PdfTabHost · 更新/关于弹窗  │
│  Pinia: tabs / recent                                        │
│  ViewerSessionManager → ViewerSession → FoxitViewerAdapter   │
│  warmup / license / LiteAppearance / 自研 Controllers         │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP
┌───────────────────────────▼─────────────────────────────────┐
│  Foxit PDF SDK for Web 11.x（UIExtension）                   │
│  public/foxit-lib 或 extraResources/foxit-lib                 │
│  每 PDFUI 一个 JR Worker                                      │
└─────────────────────────────────────────────────────────────┘
```



### 5.1 技术栈


| 层      | 选型                                                     |
| ------ | ------------------------------------------------------ |
| 桌面壳    | Electron 35                                            |
| UI     | Vue 3 + Pinia + TypeScript                             |
| 构建     | Vite 6 + vite-plugin-electron + vue-tsc                |
| PDF 引擎 | `@foxitsoftware/foxit-pdf-sdk-for-web-library` ^11.1.0 |
| 打包     | electron-builder 26（NSIS / DMG）                        |
| 发布     | GitHub Release；安装版读 `releases/latest`                  |




### 5.2 目录约定


| 路径                       | 职责                                              |
| ------------------------ | ----------------------------------------------- |
| `electron/`              | 主进程、preload、最近文件、本地静态服务                         |
| `src/components/`        | 工作台、标签、PDF 宿主、关于/更新                             |
| `src/stores/`            | 标签与最近文件状态                                       |
| `src/foxit/adapter/`     | 唯一允许 `new PDFUI` 的适配层                           |
| `src/foxit/session/`     | 每标签会话生命周期与视图快照                                  |
| `src/foxit/appearance/`  | 自定义 layout template + Appearance                |
| `src/foxit/controllers/` | 侧栏、更多菜单、视图历史、撤销重做                               |
| `src/foxit/warmup.ts`    | SDK 脚本、License、Worker 预热                        |
| `scripts/`               | 同步 SDK 到 `public/foxit-lib`、同步 License 到 `.env` |
| `resources/`             | 应用图标                                            |


---



## 6. 关键技术方案



### 6.1 多标签与阅读进度

**决策**：一标签一 `ViewerSession` / 一 `PDFUI`，组件不随切换销毁。

**为何不用单实例切换文档**：WebSDK 多实例下 Worker 与 UI 状态绑定实例；关标签才能 `destroy()`。

**切换策略（v0.1.6）**：

1. 非活跃 `.lp-panel` 使用 `visibility: hidden` 叠层，**不用** `display: none`，避免容器 0×0 导致引擎重置到第 1 页。
2. 离开标签时 `captureViewState()`（页码、缩放、旋转、视图模式）。
3. 回到标签时 `restoreViewState()`，并在下一帧再恢复一次，抵消 Foxit 异步重排。
4. `loading` 遮罩仅在 `!session.isReady()` 时出现，避免切回闪白。

同路径去重在 `tabs.openDoc`；关闭走 `ViewerSessionManager.close`。

### 6.2 安装版资源加载（v0.1.5 结论）

**问题**：安装版若 `loadFile` / `file://` / 自定义协议加载 SDK，Web Worker 与 addon `fetch` 失败，表现为空白、`reading 'sources'` 或「PDF 打开失败」。开发态走 `http://localhost:5173` 则正常。

**方案**：生产环境在 `127.0.0.1` 随机端口起本地 HTTP 服务，同时提供：

- `dist/`：应用前端
- `/foxit-lib/`：`extraResources` 中的 SDK

窗口 `loadURL(http://127.0.0.1:<port>/)`；`getFoxitLibUrl()` / Worker 路径与之相同。路径拼接做根目录约束，防止目录穿越。

开发环境仍用 Vite；`app-foxit` 协议保留但安装版主路径不再依赖它加载 Worker。

### 6.3 JR Worker 隔离（v0.1.4 结论）

**问题**：多 `PDFUI` 共用一个 `readyWorker` 会在第二个文档报 `Cannot read properties of undefined (reading 'sources')`。

**方案**：

- `createReadyWorker()` 按实例创建
- 欢迎页 `prewarmJrWorkerInBackground()` 只预热 **一个** Worker
- `takeReadyWorkerForInstance()` 仅让 **第一个** PDFUI 认领预热 Worker，其后每个实例新建

开始页仍预热 SDK 脚本与 License，缩短首开；不以牺牲多实例正确性换速度。

### 6.4 UI 裁剪

不使用完整 Ribbon 的「编辑 / 表单 / 保护 / 文件包」页。通过 `LITE_LAYOUT_TEMPLATE` 只保留：

- 顶栏三区：侧栏开关 + 文件名 | 主页/批注 Tab | 搜索·打印·另存·更多
- 下方 paddle 复用官方 ribbon 按钮与部分自研按钮
- 主体：左侧栏 + viewer + 右侧搜索栏

自研 Controller 在 `new PDFUI` 前注册到 `litepdf` 模块，保证 template 上 `@controller="litepdf:..."` 可解析。

启用 addon：`thumbnail`、`search`、`print`、`undo-redo`、`file-property`、`full-screen`。

### 6.5 授权

优先级：

1. 运行时 `public/license-key.js`（支持 `var licenseSN = "..."` 与 `licenseSN: "..."`）
2. 构建期 `.env` 的 `VITE_FOXIT_LICENSE_*`
3. `license.defaults.json`

`license-key.js` 与 `.env` 均 gitignore。`npm run sync:license` / `predev` 把 js 同步到 `.env`。打包后 License 随前端资源分发，更换授权需改文件后重新打包。

### 6.6 错误与打开时序

- `waitForInitialization()`（事件名兼容 `pdfui-intialization-completed`）判断 PDFUI 就绪，超时 60s。
- `openPDFByFile` 的加载遮罩在 `open-file-success` 回调结束，而不是等首屏渲染全部完成。
- `isSupportFileType` 一类自定义拦截已移除（v0.1.3），避免误杀正常打开。
- 纯数字错误码不展示在应用遮罩上，避免挡住 SDK「授权无效」弹窗。



### 6.7 进程边界与 IPC

渲染进程只通过 `window.litepdf` 访问：

对话框、读写文件、最近文件、版本与更新、Foxit URL、打开路径/在文件夹显示、拖放真实路径（`webUtils.getPathForFile`）。

主进程负责：单实例、`open-file`（macOS）、命令行 PDF、权限（默认允许 `local-fonts`）、拦截 `window.open` 到系统浏览器。

### 6.8 更新与发布

- 数据源：`https://api.github.com/repos/Mike-QiSiXian/LitePDF/releases/latest`
- 版本比较：去掉 `v` 前缀后按数字段比较
- 无对应平台包时状态为 `unavailable`，不误报可升级
- 关于页仅在 `status === 'available'` 时展示 Release 说明
- 发布流程：升 `package.json` 版本 → 更新 README → `pack:win` / `pack:mac` → tag → GitHub Release 上传 exe/dmg 并写 SHA256

Windows 未签名会显示「未知发布者」；macOS 未签名需用户右键打开或 `xattr -cr`。

---



## 7. 界面信息架构

```
LitePDF 窗口
├── 标签栏（系统标题栏区域）
│     开始页 │ PDF1 │ PDF2 │ … │ 拖拽空白 │ 系统按钮留白
└── 工作区
      ├── 开始页：打开、能力卡片、最近文件、关于
      └── PDF 面板（叠层，仅一个 active）
            └── Foxit UIExtension
                  顶栏 + paddle
                  侧栏 + 画布 + 右栏搜索
```

视觉基调：浅色工作台（`#f6f7f9` / `#eef1f5`），主色 `#2d5af7`，中文 UI。

---



## 8. 数据与配置


| 数据        | 位置                               | 说明                  |
| --------- | -------------------------------- | ------------------- |
| 最近文件      | `{userData}/recent-files.json`   | 路径、文件名、时间；读取时补缺失与大小 |
| 标签 / 阅读进度 | 仅内存                              | 关标签或退出即丢；不跨进程持久化页码  |
| License   | `license-key.js` / `.env` / 构建产物 | 不写入 userData        |
| 更新状态      | 运行时                              | 不缓存「已忽略版本」          |


---



## 9. 构建、打包与体积策略

1. `ensure-sdk`：把 npm 包 `lib` 链到 `public/foxit-lib`（可用 `FOXIT_SDK_LIB` 覆盖）。
2. Vite 生产构建结束后删除 `dist/foxit-lib`，避免 asar 与 extraResources 双份。
3. `electron-builder`：`files` 排除 npm 整包 Foxit；`extraResources` 只带 `foxit-lib`，过滤非中英图章与词条。
4. 命令：`npm run pack:win` / `npm run pack:mac`；若默认 `release/` 被占用，可用 `--config.directories.output=release-vX.Y.Z`。

CI（GitHub Actions）目前对 main 做 `npm ci` + `vue-tsc`，**不自动打安装包、不自动发 Release**。发版以本地/人工上传为准。

---



## 10. 质量与已知约束



### 10.1 必须守住的回归

- 安装包打开第一个及后续多个 PDF，无 `reading 'sources'`、无空白死遮罩
- 多标签切换不闪加载、不丢页码
- 关于页长更新说明仍能点到「下载最新版本」
- 无效/过期 License 时 SDK 弹窗可见
- 拖放、二次启动、macOS `open-file` 都能打开 PDF



### 10.2 当前约束

- 阅读进度不写盘，重启应用从第 1 页开始
- 更新需用户手动跑安装包
- 密码框为 `prompt`，体验一般
- 未做 Windows Authenticode / macOS Notarization
- GitHub Actions 不产出安装包；macOS 包需在 Mac 上 `pack:mac`
- 浏览器模式仅调试，无真实路径持久化

---



## 11. 版本基线（实现历程摘要）


| 版本     | 对方案的影响                                            |
| ------ | ------------------------------------------------- |
| v0.1.2 | 预热 SDK、官方 `waitForInitialization`、静默更新、品牌图标、按平台选包 |
| v0.1.3 | 安装版打开问题部分修复；去掉有问题的文件类型拦截；Worker 延后创建              |
| v0.1.4 | **Worker 按实例隔离**；授权解析兼容；错误码不再挡 SDK 弹窗             |
| v0.1.5 | **安装版本机 HTTP 加载应用与 SDK**                          |
| v0.1.6 | **标签叠层 + 视图快照**；更新弹窗可滚动、按钮固定                      |


---



## 12. 验收清单（V1 交付定义）

- [x] 工作台打开 / 拖入 / 最近文件
- [x] 多标签 + 开始页
- [x] 阅读导航、缩略图、书签、搜索、打印
- [x] V1 批注集 + 另存为
- [x] 自定义 Appearance，无编辑/表单/保护 Tab
- [x] 适配层隔离
- [x] Windows NSIS、macOS 双架构 dmg
- [x] 安装版与开发版均可稳定打开 PDF
- [x] 检查更新并下载对应安装包
- [x] License 与密钥不进公开仓库

---



## 13. 后续演进（非当前范围，仅基于现状缺口）

若继续迭代，建议按用户价值而不是技术债务单独开需求：

1. 阅读进度持久化到 userData（按文件路径）
2. 应用内下载安装包并引导退出安装（仍建议保留手动确认）
3. 代码签名与公证，消除「未知发布者」
4. 密码与关于/更新弹窗统一为应用内对话框
5. CI 产出并上传 GitHub Release 资产
6. 未保存文档标题带 `*`

以上几项 **均未在 v0.1.6 实现**，不作为当前验收项。