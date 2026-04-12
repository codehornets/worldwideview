import { Anchor } from "lucide-react";
import { BaseFacilityPlugin } from "@worldwideview/wwv-lib-facilities";

export class SeaportsPlugin extends BaseFacilityPlugin {
    id = "seaports";
    name = "Seaports";
    description = "Harbours and seaports worldwide from OSM";
    icon = Anchor;
    category = "maritime" as const;
    version = "1.0.1";
    
    protected defaultLayerColor = "#0ea5e9";
}
