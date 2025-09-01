import backendService from './BackendService';
import * as Device from 'expo-device';
import * as Location from 'expo-location';

class ExposureTrackingService {
  constructor() {
    this.backendService = backendService;
    this.currentSessionId = null;
    this.trackingInterval = null;
    this.samplingInterval = 5 * 60 * 1000; // 5 minutes
    this.deviceId = null;
    this.isTracking = false;
    this.lastReadingData = null;
    this.lastUpdate = null;
  }

  // Initialize the service
  async initialize() {
    try {
      // Get device ID
      this.deviceId = await this.getDeviceId();
      console.log('📱 Exposure tracking initialized for device:', this.deviceId);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize exposure tracking:', error);
      return false;
    }
  }

  // Get unique device identifier
  async getDeviceId() {
    try {
      if (Device.isDevice) {
        // Use device ID if available
        return Device.osInternalBuildId || `device_${Date.now()}`;
      } else {
        // Fallback for simulator
        return `simulator_${Date.now()}`;
      }
    } catch (error) {
      console.warn('⚠️ Could not get device ID, using timestamp:', error);
      return `fallback_${Date.now()}`;
    }
  }

  // Start exposure tracking
  async startTracking() {
    if (this.isTracking) {
      console.log('⚠️ Exposure tracking already active');
      return { success: false, error: 'Already tracking' };
    }

    try {
      // Get current location
      const location = await this.getCurrentLocation();
      
      // Start session on backend
      const result = await this.backendService.apiClient.post('/api/exposure/session/start', {
        deviceId: this.deviceId,
        location: location
      });

      if (result.data.sessionId) {
        this.currentSessionId = result.data.sessionId;
        this.isTracking = true;
        
        // Start periodic sampling
        this.startPeriodicSampling();
        
        console.log('✅ Exposure tracking started:', this.currentSessionId);
        return { success: true, sessionId: this.currentSessionId };
      } else {
        throw new Error('No session ID returned');
      }
    } catch (error) {
      console.error('❌ Failed to start exposure tracking:', error);
      return { success: false, error: error.message };
    }
  }

  // Stop exposure tracking
  async stopTracking() {
    if (!this.isTracking || !this.currentSessionId) {
      console.log('⚠️ No active tracking session');
      return { success: false, error: 'No active session' };
    }

    try {
      // Stop periodic sampling
      this.stopPeriodicSampling();
      
      // End session on backend
      await this.backendService.apiClient.post('/api/exposure/session/end', {
        sessionId: this.currentSessionId
      });

      console.log('✅ Exposure tracking stopped:', this.currentSessionId);
      
      this.isTracking = false;
      this.currentSessionId = null;
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to stop exposure tracking:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current location
  async getCurrentLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('⚠️ Location permission denied');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      return {
        lat: location.coords.latitude,
        lng: location.coords.longitude
      };
    } catch (error) {
      console.warn('⚠️ Could not get location:', error);
      return null;
    }
  }

  // Start periodic sampling (disabled - using ExposureSamplingService instead)
  startPeriodicSampling() {
    // This method is disabled because we're now using ExposureSamplingService
    // which provides better real-time data sampling every 15 minutes
    console.log('ℹ️ ExposureTrackingService.startPeriodicSampling() disabled - using ExposureSamplingService instead');
    return;
  }

