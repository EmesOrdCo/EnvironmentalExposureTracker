import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { EXPOSURE_LEVELS } from '../types';
import { getExposureColor, getExposureIcon } from '../utils/mapDataUtils';

const CollapsibleLegend = ({ type = 'uv' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [slideAnim] = useState(new Animated.Value(0));

  const toggleLegend = () => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);
    
    Animated.timing(slideAnim, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

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

  const legendWidth = 200;

  return (
    <View style={styles.container}>
      {/* Arrow Button */}
      <TouchableOpacity
        style={styles.arrowButton}
        onPress={toggleLegend}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name={isExpanded ? "chevron-right" : "chevron-left"}
          size={20}
          color="#ffffff"
        />
      </TouchableOpacity>

             {/* Collapsible Legend Panel */}
       <Animated.View
         style={[
           styles.legendPanel,
           {
             transform: [{
               translateX: slideAnim.interpolate({
                 inputRange: [0, 1],
                 outputRange: [-legendWidth, 0],
               })
             }],
             opacity: slideAnim.interpolate({
               inputRange: [0, 0.5, 1],
               outputRange: [0, 0.5, 1],
             })
           }
         ]}
       >
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
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateY: -100 }],
    zIndex: 1000,
  },
  arrowButton: {
    position: 'absolute',
    right: 0,
    top: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  legendPanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 200,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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

export default CollapsibleLegend;
