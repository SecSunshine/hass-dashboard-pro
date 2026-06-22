<p align="center">
  <img src="https://img.shields.io/github/v/release/SecSunshine/hass-dashboard-pro?style=flat-square&color=%231E40AF" alt="Release">
  <img src="https://img.shields.io/badge/HACS-Default-1E40AF?style=flat-square" alt="HACS Default">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-1E40AF?style=flat-square" alt="License"></a>
  <a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=SecSunshine&repository=hass-dashboard-pro&category=plugin"><img src="https://my.home-assistant.io/badges/hacs_repository.svg" alt="HACS Repository"></a>
  <img src="https://img.shields.io/badge/HA-%E2%89%A52024.8-1E40AF?style=flat-square" alt="HA Version">
</p>

<h1 align="center">Hass Dashboard Pro</h1>

<p align="center">
  <strong>A Lovelace dashboard strategy for Home Assistant — clean, minimal, and beautiful.</strong><br>
  Powered by the <code>html-pro-card</code> rendering engine, guided by Apple HIG and Dieter Rams design principles.
</p>

---

## Overview

Hass Dashboard Pro generates a complete Lovelace dashboard automatically from your Home Assistant entities — no manual card configuration required. It uses HA's native `customStrategies` API to produce a polished, responsive smart home interface:

- **Home View** — welcome greeting, status summary grid, quick actions, and favorite entities
- **Area Views** — one page per floor/area, with domain-categorized entity cards and toggles
- **Visual Settings** — interactive panel for real-time theme customization (color, spacing, typography, shadows)

