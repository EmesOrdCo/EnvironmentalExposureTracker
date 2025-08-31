import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { getExposureColor, getExposureIcon, getExposureDescription } from '../utils/exposureUtils';

const ExposureCard = ({ 
  type, 
  value, 
  level, 
  title, 
  subtitle, 
  onPress, 
  showIcon = true,
  showDescription = true,
  style = {} 
}) => {
  const color = getExposureColor(type, level);
  const icon = getExposureIcon(type);
  const description = getExposureDescription(type, level);

  const CardContent = () => (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={[color + '20', color + '10']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          {showIcon && (
            <View style={[styles.iconContainer, { backgroundColor: color + '30' }]}>
              <MaterialIcons name={icon} size={24} color={color} />
            </View>
          )}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.valueContainer}>
            <Text style={[styles.value, { color }]}>{value?.toFixed(1) || '--'}</Text>
            <Text style={styles.unit}>{getUnit(type)}</Text>
          </View>

          <View style={[styles.levelBadge, { backgroundColor: color }]}>
            <Text style={styles.levelText}>
              {level?.charAt(0).toUpperCase() + level?.slice(1) || 'Unknown'}
            </Text>
          </View>
        </View>

        {showDescription && (
          <Text style={styles.description}>{description}</Text>
        )}
      </LinearGradient>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <CardContent />
      </TouchableOpacity>
    );
  }

  return <CardContent />;
};

const getUnit = (type) => {
  switch (type) {
    case 'uv':
      return 'UV Index';
    case 'pollen':
      return 'Pollen Count';
    case 'airQuality':
      return 'AQI';
    default:
      return '';
  }
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  gradient: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
    marginRight: 4,
  },
  unit: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  levelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  levelText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default ExposureCard;
