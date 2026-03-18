# @worldwideview/wwv-plugin-aviation

[WorldWideView](https://github.com/silvertakana/worldwideview) plugin for **real-time commercial aircraft tracking** via the [OpenSky Network](https://opensky-network.org/) API.

## Features

- 🛩️ Live aircraft positions updated every 15 seconds
- 🎨 Altitude-based color coding (green → cyan → blue → purple → pink)
- ✈️ 3D airplane model rendering with heading-oriented rotation
- 🔍 Filters: country of origin, altitude range, on-ground status, callsign
- 📡 Flight trail rendering on entity selection
- ⏪ History playback mode support

## Installation

```bash
npm install @worldwideview/wwv-plugin-aviation
```

### Peer Dependencies

- `@worldwideview/wwv-plugin-sdk`
- `lucide-react` ≥ 0.576.0

## Usage

```ts
import { AviationPlugin } from "@worldwideview/wwv-plugin-aviation";

const plugin = new AviationPlugin();
```

Register the plugin with the WorldWideView plugin engine to start tracking aircraft on the globe.

## Data Source

Live data is fetched from the [OpenSky Network REST API](https://openskynetwork.github.io/opensky-api/). Requires server-side API route at `/api/aviation`.

## Changelog

- **v1.0.3** — Added README with feature list and usage docs.
- **v1.0.2** — Package metadata updates.
- **v1.0.1** — Package configuration fixes.
- **v1.0.0** — Initial release with live tracking, altitude coloring, and 3D model rendering.

## License

ISC
