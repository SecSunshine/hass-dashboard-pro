<p align="center">
  <a href="https://github.com/hacs/integration"><img src="https://img.shields.io/badge/HACS-Dashboard-%231E40AF?style=flat-square&logo=hacs" alt="HACS Dashboard"></a>
  <a href="https://github.com/SecSunshine/hass-dashboard-pro/releases"><img src="https://img.shields.io/github/v/release/SecSunshine/hass-dashboard-pro?style=flat-square&color=%231E40AF" alt="Release"></a>
  <a href="https://github.com/SecSunshine/hass-dashboard-pro/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-%231E40AF?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/HA-%E2%89%A52024.8-%231E40AF?style=flat-square" alt="Home Assistant >= 2024.8">
</p>

<h1 align="center">Hass Dashboard Pro</h1>

<p align="center">
  <strong>Zero-config dashboard strategy for Home Assistant Lovelace.</strong><br>
  Automatically generates a clean, responsive smart home interface from your areas, devices, and entities — <em>no card-by-card YAML required</em>.
</p>

<p align="center">
  <sub>Powered by <a href="https://github.com/ha-china/html-pro-card">html-pro-card</a> &middot; Apple HIG &amp; Dieter Rams minimalism &middot; Built-in visual theme editor</sub>
</p>

---

## Features

