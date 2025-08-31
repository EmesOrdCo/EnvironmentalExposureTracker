import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { EXPOSURE_LEVELS } from '../types';
import { getExposureColor, getExposureIcon } from '../utils/mapDataUtils';

const MapLegend = ({ type = 'uv' }) => {
  const getTypeName = () => {
    switch (type) {
      case 'uv': return 'UV Index';
      case 'pollen': return 'Pollen Count';
      case 'airQuality': return 'Air Quality';
      default: return 'Environmental Data';
    }
  };

  const getValueRange = (level) => {
    const ranges = {
      uv: {
        [EXPOSURE_LEVELS.LOW]: '0-3',
        [EXPOSURE_LEVELS.MODERATE]: '3-6',
        [EXPOSURE_LEVELS.HIGH]: '6-8',
        [EXPOSURE_LEVELS.VERY_HIGH]: '8-11',
        [EXPOSURE_LEVELS.EXTREME]: '11+',
      },
      pollen: {
        [EXPOSURE_LEVELS.LOW]: '0-2.4',
        [EXPOSURE_LEVELS.MODERATE]: '2.4-4.8',
        [EXPOSURE_LEVELS.HIGH]: '4.8-7.2',
        [EXPOSURE_LEVELS.VERY_HIGH]: '7.2-9.6',
        [EXPOSURE_LEVELS.EXTREME]: '9.6+',
      },
      airQuality: {
        [EXPOSURE_LEVELS.LOW]: '0-51',
        [EXPOSURE_LEVELS.MODERATE]: '51-101',
        [EXPOSURE_LEVELS.HIGH]: '101-151',
        [EXPOSURE_LEVELS.VERY_HIGH]: '151-201',
        [EXPOSURE_LEVELS.EXTREME]: '201+',
      },
    };
    return ranges[type][level] || 'N/A';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons
          name={getExposureIcon(type)}
          size={20}
          color="#333"
        />
        <Text style={styles.title}>{getTypeName()} Legend</Text>
      </View>
      
      <View style={styles.legendItems}>
        {Object.values(EXPOSURE_LEVELS).map((level) => (
          <View key={level} style={styles.legendItem}>
            <View style={[
              styles.colorIndicator,
              { backgroundColor: getExposureColor(type, level) }
            ]} />
            <Text style={styles.levelText}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Text>
            <Text style={styles.rangeText}>
              {getValueRange(level)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    margin: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  legendItems: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  rangeText: {
    fontSize: 12,
    color: '#666',
  },
});

export default MapLegend;
