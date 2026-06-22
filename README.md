<p align="center">
  <a href="https://github.com/SecSunshine/hass-dashboard-pro/releases"><img src="https://img.shields.io/github/v/release/SecSunshine/hass-dashboard-pro?style=flat-square&color=%231E40AF" alt="GitHub Release"></a>
  <a href="https://github.com/SecSunshine/hass-dashboard-pro/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-1E40AF?style=flat-square" alt="MIT License"></a>
  <a href="https://github.com/hacs/integration"><img src="https://img.shields.io/badge/HACS-plugin-1E40AF?style=flat-square" alt="HACS Plugin"></a>
  <img src="https://img.shields.io/badge/HA-%E2%89%A52024.8-1E40AF?style=flat-square" alt="Home Assistant 2024.8+">
  <a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=SecSunshine&repository=hass-dashboard-pro&category=plugin"><img src="https://my.home-assistant.io/badges/hacs_repository.svg" alt="Add to HACS"></a>
</p>

<h1 align="center">Hass Dashboard Pro</h1>

<p align="center">
  A <strong>zero-config Lovelace dashboard strategy</strong> for Home Assistant that generates a clean, responsive smart home interface from your existing entities — no card-by-card YAML required.
</p>

<p align="center">
  Powered by <code>html-pro-card</code> &nbsp;·&nbsp; Apple HIG + Dieter Rams minimalism &nbsp;·&nbsp; Built-in visual theme editor
</p>

---

## Overview

Hass Dashboard Pro replaces manual Lovelace card configuration with an automated strategy-based approach. Using Home Assistant's native `customStrategies` API, it introspects your entities and areas to produce:

- **Home View** — time-aware greeting, status summary grid, quick actions, and pinned favorite entities
- **Area Views** — auto-generated pages per floor/area, with entities sorted into domain-categorized control cards
- **Visual Settings** — interactive panel for real-time theme customization (colors, spacing, typography, shadows), persisted to `localStorage`

