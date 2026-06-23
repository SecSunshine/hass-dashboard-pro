<p align="center">
  <a href="https://github.com/hacs/integration"><img src="https://img.shields.io/badge/HACS-Dashboard-%231E40AF?style=flat-square&logo=hacs" alt="HACS Dashboard"></a>
  <a href="https://github.com/SecSunshine/hass-dashboard-pro/releases"><img src="https://img.shields.io/github/v/release/SecSunshine/hass-dashboard-pro?style=flat-square&color=%231E40AF" alt="Release"></a>
  <a href="https://github.com/SecSunshine/hass-dashboard-pro/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-%231E40AF?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/HA-%E2%89%A52024.8-%231E40AF?style=flat-square" alt="Home Assistant">
  <a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=SecSunshine&repository=hass-dashboard-pro&category=dashboard"><img src="https://my.home-assistant.io/badges/hacs_repository.svg" alt="Open your Home Assistant instance and open a repository inside HACS."></a>
</p>

<h1 align="center">Hass Dashboard Pro</h1>

<p align="center">
  <strong>Zero-config dashboard strategy for Home Assistant Lovelace.</strong><br>
  Generates a clean, responsive smart home interface from your existing entities — <em>no card-by-card YAML required</em>.
</p>

<p align="center">
  <sub>Powered by <a href="https://github.com/ha-china/html-pro-card">html-pro-card</a> &middot; Apple HIG &amp; Dieter Rams minimalism &middot; Built-in visual theme editor</sub>
</p>

---

## Features

- **Auto-generated views** — Home dashboard with greeting, status grid, and quick actions; per-area detail pages with domain-categorized control cards
- **Visual theme editor** — Interactive panel for real-time customization of colors, spacing, typography, and shadows; persisted in `localStorage`
- **Design-token system** — Centralized CSS variables (`--hdp-*`) for consistent theming across all views
- **Zero emoji** — All icons are SVG
- **HACS native** — One-click install, auto-registered as a Lovelace resource

---

## Installation

### HACS (recommended)

