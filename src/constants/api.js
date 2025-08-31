// API Configuration Constants
// TODO: Replace with your actual API keys

export const API_CONFIG = {
  // OpenWeatherMap API (for UV and Air Quality)
  OPENWEATHER_API_KEY: 'YOUR_OPENWEATHER_API_KEY_HERE',
  OPENWEATHER_BASE_URL: 'https://api.openweathermap.org/data/2.5',
  
  // Tomorrow.io API (for UV, Air Quality, and Pollen)
  TOMORROW_API_KEY: 'YOUR_TOMORROW_API_KEY_HERE',
  TOMORROW_BASE_URL: 'https://api.tomorrow.io/v4',
  
  // BreezoMeter API (for Air Quality and Pollen)
  BREEZOMETER_API_KEY: 'YOUR_BREEZOMETER_API_KEY_HERE',
  BREEZOMETER_BASE_URL: 'https://api.breezometer.com/air-quality/v1',
  
  // Ambee API (for Pollen)
  AMBEE_API_KEY: 'YOUR_AMBEE_API_KEY_HERE',
  AMBEE_BASE_URL: 'https://api.ambeedata.com',
};

// API Endpoints
export const ENDPOINTS = {
  // OpenWeatherMap
  UV_INDEX: '/uvi',
  AIR_QUALITY: '/air_pollution',
  
  // Tomorrow.io
  TOMORROW_WEATHER: '/weather/realtime',
  TOMORROW_AIR_QUALITY: '/air-quality/realtime',
  TOMORROW_POLLEN: '/pollen/realtime',
  
  // BreezoMeter
  BREEZOMETER_AIR_QUALITY: '/current-conditions',
  BREEZOMETER_POLLEN: '/pollen/v2/current-conditions',
  
  // Ambee
  AMBEE_POLLEN: '/latest/pollen/by-lat-lng',
};

// Default thresholds for alerts
export const DEFAULT_THRESHOLDS = {
  UV: {
    LOW: 0,
    MODERATE: 3,
    HIGH: 6,
    VERY_HIGH: 8,
    EXTREME: 11,
  },
  POLLEN: {
    LOW: 0,
    MODERATE: 2.4,
    HIGH: 4.8,
    VERY_HIGH: 7.2,
    EXTREME: 9.6,
  },
  AIR_QUALITY: {
    LOW: 0,
    MODERATE: 51,
    HIGH: 101,
    VERY_HIGH: 151,
    EXTREME: 201,
  },
};

// Notification messages
export const NOTIFICATION_MESSAGES = {
  UV: {
    HIGH: 'High UV levels detected! Apply sunscreen and seek shade.',
    VERY_HIGH: 'Very high UV levels! Limit sun exposure and wear protective clothing.',
    EXTREME: 'Extreme UV levels! Avoid sun exposure during peak hours.',
  },
  POLLEN: {
    HIGH: 'High pollen levels detected! Consider wearing a mask outdoors.',
    VERY_HIGH: 'Very high pollen levels! Limit outdoor activities.',
    EXTREME: 'Extreme pollen levels! Stay indoors if possible.',
  },
  AIR_QUALITY: {
    HIGH: 'Poor air quality detected! Consider wearing a mask.',
    VERY_HIGH: 'Very poor air quality! Limit outdoor activities.',
    EXTREME: 'Hazardous air quality! Stay indoors and use air purifiers.',
  },
};