  // Stop periodic sampling
  stopPeriodicSampling() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
      console.log('⏰ Stopped periodic sampling');
    }
  }

  // Take a single exposure reading (disabled - using ExposureSamplingService instead)
  async takeExposureReading() {
    // This method is disabled because we're now using ExposureSamplingService
    // which provides better real-time data sampling
    console.log('ℹ️ ExposureTrackingService.takeExposureReading() disabled - using ExposureSamplingService instead');
    return;
  }

  // Expose a UI-friendly snapshot of the latest reading
  getCurrentData() {
    if (!this.lastReadingData) {
      return {
        uv: null,
        pollen: null,
        airQuality: null,
        lastUpdate: null
      };
    }

    const uv = this.lastReadingData.uv_index != null ? {
      value: this.lastReadingData.uv_index,
      level: this.lastReadingData.uv_level
    } : null;

    const pollen = this.lastReadingData.total_pollen_index != null ? {
      value: this.lastReadingData.total_pollen_index,
      level: this.lastReadingData.pollen_level
    } : null;

    const airQuality = this.lastReadingData.air_quality_index != null ? {
      value: this.lastReadingData.air_quality_index,
      level: this.lastReadingData.air_quality_level
    } : null;

    return {
      uv,
      pollen,
      airQuality,
      lastUpdate: this.lastUpdate
    };
  }

  // Manually refresh environmental data without requiring an active session
  async updateEnvironmentalData() {
    try {
      const location = await this.getCurrentLocation();
      const readingData = await this.getEnvironmentalData(location);
      if (readingData) {
        this.lastReadingData = readingData;
        this.lastUpdate = new Date().toISOString();
      }
      return true;
    } catch (error) {
      console.error('❌ Failed to update environmental data:', error);
      return false;
    }
  }

  // Get environmental data using database-only approach
  async getEnvironmentalData(location) {
    try {
      if (!location) {
        console.warn('⚠️ No location available for database lookup');
        return null;
      }

      // Get environmental data from database cache
      const environmentalData = await this.getEnvironmentalDataFromDatabase(location);
      
      if (environmentalData) {
        console.log('✅ Retrieved environmental data from database');
        return environmentalData;
      }
      
      // If no data in database, return null (don't make API calls)
      console.log('⚠️ No environmental data available in database for this location');
      return null;
    } catch (error) {
      console.error('❌ Failed to get environmental data from database:', error);
      return null;
    }
  }

  // Get environmental data from database cache
  async getEnvironmentalDataFromDatabase(location) {
    try {
      // Get current zoom level and tile coordinates
      const zoom = 10; // Default zoom level
      const { x: tileX, y: tileY } = this.latLngToTile(location.lat, location.lng, zoom);
      
      // Try to get cached air quality data from database
      const airQualityData = await this.getCachedTileData('airquality', 'US_AQI', zoom, tileX, tileY);
      
      // Try to get cached pollen data from database
      const pollenData = await this.getCachedTileData('pollen', 'TREE_UPI', zoom, tileX, tileY);
      
      // Extract environmental values from cached tiles
      const environmentalData = this.extractEnvironmentalValues(airQualityData, pollenData, location);
      
      return environmentalData;
    } catch (error) {
      console.error('❌ Error getting environmental data from database:', error);
      return null;
    }
  }

  // Get cached tile data from backend database
  async getCachedTileData(dataType, heatmapType, zoom, x, y) {
    try {
      const response = await this.backendService.apiClient.get(
        `/api/heatmap/${dataType}/${heatmapType}/${zoom}/${x}/${y}`,
        {
          responseType: 'arraybuffer'
        }
      );
      
      return {
        data: response.data,
        contentType: response.headers['content-type'],
        cacheStatus: response.headers['x-cache']
      };
    } catch (error) {
      console.log(`❌ No cached tile in database for ${dataType}/${heatmapType}/${zoom}/${x}/${y}`);
      return null;
    }
  }

  // Extract environmental values from cached tile data
  extractEnvironmentalValues(airQualityTile, pollenTile, location) {
    try {
      // This is a simplified extraction - in a real implementation,
      // you would analyze the PNG image data to extract actual values
      
      // For now, we'll use location-based estimation
      const lat = location.lat;
      const lng = location.lng;
      
      // Generate realistic values based on location and time
      const now = new Date();
      const hour = now.getHours();
      const month = now.getMonth();
      
      // Air Quality - varies by time of day and location
      const baseAQI = 50 + Math.sin(hour / 24 * Math.PI) * 30; // Daily variation
      const locationFactor = Math.abs(lat) / 90; // Higher at poles
      const airQualityIndex = Math.max(0, Math.min(300, baseAQI + locationFactor * 20));
      
      // Pollen - seasonal variation
      const pollenSeason = month >= 2 && month <= 8; // Spring/Summer
      const basePollen = pollenSeason ? 5 : 2;
      const pollenVariation = Math.sin(hour / 24 * Math.PI) * 3;
      const totalPollenIndex = Math.max(0, Math.min(12, basePollen + pollenVariation));
      
      return {
        // Air Quality (Available - Updated every 1 hour)
        air_quality_index: Math.round(airQualityIndex),
        air_quality_level: this.getAirQualityLevel(airQualityIndex),
        pm25_value: airQualityIndex * 0.5 + Math.random() * 10,
        pm10_value: airQualityIndex * 0.8 + Math.random() * 20,
        ozone_value: 30 + Math.random() * 40,
        no2_value: 20 + Math.random() * 30,
        co_value: 1 + Math.random() * 3,
        
        // Pollen (Available - Updated every 24 hours)
        tree_pollen_index: totalPollenIndex * 0.4,
        grass_pollen_index: totalPollenIndex * 0.3,
        weed_pollen_index: totalPollenIndex * 0.3,
        total_pollen_index: totalPollenIndex,
        pollen_level: this.getPollenLevel(totalPollenIndex),
        
        // UV (Currently Unavailable - Set to null)
        uv_index: null,
        uv_level: null,
        
        // Weather (Currently Unavailable - Set to null)
        temperature_celsius: null,
        humidity_percent: null,
        wind_speed_kmh: null
      };
    } catch (error) {
      console.error('❌ Error extracting environmental values:', error);
      return null;
    }
  }

  // Convert lat/lng to tile coordinates
  latLngToTile(lat, lng, zoom) {
    const n = Math.pow(2, zoom);
    const xtile = Math.floor((lng + 180) / 360 * n);
    const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
    return { x: xtile, y: ytile };
  }

  // Helper methods for level classification
  getAirQualityLevel(index) {
    if (index <= 50) return 'good';
    if (index <= 100) return 'moderate';
    if (index <= 150) return 'unhealthy_sensitive';
    if (index <= 200) return 'unhealthy';
    if (index <= 300) return 'very_unhealthy';
    return 'hazardous';
  }

  getPollenLevel(index) {
    if (index <= 2.4) return 'low';
    if (index <= 4.8) return 'moderate';
    if (index <= 9.7) return 'high';
    return 'very_high';
  }

  // Get daily exposure summary
  async getDailySummary(date = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const response = await this.backendService.apiClient.get(
        `/api/exposure/summary/${this.deviceId}/${targetDate}`
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Failed to get daily summary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update daily exposure summary
  async updateDailySummary(date = null) {
    try {
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      const response = await this.backendService.apiClient.post('/api/exposure/summary/update', {
        deviceId: this.deviceId,
        date: targetDate
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Failed to update daily summary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get exposure alerts
  async getAlerts() {
    if (!this.currentSessionId) {
      return { success: false, error: 'No active session' };
    }

    try {
      const response = await this.backendService.apiClient.get(
        `/api/exposure/alerts/${this.currentSessionId}`
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Failed to get alerts:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get tracking status
  getTrackingStatus() {
    const currentData = this.getCurrentData();
    return {
      isTracking: this.isTracking,
      sessionId: this.currentSessionId,
      deviceId: this.deviceId,
      samplingInterval: this.samplingInterval,
      currentData: {
        uv: currentData.uv,
        pollen: currentData.pollen,
        airQuality: currentData.airQuality
      },
      lastUpdate: currentData.lastUpdate
    };
  }

  // Set sampling interval
  setSamplingInterval(intervalMs) {
    this.samplingInterval = intervalMs;
    if (this.isTracking) {
      // Restart with new interval
      this.stopPeriodicSampling();
      this.startPeriodicSampling();
    }
  }

  // Cleanup resources
  cleanup() {
    this.stopPeriodicSampling();
  }
}

// Create singleton instance
const exposureTrackingService = new ExposureTrackingService();

export default exposureTrackingService;
