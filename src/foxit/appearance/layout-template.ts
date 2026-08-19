/**
 * 自定义布局：
 * - 顶栏三区：左侧（侧栏切换+文件名）/ 中间（主页·注释）/ 右侧（搜索·打印·另存为·更多）
 * - 下方保留 Ribbon paddle 工具条（复用内置 Controller）
 * - 主体：侧栏 + viewer
 */
export const LITE_LAYOUT_TEMPLATE = `
<webpdf>
  <toolbar name="toolbar" class="litepdf-toolbar-shell">
    <!-- toolbar-tabs 必须是 toolbar 直接子节点，与 toolbar-tab-bodies 同级，gtab 才能切换 paddle -->
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

    <div
      class="litepdf-topbar-center fv__ui-tab-nav"
      name="toolbar-tabs"
      @alt.menu=">::activated()"
      @aria:toolbar.tablist
    >
      <gtab
        name="home-tab"
        group="toolbar-tab"
        body="fv--home-tab-paddle"
        text="toolbar.tabs.home.title"
        @aria:toolbar.tab
        active
      ></gtab>
      <gtab
        name="comment-tab"
        group="toolbar-tab"
        body="fv--comment-tab-paddle"
        text="批注"
        @aria:toolbar.tab
      ></gtab>
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
        <!-- 更多：对齐官方 search-bar「查找选项」——按钮 + contextmenu.showAt -->
        <xbutton
          name="litepdf-more-btn"
          class="litepdf-icon-btn litepdf-more-btn"
          icon-class="litepdf-icon-more"
          @tooltip
          tooltip-title="更多"
          @controller="litepdf:MoreMenuButtonController"
        ></xbutton>
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
          <group name="home-tab-group-nav" retain-count="5">
            <goto-first-page-button></goto-first-page-button>
            <goto-prev-page-button></goto-prev-page-button>
            <goto-page-input></goto-page-input>
            <goto-next-page-button></goto-next-page-button>
            <goto-last-page-button></goto-last-page-button>
            <xbutton
              name="litepdf-prev-view-btn"
              icon-class="fv__icon-toolbar-previous-view"
              @tooltip
              tooltip-title="返回上一视图"
              @controller="litepdf:PrevViewController"
            ></xbutton>
            <xbutton
              name="litepdf-next-view-btn"
              icon-class="fv__icon-toolbar-next-view"
              @tooltip
              tooltip-title="跳转到下一视图"
              @controller="litepdf:NextViewController"
            ></xbutton>
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

      <paddle name="fv--comment-tab-paddle" class="litepdf-comment-paddle" visible="false" @aria:toolbar>
        <div class="litepdf-comment-zones" name="litepdf-comment-zones">
          <div class="litepdf-comment-zone litepdf-comment-zone-left" name="litepdf-comment-zone-left">
            <group-list name="comment-toolbar-group-list-left">
              <group name="comment-tab-group-undo" retain-count="2">
                <!-- 不用预置 undo/redo-ribbon-button：官方控制器用 lock() 置灰会挡 @tooltip -->
                <ribbon-button
                  name="litepdf-undo-btn"
                  @tooltip
                  tooltip-title="撤销"
                  text="撤销"
                  not-dropdown="true"
                  icon-class="fv__icon-toolbar-undo"
                  @controller="litepdf:UndoController"
                ></ribbon-button>
                <ribbon-button
                  name="litepdf-redo-btn"
                  @tooltip
                  tooltip-title="重做"
                  text="重做"
                  not-dropdown="true"
                  icon-class="fv__icon-toolbar-redo"
                  @controller="litepdf:RedoController"
                ></ribbon-button>
              </group>
            </group-list>
          </div>
          <div class="litepdf-comment-zone litepdf-comment-zone-center" name="litepdf-comment-zone-center">
            <group-list name="comment-toolbar-group-list" class="litepdf-comment-toolbar">
              <group name="comment-tab-group-highlight" retain-count="2">
                <!-- 不用预置 create-text-highlight-ribbon-button：其模板内嵌 SVG，iconCls 无法替换 -->
                <ribbon-button
                  name="create-highlight"
                  @tooltip
                  tooltip-title="文本高亮"
                  text="文本高亮"
                  not-dropdown="true"
                  icon-class="litepdf-icon-highlight"
                  @controller="states:CreateHighlightController"
                ></ribbon-button>
                <!-- 不用预置 create-area-highlight-ribbon-button：其模板内嵌 SVG，iconCls 无法替换 -->
                <ribbon-button
                  name="create-area-highlight"
                  @tooltip
                  tooltip-title="区域高亮"
                  text="区域高亮"
                  not-dropdown="true"
                  icon-class="litepdf-icon-area-highlight"
                  @controller="states:CreateAreaHighlightController"
                ></ribbon-button>
              </group>
              <group name="comment-tab-group-pencil" retain-count="2">
                <!-- 不用预置 create-pencil-ribbon-button：其模板内嵌 SVG，iconCls 无法替换 -->
                <ribbon-button
                  name="pencil-tool"
                  @tooltip
                  tooltip-title="画笔工具"
                  text="画笔工具"
                  not-dropdown="true"
                  icon-class="litepdf-icon-pencil"
                  @controller="states:CreatePencilController"
                ></ribbon-button>
                <ribbon-button
                  name="eraser-tool"
                  @tooltip
                  tooltip-title="局部擦除"
                  text="局部擦除"
                  icon-class="litepdf-icon-eraser"
                  @controller="states:EraserController"
                ></ribbon-button>
              </group>
              <group name="comment-tab-group-shape" retain-count="3">
                <create-typewriter-ribbon-button></create-typewriter-ribbon-button>
                <create-textbox-ribbon-button></create-textbox-ribbon-button>
                <create-callout-ribbon-button></create-callout-ribbon-button>
              </group>
              <group name="comment-tab-group-drawing" retain-count="1">
                <!-- 官方 ribbon 下拉：图标槽与其它批注按钮同为 fx-ribbon-item-icon 32px -->
                <create-drawings-ribbon-dropdown></create-drawings-ribbon-dropdown>
              </group>
              <group name="comment-tab-group-markup" retain-count="5">
                <create-underline-ribbon-button></create-underline-ribbon-button>
                <create-strikeout-ribbon-button></create-strikeout-ribbon-button>
                <create-squiggly-ribbon-button></create-squiggly-ribbon-button>
                <create-caret-ribbon-button></create-caret-ribbon-button>
                <create-replace-ribbon-button></create-replace-ribbon-button>
              </group>
              <group name="comment-tab-group-extras" retain-count="2">
                <stamp-ribbon-dropdown></stamp-ribbon-dropdown>
                <ink-sign-ribbon-dropdown name="fv--ink-sign-dropdown"></ink-sign-ribbon-dropdown>
              </group>
            </group-list>
          </div>
          <div class="litepdf-comment-zone litepdf-comment-zone-right" name="litepdf-comment-zone-right"></div>
        </div>
      </paddle>

    </div>
  </toolbar>

  <div class="fv__ui-body">
    <sidebar name="sidebar">
      <thumbnail-sidebar-panel @require-modules="thumbnail"></thumbnail-sidebar-panel>
      <!-- WebSDK 10+：旧 bookmark-sidebar-panel 已废弃，改用 bookmark-v2 -->
      <!-- @see https://devdocs.fuxinsoft.cn/development-guide/pdf-sdk-web/upgrade-notes/bookmark-migration-guide.html -->
      <bookmark-v2:sidebar-panel></bookmark-v2:sidebar-panel>
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
    <!-- 放在 template-container，避免打断 toolbar → tab-bodies 结构 -->
    <full-screen:toggle-full-screen-button
      name="litepdf-presentation-fullscreen-trigger"
      class="litepdf-presentation-fullscreen-trigger"
      aria-hidden="true"
      tabindex="-1"
    ></full-screen:toggle-full-screen-button>
    <print:print-dialog @lazy></print:print-dialog>
    <!-- 对齐官方 complete_webViewer：勿 @lazy，否则 popup 未挂载时 getComponentByName 失败 -->
    <fpmodule:file-property-dialog></fpmodule:file-property-dialog>
    <!-- WebSDK 10+ 书签右键菜单（替代旧 bookmark-contextmenu） -->
    <bookmark-v2:bookmark-contextmenu></bookmark-v2:bookmark-contextmenu>
    <create-ink-sign-dialog @lazy></create-ink-sign-dialog>
    <!-- contextmenus：对齐 built-in-pc-layout-template.tpl -->
    <page-contextmenu></page-contextmenu>
    <default-annot-contextmenu @lazy></default-annot-contextmenu>
    <markup-contextmenu @lazy></markup-contextmenu>
    <markup-contextmenu @lazy name="fv--ink-contextmenu"></markup-contextmenu>
    <markup-contextmenu @lazy name="fv--stamp-contextmenu"></markup-contextmenu>
    <markup-contextmenu @lazy name="fv--text-contextmenu"></markup-contextmenu>
    <!-- 区域高亮必须用 caret-contextmenu，不能用 markup-contextmenu -->
    <caret-contextmenu name="fv--areahighlight-contextmenu" @lazy></caret-contextmenu>
    <textmarkup-contextmenu @lazy name="fv--highlight-contextmenu"></textmarkup-contextmenu>
    <textmarkup-contextmenu @lazy name="fv--strikeout-contextmenu"></textmarkup-contextmenu>
    <textmarkup-contextmenu @lazy name="fv--underline-contextmenu"></textmarkup-contextmenu>
    <textmarkup-contextmenu @lazy name="fv--squiggly-contextmenu"></textmarkup-contextmenu>
    <freetext-contextmenu @lazy name="fv--typewriter-contextmenu"></freetext-contextmenu>
    <freetext-contextmenu @lazy name="fv--callout-contextmenu"></freetext-contextmenu>
    <freetext-contextmenu @lazy name="fv--textbox-contextmenu"></freetext-contextmenu>
    <comment-card-contextmenu @lazy></comment-card-contextmenu>
    <text-sel:text-selection-tooltip @lazy></text-sel:text-selection-tooltip>
    <annottext name="fv--annottext-tooltip" @lazy></annottext>
    <freetext:freetext-tooltip></freetext:freetext-tooltip>
    <search:basic-search-options name="fv--search-basic-options"></search:basic-search-options>
    <search:choose-search-type name="fv--search-choose-search-type"></search:choose-search-type>
    <!-- 顶栏「更多」菜单：与官方「查找选项」相同，挂在 template-container 用 showAt 弹出 -->
    <contextmenu name="litepdf-more-menu" class="litepdf-more-contextmenu">
      <contextmenu-item
        name="litepdf-more-annot"
        action="annotations"
        icon-class="litepdf-more-icon-annot"
        @controller="litepdf:MoreMenuController"
      >注解</contextmenu-item>
      <contextmenu-item
        name="litepdf-more-play"
        action="play"
        icon-class="litepdf-more-icon-play"
        @controller="litepdf:MoreMenuController"
      >播放</contextmenu-item>
      <contextmenu-item
        name="litepdf-more-props"
        action="properties"
        icon-class="litepdf-more-icon-props"
        @controller="litepdf:MoreMenuController"
      >文档属性</contextmenu-item>
    </contextmenu>
    <comment-list:filter-dialog name="fv--commentlist-filter-comment-dialog"></comment-list:filter-dialog>
  </template>
</webpdf>
`