[![Open your Home Assistant instance and open a repository inside HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=SecSunshine&repository=hass-dashboard-pro&category=dashboard)

Or manually:

1. Go to **HACS → ⋮ → Custom repositories**
2. URL: `https://github.com/SecSunshine/hass-dashboard-pro` &middot; Category: **Dashboard**
3. Click **Add**, search for `Hass Dashboard Pro`, and download
4. Refresh your browser

> HACS registers the module as a Lovelace resource automatically — no manual YAML needed.

### Manual

1. Download [`hass-dashboard-pro.js`](https://github.com/SecSunshine/hass-dashboard-pro/releases/latest) from the latest release
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

### Prerequisites

| Package | Minimum Version | Notes |
|---------|:--------------:|-------|
| [Home Assistant](https://www.home-assistant.io/) | 2024.8 | `customStrategies` API support |
| [html-pro-card](https://github.com/ha-china/html-pro-card) | latest | Rendering engine (install via HACS first) |

---

## Quick Start

Create a new dashboard (**Settings → Dashboards → Add Dashboard**), switch to raw YAML, and enter:

```yaml
strategy:
  type: hass-dashboard-pro
  title: My Home
```

Save and open — your entities are organized by area automatically.

---

## Configuration

All options live inside the `strategy` key:

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

### Option Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | `string` | `"Home"` | Dashboard title on the home view |
| `hidden_areas` | `string[]` | `[]` | Area IDs to exclude from the dashboard |
| `hidden_domains` | `string[]` | `[]` | Entity domains to hide across all views |
| `favorite_entities` | `string[]` | `[]` | Entity IDs pinned to the home view |
| `custom_cards` | `object` | `{}` | Map of `{ area_id: [Lovelace cards] }` appended to area views |
| `visual.theme` | `string` | `"light"` | Theme preset: `light` \| `dark` \| `warm` \| `forest` |
| `visual.colors.*` | `string` | — | Override `primary` / `page_bg` / `card_bg` / `text_primary` / `text_secondary` / `accent` |
| `visual.border_radius` | `number` | `10` | Card border radius in pixels |
| `visual.card_padding` | `number` | `16` | Card inner padding in pixels |
| `visual.font_family` | `string` | Inter stack | CSS `font-family` value |
| `visual.shadows` | `boolean` | `true` | Show card drop shadows |
| `visual.animations` | `boolean` | `true` | Enable CSS transitions |

---

## Visual Customization

Open the **Visual Settings** page from the dashboard sidebar to adjust the appearance interactively. Changes preview instantly and persist across browser sessions.

### Resolution Order

```
Panel settings (localStorage)  >  YAML visual.*  >  YAML visual.theme  >  Defaults
```

The visual settings panel always wins — experiment freely without touching YAML files.

### Built-in Theme Presets

| Preset | Primary | Background | Card | Style |
|--------|:-------:|:----------:|:----:|-------|
| **Light** | `#1E40AF` | `#F8FAFC` | `#FFFFFF` | Clean & professional |
| **Dark** | `#818CF8` | `#1E293B` | `#334155` | Low-light comfort |
| **Warm** | `#C2410C` | `#FFF7ED` | `#FFFFFF` | Cozy & inviting |
| **Forest** | `#047857` | `#ECFDF5` | `#FFFFFF` | Calm & natural |

---

## Design Tokens

Runtime visual overrides are injected as CSS custom properties:

| Variable | Default | |
|----------|---------|---|
| `--hdp-primary` | `#1E40AF` | Primary accent color |
| `--hdp-page-bg` | `#F8FAFC` | Page background |
| `--hdp-card-bg` | `#FFFFFF` | Card surface |
| `--hdp-card-shadow` | `0 2px 8px rgba(0,0,0,0.06)` | Card drop shadow |
| `--hdp-border-radius` | `10px` | Card corner radius |
| `--hdp-card-padding` | `16px` | Card inner spacing |
| `--hdp-text-primary` | `#1E293B` | Primary text |
| `--hdp-text-secondary` | `#64748B` | Secondary text |
| `--hdp-accent` | `#F59E0B` | Accent / highlight |
| `--hdp-font-family` | `Inter, -apple-system, ...` | Typeface stack |

---

## Development

```bash
git clone https://github.com/SecSunshine/hass-dashboard-pro.git
cd hass-dashboard-pro
npm install

npm run build        # Production build → hass-dashboard-pro.js
npm run dev          # Watch mode (rebuilds on change)
npm run lint         # TypeScript type-check
```

### Project Structure

```
hass-dashboard-pro/
├── src/
│   ├── index.ts                       # Strategy registration entry point
│   ├── types.ts                       # Interfaces, constants, theme presets
│   ├── styles/
│   │   └── design-tokens.ts           # Token definitions & CSS variable generation
│   ├── strategies/
│   │   ├── dashboard-strategy.ts      # Top-level: generates views list
│   │   └── view-strategy.ts           # Per-view: routes to template by path
│   ├── templates/
│   │   ├── home-view.ts               # Home page YAML template
│   │   ├── area-view.ts               # Area detail YAML template
│   │   └── settings-view.ts           # Visual settings panel template
│   └── utils/
│       ├── area-entities.ts           # Entity-to-area mapping
│       └── visual-config.ts           # Token resolution + localStorage persistence
├── hass-dashboard-pro.js              # Built output (HACS entry point)
├── rollup.config.js                   # Rollup build configuration
├── tsconfig.json                      # TypeScript configuration
├── package.json
├── .hacs.json                         # HACS manifest
└── LICENSE
```

**Build pipeline**: TypeScript → Rollup → single ES module → `hass-dashboard-pro.js`

---

## FAQ

<details>
<summary><strong>How is this different from Dwains Dashboard?</strong></summary><br>

- Renders through `html-pro-card` instead of custom Lit web components
- Follows a stricter visual language (Apple HIG / 10 px radius / Inter / SVG icons)
- Ships an interactive visual settings panel for real-time theme editing
- TypeScript + Rollup (no webpack), zero emoji, MIT licensed

</details>

<details>
<summary><strong>Do I need html-pro-card separately?</strong></summary><br>

Yes — `html-pro-card` is the rendering engine. Install it via HACS before enabling this dashboard.

</details>

<details>
<summary><strong>Can I mix auto-generated and manual cards?</strong></summary><br>

Yes — use `custom_cards` to inject any Lovelace card into specific areas alongside the auto-generated layout.

</details>

<details>
<summary><strong>How do I hide unwanted entities?</strong></summary><br>

Use `hidden_domains` to exclude entire categories (e.g. `automation`) or `hidden_areas` to exclude rooms entirely.

</details>

---

## Contributing

Bug reports and pull requests are welcome on [GitHub](https://github.com/SecSunshine/hass-dashboard-pro). Please:

1. Search [existing issues](https://github.com/SecSunshine/hass-dashboard-pro/issues) before opening a new one
2. Target the `main` branch with pull requests
3. Ensure `npm run lint` passes before submitting

---

## License

[MIT](LICENSE) &copy; 2026 SecSunshine

---

<p align="center">
  <sub>Built with TypeScript &middot; Powered by html-pro-card &middot; Designed for Home Assistant</sub>
</p>
