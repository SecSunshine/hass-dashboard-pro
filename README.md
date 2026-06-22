# Hass Dashboard Pro

**基于 Dwains Dashboard Next 架构理念，使用 html-pro-card 渲染引擎的全新 Home Assistant 仪表盘策略。**

## 设计哲学

遵循 **Apple HIG · Dieter Rams 极简主义** 原则：
- 大量留白、干净排版、克制装饰
- 10px 统一圆角（html-card-pro 强制规约）
- 8px 基础间距系统
- 卡片级极淡投影，无内部 box-shadow
- Inter 系统字体，无 emoji

## 架构

```
HA Frontend (Lovelace)
  ├─ customStrategies: HassDashboardProStrategy
  │    └─ 生成 views 列表（首页 + 所有区域）
  └─ 每个 view
       └─ strategy: HassDashboardProViewStrategy
            ├─ 首页: home-view 模板（欢迎卡片 + 状态网格 + 快捷操作）
            └─ 区域: area-view 模板（徽章 + 实体卡片 + 开关）
                 ↓
            html-pro-card 渲染引擎
                 ↓
            HA Dashboard UI
```

## 依赖

| 依赖 | 版本要求 |
|------|---------|
| Home Assistant | ≥ 2024.8 |
| html-pro-card | 已安装 |
| HACS (推荐) | 最新版 |

## 安装

### 方式一：HACS（推荐）

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=SecSunshine&repository=hass-dashboard-pro&category=plugin)

> 点击上方徽章可直接在 HA 中打开 HACS 并添加此仓库。

**手动添加步骤：**

1. 打开 HACS → 右上角 `⋮` → **自定义存储库**
2. 填入仓库 URL：`https://github.com/SecSunshine/hass-dashboard-pro`
3. 类别选择：**仪表盘 (Dashboard / Plugin)**
4. 点击「添加」→ 在 HACS 中搜索 "Hass Dashboard Pro" 并下载
5. 刷新浏览器 (F5) 即可生效

> 注意：HACS 会自动将 `dist/hass-dashboard-pro.js` 注册为 Lovelace module 资源，无需手动配置。

### 方式二：手动安装

```bash
# 1. 下载 dist/hass-dashboard-pro.js
# 2. 放入 HA config/www/ 目录
```

在 `configuration.yaml` 或 Lovelace 资源管理界面中注册：

```yaml
lovelace:
  mode: storage
  resources:
    - url: /local/hass-dashboard-pro.js
      type: module
```

> **提示**：HA 2023+ 推荐在「设置 → 仪表盘 → 资源」中直接添加，无需编辑 yaml。

## 使用

### 创建新仪表盘

在 `dashboards.yaml` 或 Lovelace 原始配置编辑器中：

```yaml
title: 我的家
strategy:
  type: hass-dashboard-pro
  title: 首页
  hidden_areas:
    - utility_room    # 隐藏不需要的区域
  hidden_domains:
    - automation
    - script
  favorite_entities:
    - light.living_room_main
    - climate.bedroom_ac
  visual:             # 视觉配置（可选）
    theme: light      # light | dark | warm | forest | auto
  custom_cards:
    living_room:
      - type: custom:html-pro-card
        # 自定义卡片...
```

### 视觉配置（🆕 v1.1）

仪表盘内置了一个 **交互式视觉配置面板**（「视觉设置」页面），你可以：

- 🎨 切换 4 套主题预设（浅色 / 深色 / 暖色 / 森林）
- 🌈 无极调节主色、背景色、卡片色、文字色
- 📐 拖动滑块调节圆角半径、卡片内边距
- 🔤 切换字体（Inter / 系统字体 / 衬线 / 等宽）
- 🌓 开关卡片投影
- 👁️ **实时预览**，所见即所得
- 💾 所有配置自动保存到浏览器，刷新不丢失

#### YAML 方式配置

也可以在仪表盘 YAML 中直接声明视觉参数：

```yaml
strategy:
  type: hass-dashboard-pro
  visual:
    theme: dark                    # 预设主题
    colors:                        # 单项颜色覆盖
      primary: '#3B82F6'
      page_bg: '#0F172A'
      card_bg: '#1E293B'
    border_radius: 12              # 圆角 (px)
    card_padding: 20               # 卡片内边距 (px)
    sidebar_width: 260             # 侧边栏宽度 (px)
    font_family: 'Georgia, serif'  # 字体
    shadows: true                  # 卡片投影
    animations: true               # 过渡动画
```

**优先级**: 面板实时设置 > YAML visual 配置 > YAML theme 预设 > 默认值

### 配置选项

| 参数 | 类型 | 说明 |
|------|------|------|
| `title` | string | 首页标题 |
| `hidden_areas` | string[] | 隐藏的区域 ID 列表 |
| `hidden_domains` | string[] | 隐藏的实体域 |
| `favorite_entities` | string[] | 收藏的实体 (展示在首页) |
| `custom_cards` | Record | 每个区域的附加卡片 |
| `visual.theme` | string | 主题：light / dark / warm / forest / auto |
| `visual.colors` | object | 单项颜色覆盖 |
| `visual.border_radius` | number | 圆角半径 (px) |
| `visual.card_padding` | number | 卡片内边距 (px) |
| `visual.font_family` | string | CSS font-family |
| `visual.shadows` | boolean | 启用/禁用阴影 |
| `visual.animations` | boolean | 启用/禁用动画 |

## 构建

```bash
npm install
npm run build     # 生产构建 → dist/hass-dashboard-pro.js
npm run dev       # 开发模式 (watch)
```

## 设计令牌系统

所有视觉属性集中在 `src/styles/design-tokens.ts`：

```
颜色:   #F8FAFC (背景) · #1E40AF (主色) · #FFFFFF (卡片)
阴影:   0 2px 8px rgba(0,0,0,0.06)
圆角:   10px (强制)
间距:   8px 基数 · 16px 卡片内边距 · 20px 区块间距
字体:   Inter, -apple-system, sans-serif
```

修改 `design-tokens.ts` 即可全局更新视觉风格。也可通过 `visual` 配置项或内置「视觉设置」面板实时自定义，无需改代码。

## 架构

```
HA Frontend (Lovelace)
  ├─ customStrategies: HassDashboardProStrategy
  │    └─ 生成 views 列表（首页 + 区域 + 视觉设置）
  └─ 每个 view
       └─ strategy: HassDashboardProViewStrategy
            ├─ 首页: home-view 模板
            ├─ 区域: area-view 模板
            └─ 设置: settings-view 模板（交互式视觉配置）
                 ↓
            resolveTokens() → YAML config + localStorage
                 ↓
            generateDesignTokenCSS(tokens) → CSS 变量注入
                 ↓
            html-pro-card 渲染引擎
                 ↓
            HA Dashboard UI
```

## 许可证

MIT License
