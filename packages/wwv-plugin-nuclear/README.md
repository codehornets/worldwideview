# @worldwideview/wwv-plugin-nuclear

WorldWideView plugin that displays **global nuclear power plants, reactors, and decommissioned facilities** on the 3D globe.

## Data Source

- **Source:** OpenStreetMap via [Overpass Turbo](https://overpass-turbo.eu/)
- **Tag:** `generator:source=nuclear`
- **Format:** Static GeoJSON (~758 facilities worldwide)
- **License:** [ODbL](https://opendatacommons.org/licenses/odbl/) (OpenStreetMap)

## Features

- Nuclear power plants, research reactors, and decommissioned sites
- Status classification: operational, decommissioned, abandoned, under construction
- Operator and output metadata where available
- Point clustering at global zoom levels

## Installation

Install via the [WorldWideView Marketplace](https://github.com/silvertakana/worldwideview-marketplace) or manually:

```bash
npm install @worldwideview/wwv-plugin-nuclear
```

## Peer Dependencies

- `@worldwideview/wwv-plugin-sdk`

## Changelog

- **v1.0.0** — Initial release with global nuclear facility data from OSM.

## License

ISC
