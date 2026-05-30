# 🤖 Vacuum Room Commander Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![GitHub release](https://img.shields.io/github/v/release/Liionboy/ha-vacuum-commander-card)](https://github.com/Liionboy/ha-vacuum-commander-card/releases)
[![License](https://img.shields.io/github/license/Liionboy/ha-vacuum-commander-card)](LICENSE)

**Comandă vacuum-ul pe camere.** Start/stop/pauză, curățare pe cameră, baterie, status — totul într-un card frumos.

## ✨ Features

- Start/Stop/Pauză/Return to base
- Curățare pe cameră (Living, Bucătărie, Dormitor, Baie, Birou, Hol)
- Baterie cu indicator low
- Fan speed display
- Curățare rapidă
- Visual config editor
- HACS ready

## 📦 Installation

### Option 1: HACS (recommended)

1. Open **HACS** → **Frontend** → ⋮ → **Custom Repositories**
2. Add repository: `Liionboy/ha-vacuum-commander-card`
3. Category: **Lovelace** → Click **Add**
4. Find **Vacuum Room Commander Card** in HACS → Click **Install**
5. Go to **Settings** → **Dashboards** → **Resources** → **Add**:
   ```
   /hacsfiles/ha-vacuum-commander-card/ha-vacuum-commander-card.js
   type: JavaScript Module
   ```
6. **Restart Home Assistant** (or clear browser cache with Ctrl+Shift+R)
7. Edit your dashboard → Add card → Search for `ha-vacuum-commander-card`

### Option 2: Manual Install

1. Download `ha-vacuum-commander-card.js` from [Releases](https://github.com/Liionboy/ha-vacuum-commander-card/releases/latest)
2. Copy the file to your Home Assistant `/config/www/` directory
3. Go to **Settings** → **Dashboards** → **Resources** → **Add**:
   ```
   /local/ha-vacuum-commander-card.js
   type: JavaScript Module
   ```
4. **Restart Home Assistant** (or clear browser cache)
5. Edit your dashboard → Add card → Search for `ha-vacuum-commander-card`

### Option 3: Manual via YAML

Add to your `configuration.yaml`:
```yaml
lovelace:
  resources:
    - url: /local/ha-vacuum-commander-card.js
      type: module
```

## ⚙️ Configuration

### Minimal

```yaml
type: custom:ha-vacuum-commander-card
```

### Full Configuration

```yaml
type: custom:ha-vacuum-commander-card
title: 🤖 Noci
entity: vacuum.noci
show_map: true
show_history: true
rooms:
  - id: living
    name: Living
    icon: mdi:sofa
  - id: bucatarie
    name: Bucătărie
    icon: mdi:silverware
  - id: dormitor
    name: Dormitor
    icon: mdi:bed
  - id: baie
    name: Baie
    icon: mdi:shower
  - id: birou
    name: Birou
    icon: mdi:desk
  - id: hol
    name: Hol
    icon: mdi:door
```

## 📄 License

MIT
