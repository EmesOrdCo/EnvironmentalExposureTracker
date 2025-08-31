// Google Cloud API Configuration
export const GOOGLE_CLOUD_API_CONFIG = {
  // API Keys (to be provided by user)
  API_KEY: 'AIzaSyCCNN19KhPTamJDozHgega-hoojK-n-a7Y',
  
  // Base URLs
  AIR_QUALITY_BASE_URL: 'https://airquality.googleapis.com',
  POLLEN_BASE_URL: 'https://pollen.googleapis.com',
  
  // Heatmap Types
  AIR_QUALITY_HEATMAP_TYPES: {
    US_AQI: 'US_AQI',
    EUROPEAN_AQI: 'EUROPEAN_AQI',
    CHINESE_AQI: 'CHINESE_AQI',
    INDIAN_AQI: 'INDIAN_AQI',
    PM25: 'PM25',
    PM10: 'PM10',
    NO2: 'NO2',
    O3: 'O3',
    SO2: 'SO2',
    CO: 'CO'
  },
  
  POLLEN_HEATMAP_TYPES: {
    TREE_POLLEN: 'tree_pollen',
    GRASS_POLLEN: 'grass_pollen',
    WEED_POLLEN: 'weed_pollen',
    MOLD: 'mold',
    RAGWEED: 'ragweed'
  },
  
  // Default settings
  DEFAULT_ZOOM_LEVEL: 10,
  MIN_ZOOM_LEVEL: 0,
  MAX_ZOOM_LEVEL: 16,
  
  // Cache settings
  CACHE_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  MAX_CACHE_SIZE: 100, // Maximum number of cached tiles
  
  // Update intervals
  UPDATE_INTERVALS: {
    FAST: 30 * 1000, // 30 seconds
    NORMAL: 5 * 60 * 1000, // 5 minutes
    SLOW: 15 * 60 * 1000, // 15 minutes
    MANUAL: null // Manual refresh only
  },
  
  // Error handling
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Heatmap type descriptions
export const HEATMAP_DESCRIPTIONS = {
  // Air Quality
  US_AQI: {
    name: 'US Air Quality Index',
    description: 'Air quality measurement based on US EPA standards',
    range: '0-500+',
    colors: {
      good: '#00E400',
      moderate: '#FFFF00',
      unhealthy_sensitive: '#FF7E00',
      unhealthy: '#FF0000',
      very_unhealthy: '#8F3F97',
      hazardous: '#7E0023'
    }
  },
  EUROPEAN_AQI: {
    name: 'European Air Quality Index',
    description: 'Air quality measurement based on European standards',
    range: '0-100+',
    colors: {
      good: '#00E400',
      fair: '#FFFF00',
      moderate: '#FF7E00',
      poor: '#FF0000',
      very_poor: '#8F3F97',
      extremely_poor: '#7E0023'
    }
  },
  PM25: {
    name: 'PM2.5 Particles',
    description: 'Fine particulate matter (2.5 micrometers or smaller)',
    range: '0-500+ μg/m³',
    unit: 'μg/m³'
  },
  PM10: {
    name: 'PM10 Particles',
    description: 'Coarse particulate matter (10 micrometers or smaller)',
    range: '0-500+ μg/m³',
    unit: 'μg/m³'
  },
  NO2: {
    name: 'Nitrogen Dioxide',
    description: 'Nitrogen dioxide concentration',
    range: '0-500+ ppb',
    unit: 'ppb'
  },
  O3: {
    name: 'Ozone',
    description: 'Ground-level ozone concentration',
    range: '0-500+ ppb',
    unit: 'ppb'
  },
  
  // Pollen
  TREE_POLLEN: {
    name: 'Tree Pollen',
    description: 'Tree pollen concentration',
    range: '0-10+',
    unit: 'pollen count'
  },
  GRASS_POLLEN: {
    name: 'Grass Pollen',
    description: 'Grass pollen concentration',
    range: '0-10+',
    unit: 'pollen count'
  },
  WEED_POLLEN: {
    name: 'Weed Pollen',
    description: 'Weed pollen concentration',
    range: '0-10+',
    unit: 'pollen count'
  },
  MOLD: {
    name: 'Mold Spores',
    description: 'Mold spore concentration',
    range: '0-10+',
    unit: 'spore count'
  },
  RAGWEED: {
    name: 'Ragweed Pollen',
    description: 'Ragweed pollen concentration',
    range: '0-10+',
    unit: 'pollen count'
  }
};

// API endpoints
export const API_ENDPOINTS = {
  // Air Quality API
  AIR_QUALITY: {
    HEATMAP_TILES: '/v1/mapTypes/heatmapTiles',
    CURRENT_CONDITIONS: '/v1/currentConditions:lookup',
    FORECAST: '/v1/forecast:lookup',
    HISTORICAL: '/v1/historical:lookup',
    MAP_TYPES: '/v1/mapTypes'
  },
  
  // Pollen API
  POLLEN: {
    HEATMAP_TILES: '/v1/mapTypes/heatmapTiles',
    FORECAST: '/v1/forecast:lookup',
    MAP_TYPES: '/v1/mapTypes'
  }
};

// Default heatmap types for different regions
export const REGIONAL_DEFAULTS = {
  NORTH_AMERICA: {
    airQuality: 'US_AQI',
    pollen: 'TREE_POLLEN'
  },
  EUROPE: {
    airQuality: 'EUROPEAN_AQI',
    pollen: 'GRASS_POLLEN'
  },
  ASIA: {
    airQuality: 'CHINESE_AQI',
    pollen: 'TREE_POLLEN'
  },
  GLOBAL: {
    airQuality: 'US_AQI',
    pollen: 'TREE_POLLEN'
  }
};

// Error messages
export const ERROR_MESSAGES = {
  API_KEY_MISSING: 'Google Cloud API key is required. Please configure it in settings.',
  API_KEY_INVALID: 'Invalid API key. Please check your Google Cloud API key.',
  RATE_LIMIT_EXCEEDED: 'API rate limit exceeded. Please try again later.',
  NO_DATA_AVAILABLE: 'No environmental data available for this location.',
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  TILE_FETCH_FAILED: 'Failed to fetch map tile. Please try again.',
  LOCATION_UNAVAILABLE: 'Location data unavailable. Please enable location services.',
  CACHE_FULL: 'Cache is full. Some older data may be cleared.',
  ZOOM_LEVEL_INVALID: 'Invalid zoom level. Must be between 0 and 16.'
};

// Success messages
export const SUCCESS_MESSAGES = {
  API_KEY_SET: 'API key configured successfully.',
  DATA_LOADED: 'Environmental data loaded successfully.',
  CACHE_CLEARED: 'Cache cleared successfully.',
  SETTINGS_SAVED: 'Settings saved successfully.',
  LOCATION_UPDATED: 'Location updated successfully.',
  TILES_LOADED: 'Map tiles loaded successfully.'
};
