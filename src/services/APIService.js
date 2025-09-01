import axios from 'axios';
import { API_CONFIG, ENDPOINTS } from '../constants/api';
import { GOOGLE_CLOUD_API_CONFIG, HEATMAP_DESCRIPTIONS } from '../constants/googleCloudAPI';
import GoogleCloudAPIService from './GoogleCloudAPIService';
import { calculateExposureLevel } from '../utils/exposureUtils';

class APIService {
  constructor() {
    this.googleCloudEnabled = false;
    this.googleCloudAPIKey = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  // Test Google Cloud API key
  async testGoogleCloudAPI() {
    if (!this.googleCloudAPIKey) {
      console.log('No Google Cloud API key configured');
      return false;
    }

    try {
      console.log('Testing Google Cloud API key...');
      console.log('API Key (first 10 chars):', this.googleCloudAPIKey.substring(0, 10) + '...');
      
      // Test with a valid heatmap tile endpoint (zoom 0, coordinates 0,0)
      const testUrl = `https://airquality.googleapis.com/v1/mapTypes/US_AQI/heatmapTiles/0/0/0`;
      const response = await axios.get(testUrl, {
        params: {
          key: this.googleCloudAPIKey
        },
        responseType: 'arraybuffer'
      });
      
      console.log('Google Cloud API test successful:', response.status);
      return true;
    } catch (error) {
      console.error('Google Cloud API test failed:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message
      });
      return false;
    }
  }

  // Initialize Google Cloud API
  async initGoogleCloudAPI(apiKey) {
    try {
      this.googleCloudAPIKey = apiKey;
      GoogleCloudAPIService.setAPIKey(apiKey);
      
      // Test the API key first
      const isWorking = await this.testGoogleCloudAPI();
      if (!isWorking) {
        console.error('Google Cloud API test failed');
      }
      
      // Test the API key by fetching available heatmap types
      // This will now return default types even if the API is not fully accessible
      await GoogleCloudAPIService.getAirQualityHeatmapTypes();
      this.googleCloudEnabled = true;
      
      console.log('Google Cloud API initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Cloud API:', error);
      this.googleCloudEnabled = false;
      return false;
    }
  }

  // Check if Google Cloud API is available
  isGoogleCloudAvailable() {
    return this.googleCloudEnabled && GoogleCloudAPIService.isConfigured();
  }

  // Get UV Index data (with Google Cloud fallback)
  async fetchUVIndex(latitude, longitude) {
    // Skip UV API calls - focus only on heatmap tiles
    console.log('Skipping UV API call - using heatmap tiles only');
    return {
      timestamp: new Date().toISOString(),
      source: 'Heatmap tiles only',
      message: 'UV data available via heatmap tiles'
    };
  }

  // Get Air Quality data (Google Cloud primary)
  async fetchAirQuality(latitude, longitude) {
    // Skip air quality forecast API calls - focus only on heatmap tiles
    console.log('Skipping air quality forecast API call - using heatmap tiles only');
    return {
      timestamp: new Date().toISOString(),
      source: 'Heatmap tiles only',
      message: 'Air quality data available via heatmap tiles'
    };
  }