Every view is rendered through `html-pro-card`, enforcing the [html-card-pro design specification](https://github.com/ha-china/html-card-pro):
- **10px unified border radius** on all cards
- **16px card padding** with subtle `0 2px 8px rgba(0,0,0,0.06)` shadow
- **Inter** typeface throughout
- **SVG-only icons** — no emoji

> The strategy-based architecture was inspired by the pattern pioneered by Dwains Dashboard, re-implemented from scratch with a modern rendering engine and a stricter visual language.

---

## Installation

### HACS (recommended)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=SecSunshine&repository=hass-dashboard-pro&category=plugin)

Or manually in HACS:

1. Go to **HACS → ⋮ → Custom repositories**
2. Repository: `https://github.com/SecSunshine/hass-dashboard-pro` &nbsp;·&nbsp; Category: **Dashboard**
3. Click **Add**, search for <kbd>Hass Dashboard Pro</kbd>, and download
4. Refresh your browser

> HACS automatically registers the module as a Lovelace resource — no manual YAML configuration is needed.

### Manual

1. Download `hass-dashboard-pro.js` from the [latest release](https://github.com/SecSunshine/hass-dashboard-pro/releases/latest)
2. Place it in your HA `config/www/` directory
3. Register the resource:

   ```yaml
   # configuration.yaml
   lovelace:
     mode: storage
     resources:
       - url: /local/hass-dashboard-pro.js
         type: module
   ```

### Dependencies

| Dependency | Version | Notes |
|------------|---------|-------|
| [Home Assistant](https://www.home-assistant.io/) | ≥ 2024.8 | `customStrategies` API |
| [html-pro-card](https://github.com/ha-china/html-pro-card) | latest | Rendering engine — install via HACS first |

---

## Quick Start

Create a new dashboard (**Settings → Dashboards → Add Dashboard**), switch to raw YAML mode:

```yaml
strategy:
  type: hass-dashboard-pro
  title: My Home
```

Save, open the dashboard, and you will see your entities organized by area automatically.

---

## Configuration

All options live under the `strategy` key in your dashboard YAML:

```yaml
strategy:
  type: hass-dashboard-pro

  # General
  title: My Home
  hidden_areas:              # Area IDs to exclude
    - utility_room
  hidden_domains:            # Domains to hide
    - automation
    - script
  favorite_entities:         # Pinned to home view
    - light.living_room_main
    - climate.bedroom_ac

  # Per-area custom cards
  custom_cards:
    living_room:
      - type: custom:html-pro-card
        content: |
          <h2>Extra Controls</h2>

  # Visual overrides (all optional)
  visual:
    theme: light
    colors:
      primary: "#1E40AF"
      page_bg: "#F8FAFC"
      card_bg: "#FFFFFF"
      text_primary: "#1E293B"
      text_secondary: "#64748B"
      accent: "#F59E0B"
    border_radius: 12
    card_padding: 20
    font_family: "Inter, -apple-system, sans-serif"
    shadows: true
    animations: true
```

### Options Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | `string` | `"Home"` | Dashboard title on the home view |
| `hidden_areas` | `string[]` | `[]` | Area IDs to exclude |
| `hidden_domains` | `string[]` | `[]` | Domains to hide across all views |
| `favorite_entities` | `string[]` | `[]` | Entities featured on the home view |
| `custom_cards` | `object` | `{}` | `{ area_id: [cards...] }` map of extra Lovelace cards |
| `visual.theme` | `string` | `"light"` | Preset: `light` \| `dark` \| `warm` \| `forest` |
| `visual.colors.*` | `string` | theme defaults | Any of `primary` / `page_bg` / `card_bg` / `text_primary` / `text_secondary` / `accent` |
| `visual.border_radius` | `number` | `10` | Card border radius (px) |
| `visual.card_padding` | `number` | `16` | Card inner padding (px) |
| `visual.font_family` | `string` | Inter stack | CSS `font-family` value |
| `visual.shadows` | `boolean` | `true` | Card drop shadows |
| `visual.animations` | `boolean` | `true` | CSS transitions |

---

## Visual Customization

Open the **Visual Settings** page from the dashboard sidebar to adjust the appearance interactively. Changes preview instantly and persist across sessions.

### Resolution Order

```
Panel settings (localStorage)  >  YAML visual.*  >  YAML visual.theme  >  Defaults
```

Panel tweaks always win — you can experiment without touching your YAML files.

### Theme Presets

| Preset | Primary | Background | Card | Vibe |
|--------|---------|------------|------|------|
| **Light** | `#1E40AF` | `#F8FAFC` | `#FFFFFF` | Clean & professional |
| **Dark** | `#818CF8` | `#1E293B` | `#334155` | Low-light comfort |
| **Warm** | `#C2410C` | `#FFF7ED` | `#FFFFFF` | Cozy & inviting |
| **Forest** | `#047857` | `#ECFDF5` | `#FFFFFF` | Calm & natural |

---

## Design Tokens

All visual properties are centralized. Runtime overrides are injected as CSS variables:

| CSS Variable | Default |
|-------------|---------|
| `--hdp-primary` | `#1E40AF` |
| `--hdp-page-bg` | `#F8FAFC` |
| `--hdp-card-bg` | `#FFFFFF` |
| `--hdp-card-shadow` | `0 2px 8px rgba(0,0,0,0.06)` |
| `--hdp-border-radius` | `10px` |
| `--hdp-card-padding` | `16px` |
| `--hdp-text-primary` | `#1E293B` |
| `--hdp-text-secondary` | `#64748B` |
| `--hdp-accent` | `#F59E0B` |
| `--hdp-font-family` | `Inter, -apple-system, ...` |

---

## Development

```bash
git clone https://github.com/SecSunshine/hass-dashboard-pro.git
cd hass-dashboard-pro
npm install

npm run build        # Production build → hass-dashboard-pro.js
npm run dev          # Watch mode
npm run lint         # Type check
```

### Architecture

```
src/
├── index.ts                       # Strategy registration
├── types.ts                       # Interfaces, constants, theme presets
├── styles/
│   └── design-tokens.ts           # Token definitions + CSS variable generation
├── strategies/
│   ├── dashboard-strategy.ts      # Top-level: generates views list
│   └── view-strategy.ts           # Per-view: routes to template by path
├── templates/
│   ├── home-view.ts               # Home page YAML template
│   ├── area-view.ts               # Area detail YAML template
│   └── settings-view.ts           # Visual settings panel template
└── utils/
    ├── area-entities.ts           # Entity → area mapping
    └── visual-config.ts           # Token resolution + localStorage persistence
```

**Build pipeline**: TypeScript → Rollup → single ES module → `dist/hass-dashboard-pro.js`

---

## FAQ

<details>
<summary><strong>How is this different from Dwains Dashboard?</strong></summary><br>

- Renders through `html-pro-card` instead of custom Lit web components
- Follows a stricter visual language (Apple HIG / 10px radius / Inter / SVG icons)
- Ships an interactive visual settings panel for real-time theme editing
- TypeScript + Rollup (no webpack), zero emoji, MIT licensed

</details>

<details>
<summary><strong>Do I need html-pro-card separately?</strong></summary><br>

Yes — `html-pro-card` is the rendering engine. Install it via HACS before enabling this dashboard.

</details>

<details>
<summary><strong>Can I mix auto-generated cards with manual ones?</strong></summary><br>

Yes — use `custom_cards` to inject any Lovelace card into specific areas alongside the auto-generated layout.

</details>

<details>
<summary><strong>How do I hide unwanted entities?</strong></summary><br>

Use `hidden_domains` to exclude entire categories (e.g. `automation`) or `hidden_areas` to exclude rooms entirely.

</details>

<details>
<summary><strong>Can I submit a theme or improvement?</strong></summary><br>

Absolutely — see [Contributing](#contributing) below. Bug reports, feature requests, and pull requests are welcome.

</details>

---

## Contributing

Contributions are welcome. Please:

1. Open an issue to discuss the change before starting work
2. Target the `main` branch with your pull request
3. Ensure `npm run lint` passes with no errors
4. Describe the motivation and scope clearly

---

## License

[MIT](LICENSE) © 2025 SecSunshine

---

<p align="center">
  <sub>Built with TypeScript · Powered by html-pro-card · Designed for Home Assistant</sub>
</p>
