import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';

import {
  getExposureColor,
  getExposureIcon,
  getEnvironmentalSummary,
} from '../utils/mapDataUtils';
import CollapsibleLegend from '../components/CollapsibleLegend';
import HeatmapMap from '../components/HeatmapMap';
import HeatmapService from '../services/HeatmapService';
import backendService from '../services/BackendService';
import exposureTrackingService from '../services/ExposureTrackingService';

const { width, height } = Dimensions.get('window');

const MapScreen = () => {
  const [location, setLocation] = useState(null);
  const [environmentalData, setEnvironmentalData] = useState([]);
  const [overlaySettings, setOverlaySettings] = useState({
    pollen: true,
    airQuality: true,
  });
  const [selectedType, setSelectedType] = useState('airQuality');
  const [selectedHeatmapTypes, setSelectedHeatmapTypes] = useState({
    airQuality: 'US_AQI',
    pollen: 'TREE_UPI'
  });
  const [environmentalSummary, setEnvironmentalSummary] = useState(null);
  const [availableHeatmapTypes, setAvailableHeatmapTypes] = useState({
    airQuality: [],
    pollen: []
  });
  const [mapReady, setMapReady] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [exposureTrackingStatus, setExposureTrackingStatus] = useState('idle');
  const [exposureSummary, setExposureSummary] = useState(null);
  const [isTrackingExposure, setIsTrackingExposure] = useState(false);

  useEffect(() => {
    getCurrentLocation();
    checkBackendHealth();
    initializeExposureTracking();
  }, []);

  useEffect(() => {
    if (location) {
      loadHeatmapTypes();
    }
  }, [location]);

  useEffect(() => {
    if (environmentalData.length > 0) {
      const summary = getEnvironmentalSummary(environmentalData);
      setEnvironmentalSummary(summary);
    }
  }, [environmentalData]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show your location on the map.');
        // Use default location (New York City)
        setLocation({
          latitude: 40.7128,
          longitude: -74.0060,
        });
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      // Use default location
      setLocation({
        latitude: 40.7128,
        longitude: -74.0060,
      });
    }
  };

  const checkBackendHealth = async () => {
    try {
      console.log('🔍 Checking backend health...');
      const result = await backendService.healthCheck();
      
      if (result.success) {
        console.log('✅ Backend is healthy:', result.data);
        setBackendStatus('healthy');
      } else {
        console.error('❌ Backend health check failed:', result.error);
        setBackendStatus('unhealthy');
      }
    } catch (error) {
      console.error('❌ Backend health check error:', error);
      setBackendStatus('unhealthy');
    }
  };

  const initializeExposureTracking = async () => {
    try {
      console.log('🔍 Initializing exposure tracking...');
      const success = await exposureTrackingService.initialize();
      
      if (success) {
        setExposureTrackingStatus('ready');
        console.log('✅ Exposure tracking initialized');
      } else {
        setExposureTrackingStatus('error');
        console.error('❌ Failed to initialize exposure tracking');
      }
    } catch (error) {
      console.error('❌ Exposure tracking initialization error:', error);
      setExposureTrackingStatus('error');
    }
  };

  const toggleExposureTracking = async () => {
    try {
      if (isTrackingExposure) {
        // Stop tracking
        const result = await exposureTrackingService.stopTracking();
        if (result.success) {
          setIsTrackingExposure(false);
          setExposureTrackingStatus('stopped');
          console.log('✅ Exposure tracking stopped');
        } else {
          console.error('❌ Failed to stop exposure tracking:', result.error);
        }
      } else {
        // Start tracking
        const result = await exposureTrackingService.startTracking();
        if (result.success) {
          setIsTrackingExposure(true);
          setExposureTrackingStatus('tracking');
          console.log('✅ Exposure tracking started');
        } else {
          console.error('❌ Failed to start exposure tracking:', result.error);
        }
      }
    } catch (error) {
      console.error('❌ Exposure tracking toggle error:', error);
    }
  };

  const loadExposureSummary = async () => {
    try {
      const result = await exposureTrackingService.getDailySummary();
      if (result.success) {
        setExposureSummary(result.data);
        console.log('✅ Loaded exposure summary:', result.data);
      } else {
        console.error('❌ Failed to load exposure summary:', result.error);
      }
    } catch (error) {
      console.error('❌ Load exposure summary error:', error);
    }
  };

  const renderExposureTrackingControls = () => (
    <View style={styles.exposureTrackingContainer}>
      <View style={styles.exposureTrackingHeader}>
        <Text style={styles.exposureTrackingTitle}>Exposure Tracking</Text>
        <View style={styles.statusIndicator}>
          <View style={[
            styles.statusDot,
            { backgroundColor: getStatusColor(exposureTrackingStatus) }
          ]} />
          <Text style={styles.statusText}>{exposureTrackingStatus}</Text>
        </View>
      </View>
      
      <View style={styles.exposureTrackingButtons}>
        <TouchableOpacity
          style={[
            styles.trackingButton,
            isTrackingExposure && styles.trackingButtonActive
          ]}
          onPress={toggleExposureTracking}
          disabled={exposureTrackingStatus === 'error'}
        >
          <MaterialIcons
            name={isTrackingExposure ? 'stop' : 'play-arrow'}
            size={16}
            color={isTrackingExposure ? '#ffffff' : '#666'}
          />
          <Text style={[
            styles.trackingButtonText,
            isTrackingExposure && styles.trackingButtonTextActive
          ]}>
            {isTrackingExposure ? 'Stop Tracking' : 'Start Tracking'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.summaryButton}
          onPress={loadExposureSummary}
        >
          <MaterialIcons name="assessment" size={16} color="#666" />
          <Text style={styles.summaryButtonText}>Daily Summary</Text>
        </TouchableOpacity>
      </View>
      
      {exposureSummary && (
        <View style={styles.exposureSummaryContainer}>
          <Text style={styles.exposureSummaryTitle}>Today's Exposure</Text>
          <View style={styles.exposureSummaryRow}>
            <Text style={styles.exposureSummaryLabel}>Total Sessions:</Text>
            <Text style={styles.exposureSummaryValue}>
              {exposureSummary.summary?.total_sessions || 0}
            </Text>
          </View>
          <View style={styles.exposureSummaryRow}>
            <Text style={styles.exposureSummaryLabel}>Duration:</Text>
            <Text style={styles.exposureSummaryValue}>
              {exposureSummary.summary?.total_duration_minutes || 0} min
            </Text>
          </View>
          <View style={styles.exposureSummaryRow}>
            <Text style={styles.exposureSummaryLabel}>Overall Score:</Text>
            <Text style={styles.exposureSummaryValue}>
              {exposureSummary.summary?.total_overall_exposure || 0}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready':
      case 'tracking':
        return '#4CAF50';
      case 'stopped':
        return '#FF9800';
      case 'error':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const loadHeatmapTypes = async () => {
    if (!location) return;
    
    try {
      const types = await HeatmapService.getAvailableHeatmapTypes();
      setAvailableHeatmapTypes(types);
      console.log('Available heatmap types:', types);
    } catch (error) {
      console.error('Error loading heatmap types:', error);
    }
  };

  const toggleOverlay = (type) => {
    setOverlaySettings(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const renderMap = () => (
    <HeatmapMap
      location={location}
      overlaySettings={overlaySettings}
      selectedType={selectedType}
      selectedHeatmapTypes={selectedHeatmapTypes}
      onMapReady={() => setMapReady(true)}
      onRegionChange={(data) => {
        console.log('Map region changed:', data);
      }}
    />
  );

  const renderOverlayControls = () => (
    <View style={styles.overlayControls}>
      <Text style={styles.overlayTitle}>Overlays</Text>
      
      <View style={styles.buttonRow}>
        {['airQuality', 'pollen'].map((type) => {
          const isEnabled = overlaySettings[type];
          const isSelected = selectedType === type;
          
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.overlayButton,
                isEnabled && styles.overlayButtonActive,
                isSelected && styles.overlayButtonSelected,
              ]}
              onPress={() => {
                // Toggle overlay and select type in one action
                toggleOverlay(type);
                setSelectedType(type);
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={getExposureIcon(type)}
                size={16}
                color={isEnabled ? '#ffffff' : '#666'}
              />
              <Text style={[
                styles.overlayButtonText,
                isEnabled && styles.overlayButtonTextActive,
              ]}>
                {type === 'airQuality' ? 'Air' : 'Pollen'}
              </Text>
              {isSelected && isEnabled && (
                <View style={styles.selectedIndicator}>
                  <MaterialIcons name="check" size={12} color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderHeatmapTypeSelector = () => {
    const types = availableHeatmapTypes[selectedType] || [];
    
    return (
      <View style={styles.heatmapTypeSelector}>
        <Text style={styles.heatmapTypeTitle}>Type</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {types.map((type) => (
            <TouchableOpacity
              key={type.name}
              style={[
                styles.heatmapTypeButton,
                selectedHeatmapTypes[selectedType] === type.name && styles.heatmapTypeButtonActive,
              ]}
              onPress={() => setSelectedHeatmapTypes(prev => ({
                ...prev,
                [selectedType]: type.name
              }))}
            >
              <Text style={[
                styles.heatmapTypeButtonText,
                selectedHeatmapTypes[selectedType] === type.name && styles.heatmapTypeButtonTextActive,
              ]}>
                {type.displayName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Removed redundant renderTypeSelector - functionality merged into renderOverlayControls

  const renderEnvironmentalSummary = () => {
    if (!environmentalSummary) return null;

    return (
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Area Summary</Text>
        <View style={styles.summaryGrid}>
          {Object.entries(environmentalSummary).map(([type, data]) => (
            <View key={type} style={styles.summaryItem}>
              <View style={styles.summaryHeader}>
                <MaterialIcons
                  name={getExposureIcon(type)}
                  size={16}
                  color={getExposureColor(type, data.level)}
                />
                <Text style={styles.summaryType}>
                  {type === 'uv' ? 'UV Index' : 
                   type === 'pollen' ? 'Pollen' : 'Air Quality'}
                </Text>
              </View>
              <Text style={styles.summaryValue}>
                {data.average.toFixed(1)}
              </Text>
              <Text style={[
                styles.summaryLevel,
                { color: getExposureColor(type, data.level) },
              ]}>
                {data.level.charAt(0).toUpperCase() + data.level.slice(1)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#4CAF50" />
      
      {/* Header */}
      <LinearGradient
        colors={['#4CAF50', '#45A049']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Environmental Map</Text>
        <Text style={styles.headerSubtitle}>Track environmental conditions in your area</Text>
      </LinearGradient>

      {/* Map */}
      <View style={styles.mapContainer}>
        {renderMap()}
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {renderOverlayControls()}
        </ScrollView>
        {mapReady && renderHeatmapTypeSelector()}
        {renderExposureTrackingControls()}
      </View>

      {/* Summary */}
      {renderEnvironmentalSummary()}
      
      {/* Collapsible Legend */}
      <CollapsibleLegend type={selectedType} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  mapContainer: {
    flex: 1,
    margin: 4,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#ffffff',
  },

  controlsContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  overlayControls: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  overlayTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    flex: 1,
    marginHorizontal: 4,
  },
  overlayButtonActive: {
    backgroundColor: '#4CAF50',
  },
  overlayButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginLeft: 6,
  },
  overlayButtonTextActive: {
    color: '#ffffff',
  },

  overlayButtonSelected: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Removed unused type selector styles
  heatmapTypeSelector: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  heatmapTypeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  heatmapTypeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  heatmapTypeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  heatmapTypeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  heatmapTypeButtonTextActive: {
    color: '#ffffff',
  },
  // Exposure tracking styles
  exposureTrackingContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  exposureTrackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exposureTrackingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  exposureTrackingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    flex: 1,
    marginRight: 8,
  },
  trackingButtonActive: {
    backgroundColor: '#F44336',
  },
  trackingButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginLeft: 6,
  },
  trackingButtonTextActive: {
    color: '#ffffff',
  },
  summaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  summaryButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginLeft: 6,
  },
  exposureSummaryContainer: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  exposureSummaryTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  exposureSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  exposureSummaryLabel: {
    fontSize: 12,
    color: '#666',
  },
  exposureSummaryValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  summaryContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryType: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  summaryLevel: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default MapScreen;
