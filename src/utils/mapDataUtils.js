import { EXPOSURE_LEVELS } from '../types';

// Note: This function is no longer used since we're using real API data
// Keeping the structure for potential future use with real data
export const generateEnvironmentalData = (centerLat, centerLng, radius = 0.1) => {
  // This would be populated with real API data
  return [];
};

// Calculate exposure level based on value and type
const calculateExposureLevel = (value, type) => {
  const thresholds = {
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
  
  const typeThresholds = thresholds[type];
  
  if (value <= typeThresholds.MODERATE) return EXPOSURE_LEVELS.LOW;
  if (value <= typeThresholds.HIGH) return EXPOSURE_LEVELS.MODERATE;
  if (value <= typeThresholds.VERY_HIGH) return EXPOSURE_LEVELS.HIGH;
  if (value <= typeThresholds.EXTREME) return EXPOSURE_LEVELS.VERY_HIGH;
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

// Get opacity for map overlay based on exposure level
export const getExposureOpacity = (level) => {
  const opacities = {
    [EXPOSURE_LEVELS.LOW]: 0.2,
    [EXPOSURE_LEVELS.MODERATE]: 0.4,
    [EXPOSURE_LEVELS.HIGH]: 0.6,
    [EXPOSURE_LEVELS.VERY_HIGH]: 0.8,
    [EXPOSURE_LEVELS.EXTREME]: 0.9,
  };
  return opacities[level] || 0.2;
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

// Generate heatmap data for a specific environmental type
export const generateHeatmapData = (environmentalData, type) => {
  return environmentalData.map(point => ({
    latitude: point.coordinate.latitude,
    longitude: point.coordinate.longitude,
    weight: point[type].value,
    color: getExposureColor(type, point[type].level),
    opacity: getExposureOpacity(point[type].level),
  }));
};

// Get environmental summary for a region
export const getEnvironmentalSummary = (environmentalData) => {
  if (!environmentalData || environmentalData.length === 0) {
    return {
      uv: { average: 0, max: 0, level: EXPOSURE_LEVELS.LOW },
      pollen: { average: 0, max: 0, level: EXPOSURE_LEVELS.LOW },
      airQuality: { average: 0, max: 0, level: EXPOSURE_LEVELS.LOW },
    };
  }

  const uvValues = environmentalData.map(d => d.uv.value);
  const pollenValues = environmentalData.map(d => d.pollen.value);
  const airQualityValues = environmentalData.map(d => d.airQuality.value);

  return {
    uv: {
      average: uvValues.reduce((a, b) => a + b, 0) / uvValues.length,
      max: Math.max(...uvValues),
      level: calculateExposureLevel(
        uvValues.reduce((a, b) => a + b, 0) / uvValues.length,
        'UV'
      ),
    },
    pollen: {
      average: pollenValues.reduce((a, b) => a + b, 0) / pollenValues.length,
      max: Math.max(...pollenValues),
      level: calculateExposureLevel(
        pollenValues.reduce((a, b) => a + b, 0) / pollenValues.length,
        'POLLEN'
      ),
    },
    airQuality: {
      average: airQualityValues.reduce((a, b) => a + b, 0) / airQualityValues.length,
      max: Math.max(...airQualityValues),
      level: calculateExposureLevel(
        airQualityValues.reduce((a, b) => a + b, 0) / airQualityValues.length,
        'AIR_QUALITY'
      ),
    },
  };
};
