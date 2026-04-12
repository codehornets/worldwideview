import { Lamp, Lightbulb } from "lucide-react";
import { BaseFacilityPlugin } from "@worldwideview/wwv-lib-facilities";
import type { GeoEntity } from "@worldwideview/wwv-plugin-sdk";

export class LighthousesPlugin extends BaseFacilityPlugin {
    id = "lighthouses";
    name = "Lighthouses";
    description = "Lighthouses worldwide from OSM";
    icon = Lamp;
    category = "maritime" as const;
    version = "1.0.1";
    
    protected defaultLayerColor = "#facc15";

    protected getEntityIcon(entity: GeoEntity): any {
        return Lightbulb;
    }
}
