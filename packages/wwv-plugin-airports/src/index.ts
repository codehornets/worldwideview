import { PlaneTakeoff } from "lucide-react";
import { BaseFacilityPlugin } from "@worldwideview/wwv-lib-facilities";

export class AirportsPlugin extends BaseFacilityPlugin {
    id = "airports";
    name = "Airports";
    description = "Airports and aerodromes worldwide from OSM";
    icon = PlaneTakeoff;
    category = "aviation" as const;
    version = "1.0.1";
    
    protected defaultLayerColor = "#3b82f6";
}
