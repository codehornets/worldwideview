# @worldwideview/wwv-plugin-maritime

[WorldWideView](https://github.com/silveittakana/worldwideview) plugin for **real-time vessel tracking** via AIS (Automatic Identification System) feeds.

## Features

- 🚢 Live vessel positions with heading and speed indicators
- 🎨 Color-coded by vessel type (cargo, tanker, passenger, fishing, military, sailing, tug)
- 🔍 Filters: vessel type, speed range
- 📍 Clustered point rendering with vessel name labels
- 🔄 Demo mode with realistic sample vessels when API is unavailable

## Installation

```bash
npm install @worldwideview/wwv-plugin-maritime
```

### Peer Dependencies

- `@worldwideview/wwv-plugin-sdk`
- `lucide-react` ≥ 0.576.0

## Usage

```ts
import { MaritimePlugin } from "@worldwideview/wwv-plugin-maritime";

const plugin = new MaritimePlugin();
```

Register the plugin with the WorldWideView plugin engine to start tracking vessels on the globe.

## Data Source

Vessel data is fetched from the `/api/maritime` endpoint. Falls back to demo data with 15 sample vessels when the API is unavailable.

## Vessel Colors

| Type | Color |
|---|---|
| Cargo | 🟡 `#f59e0b` |
| Tanker | 🔴 `#ef4444` |
| Passenger | 🔵 `#3b82f6` |
| Fishing | 🔵 `#22d3ee` |
| Military | 🟣 `#a78bfa` |
| Sailing | 🟢 `#4ade80` |
| Tug | 🟠 `#f97316` |

## License

ISC
