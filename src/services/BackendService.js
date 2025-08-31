import axios from 'axios';

class BackendService {
  constructor() {
    // Backend server URL - update this when you deploy
    this.baseURL = 'http://localhost:3000';
    this.apiClient = axios.create({
      baseURL: this.baseURL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get heatmap tile from backend cache
   * This will check cache first, then fetch from Google Cloud API if needed
   */
  async getHeatmapTile(dataType, heatmapType, zoom, x, y) {
    try {
      console.log(`🔍 Backend: Requesting tile ${dataType}/${heatmapType}/${zoom}/${x}/${y}`);
      
      const response = await this.apiClient.get(
        `/api/heatmap/${dataType}/${heatmapType}/${zoom}/${x}/${y}`,
        {
          responseType: 'arraybuffer', // Get binary image data
        }
      );

      // Check if this was a cache hit or miss
      const cacheStatus = response.headers['x-cache'];
      const cacheExpires = response.headers['x-cache-expires'];
      
      console.log(`✅ Backend: ${cacheStatus} for ${dataType}/${heatmapType}/${zoom}/${x}/${y}`);
      
      if (cacheStatus === 'HIT') {
        console.log(`💾 Cache hit! Expires: ${cacheExpires}`);
      } else {
        console.log(`🌐 Cache miss - fetched from Google Cloud API`);
      }

      return {
        success: true,
        data: response.data,
        contentType: response.headers['content-type'],
        cacheStatus: cacheStatus,
        cacheExpires: cacheExpires,
      };
    } catch (error) {
      console.error(`❌ Backend error for ${dataType}/${heatmapType}/${zoom}/${x}/${y}:`, error.response?.status, error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        status: error.response?.status,
      };
    }
  }

  /**
   * Get cache statistics from backend
   */
  async getCacheStats() {
    try {
      const response = await this.apiClient.get('/api/stats');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Failed to get cache stats:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Health check for backend
   */
  async healthCheck() {
    try {
      const response = await this.apiClient.get('/api/health');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Backend health check failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get multiple tiles for a region (for grid-based caching)
   */
  async getRegionTiles(dataType, heatmapType, zoom, gridLat, gridLng) {
    try {
      const response = await this.apiClient.get(
        `/api/region/${dataType}/${heatmapType}/${zoom}/${gridLat}/${gridLng}`
      );
      
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Failed to get region tiles:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Clean up expired tiles (admin function)
   */
  async cleanupExpiredTiles() {
    try {
      const response = await this.apiClient.post('/api/cleanup');
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      console.error('❌ Failed to cleanup expired tiles:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Create singleton instance
const backendService = new BackendService();

export default backendService;
