import { Atom, Radiation } from "lucide-react";
import {
    type GeoEntity,
    type TimeRange,
    type FilterDefinition
} from "@worldwideview/wwv-plugin-sdk";
import { BaseFacilityPlugin } from "@worldwideview/wwv-lib-facilities";

const STATUS_COLORS: Record<string, string> = {
    "operational": "#22c55e", // Green
    "under construction": "#eab308", // Yellow
    "decommissioned": "#64748b", // Slate
    "abandoned": "#ef4444", // Red
};

export class NuclearPlugin extends BaseFacilityPlugin {
    id = "nuclear";
    name = "Nuclear Facilities";
    description = "Global nuclear power plants and reactors from OSM.";
    icon = Atom;
    category = "infrastructure" as const;
    version = "1.0.2";
    
    protected defaultLayerColor = "#22d3ee";
    protected maxEntities = 1000;

    protected getEntityColor(entity: GeoEntity): string {
        const status = (entity.properties?.status as string)?.toLowerCase() || "unknown";
        return STATUS_COLORS[status] || this.defaultLayerColor;
    }

    protected getEntityIcon(entity: GeoEntity): any {
        const status = (entity.properties?.status as string)?.toLowerCase() || "unknown";
        if (STATUS_COLORS[status]) {
            return Radiation; // use radiation symbol for known status colors
        }
        return Atom;
    }

    getFilterDefinitions(): FilterDefinition[] {
        return [
            {
                id: "status",
                label: "Facility Status",
                propertyKey: "status",
                type: "select",
                options: [
                    { value: "operational", label: "Operational" },
                    { value: "under construction", label: "Under Construction" },
                    { value: "decommissioned", label: "Decommissioned" },
                    { value: "abandoned", label: "Abandoned" }
                ]
            }
        ];
    }

    getLegend() {
        return [
            { label: "Operational", color: STATUS_COLORS["operational"], filterId: "status", filterValue: "operational" },
            { label: "Under Const.", color: STATUS_COLORS["under construction"], filterId: "status", filterValue: "under construction" },
            { label: "Decommissioned", color: STATUS_COLORS["decommissioned"], filterId: "status", filterValue: "decommissioned" },
            { label: "Abandoned", color: STATUS_COLORS["abandoned"], filterId: "status", filterValue: "abandoned" }
        ];
    }
}
