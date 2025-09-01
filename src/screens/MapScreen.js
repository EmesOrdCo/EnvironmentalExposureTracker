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

const { width, height } = Dimensions.get('window');

const MapScreen = () => {
  const [location, setLocation] = useState(null);
  const [environmentalData, setEnvironmentalData] = useState([]);
  const [overlaySettings, setOverlaySettings] = useState({
    airQuality: true,
    pollen: false,
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
  const [overlayState, setOverlayState] = useState({ isClearing: false, isLoading: false });
  const [backendStatus, setBackendStatus] = useState('checking');
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    getCurrentLocation();
    checkBackendHealth();
  }, []);

  useEffect(() => {
    console.log('📍 Location useEffect triggered, location:', location);
    if (location) {
      console.log('📍 Location available, calling loadHeatmapTypes');
      loadHeatmapTypes();
    } else {
      console.log('📍 No location yet, waiting...');
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
      console.log('📍 Getting current location...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('📍 Location permission denied, using default location');
        Alert.alert('Permission Denied', 'Location permission is required to show your location on the map.');
        // Use default location (New York City)
        const defaultLocation = {
          latitude: 40.7128,
          longitude: -74.0060,
        };
        console.log('📍 Setting default location:', defaultLocation);
        setLocation(defaultLocation);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const locationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      };
      console.log('📍 Setting current location:', locationData);
      setLocation(locationData);
    } catch (error) {
      console.error('📍 Error getting location:', error);
      // Use default location
      const defaultLocation = {
        latitude: 40.7128,
        longitude: -74.0060,
      };
      console.log('📍 Setting default location due to error:', defaultLocation);
      setLocation(defaultLocation);
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

  // Exposure tracking UI removed from Map page (moved to History)

  const loadHeatmapTypes = async () => {
    console.log('🔄 loadHeatmapTypes called, location:', location);
    if (!location) {
      console.log('❌ No location available, skipping heatmap types load');
      return;
    }
    
    try {
      console.log('🔄 Loading heatmap types...');
      const types = await HeatmapService.getAvailableHeatmapTypes();
      console.log('✅ HeatmapService returned types:', types);
      setAvailableHeatmapTypes(types);
      console.log('✅ State updated with heatmap types:', types);
      
      // Set default heatmap types if none selected
      if (!selectedHeatmapTypes.airQuality && types.airQuality?.length > 0) {
        console.log('🎯 Setting default air quality type:', types.airQuality[0].name);
        setSelectedHeatmapTypes(prev => ({
          ...prev,
          airQuality: types.airQuality[0].name
        }));
      }
      if (!selectedHeatmapTypes.pollen && types.pollen?.length > 0) {
        console.log('🎯 Setting default pollen type:', types.pollen[0].name);
        setSelectedHeatmapTypes(prev => ({
          ...prev,
          pollen: types.pollen[0].name
        }));
      }
    } catch (error) {
      console.error('❌ Error loading heatmap types:', error);
      console.error('❌ Error stack:', error.stack);
    }
  };

  const toggleOverlay = (type) => {
    // Enforce single overlay active at a time
    const next = { airQuality: false, pollen: false };
    next[type] = true;
    setOverlaySettings(next);
    setSelectedType(type);
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
      onOverlayStateChange={setOverlayState}
    />
  );

  const renderOverlayControls = () => (
    <View style={styles.overlayControls}>
      <View style={styles.overlayHeader}>
        <Text style={styles.overlayTitle}>
          Overlays
          {overlayState.isClearing && (
            <Text style={styles.statusText}> (Clearing...)</Text>
          )}
          {overlayState.isLoading && (
            <Text style={styles.statusText}> (Loading...)</Text>
          )}
        </Text>
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => {
            // Send debug message to WebView
            console.log('Debug overlays requested');
            setDebugInfo('Debug message sent. Check console for details.');
          }}
        >
          <Text style={styles.debugButtonText}>Debug</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.buttonRow}>
        {['airQuality', 'pollen'].map((type) => {
          const isEnabled = overlaySettings[type];
          const isSelected = selectedType === type;
          
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.overlayButton,
                (selectedType === type) && styles.overlayButtonActive,
                isSelected && styles.overlayButtonSelected,
              ]}
              onPress={() => {
                toggleOverlay(type);
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name={getExposureIcon(type)}
                size={16}
                color={selectedType === type ? '#ffffff' : '#666'}
              />
              <Text style={[
                styles.overlayButtonText,
                (selectedType === type) && styles.overlayButtonTextActive,
              ]}>
                {type === 'airQuality' ? 'Air' : 'Pollen'}
              </Text>
              {isSelected && (
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
    
    // Debug logging
    console.log(`🔍 Type Selector Debug:`, {
      selectedType,
      hasAvailableTypes: Object.keys(availableHeatmapTypes).length > 0,
      typesForSelected: types.length,
      availableHeatmapTypes
    });
    
    return (
      <View style={styles.heatmapTypeSelector}>
        <Text style={styles.heatmapTypeTitle}>
          Type ({selectedType}) {types.length > 0 ? `- ${types.length} available` : '- Loading...'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {types.length > 0 ? types.map((type) => (
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
          )) : (
            <View style={styles.loadingTypesContainer}>
              <Text style={styles.loadingTypesText}>Loading types...</Text>
            </View>
          )}
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

      {/* Controls - Moved to top */}
      <View style={styles.topControlsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.overlayScrollView}>
          {renderOverlayControls()}
        </ScrollView>
        {renderHeatmapTypeSelector()}
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {renderMap()}
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
  topControlsContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  overlayScrollView: {
    marginBottom: 8,
  },
  loadingTypesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingTypesText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
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
  overlayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  debugButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  debugButtonText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '500',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666',
    fontStyle: 'italic',
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
