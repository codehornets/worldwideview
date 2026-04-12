import { 
    createSvgIconUrl,
    type WorldPlugin, 
    type GeoEntity, 
    type TimeRange, 
    type PluginContext, 
    type LayerConfig, 
    type CesiumEntityOptions, 
    type ServerPluginConfig,
    type PluginCategory
} from "@worldwideview/wwv-plugin-sdk";

export abstract class BaseFacilityPlugin implements WorldPlugin {
    abstract id: string;
    abstract name: string;
    abstract description: string;
    abstract icon: any;
    abstract category: PluginCategory;
    abstract version: string;
    
    protected context: PluginContext | null = null;
    protected iconUrls: Record<string, string> = {};
    
    // Configurable rendering defaults
    protected defaultLayerColor = "#3b82f6";
    protected clusterDistance = 50;
    protected maxEntities = 5000;
    protected iconScale = 1.0;
    
    async initialize(ctx: PluginContext): Promise<void> { this.context = ctx; }
    destroy(): void { this.context = null; }

    // Generally facilities are static plugins (data loaded via mapJsonToEntities locally),
    // but we stub this out just in case
    async fetch(_timeRange: TimeRange): Promise<GeoEntity[]> { return []; }
    getPollingInterval(): number { return 0; }

    getLayerConfig(): LayerConfig {
        return { 
            color: this.defaultLayerColor, 
            clusterEnabled: true, 
            clusterDistance: this.clusterDistance,
            maxEntities: this.maxEntities
        };
    }

    protected getEntityColor(entity: GeoEntity): string {
        return this.defaultLayerColor;
    }

    protected getEntityIcon(entity: GeoEntity): any {
        return this.icon;
    }

    renderEntity(entity: GeoEntity): CesiumEntityOptions {
        const color = this.getEntityColor(entity);
        const iconComponent = this.getEntityIcon(entity);
        
        const cacheKey = `${iconComponent?.displayName || iconComponent?.name || "default"}-${color}`;
        
        if (!this.iconUrls[cacheKey]) {
            this.iconUrls[cacheKey] = createSvgIconUrl(iconComponent, { color });
        }

        return {
            type: "billboard", 
            iconUrl: this.iconUrls[cacheKey], 
            color: color,
            iconScale: this.iconScale
        };
    }

}