- **One-click dashboard** — Appears in HA's "Add Dashboard" dialog (HA 2026.5+), or configure via raw YAML on older versions
- **Auto-generated views** — Home dashboard with greeting, status grid, and quick actions; per-area detail pages with domain-categorized control cards
- **Visual theme editor** — Interactive panel for real-time customization of colors, spacing, typography, and shadows; persisted in `localStorage`
- **Design-token system** — Centralized CSS variables (`--hdp-*`) for consistent theming across all views
- **SVG icons only** — No emoji, sharp and consistent at any size
- **HACS-ready** — Add as a custom repository and install in seconds

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| [Home Assistant](https://www.home-assistant.io/) >= 2024.8 | Required for custom strategy support |
| [html-pro-card](https://github.com/ha-china/html-pro-card) (latest) | Rendering engine — install this via HACS first |

---

## Installation

### Via HACS (recommended)

<a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=SecSunshine&amp;repository=hass-dashboard-pro&amp;category=dashboard"><img src="https://my.home-assistant.io/badges/hacs_repository.svg" alt="Open your Home Assistant instance and open a repository inside the Home Assistant Community Store." width="300"></a>

Or manually:

1. In Home Assistant, go to **HACS** → **Frontend**
2. Click the menu icon **⋮** in the top-right corner → **Custom repositories**
3. Enter the repository URL:
   ```
   https://github.com/SecSunshine/hass-dashboard-pro
   ```
4. Set the category to **Dashboard**, then click **Add**
5. Search for **Hass Dashboard Pro** and click **Download**
6. Restart Home Assistant (or hard-refresh your browser)

---

## Usage

### Method 1: Add Dashboard dialog (HA 2026.5+)

After installation, the strategy appears in HA's "Add Dashboard" dialog:

1. Go to **Settings → Dashboards → Add Dashboard**
2. You will see **Hass Dashboard Pro** listed as an option
3. Select it, give your dashboard a name, and click **Create**
4. Your entities are automatically organized by area — done!

### Method 2: Raw YAML configuration (all HA versions)

1. Go to **Settings → Dashboards → Add Dashboard**
2. Give it a name (e.g. "My Home") and click **Create**
3. Open the new dashboard, click **⋮ → Edit Dashboard → Raw configuration editor**, and replace the content with:

```yaml
strategy:
  type: hass-dashboard-pro
  title: My Home
```

4. Click **Save** — your entities are organized by area automatically.

> **Important:** The strategy type is `hass-dashboard-pro` (no `custom:` prefix). HA's strategy system uses bare type names, not the `custom:` prefix used by Lovelace cards.

---

## Configuration

All options live inside the top-level `strategy` key:

```yaml
strategy:
  type: hass-dashboard-pro

  # General
  title: My Home
  hidden_areas:              # Area IDs to exclude
    - utility_room
  hidden_domains:            # Entity domains to hide everywhere
    - automation
    - script
  favorite_entities:         # Pinned to the home view quick-actions bar
    - light.living_room_main
    - climate.bedroom_ac

  # Per-area custom cards (appended after auto-generated cards)
  custom_cards:
    living_room:
      - type: custom:html-pro-card
        content: |
          <h2>Extra Controls</h2>

  # Visual overrides — all optional, takes precedence over theme preset
  visual:
    theme: light             # light | dark | warm | forest
    colors:
      primary: "#1E40AF"
      page_bg: "#F8FAFC"
      card_bg: "#FFFFFF"
      text_primary: "#1E293B"
      text_secondary: "#64748B"
    border_radius: 12        # px
    card_padding: 20         # px
    font_family: "Inter, -apple-system, sans-serif"
    shadows: true
    animations: true
```

### Option Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `title` | `string` | `"Home"` | Title shown on the home view |
| `hidden_areas` | `string[]` | `[]` | Area IDs to exclude from the dashboard |
| `hidden_domains` | `string[]` | `[]` | Entity domains to hide across all views |
| `favorite_entities` | `string[]` | `[]` | Entity IDs pinned to the home view |
| `custom_cards` | `object` | `{}` | Map of `{ area_id: Lovelace card[] }` appended to area views |
| `visual.theme` | `string` | `"light"` | Theme preset: `light` \| `dark` \| `warm` \| `forest` |
| `visual.colors.*` | `string` | — | Override any of `primary` / `page_bg` / `card_bg` / `text_primary` / `text_secondary` |
| `visual.border_radius` | `number` | `10` | Card corner radius in pixels |
| `visual.card_padding` | `number` | `16` | Card inner padding in pixels |
| `visual.font_family` | `string` | Inter stack | CSS `font-family` value |
| `visual.shadows` | `boolean` | `true` | Show card drop shadows |
| `visual.animations` | `boolean` | `true` | Enable CSS transitions |

---

## Visual Customization

Open the **Visual Settings** page from the dashboard sidebar to adjust the appearance interactively. Changes preview instantly and are persisted across browser sessions via `localStorage`.

### Priority Order

```
Panel (localStorage)  >  YAML visual.*  >  YAML visual.theme preset  >  Built-in defaults
```

### Built-in Theme Presets

| Preset | Primary | Background | Card | Style |
|--------|:-------:|:----------:|:----:|-------|
| `light` | `#1E40AF` | `#F8FAFC` | `#FFFFFF` | Clean & professional |
| `dark` | `#3B82F6` | `#0F172A` | `#1E293B` | Low-light comfort |
| `warm` | `#D97706` | `#FFFBEB` | `#FFFFFF` | Cozy & inviting |
| `forest` | `#065F46` | `#ECFDF5` | `#FFFFFF` | Calm & natural |

---

## Design Tokens

Visual overrides are applied as CSS custom properties on a `<style>` element injected into each view:

| Variable | Default | Description |
|----------|---------|-------------|
| `--hdp-primary` | `#1E40AF` | Primary accent color |
| `--hdp-bg` | `#F8FAFC` | Page background |
| `--hdp-card-bg` | `#FFFFFF` | Card surface |
| `--hdp-shadow-card` | `0 2px 8px rgba(0,0,0,0.06)` | Card drop shadow |
| `--hdp-radius` | `10px` | Card corner radius |
| `--hdp-card-padding` | `16px` | Card inner spacing |
| `--hdp-text` | `#1E293B` | Primary text color |
| `--hdp-text-secondary` | `#64748B` | Secondary / muted text |
| `--hdp-font` | `Inter, -apple-system, ...` | Typeface stack |

---

## How It Works

```
                    ┌─────────────────────────────────┐
                    │     Home Assistant Lovelace     │
                    └──────────────┬──────────────────┘
                                   │ strategy.type: hass-dashboard-pro
                                   ▼
          ┌────────────────────────────────────────────────┐
          │  ll-strategy-dashboard-hass-dashboard-pro      │
          │  (customElements.define — this plugin)         │
          │                                                │
          │  generate() → scans HA areas, devices,        │
          │  entities → produces Lovelace view list       │
          └──────────────┬─────────────────────────────────┘
                         │ each view has strategy.type: hass-dashboard-pro-view
                         ▼
          ┌────────────────────────────────────────────────┐
          │  ll-strategy-view-hass-dashboard-pro-view      │
          │                                                │
          │  generate() → routes to template by path:     │
          │    /home        → home-view.ts                 │
          │    /<area-name> → area-view.ts                 │
          │    /hdp-settings → settings-view.ts            │
          └──────────────┬─────────────────────────────────┘
                         │ each template returns LovelaceCardConfig[]
                         ▼
          ┌────────────────────────────────────────────────┐
          │  html-pro-card (rendering engine)              │
          │                                                │
          │  Renders HTML templates with CSS variables     │
          │  injected from the design-token system         │
          └────────────────────────────────────────────────┘
```

---

## Development

```bash
git clone https://github.com/SecSunshine/hass-dashboard-pro.git
cd hass-dashboard-pro
npm install

npm run build   # Production build → dist/hass-dashboard-pro.js
npm run dev     # Watch mode (rebuilds on file change)
npm run lint    # TypeScript type-check (no emit)
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
│   │   ├── dashboard-strategy.ts      # Top-level: generates the views list
│   │   └── view-strategy.ts           # Per-view: routes to template by path
│   ├── templates/
│   │   ├── home-view.ts               # Home page Lovelace YAML template
│   │   ├── area-view.ts               # Area detail Lovelace YAML template
│   │   └── settings-view.ts           # Visual settings panel template
│   └── utils/
│       ├── area-entities.ts           # Entity-to-area mapping helpers
│       └── visual-config.ts           # Token resolution + localStorage persistence
├── dist/
│   └── hass-dashboard-pro.js          # Compiled output (HACS download target)
├── hacs.json                          # HACS manifest
├── rollup.config.js
├── tsconfig.json
├── package.json
└── LICENSE
```

---

## FAQ

<details>
<summary><strong>How do I update to a new version?</strong></summary><br>

If installed via HACS: go to **HACS → Frontend**, find Hass Dashboard Pro, and click **Update**. Hard-refresh your browser after updating.

</details>

<details>
<summary><strong>Do I need html-pro-card installed separately?</strong></summary><br>

Yes. `html-pro-card` is the rendering engine that processes the HTML templates inside each card. Install it from HACS before activating this dashboard.

</details>

<details>
<summary><strong>Can I mix auto-generated and manual cards?</strong></summary><br>

Yes — use the `custom_cards` option to inject any Lovelace card definition into specific area views. Auto-generated cards appear first; custom cards are appended below.

</details>

<details>
<summary><strong>How do I hide automations or scripts from the dashboard?</strong></summary><br>

Add the domain name to `hidden_domains`:

```yaml
strategy:
  type: hass-dashboard-pro
  hidden_domains:
    - automation
    - script
    - update
```

</details>

<details>
<summary><strong>My entities are not organized into areas — what should I do?</strong></summary><br>

Hass Dashboard Pro groups entities by their assigned HA area. Go to **Settings → Areas & Zones**, create your areas, and assign each device or entity to one. The dashboard will reflect the structure automatically.

</details>

<details>
<summary><strong>"Unknown strategy" or "Timeout waiting for strategy element" error</strong></summary><br>

This means the JS file is not loaded or the strategy element is not registered. Check:

1. The resource URL is correct: `/hacsfiles/hass-dashboard-pro/hass-dashboard-pro.js` (HACS auto-registers this)
2. Hard-refresh your browser (Ctrl+Shift+R) after installation
3. Check browser console for errors — you should see `✓ ll-strategy-dashboard-hass-dashboard-pro` on successful load

</details>

---

## Contributing

Bug reports and pull requests are welcome. Please:

1. Search [existing issues](https://github.com/SecSunshine/hass-dashboard-pro/issues) before opening a new one
2. Target the `main` branch for pull requests
3. Run `npm run lint` and ensure it passes before submitting

---

## License

[MIT](LICENSE) &copy; 2026 SecSunshine
