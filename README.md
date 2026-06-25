<p align="center">
  <a href="https://github.com/hacs/integration"><img src="https://img.shields.io/badge/HACS-Dashboard-%231E40AF?style=flat-square&logo=hacs" alt="HACS Dashboard"></a>
  <a href="https://github.com/SecSunshine/hass-dashboard-pro/releases"><img src="https://img.shields.io/github/v/release/SecSunshine/hass-dashboard-pro?style=flat-square&color=%231E40AF" alt="Release"></a>
  <a href="https://github.com/SecSunshine/hass-dashboard-pro/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-%231E40AF?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/HA-%E2%89%A52026.5-%231E40AF?style=flat-square" alt="Home Assistant >= 2026.5">
</p>

# Hass Dashboard Pro

A zero-config Lovelace dashboard strategy for Home Assistant. It automatically builds a clean, responsive smart-home interface from your areas, devices, and entities — no card-by-card YAML required.

After installation, it registers itself in the native **Add Dashboard** dialog. Users just click to create a fully organized dashboard — the same workflow as Dwains Dashboard Next.

## Requirements

- Home Assistant 2026.5.0 or newer
- [HACS](https://hacs.xyz) installed
- [html-pro-card](https://github.com/ha-china/html-pro-card) installed via HACS (rendering engine)

## Installation

<a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=SecSunshine&amp;repository=hass-dashboard-pro&amp;category=dashboard"><img src="https://my.home-assistant.io/badges/hacs_repository.svg" alt="Open HACS repository" width="300"></a>

Or manually:

1. Open **HACS** in Home Assistant.
2. Click the menu icon **⋮** in the top-right → **Custom repositories**.
3. Enter `https://github.com/SecSunshine/hass-dashboard-pro`, set category to **Dashboard**, click **Add**.
4. Search for **Hass Dashboard Pro** and click **Download**.
5. Reload the frontend if Home Assistant asks.

## Usage

### Option A — Add Dashboard dialog (recommended)

1. Go to **Settings → Dashboards → Add Dashboard**.
2. Select **Hass Dashboard Pro** from Community dashboards.
3. Give it a name and click **Create**.
4. Your entities are automatically organized by area — done.

### Option B — Raw YAML

1. Go to **Settings → Dashboards → Add Dashboard**.
2. Give it a name, click **Create**.
3. Open the dashboard, click **⋮ → Edit → Raw configuration editor**, and paste:

```yaml
strategy:
  type: custom:hass-dashboard-pro
```

4. Click **Save**.

> The strategy type is `custom:hass-dashboard-pro` (`custom:` prefix is required by HA 2026.5+).

## What It Does

- Registers itself in the native **Add Dashboard** dialog (HA 2026.5+).
- Generates a home overview page with greeting, environment stats, and quick actions.
- Generates one detail page per HA area, grouped by floor.
- Categorizes entities by domain (lights, climate, covers, sensors, etc.).
- Provides a built-in visual theme editor — switch presets, adjust colors, spacing, and typography in real time.
- All visual properties use CSS variables (`--hdp-*`) for consistent theming.
- Runs entirely in the frontend as a JavaScript dashboard resource — no Python, no integration, no YAML required.

## Configuration

All options live inside the top-level `strategy` key. Everything is optional:

```yaml
strategy:
  type: custom:hass-dashboard-pro
  title: My Home
  hidden_areas:
    - utility_room
  hidden_domains:
    - automation
    - script
  favorite_entities:
    - light.living_room_main
  visual:
    theme: light              # light | dark | warm | forest
    colors:
      primary: "#1E40AF"
      page_bg: "#F8FAFC"
    border_radius: 10
    card_padding: 16
    font_family: "Inter, -apple-system, sans-serif"
    shadows: true
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | string | `"Home"` | Title shown on the home view |
| `hidden_areas` | string[] | `[]` | Area IDs to exclude |
| `hidden_domains` | string[] | `[]` | Entity domains to hide everywhere |
| `favorite_entities` | string[] | `[]` | Entity IDs pinned to the home view |
| `visual.theme` | string | `"light"` | `light` \| `dark` \| `warm` \| `forest` |
| `visual.colors.*` | string | — | Override `primary` / `page_bg` / `card_bg` / `text_primary` / `text_secondary` |
| `visual.border_radius` | number | `10` | Card corner radius (px) |
| `visual.card_padding` | number | `16` | Card inner padding (px) |
| `visual.font_family` | string | Inter stack | CSS `font-family` |
| `visual.shadows` | boolean | `true` | Card drop shadows |

### Theme Presets

| Preset | Primary | Background | Style |
|--------|:-------:|:----------:|-------|
| `light` | `#1E40AF` | `#F8FAFC` | Clean & professional |
| `dark` | `#3B82F6` | `#0F172A` | Low-light comfort |
| `warm` | `#D97706` | `#FFFBEB` | Cozy & inviting |
| `forest` | `#065F46` | `#ECFDF5` | Calm & natural |

Open the **Visual Settings** page from the dashboard sidebar to adjust appearance interactively. Changes persist in `localStorage`.

## Development

```bash
git clone https://github.com/SecSunshine/hass-dashboard-pro.git
cd hass-dashboard-pro
npm install
npm run build   # → dist/hass-dashboard-pro.js
```

```
hass-dashboard-pro/
├── src/
│   ├── index.ts                    # Strategy registration
│   ├── types.ts                    # Interfaces, theme presets
│   ├── styles/design-tokens.ts     # CSS variable generation
│   ├── strategies/
│   │   ├── dashboard-strategy.ts   # Generates views list
│   │   └── view-strategy.ts        # Routes to template by path
│   ├── templates/
│   │   ├── home-view.ts            # Home overview
│   │   ├── area-view.ts            # Area detail
│   │   └── settings-view.ts        # Visual theme editor
│   └── utils/
│       ├── area-entities.ts        # Entity-to-area mapping
│       └── visual-config.ts        # Token resolution + persistence
├── dist/hass-dashboard-pro.js      # Build output (HACS target)
├── hacs.json
└── LICENSE
```

## HACS

This repository is structured as a HACS Dashboard plugin. The dashboard file is:

```
dist/hass-dashboard-pro.js
```

## License

[MIT](LICENSE)
