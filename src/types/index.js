// Environmental Exposure Types

export const EXPOSURE_TYPES = {
  UV: 'uv',
  POLLEN: 'pollen',
  AIR_QUALITY: 'airQuality',
};

export const EXPOSURE_LEVELS = {
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  VERY_HIGH: 'veryHigh',
  EXTREME: 'extreme',
};

export const TIME_RANGES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
};

// Data structures
export const ExposureData = {
  type: EXPOSURE_TYPES.UV | EXPOSURE_TYPES.POLLEN | EXPOSURE_TYPES.AIR_QUALITY,
  value: Number,
  level: EXPOSURE_LEVELS.LOW | EXPOSURE_LEVELS.MODERATE | EXPOSURE_LEVELS.HIGH | EXPOSURE_LEVELS.VERY_HIGH | EXPOSURE_LEVELS.EXTREME,
  timestamp: String,
  location: {
    latitude: Number,
    longitude: Number,
  },
};

export const AlertData = {
  id: String,
  type: EXPOSURE_TYPES.UV | EXPOSURE_TYPES.POLLEN | EXPOSURE_TYPES.AIR_QUALITY,
  level: EXPOSURE_LEVELS.LOW | EXPOSURE_LEVELS.MODERATE | EXPOSURE_LEVELS.HIGH | EXPOSURE_LEVELS.VERY_HIGH | EXPOSURE_LEVELS.EXTREME,
  message: String,
  timestamp: String,
  isRead: Boolean,
};

export const UserSettings = {
  uvThreshold: Number,
  pollenThreshold: Number,
  airQualityThreshold: Number,
  skinSensitivity: 'low' | 'medium' | 'high',
  allergyTypes: Array,
  notificationEnabled: Boolean,
  updateInterval: Number,
};
