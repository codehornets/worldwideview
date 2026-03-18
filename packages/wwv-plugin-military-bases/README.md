# @worldwideview/wwv-plugin-military-bases

[WorldWideView](https://github.com/silvertakana/worldwideview) plugin that displays **worldwide military bases, airfields, and barracks** on the 3D globe.

## Features

- 🏛️ Military installations sourced from OpenStreetMap
- 📍 Point markers with clustering for dense regions
- ⚡ Static GeoJSON layer — no external API calls at runtime

## Installation

Install via the WorldWideView Marketplace, or manually:

```bash
npm install @worldwideview/wwv-plugin-military-bases
```

### Peer Dependencies

- `@worldwideview/wwv-plugin-sdk`

## How It Works

This is a **static format** plugin. The GeoJSON data file is served by the host application at `/data/military_bases.geojson`. The plugin manifest tells WorldWideView's `StaticDataPlugin` loader how to render the data (point markers, clustering, colour).

## Changelog

- **v1.0.0** — Initial release with OSM military installation data.

## License

ISC
