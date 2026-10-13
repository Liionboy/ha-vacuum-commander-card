# Vacuum Commander Card

A responsive Home Assistant Lovelace card for controlling a vacuum, starting room or spot cleaning, and viewing its state and battery.

## Features

- Start, pause, stop, and return the vacuum to its dock
- Discover Dreame room names and segment IDs from the active map
- Use Dreame's native segment-cleaning action with map-qualified segment IDs
- Optional manual room configuration for other integrations
- Battery display from the vacuum entity or a companion battery sensor
- Spot cleaning and fan-speed display
- Home Assistant theme colors and compact layouts that adapt to the card's width, including `horizontal-stack`
- Press and hold the card background to open Home Assistant More Info
- Four configurable color palettes: `aurora`, `ocean`, `sunset`, and `lavender`
- HACS compatible

## Installation with HACS

1. In HACS, open **Frontend** → **Custom repositories**.
2. Add `Liionboy/ha-vacuum-commander-card` with category **Lovelace**.
3. Install **Vacuum Commander** and reload the browser/dashboard resources.
4. Add the card to a dashboard:

```yaml
type: custom:ha-vacuum-commander-card
title: Vacuum
entity: vacuum.my_vacuum
palette: aurora
```

For a Dreame vacuum, omit `rooms` to discover rooms from the active map. Optionally set `map_entity` or `battery_entity` when the automatically derived entity IDs do not match your setup.

## Configuration

| Option | Required | Description |
| --- | --- | --- |
| `entity` | Yes | Vacuum entity ID |
| `title` | No | Card title; defaults to the vacuum's friendly name |
| `rooms` | No | Explicit room list. When omitted, Dreame rooms are discovered from its active map. |
| `map_entity` | No | Map camera entity; defaults to `camera.<vacuum object id>_map` |
| `battery_entity` | No | Battery sensor; defaults to `sensor.<vacuum object id>_battery_level` |
| `palette` | No | Accent palette: `aurora` (default), `ocean`, `sunset`, or `lavender` |

Example with an explicit room list:

```yaml
type: custom:ha-vacuum-commander-card
title: Vacuum
entity: vacuum.my_vacuum
rooms:
  - id: 1
    name: Living room
    icon: mdi:sofa
  - id: 2
    name: Kitchen
    icon: mdi:silverware
```

Room `id` or `segments` values must be the numeric segment IDs from the vacuum map. For Dreame, the card adds the active map index required by the integration's native `vacuum_clean_segment` action. A generic label such as `Room 4` means that segment still needs to be identified and renamed in the vacuum app.

For non-Dreame integrations, explicit rooms use the legacy `vacuum.send_command` segment-cleaning path; support depends on the integration.

## Manual installation

Download `ha-vacuum-commander-card.js` from the [latest release](https://github.com/Liionboy/ha-vacuum-commander-card/releases/latest), place it in `/config/www/`, and add `/local/ha-vacuum-commander-card.js` as a JavaScript Module resource.

## License

MIT
