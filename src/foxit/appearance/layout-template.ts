/**
 * 自定义布局：
 * - 顶栏三区：左侧（侧栏切换+文件名）/ 中间（主页·注释）/ 右侧（搜索·打印·另存为·更多）
 * - 下方保留 Ribbon paddle 工具条（复用内置 Controller）
 * - 主体：侧栏 + viewer
 */
export const LITE_LAYOUT_TEMPLATE = `
<webpdf>
  <toolbar name="toolbar" class="litepdf-toolbar-shell">
    <div class="litepdf-topbar" name="litepdf-topbar">
      <div class="litepdf-topbar-left" name="litepdf-topbar-left">
        <!-- 展开(默认缩略图) / 收起；仅用 @tooltip，勿加原生 title 以免双提示 -->
        <xbutton
          name="litepdf-sidebar-toggle"
          class="litepdf-icon-btn"
          icon-class="litepdf-icon-sidebar-expand"
          @tooltip
          tooltip-title="缩略图/书签/注释列表"
          @controller="litepdf:SidebarToggleController"
        ></xbutton>
        <div name="litepdf-filename" class="litepdf-filename" title="">未打开文件</div>
      </div>

      <div class="litepdf-topbar-center fv__ui-tab-nav" name="toolbar-tabs">
        <gtab name="home-tab" group="toolbar-tab" body="fv--home-tab-paddle" text="toolbar.tabs.home.title" active></gtab>
        <gtab name="comment-tab" group="toolbar-tab" body="fv--comment-tab-paddle" text="toolbar.tabs.comment.title"></gtab>
      </div>

      <div class="litepdf-topbar-right" name="litepdf-topbar-right">
        <!-- 搜索按钮复用 SearchToggleButtonController；侧栏面板复用 SearchSidebarPanelController -->
        <xbutton
          name="litepdf-search-btn"
          class="litepdf-icon-btn"
          icon-class="fv__icon-sidebar-search"
          @tooltip
          tooltip-title="搜索"
          @controller="mobile:SearchToggleButtonController"
        ></xbutton>
        <xbutton
          name="litepdf-print-btn"
          class="litepdf-icon-btn"
          icon-class="fv__icon-toolbar-print"
          @tooltip
          tooltip-title="打印"
          @controller="print:ShowPrintDialogController"
        ></xbutton>
        <xbutton
          name="litepdf-save-btn"
          class="litepdf-icon-btn"
          icon-class="fv__icon-toolbar-download"
          @tooltip
          tooltip-title="另存为"
          @controller="file:DownloadFileController"
        ></xbutton>
        <!-- 更多：不常用功能下拉（夸克风格；勿加 litepdf-icon-btn，以免压扁下拉层） -->
        <dropdown
          name="litepdf-more"
          class="litepdf-more-dropdown fv__ui-dropdown-hide-text"
          icon-class="litepdf-icon-more"
          tooltip-title="更多"
          @tooltip
          text=""
        >
          <dropdown-button
            name="litepdf-more-open-browser"
            action="open-browser"
            icon-class="litepdf-more-icon-browser"
            @controller="litepdf:MoreMenuController"
          >在浏览器窗口打开</dropdown-button>
          <dropdown-button
            name="litepdf-more-send"
            action="send-devices"
            icon-class="litepdf-more-icon-send"
            @controller="litepdf:MoreMenuController"
          >发送到其他设备</dropdown-button>
          <dropdown-button
            name="litepdf-more-password"
            class="litepdf-more-after-sep"
            action="password"
            icon-class="litepdf-more-icon-password"
            @controller="litepdf:MoreMenuController"
          >文档密码</dropdown-button>
          <dropdown-button
            name="litepdf-more-annot"
            action="annotations"
            icon-class="litepdf-more-icon-annot"
            @controller="litepdf:MoreMenuController"
          >注解</dropdown-button>
          <dropdown-button
            name="litepdf-more-play"
            action="play"
            icon-class="litepdf-more-icon-play"
            @controller="litepdf:MoreMenuController"
          >播放</dropdown-button>
          <dropdown-button
            name="litepdf-more-props"
            action="properties"
            icon-class="litepdf-more-icon-props"
            @controller="litepdf:MoreMenuController"
          >文档属性</dropdown-button>
          <dropdown-button
            name="litepdf-more-settings"
            action="settings"
            icon-class="litepdf-more-icon-settings"
            @controller="litepdf:MoreMenuController"
          >PDF设置</dropdown-button>
        </dropdown>
      </div>
    </div>

    <div class="fv__ui-toolbar-tab-bodies litepdf-tool-paddle" name="toolbar-tab-bodies">
      <paddle name="fv--home-tab-paddle" @aria:toolbar>
        <group-list name="home-toolbar-group-list">
          <group name="home-tab-group-hand" retain-count="1">
            <hand-ribbon-button></hand-ribbon-button>
          </group>
          <group name="home-tab-group-zoom">
            <zoom-out-ribbon-button></zoom-out-ribbon-button>
            <zoom-in-ribbon-button></zoom-in-ribbon-button>
            <editable-zoom-dropdown></editable-zoom-dropdown>
          </group>
          <group name="home-tab-group-nav" retain-count="3">
            <goto-first-page-button></goto-first-page-button>
            <goto-prev-page-button></goto-prev-page-button>
            <goto-page-input></goto-page-input>
            <goto-next-page-button></goto-next-page-button>
            <goto-last-page-button></goto-last-page-button>
          </group>
          <!-- 原视图页页面布局组：并入主页工具条 -->
          <group name="view-tab-group-page" retain-count="2">
            <single-page-ribbon-button></single-page-ribbon-button>
            <continuous-page-ribbon-button></continuous-page-ribbon-button>
            <facing-page-ribbon-button></facing-page-ribbon-button>
            <continuous-facing-page-ribbon-button></continuous-facing-page-ribbon-button>
          </group>
        </group-list>
      </paddle>

      <paddle name="fv--comment-tab-paddle" visible="false" @aria:toolbar>
        <group-list name="comment-toolbar-group-list">
          <group name="comment-tab-group-hand" retain-count="3">
            <hand-ribbon-button></hand-ribbon-button>
            <selection-ribbon-dropdown></selection-ribbon-dropdown>
            <zoom-ribbon-dropdown></zoom-ribbon-dropdown>
          </group>
          <group name="comment-tab-group-note" retain-count="2">
            <create-note-ribbon-button></create-note-ribbon-button>
          </group>
          <group name="comment-tab-group-mark">
            <div class="fx-ribbon-items-sm">
              <create-text-highlight-ribbon-button small="true"></create-text-highlight-ribbon-button>
              <create-strikeout-ribbon-button small="true"></create-strikeout-ribbon-button>
            </div>
            <div class="fx-ribbon-items-sm">
              <create-underline-ribbon-button small="true"></create-underline-ribbon-button>
              <create-squiggly-ribbon-button small="true"></create-squiggly-ribbon-button>
            </div>
          </group>
          <group name="comment-tab-group-text">
            <create-typewriter-ribbon-button></create-typewriter-ribbon-button>
            <create-callout-ribbon-button></create-callout-ribbon-button>
            <create-textbox-ribbon-button></create-textbox-ribbon-button>
          </group>
          <group name="comment-tab-group-pencil" retain-count="2">
            <create-pencil-ribbon-button></create-pencil-ribbon-button>
            <eraser-ribbon-button></eraser-ribbon-button>
          </group>
        </group-list>
      </paddle>

    </div>
  </toolbar>

  <div class="fv__ui-body">
    <sidebar name="sidebar">
      <thumbnail-sidebar-panel @require-modules="thumbnail"></thumbnail-sidebar-panel>
      <bookmark-sidebar-panel></bookmark-sidebar-panel>
      <commentlist-sidebar-panel></commentlist-sidebar-panel>
      <!-- 搜索侧栏面板：供 SearchToggleButtonController / SearchSidebarPanelController 复用 -->
      <sidebar-panel
        name="sidebar-search"
        @tooltip
        tooltip-placement="right"
        tooltip-title="sidebar.search.tooltip"
        title="sidebar.search.title"
        icon-class="fv__icon-sidebar-search"
        @controller="search:SearchSidebarPanelController"
      >
        <search-pane></search-pane>
      </sidebar-panel>
    </sidebar>
    <viewer @zoom-on-pinch @zoom-on-doubletap @zoom-on-wheel @touch-to-scroll></viewer>
    <sidebar-right min-width="280" max-width="360" name="sidebar-right" @lazy-content="shown">
      <sidebar-tabs name="sidebar-right-tabs">
        <sidebar-tab-panel name="right-search-panel" tab-title="搜索">
          <search:advanced-search name="advanced-search"></search:advanced-search>
        </sidebar-tab-panel>
      </sidebar-tabs>
    </sidebar-right>
  </div>

  <template name="template-container">
    <print:print-dialog @lazy></print:print-dialog>
    <page-contextmenu></page-contextmenu>
    <default-annot-contextmenu></default-annot-contextmenu>
    <markup-contextmenu></markup-contextmenu>
    <markup-contextmenu name="fv--ink-contextmenu"></markup-contextmenu>
    <markup-contextmenu name="fv--text-contextmenu"></markup-contextmenu>
    <textmarkup-contextmenu name="fv--highlight-contextmenu"></textmarkup-contextmenu>
    <textmarkup-contextmenu name="fv--strikeout-contextmenu"></textmarkup-contextmenu>
    <textmarkup-contextmenu name="fv--underline-contextmenu"></textmarkup-contextmenu>
    <textmarkup-contextmenu name="fv--squiggly-contextmenu"></textmarkup-contextmenu>
    <freetext-contextmenu name="fv--typewriter-contextmenu"></freetext-contextmenu>
    <freetext-contextmenu name="fv--callout-contextmenu"></freetext-contextmenu>
    <freetext-contextmenu name="fv--textbox-contextmenu"></freetext-contextmenu>
    <comment-card-contextmenu></comment-card-contextmenu>
    <text-sel:text-selection-tooltip></text-sel:text-selection-tooltip>
    <freetext:freetext-tooltip></freetext:freetext-tooltip>
    <search:basic-search-options name="fv--search-basic-options"></search:basic-search-options>
    <search:choose-search-type name="fv--search-choose-search-type"></search:choose-search-type>
    <comment-list:filter-dialog name="fv--commentlist-filter-comment-dialog"></comment-list:filter-dialog>
  </template>
</webpdf>
`
