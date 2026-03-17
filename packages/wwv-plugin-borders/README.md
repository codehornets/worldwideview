# @worldwideview/wwv-plugin-borders

[WorldWideView](https://github.com/silveittakana/worldwideview) plugin that displays **political borders and country labels** as a globe overlay.

## Features

- 🗺️ Country border outlines rendered on the 3D globe
- 🏷️ Country name labels
- ⚡ Zero-polling — static layer with no data fetching overhead

## Installation

```bash
npm install @worldwideview/wwv-plugin-borders
```

### Peer Dependencies

- `@worldwideview/wwv-plugin-sdk`

## Usage

```ts
import { BordersPlugin } from "@worldwideview/wwv-plugin-borders";

const plugin = new BordersPlugin();
```

Register the plugin with the WorldWideView plugin engine to display borders on the globe. Border rendering is managed by the host application's `BordersManager`.

## License

ISC
