import axios from 'axios';

class GoogleCloudAPIService {
  constructor() {
    this.airQualityBaseURL = 'https://airquality.googleapis.com';
    this.pollenBaseURL = 'https://pollen.googleapis.com';
    this.apiKey = null;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Initialize with API key
  setAPIKey(apiKey) {
    this.apiKey = apiKey;
  }

  // Check if API key is set
  isConfigured() {
    return !!this.apiKey;
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

  // Clear old cache entries
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  // Get Air Quality heatmap tile
  async getAirQualityHeatmapTile(zoom, x, y, heatmapType = 'US_AQI') {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const cacheKey = this.generateCacheKey('airquality', zoom, x, y, heatmapType);
    const cached = this.getCachedTile(cacheKey);
    if (cached) {
      console.log(`Using cached Air Quality tile: ${cacheKey}`);
      return cached;
    }

    try {
      console.log(`Fetching Air Quality tile: zoom=${zoom}, x=${x}, y=${y}, type=${heatmapType}`);
      const url = `${this.airQualityBaseURL}/v1/mapTypes/${heatmapType}/heatmapTiles/${zoom}/${x}/${y}`;
      
      const response = await axios.get(url, {
        params: { key: this.apiKey },
        responseType: 'arraybuffer'
      });

      const tileData = {
        type: 'airquality',
        zoom,
        x,
        y,
        heatmapType,
        data: new Uint8Array(response.data),
        contentType: response.headers['content-type'] || 'image/png'
      };

      this.cacheTile(cacheKey, tileData);
      console.log(`Successfully fetched Air Quality tile: ${cacheKey}`);
      return tileData;
    } catch (error) {
      console.error('Error fetching Air Quality heatmap tile:', error);
      throw error;
    }
  }

  // Get Pollen heatmap tile
  async getPollenHeatmapTile(zoom, x, y, heatmapType = 'TREE_UPI') {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const cacheKey = this.generateCacheKey('pollen', zoom, x, y, heatmapType);
    const cached = this.getCachedTile(cacheKey);
    if (cached) {
      console.log(`Using cached Pollen tile: ${cacheKey}`);
      return cached;
    }

    try {
      console.log(`Fetching Pollen tile: zoom=${zoom}, x=${x}, y=${y}, type=${heatmapType}`);
      const url = `${this.pollenBaseURL}/v1/mapTypes/${heatmapType}/heatmapTiles/${zoom}/${x}/${y}`;
      
      const response = await axios.get(url, {
        params: { key: this.apiKey },
        responseType: 'arraybuffer'
      });

      const tileData = {
        type: 'pollen',
        zoom,
        x,
        y,
        heatmapType,
        data: new Uint8Array(response.data),
        contentType: response.headers['content-type'] || 'image/png'
      };

      this.cacheTile(cacheKey, tileData);
      console.log(`Successfully fetched Pollen tile: ${cacheKey}`);
      return tileData;
    } catch (error) {
      console.error('Error fetching Pollen heatmap tile:', error);
      throw error;
    }
  }

  // Get available Air Quality heatmap types
  async getAirQualityHeatmapTypes() {
    // No API endpoint exists for listing heatmap types
    // Return the documented allowed values from the API documentation
    console.log('Using documented Air Quality heatmap types');
    return {
      mapTypes: [
        { name: 'UAQI_RED_GREEN', displayName: 'Universal AQI (Red-Green)' },
        { name: 'UAQI_INDIGO_PERSIAN', displayName: 'Universal AQI (Indigo-Persian)' },
        { name: 'PM25_INDIGO_PERSIAN', displayName: 'PM2.5 (Indigo-Persian)' },
        { name: 'GBR_DEFRA', displayName: 'UK Daily Air Quality Index' },
        { name: 'DEU_UBA', displayName: 'German Local Air Quality Index' },
        { name: 'CAN_EC', displayName: 'Canadian Air Quality Health Index' },
        { name: 'FRA_ATMO', displayName: 'France Air Quality Index' },
        { name: 'US_AQI', displayName: 'US Air Quality Index' }
      ]
    };
  }

  // Get available Pollen heatmap types
  async getPollenHeatmapTypes() {
    // No API endpoint exists for listing pollen heatmap types
    // Return the documented allowed values from the API documentation
    console.log('Using documented Pollen heatmap types');
    return {
      mapTypes: [
        { name: 'TREE_UPI', displayName: 'Tree Pollen Index' },
        { name: 'GRASS_UPI', displayName: 'Grass Pollen Index' },
        { name: 'WEED_UPI', displayName: 'Weed Pollen Index' }
      ]
    };
  }

  // Get Air Quality data for specific location
  async getAirQualityData(latitude, longitude) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    try {
      const url = `${this.airQualityBaseURL}/v1/currentConditions:lookup`;
      const response = await axios.post(url, {
        location: {
          latitude,
          longitude
        }
      }, {
        params: {
          key: this.apiKey
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Air Quality API response:', response.status);
      return response.data;
    } catch (error) {
      console.error('Error fetching Air Quality data:', error);
      throw new Error('Air Quality API is not accessible');
    }
  }

  // Get Pollen data for specific location
  async getPollenData(latitude, longitude) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    try {
      const url = `${this.pollenBaseURL}/v1/forecast:lookup`;
      console.log('Fetching Pollen data from:', url);
      
      const response = await axios.post(url, {
        location: {
          latitude,
          longitude
        }
      }, {
        params: { key: this.apiKey },
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Pollen API response:', response.status);
      return response.data;
    } catch (error) {
      console.error('Error fetching Pollen data:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        message: error.message
      });
      throw new Error('Pollen API is not accessible');
    }
  }

  // Convert lat/lng to tile coordinates
  latLngToTile(lat, lng, zoom) {
    const n = Math.pow(2, zoom);
    const xtile = Math.floor((lng + 180) / 360 * n);
    const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
    return { x: xtile, y: ytile };
  }

  // Get tile URL for overlay
  getTileURL(type, heatmapType, zoom, x, y) {
    if (!this.apiKey) {
      return null;
    }

    const baseURL = type === 'airquality' ? this.airQualityBaseURL : this.pollenBaseURL;
    return `${baseURL}/v1/mapTypes/heatmapTiles/${heatmapType}/${zoom}/${x}/${y}?key=${this.apiKey}`;
  }

  // Get multiple tiles for a region
  async getTilesForRegion(type, heatmapType, bounds, zoom) {
    const tiles = [];
    const { north, south, east, west } = bounds;

    const startTile = this.latLngToTile(north, west, zoom);
    const endTile = this.latLngToTile(south, east, zoom);

    for (let x = startTile.x; x <= endTile.x; x++) {
      for (let y = startTile.y; y <= endTile.y; y++) {
        try {
          const tile = type === 'airquality' 
            ? await this.getAirQualityHeatmapTile(zoom, x, y, heatmapType)
            : await this.getPollenHeatmapTile(zoom, x, y, heatmapType);
          tiles.push(tile);
        } catch (error) {
          console.warn(`Failed to fetch tile ${x},${y}:`, error);
        }
      }
    }

    return tiles;
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }

  // Clear all cache
  clearCache() {
    this.cache.clear();
  }

  // Create test tile data (simple colored square)
  createTestTileData() {
    // Create a simple test image data (256x256 PNG with gradient)
    // This creates a more visible test pattern
    const width = 256;
    const height = 256;
    
    // Create a simple gradient pattern (red to blue)
    const pngData = new Uint8Array(width * height * 4);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const red = Math.floor((x / width) * 255);
        const green = Math.floor((y / height) * 255);
        const blue = Math.floor(((x + y) / (width + height)) * 255);
        const alpha = 200; // Semi-transparent
        
        pngData[index] = red;     // R
        pngData[index + 1] = green; // G
        pngData[index + 2] = blue;  // B
        pngData[index + 3] = alpha; // A
      }
    }
    
    return pngData;
  }
}

export default new GoogleCloudAPIService();
