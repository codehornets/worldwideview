# @worldwideview/wwv-plugin-camera

[WorldWideView](https://github.com/silveittakana/worldwideview) plugin for displaying **public live cameras and traffic cameras** on the 3D globe.

## Features

- 📷 Multiple data sources: default camera database, traffic cameras, custom URL, file upload
- 🌍 GeoJSON support for custom camera datasets
- 🎥 Live camera detail view with stream embedding
- ⚙️ Built-in settings component for source selection
- 🔍 Filters: country, city, popular cameras
- 📍 Clustered point rendering with labels

## Installation

```bash
npm install @worldwideview/wwv-plugin-camera
```

### Peer Dependencies

- `@worldwideview/wwv-plugin-sdk`
- `react` ≥ 18
- `lucide-react` ≥ 0.576.0

## Usage

```ts
import { CameraPlugin } from "@worldwideview/wwv-plugin-camera";

const plugin = new CameraPlugin();
```

Register the plugin with the WorldWideView plugin engine. The plugin includes a settings component for switching between camera data sources and a detail component for viewing individual camera streams.

## Data Sources

| Source | Description |
|---|---|
| `default` | Built-in public camera GeoJSON database |
| `traffic` | Traffic cameras via `/api/camera/traffic` endpoint |
| `url` | Custom JSON URL providing camera data |
| `file` | User-uploaded JSON file with camera data |

## License

ISC
