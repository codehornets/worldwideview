# @worldwideview/wwv-plugin-wildfire

[WorldWideView](https://github.com/silveittakana/worldwideview) plugin for **active wildfire and hotspot detection** using [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) (VIIRS) satellite data.

## Features

- 🔥 Active fire detection points from VIIRS satellite instruments
- 🎨 Fire Radiative Power (FRP) based color coding (yellow → orange → red)
- 📏 FRP-based point sizing for visual intensity
- 🔭 Tiered Level-of-Detail rendering (visible at different zoom levels)
- 🔍 Filters: FRP range, confidence level, satellite source
- 🛰️ Supports Suomi NPP, NOAA-20, and NOAA-21 satellites

## Installation

```bash
npm install @worldwideview/wwv-plugin-wildfire
```

### Peer Dependencies

- `@worldwideview/wwv-plugin-sdk`
- `lucide-react` ≥ 0.576.0

## Usage

```ts
import { WildfirePlugin } from "@worldwideview/wwv-plugin-wildfire";

const plugin = new WildfirePlugin();
```

Register the plugin with the WorldWideView plugin engine to visualize active wildfires on the globe.

## Data Source

Fire data is fetched from [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) via the `/api/wildfire` endpoint. Data updates every 5 minutes.

## LOD Tiers

| Tier | Visibility Range | Description |
|---|---|---|
| 1 | 3,500 km+ | Major fires visible from global view |
| 2 | 1,000–3,500 km | Regional fires at continental zoom |
| 3 | 0–1,000 km | All detections at local zoom |

## License

ISC