Under the hood, every view is rendered through `html-pro-card`, ensuring strict adherence to the [html-card-pro design specification](https://github.com/ha-china/html-card-pro): 10px unified border radius, 16px card padding, subtle shadows, and the Inter typeface.

> **Design lineage**: The architecture is inspired by the strategy-based dashboard pattern popularized by Dwains Dashboard, re-implemented from scratch with a modern rendering engine and a fresh, minimal visual language.

---

## Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Dependencies](#dependencies)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Visual Customization](#visual-customization)
- [Development](#development)
- [FAQ](#faq)
- [License](#license)

---

## Features

| Feature | Description |
|---------|-------------|
| Zero-config dashboard | Generates a full dashboard from your HA entities automatically |
| Area-based navigation | One view per floor/area — entities are grouped and sorted by domain |
| html-pro-card rendering | Every card rendered through the html-pro-card engine with design tokens |
| 4 built-in themes | Light, Dark, Warm, and Forest — switch instantly |
| Real-time visual editor | Color pickers, sliders, font selectors — preview changes as you tweak |
| Persistent settings | Visual preferences saved to localStorage; survive page reloads |
| HACS compatible | Install with one click from the Home Assistant Community Store |
| Responsive layout | Adapts to desktop, tablet, and mobile viewports |
| SVG icons only | No emoji — clean, crisp SVG domain icons throughout |

---

## Screenshots

| Home View | Area View | Visual Settings |
|-----------|-----------|-----------------|
| *Coming soon* | *Coming soon* | *Coming soon* |

> Screenshots will be added in an upcoming release. Contributions welcome!

---

## Dependencies

| Dependency | Required | Notes |
|------------|----------|-------|
| [Home Assistant](https://www.home-assistant.io/) | ≥ 2024.8 | `customStrategies` API support |
| [html-pro-card](https://github.com/ha-china/html-pro-card) | Yes | Rendering engine — must be installed via HACS or manually |
| [HACS](https://hacs.xyz/) | Recommended | Simplifies installation and updates |

---

## Installation

### Via HACS (Recommended)

Click the badge below to open HACS directly in your Home Assistant instance, or follow the manual steps:

<p align="center">
  <a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=SecSunshine&repository=hass-dashboard-pro&category=plugin">
    <img src="https://my.home-assistant.io/badges/hacs_repository.svg" alt="Open in HACS">
  </a>
</p>

**Manual HACS steps:**

1. In Home Assistant, go to **HACS → ⋮ (menu) → Custom repositories**
2. Paste the repository URL: `https://github.com/SecSunshine/hass-dashboard-pro`
3. Select category: **Dashboard** (or **Plugin**)
4. Click **Add**, then search for "Hass Dashboard Pro" and download it
5. Refresh your browser (F5)

> HACS registers `dist/hass-dashboard-pro.js` as a Lovelace module resource automatically — no manual YAML needed.

### Manual Installation

1. Download `dist/hass-dashboard-pro.js` from the [latest release](https://github.com/SecSunshine/hass-dashboard-pro/releases/latest)
2. Place it in your HA `config/www/` directory
3. Register the resource (Home Assistant 2023+: **Settings → Dashboards → Resources**):

   ```
   URL:  /local/hass-dashboard-pro.js
   Type: JavaScript Module
   ```

   Or via `configuration.yaml`:

   ```yaml
   lovelace:
     mode: storage
     resources:
       - url: /local/hass-dashboard-pro.js
         type: module
   ```

---

## Quick Start

Create a new dashboard via **Settings → Dashboards → Add Dashboard**, switch to "Raw configuration editor" mode, and enter:

```yaml
title: My Home
strategy:
  type: hass-dashboard-pro
  title: Welcome Home
```

Save and open the dashboard. You should see a generated home view with your entities organized by area.

---

## Configuration

All options are placed under the `strategy` key in your dashboard YAML configuration:

```yaml
strategy:
  type: hass-dashboard-pro

  # General
  title: My Home                   # Dashboard title displayed on the home view
  hidden_areas:                    # Area IDs to exclude from the dashboard
    - utility_room
  hidden_domains:                  # Entity domains to hide globally
    - automation
    - script
  favorite_entities:               # Entities pinned to the home view
    - light.living_room_main
    - climate.bedroom_ac

  # Custom cards (per-area overrides)
  custom_cards:
    living_room:
      - type: custom:html-pro-card
        content: |
          <h2>Extra Controls</h2>

  # Visual settings (all optional)
  visual:
    theme: light                   # light | dark | warm | forest
    colors:
      primary: '#1E40AF'
      page_bg: '#F8FAFC'
      card_bg: '#FFFFFF'
      text_primary: '#1E293B'
      text_secondary: '#64748B'
      accent: '#F59E0B'
    border_radius: 12
    card_padding: 20
    font_family: 'Inter, -apple-system, sans-serif'
    shadows: true
    animations: true
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | `string` | `"Home"` | Home view title |
| `hidden_areas` | `string[]` | `[]` | Area IDs to hide |
| `hidden_domains` | `string[]` | `[]` | Domains to hide across all views |
| `favorite_entities` | `string[]` | `[]` | Entities to feature on the home view |
| `custom_cards` | `object` | `{}` | Per-area additional Lovelace cards |
| `visual.theme` | `string` | `"light"` | Theme preset: `light`, `dark`, `warm`, `forest` |
| `visual.colors` | `object` | — | Individual color overrides (6 CSS color keys) |
| `visual.border_radius` | `number` | `10` | Card border radius in pixels |
| `visual.card_padding` | `number` | `16` | Card inner padding in pixels |
| `visual.font_family` | `string` | — | CSS `font-family` value |
| `visual.shadows` | `boolean` | `true` | Enable/disable card drop shadows |
| `visual.animations` | `boolean` | `true` | Enable/disable CSS transitions |

---

## Visual Customization

Hass Dashboard Pro ships with an **interactive visual settings panel** accessible from the dashboard navigation. Every change previews in real-time and persists across browser sessions.

### Using the Settings Panel

Open the settings page and adjust:

- **Theme presets** — One-click switch between Light, Dark, Warm, and Forest
- **Colors** — Fine-tune primary, background, card, text, and accent colors with native color pickers
- **Border radius** — Drag a slider to adjust card corner rounding (4–24 px)
- **Card padding** — Drag a slider to control card internal spacing (8–32 px)
- **Font family** — Choose from Inter, system default, serif, or monospace
- **Shadows** — Toggle card drop shadows on or off
- **Reset** — Restore all settings to defaults with a single click

### Configuration Priority

When both YAML config and panel settings exist, the resolution order is:

```
Panel settings (localStorage)  >  YAML visual.*  >  YAML visual.theme  >  Built-in defaults
```

This means panel tweaks always take effect immediately without modifying your YAML files.

---

## Development

```bash
# Clone and install
git clone https://github.com/SecSunshine/hass-dashboard-pro.git
cd hass-dashboard-pro
npm install

# Build
npm run build        # Production build → dist/hass-dashboard-pro.js
npm run dev          # Watch mode for development
npm run lint         # Type check without emitting
```

### Project Structure

```
src/
├── index.ts                          # Entry point — strategy registration
├── types.ts                          # TypeScript interfaces and constants
├── styles/
│   └── design-tokens.ts              # Design token definitions and CSS variable generation
├── strategies/
│   ├── dashboard-strategy.ts         # Top-level dashboard strategy
│   └── view-strategy.ts             # Per-view content strategy
├── templates/
│   ├── home-view.ts                  # Home page template
│   ├── area-view.ts                  # Area detail page template
│   └── settings-view.ts             # Visual settings panel template
└── utils/
    ├── area-entities.ts              # Entity-to-area mapping
    └── visual-config.ts             # Token resolution and localStorage persistence
```

### Design Tokens

All visual properties are centralized in `src/styles/design-tokens.ts`:

| Token | Value |
|-------|-------|
| Primary color | `#1E40AF` |
| Page background | `#F8FAFC` |
| Card background | `#FFFFFF` |
| Card shadow | `0 2px 8px rgba(0,0,0,0.06)` |
| Border radius | `10px` (enforced) |
| Spacing base | `8px` |
| Card padding | `16px` |
| Section gap | `20px` |
| Font stack | `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` |

---

## FAQ

<details>
<summary><strong>How is this different from Dwains Dashboard?</strong></summary>

Hass Dashboard Pro is inspired by the strategy-based architecture pattern, but built from scratch with key differences:

- Uses `html-pro-card` as the rendering engine instead of custom Lit components
- Follows a stricter, more minimal visual language (Apple HIG / Dieter Rams)
- Includes an interactive visual settings panel for real-time customization
- Zero emoji — all icons are clean SVG
- Written in TypeScript with Rollup bundling (no webpack)

</details>

<details>
<summary><strong>Do I need html-pro-card installed?</strong></summary>

Yes. `html-pro-card` is the rendering engine — every dashboard card is rendered through it. Install it via HACS or manually before using Hass Dashboard Pro.

</details>

<details>
<summary><strong>Can I mix this with regular Lovelace cards?</strong></summary>

Yes. Use the `custom_cards` config option to inject any Lovelace card into specific areas. The auto-generated cards and your custom cards coexist on the same view.

</details>

<details>
<summary><strong>How do I hide entities I don't want to see?</strong></summary>

Use `hidden_domains` to hide entire domain categories (e.g. `automation`, `script`), or `hidden_areas` to exclude rooms entirely.

</details>

---

## Contributing

Bug reports and feature requests are welcome on the [issue tracker](https://github.com/SecSunshine/hass-dashboard-pro/issues). Pull requests should target the `main` branch and include a clear description of the change.

---

## License

[MIT](LICENSE) © 2025 SecSunshine
