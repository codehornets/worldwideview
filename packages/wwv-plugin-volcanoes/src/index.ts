import { Mountain } from "lucide-react";
import { BaseFacilityPlugin } from "@worldwideview/wwv-lib-facilities";

export class VolcanoesPlugin extends BaseFacilityPlugin {
    id = "volcanoes";
    name = "Volcanoes";
    description = "Active and dormant volcanoes worldwide from OSM";
    icon = Mountain;
    category = "natural-disaster" as const;
    version = "1.0.1";
    
    protected defaultLayerColor = "#ef4444";
    protected maxEntities = 1000;
}
