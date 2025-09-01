import axios from 'axios';
import backendService from './BackendService';
import googleCloudAPIService from './GoogleCloudAPIService';

class HeatmapService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
    this.tileSize = 256; // Standard tile size
    this.backendService = backendService;
    this.googleCloudAPI = googleCloudAPIService;
  }

  // Initialize with API key
  initialize(apiKey) {
    this.googleCloudAPI.setAPIKey(apiKey);
  }

  // Generate cache key for tiles
  generateCacheKey(type, zoom, x, y, heatmapType) {
    return `${type}_${heatmapType}_${zoom}_${x}_${y}`;
  }

  // Check if cached data is still valid
  isCacheValid(timestamp) {
    return Date.now() - timestamp < this.cacheTimeout;
  }

  // Get cached tile data
  getCachedTile(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    return null;
  }

  // Cache tile data
  cacheTile(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  // Convert lat/lng to tile coordinates
  latLngToTile(lat, lng, zoom) {
    const n = Math.pow(2, zoom);
    const xtile = Math.floor((lng + 180) / 360 * n);
    const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
    return { x: xtile, y: ytile };
  }

  // Convert tile coordinates to lat/lng bounds
  tileToLatLngBounds(x, y, zoom) {
    const n = Math.pow(2, zoom);
    const west = x / n * 360 - 180;
    const east = (x + 1) / n * 360 - 180;
    const north = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
    const south = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;
    return { north, south, east, west };
  }

  // Get Air Quality heatmap tile
  async getAirQualityHeatmapTile(zoom, x, y, heatmapType = 'US_AQI') {
    const cacheKey = this.generateCacheKey('airquality', zoom, x, y, heatmapType);
    const cached = this.getCachedTile(cacheKey);
    if (cached) {
      console.log(`Using cached Air Quality tile: ${cacheKey}`);
      return cached;
    }

    try {
      console.log(`🔍 Backend: Requesting Air Quality tile: zoom=${zoom}, x=${x}, y=${y}, type=${heatmapType}`);
      
      const result = await this.backendService.getHeatmapTile('airquality', heatmapType, zoom, x, y);
      
      if (result.success) {
        const tileObj = {
          data: new Uint8Array(result.data),
          contentType: result.contentType || 'image/png'
        };
        this.cacheTile(cacheKey, tileObj);
        console.log(`✅ Backend: Successfully fetched Air Quality tile: ${cacheKey}`);
        return tileObj;
      } else {
        console.error('❌ Backend: Failed to fetch Air Quality tile:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Error fetching Air Quality heatmap tile:', error);
      throw error;
    }
  }

  // Get Pollen heatmap tile
  async getPollenHeatmapTile(zoom, x, y, heatmapType = 'TREE_UPI') {
    const cacheKey = this.generateCacheKey('pollen', zoom, x, y, heatmapType);
    const cached = this.getCachedTile(cacheKey);
    if (cached) {
      console.log(`Using cached Pollen tile: ${cacheKey}`);
      return cached;
    }

    try {
      console.log(`🔍 Backend: Requesting Pollen tile: zoom=${zoom}, x=${x}, y=${y}, type=${heatmapType}`);
      
      const result = await this.backendService.getHeatmapTile('pollen', heatmapType, zoom, x, y);
      
      if (result.success) {
        const tileObj = {
          data: new Uint8Array(result.data),
          contentType: result.contentType || 'image/png'
        };
        this.cacheTile(cacheKey, tileObj);
        console.log(`✅ Backend: Successfully fetched Pollen tile: ${cacheKey}`);
        return tileObj;
      } else {
        console.error('❌ Backend: Failed to fetch Pollen tile:', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Error fetching Pollen heatmap tile:', error);
      throw error;
    }
  }

  // Get multiple tiles for a region with optimized concurrency
  async getTilesForRegion(type, heatmapType, bounds, zoom) {
    const { north, south, east, west } = bounds;

    const startTile = this.latLngToTile(north, west, zoom);
    const endTile = this.latLngToTile(south, east, zoom);

    // Optimize tile count based on zoom level
    const maxTiles = zoom > 10 ? 16 : zoom > 8 ? 12 : 8; // More tiles for higher zoom
    const tilePromises = [];
    
    for (let x = startTile.x; x <= endTile.x; x++) {
      for (let y = startTile.y; y <= endTile.y; y++) {
        if (tilePromises.length >= maxTiles) break;
        
        const promise = (async () => {
          try {
            const tile = type === 'airquality' 
              ? await this.getAirQualityHeatmapTile(zoom, x, y, heatmapType)
              : await this.getPollenHeatmapTile(zoom, x, y, heatmapType);
            return { x, y, tile };
          } catch (error) {
            console.warn(`Failed to fetch tile ${x},${y}:`, error);
            return null;
          }
        })();
        tilePromises.push(promise);
      }
      if (tilePromises.length >= maxTiles) break;
    }

    // Process all tiles concurrently for faster response
    const batchSize = 6; // Increased batch size
    const results = [];
    
    for (let i = 0; i < tilePromises.length; i += batchSize) {
      const batch = tilePromises.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults.filter(result => result !== null));
      
      // Reduced delay between batches for faster response
      if (i + batchSize < tilePromises.length) {
        await new Promise(resolve => setTimeout(resolve, 50)); // Reduced from 100ms to 50ms
      }
    }

    return results;
  }

  // Get tiles for current viewport
  async getTilesForViewport(type, heatmapType, viewport, zoom) {
    // Handle different viewport formats
    let bounds;
    
    if (viewport.bounds) {
      // Format from map bounds_changed event
      bounds = viewport.bounds;
    } else if (viewport.latitude && viewport.longitude) {
      // Format from location object
      const lat = viewport.latitude;
      const lng = viewport.longitude;
      const delta = 0.1; // Default viewport size
      
      bounds = {
        north: lat + delta,
        south: lat - delta,
        east: lng + delta,
        west: lng - delta
      };
    } else {
      console.error('Invalid viewport format:', viewport);
      return [];
    }

    console.log(`Getting tiles for ${type} ${heatmapType} at zoom ${zoom} with bounds:`, bounds);
    return await this.getTilesForRegion(type, heatmapType, bounds, zoom);
  }

  // Get available heatmap types
  async getAvailableHeatmapTypes() {
    try {
      console.log('🔄 HeatmapService: Starting to fetch heatmap types...');
      
      const [airQualityTypes, pollenTypes] = await Promise.all([
        this.googleCloudAPI.getAirQualityHeatmapTypes(),
        this.googleCloudAPI.getPollenHeatmapTypes()
      ]);

      console.log('📊 HeatmapService: Received types:', { airQualityTypes, pollenTypes });

      const result = {
        airQuality: airQualityTypes.mapTypes || [],
        pollen: pollenTypes.mapTypes || []
      };

      console.log('✅ HeatmapService: Final result:', result);
      return result;
    } catch (error) {
      console.error('❌ HeatmapService: Error fetching heatmap types:', error);
      return {
        airQuality: [],
        pollen: []
      };
    }
  }

  // Generate heatmap overlay data for a region
  async generateHeatmapOverlay(type, heatmapType, bounds, zoom) {
    const tiles = await this.getTilesForRegion(type, heatmapType, bounds, zoom);
    
    return tiles.map(({ x, y, tile }) => ({
      x,
      y,
      zoom,
      type,
      heatmapType,
      bounds: this.tileToLatLngBounds(x, y, zoom),
      data: tile.data,
      contentType: tile.contentType
    }));
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  // Clean up old cache entries
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }
}

export default new HeatmapService();