  // Get current location
  async getCurrentLocation() {
    try {
      // Import LocationService dynamically to avoid circular dependencies
      const LocationService = require('./LocationService').default;
      return await LocationService.getCurrentLocation();
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  // Get Air Quality data for specific time
  async getAirQualityData(latitude, longitude, timestamp) {
    throw new Error('Mock data not allowed - use real heatmap sampling only');
  }

  // Get Pollen data for specific time
  async getPollenData(latitude, longitude, timestamp) {
    throw new Error('Mock data not allowed - use real heatmap sampling only');
  }

  // Get UV data for specific time
  async getUVData(latitude, longitude, timestamp) {
    throw new Error('Mock data not allowed - use real heatmap sampling only');
  }

  // Get Pollen data (Google Cloud primary)
  async fetchPollen(latitude, longitude) {
    // Skip pollen forecast API calls - focus only on heatmap tiles
    console.log('Skipping pollen forecast API call - using heatmap tiles only');
    return {
      timestamp: new Date().toISOString(),
      source: 'Heatmap tiles only',
      message: 'Pollen data available via heatmap tiles'
    };
  }

  // Get all environmental data
  async fetchAllEnvironmentalData(latitude, longitude) {
    try {
      const [uvData, airQualityData, pollenData] = await Promise.allSettled([
        this.fetchUVIndex(latitude, longitude),
        this.fetchAirQuality(latitude, longitude),
        this.fetchPollen(latitude, longitude)
      ]);

      return {
        uv: uvData.status === 'fulfilled' ? uvData.value : null,
        airQuality: airQualityData.status === 'fulfilled' ? airQualityData.value : null,
        pollen: pollenData.status === 'fulfilled' ? pollenData.value : null,
        timestamp: new Date().toISOString(),
        source: this.isGoogleCloudAvailable() ? 'Google Cloud API' : 'External APIs'
      };
    } catch (error) {
      console.error('Error fetching environmental data:', error);
      throw new Error('Failed to fetch environmental data from APIs');
    }
  }

  // Get heatmap tiles for map visualization
  async getHeatmapTiles(type, zoom, x, y, heatmapType = null) {
    if (!this.isGoogleCloudAvailable()) {
      throw new Error('Google Cloud API not available for heatmap tiles');
    }

    try {
      if (type === 'airQuality') {
        const defaultType = heatmapType || GOOGLE_CLOUD_API_CONFIG.AIR_QUALITY_HEATMAP_TYPES.US_AQI;
        return await GoogleCloudAPIService.getAirQualityHeatmapTile(zoom, x, y, defaultType);
      } else if (type === 'pollen') {
        const defaultType = heatmapType || GOOGLE_CLOUD_API_CONFIG.POLLEN_HEATMAP_TYPES.TREE_POLLEN;
        return await GoogleCloudAPIService.getPollenHeatmapTile(zoom, x, y, defaultType);
      } else {
        throw new Error(`Unsupported heatmap type: ${type}`);
      }
    } catch (error) {
      console.error(`Error fetching ${type} heatmap tiles:`, error);
      throw error;
    }
  }

  // Get available heatmap types
  async getAvailableHeatmapTypes() {
    if (!this.isGoogleCloudAvailable()) {
      return {
        airQuality: Object.keys(GOOGLE_CLOUD_API_CONFIG.AIR_QUALITY_HEATMAP_TYPES),
        pollen: Object.keys(GOOGLE_CLOUD_API_CONFIG.POLLEN_HEATMAP_TYPES)
      };
    }

    try {
      const [airQualityTypes, pollenTypes] = await Promise.all([
        GoogleCloudAPIService.getAirQualityHeatmapTypes(),
        GoogleCloudAPIService.getPollenHeatmapTypes()
      ]);

      return {
        airQuality: airQualityTypes,
        pollen: pollenTypes
      };
    } catch (error) {
      console.error('Error fetching heatmap types:', error);
      return {
        airQuality: Object.keys(GOOGLE_CLOUD_API_CONFIG.AIR_QUALITY_HEATMAP_TYPES),
        pollen: Object.keys(GOOGLE_CLOUD_API_CONFIG.POLLEN_HEATMAP_TYPES)
      };
    }
  }

  // Process Google Cloud Air Quality data
  processGoogleCloudAirQualityData(data) {
    try {
      console.log('Processing Air Quality data:', JSON.stringify(data, null, 2));
      
      // Handle the actual Google Cloud Air Quality API response format
      const indexes = data.indexes || [];
      const mainIndex = indexes.find(index => index.code === 'uaqi') || indexes[0] || {};
      
      return {
        value: mainIndex.aqi || 0,
                    level: calculateExposureLevel(mainIndex.aqi || 0, 'airQuality'),
        unit: 'AQI',
        description: mainIndex.category || mainIndex.displayName || 'Unknown',
        details: {
          aqi: mainIndex.aqi || 0,
          category: mainIndex.category || 'Unknown',
          displayName: mainIndex.displayName || 'Unknown'
        },
        timestamp: data.dateTime || new Date().toISOString(),
        source: 'Google Cloud Air Quality API'
      };
    } catch (error) {
      console.error('Error processing Google Cloud Air Quality data:', error);
      throw new Error('Failed to process Air Quality data');
    }
  }

  // Process Google Cloud Pollen data
  processGoogleCloudPollenData(data) {
    try {
      const dailyInfo = data.dailyInfo?.[0] || {};
      const pollenTypes = dailyInfo.pollenTypes || {};
      
      // Calculate overall pollen index
      const treePollen = pollenTypes.tree?.indexInfo?.category || 'low';
      const grassPollen = pollenTypes.grass?.indexInfo?.category || 'low';
      const weedPollen = pollenTypes.weed?.indexInfo?.category || 'low';
      
      // Convert categories to numeric values
      const categoryToValue = { low: 1, moderate: 3, high: 6, very_high: 9 };
      const overallValue = Math.max(
        categoryToValue[treePollen] || 0,
        categoryToValue[grassPollen] || 0,
        categoryToValue[weedPollen] || 0
      );
      
      return {
        value: overallValue,
        level: calculateExposureLevel(overallValue, 'POLLEN'),
        unit: 'pollen count',
        description: this.getPollenDescription(overallValue),
        details: {
          tree: pollenTypes.tree?.indexInfo?.category || 'low',
          grass: pollenTypes.grass?.indexInfo?.category || 'low',
          weed: pollenTypes.weed?.indexInfo?.category || 'low',
          mold: pollenTypes.mold?.indexInfo?.category || 'low'
        },
        timestamp: dailyInfo.date || new Date().toISOString(),
        source: 'Google Cloud Pollen API'
      };
    } catch (error) {
      console.error('Error processing Google Cloud Pollen data:', error);
      throw new Error('Failed to process Pollen data');
    }
  }

  // Get pollen description
  getPollenDescription(value) {
    if (value <= 2.4) return 'Low';
    if (value <= 4.8) return 'Moderate';
    if (value <= 7.2) return 'High';
    if (value <= 9.6) return 'Very High';
    return 'Extreme';
  }

  // External API methods
  async fetchUVFromExistingAPIs(latitude, longitude) {
    // Existing UV fetching logic
    try {
      // Try OpenWeatherMap first
      if (API_CONFIG.OPENWEATHER_API_KEY) {
        const response = await axios.get(ENDPOINTS.OPENWEATHER_UV, {
          params: {
            lat: latitude,
            lon: longitude,
            appid: API_CONFIG.OPENWEATHER_API_KEY
          }
        });
        
        if (response.data && response.data.current) {
          return {
            value: response.data.current.uvi || 0,
            level: calculateExposureLevel(response.data.current.uvi || 0, 'uv'),
            unit: 'UV Index',
            description: this.getUVDescription(response.data.current.uvi || 0),
            timestamp: new Date().toISOString(),
            source: 'OpenWeatherMap'
          };
        }
      }

      // Try Tomorrow.io
      if (API_CONFIG.TOMORROW_API_KEY) {
        const response = await axios.get(ENDPOINTS.TOMORROW_UV, {
          params: {
            location: `${latitude},${longitude}`,
            apikey: API_CONFIG.TOMORROW_API_KEY
          }
        });
        
        if (response.data && response.data.data) {
          const uvData = response.data.data.values.uvIndex;
          return {
            value: uvData || 0,
            level: calculateExposureLevel(uvData || 0, 'uv'),
            unit: 'UV Index',
            description: this.getUVDescription(uvData || 0),
            timestamp: new Date().toISOString(),
            source: 'Tomorrow.io'
          };
        }
      }

      throw new Error('Failed to fetch UV data from APIs');
    } catch (error) {
      console.error('Error fetching UV data from existing APIs:', error);
      throw new Error('Failed to fetch UV data from APIs');
    }
  }

  async fetchAirQualityFromExistingAPIs(latitude, longitude) {
    // Existing Air Quality fetching logic
    try {
      if (API_CONFIG.OPENWEATHER_API_KEY) {
        const response = await axios.get(ENDPOINTS.OPENWEATHER_AIR_QUALITY, {
          params: {
            lat: latitude,
            lon: longitude,
            appid: API_CONFIG.OPENWEATHER_API_KEY
          }
        });
        
        if (response.data && response.data.list && response.data.list[0]) {
          const aqi = response.data.list[0].main.aqi;
          return {
            value: aqi || 0,
            level: calculateExposureLevel(aqi || 0, 'airQuality'),
            unit: 'AQI',
            description: this.getAQIDescription(aqi || 0),
            timestamp: new Date().toISOString(),
            source: 'OpenWeatherMap'
          };
        }
      }

      throw new Error('Failed to fetch Air Quality data from APIs');
    } catch (error) {
      console.error('Error fetching Air Quality data from existing APIs:', error);
      throw new Error('Failed to fetch Air Quality data from APIs');
    }
  }

  async fetchPollenFromExistingAPIs(latitude, longitude) {
    // Existing Pollen fetching logic
    try {
      if (API_CONFIG.BREEZOMETER_API_KEY) {
        const response = await axios.get(ENDPOINTS.BREEZOMETER_POLLEN, {
          params: {
            lat: latitude,
            lon: longitude,
            key: API_CONFIG.BREEZOMETER_API_KEY
          }
        });
        
        if (response.data && response.data.data) {
          const pollenData = response.data.data;
          const overallValue = pollenData.overall_pollen_count || 0;
          
          return {
            value: overallValue,
            level: calculateExposureLevel(overallValue, 'pollen'),
            unit: 'pollen count',
            description: this.getPollenDescription(overallValue),
            timestamp: new Date().toISOString(),
            source: 'BreezoMeter'
          };
        }
      }

      throw new Error('Failed to fetch Pollen data from APIs');
    } catch (error) {
      console.error('Error fetching Pollen data from existing APIs:', error);
      throw new Error('Failed to fetch Pollen data from APIs');
    }
  }

  // Helper methods
  getUVDescription(value) {
    if (value <= 2) return 'Low';
    if (value <= 5) return 'Moderate';
    if (value <= 7) return 'High';
    if (value <= 10) return 'Very High';
    return 'Extreme';
  }

  getAQIDescription(value) {
    if (value <= 50) return 'Good';
    if (value <= 100) return 'Moderate';
    if (value <= 150) return 'Unhealthy for Sensitive Groups';
    if (value <= 200) return 'Unhealthy';
    if (value <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }

  // Get cache statistics
  getCacheStats() {
    if (this.isGoogleCloudAvailable()) {
      return GoogleCloudAPIService.getCacheStats();
    }
    return { size: 0, entries: [] };
  }

  // Clear cache
  clearCache() {
    if (this.isGoogleCloudAvailable()) {
      GoogleCloudAPIService.clearCache();
    }
  }
}

export default new APIService();
