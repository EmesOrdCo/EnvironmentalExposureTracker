import { EXPOSURE_LEVELS } from '../types';
import { DEFAULT_THRESHOLDS } from '../constants/api';

// Calculate exposure level based on value and type
export const calculateExposureLevel = (value, type) => {
  // Map the type to the correct threshold key
  const typeMap = {
    'uv': 'UV',
    'pollen': 'POLLEN',
    'airQuality': 'AIR_QUALITY'
  };
  
  const thresholdKey = typeMap[type] || type.toUpperCase();
  const thresholds = DEFAULT_THRESHOLDS[thresholdKey];
  
  if (!thresholds) {
    console.warn(`No thresholds found for type: ${type}`);
    return EXPOSURE_LEVELS.LOW;
  }
  
  if (value <= thresholds.MODERATE) return EXPOSURE_LEVELS.LOW;
  if (value <= thresholds.HIGH) return EXPOSURE_LEVELS.MODERATE;
  if (value <= thresholds.VERY_HIGH) return EXPOSURE_LEVELS.HIGH;
  if (value <= thresholds.EXTREME) return EXPOSURE_LEVELS.VERY_HIGH;
  return EXPOSURE_LEVELS.EXTREME;
};

// Get color for exposure level
export const getExposureColor = (type, level) => {
  const colors = {
    [EXPOSURE_LEVELS.LOW]: '#4CAF50',
    [EXPOSURE_LEVELS.MODERATE]: '#FF9800',
    [EXPOSURE_LEVELS.HIGH]: '#FF5722',
    [EXPOSURE_LEVELS.VERY_HIGH]: '#E91E63',
    [EXPOSURE_LEVELS.EXTREME]: '#9C27B0',
  };
  return colors[level] || '#4CAF50';
};

// Get icon for exposure type
export const getExposureIcon = (type) => {
  const icons = {
    uv: 'wb-sunny',
    pollen: 'local-florist',
    airQuality: 'air',
  };
  return icons[type] || 'info';
};

// Format timestamp for display
export const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
};

// Calculate cumulative exposure for a time period
export const calculateCumulativeExposure = (records, timeRange) => {
  if (!records || records.length === 0) return 0;
  
  const now = new Date();
  const timeRanges = {
    daily: 24 * 60 * 60 * 1000, // 24 hours
    weekly: 7 * 24 * 60 * 60 * 1000, // 7 days
    monthly: 30 * 24 * 60 * 60 * 1000, // 30 days
  };
  
  const cutoffTime = now.getTime() - timeRanges[timeRange];
  
  return records
    .filter(record => new Date(record.timestamp).getTime() > cutoffTime)
    .reduce((sum, record) => sum + record.value, 0);
};

// Get exposure level description
export const getExposureDescription = (type, level) => {
  const descriptions = {
    uv: {
      [EXPOSURE_LEVELS.LOW]: 'Low UV - Safe to be outside',
      [EXPOSURE_LEVELS.MODERATE]: 'Moderate UV - Take precautions',
      [EXPOSURE_LEVELS.HIGH]: 'High UV - Seek shade during midday',
      [EXPOSURE_LEVELS.VERY_HIGH]: 'Very High UV - Minimize sun exposure',
      [EXPOSURE_LEVELS.EXTREME]: 'Extreme UV - Avoid sun exposure',
    },
    pollen: {
      [EXPOSURE_LEVELS.LOW]: 'Low pollen - Generally safe',
      [EXPOSURE_LEVELS.MODERATE]: 'Moderate pollen - Some may be affected',
      [EXPOSURE_LEVELS.HIGH]: 'High pollen - Consider precautions',
      [EXPOSURE_LEVELS.VERY_HIGH]: 'Very High pollen - Limit outdoor activities',
      [EXPOSURE_LEVELS.EXTREME]: 'Extreme pollen - Stay indoors if possible',
    },
    airQuality: {
      [EXPOSURE_LEVELS.LOW]: 'Good air quality',
      [EXPOSURE_LEVELS.MODERATE]: 'Moderate air quality',
      [EXPOSURE_LEVELS.HIGH]: 'Poor air quality - Sensitive groups affected',
      [EXPOSURE_LEVELS.VERY_HIGH]: 'Very poor air quality - Limit outdoor activities',
      [EXPOSURE_LEVELS.EXTREME]: 'Hazardous air quality - Stay indoors',
    },
  };
  
  return descriptions[type]?.[level] || 'Unknown level';
};

// Validate location coordinates
export const isValidLocation = (latitude, longitude) => {
  return (
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180
  );
};

// Calculate distance between two points (Haversine formula)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
