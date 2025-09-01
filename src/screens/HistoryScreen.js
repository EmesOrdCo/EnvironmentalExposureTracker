import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import ExposureTrackingService from '../services/ExposureTrackingService';
import ExposureHistoryService from '../services/ExposureHistoryService';
import ExposureSamplingService from '../services/ExposureSamplingService';
import ExposureChart from '../components/ExposureChart';
import ComingSoonChart from '../components/ComingSoonChart';
import { formatTimestamp } from '../utils/exposureUtils';

const HistoryScreen = () => {
  const [isTracking, setIsTracking] = useState(true); // Always tracking
  const [currentData, setCurrentData] = useState({ uv: null, pollen: null, airQuality: null });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exposureData, setExposureData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [timeRange, setTimeRange] = useState(24); // hours
  const [loading, setLoading] = useState(false);
  const [samplingStatus, setSamplingStatus] = useState(null);

  useEffect(() => {
    const init = async () => {
      await ExposureTrackingService.initialize();
      const status = ExposureTrackingService.getTrackingStatus();
      setIsTracking(status.isTracking);
      setCurrentData(status.currentData || { uv: null, pollen: null, airQuality: null });
      setLastUpdate(status.lastUpdate || null);
      
      // Start environmental sampling
      await ExposureSamplingService.startSampling();
      setSamplingStatus(ExposureSamplingService.getSamplingStatus());
      
      // Load exposure data
      await loadExposureData();
    };
    init();

    return () => {
      // Stop sampling when component unmounts
      ExposureSamplingService.stopSampling();
    };
  }, []);

  useEffect(() => {
    // Reload data when time range changes
    if (timeRange) {
      loadExposureData();
    }
  }, [timeRange]);

  const updateSnapshot = () => {
    const data = ExposureTrackingService.getCurrentData();
    setCurrentData({ uv: data.uv, pollen: data.pollen, airQuality: data.airQuality });
    setLastUpdate(data.lastUpdate);
  };

  const loadExposureData = async () => {
    setLoading(true);
    try {
      const result = await ExposureHistoryService.getCumulativeExposureData(timeRange);
      if (result.success) {
        setExposureData(result.data);
        
        // Load statistics
        const statsResult = await ExposureHistoryService.getExposureStatistics(timeRange);
        if (statsResult.success) {
          setStatistics(statsResult.statistics);
        }
      } else {
        console.error('Failed to load exposure data:', result.error);
        
        Alert.alert(
          'No Real Data Available', 
          result.error || 'No real environmental data is currently available. The system requires real heatmap data sampling to function properly.'
        );
        setExposureData(null);
        setStatistics(null);
      }
    } catch (error) {
      console.error('Error loading exposure data:', error);
      Alert.alert(
        'Data Loading Error', 
        'Failed to load real environmental data. Please ensure location services are enabled and try again.'
      );
      setExposureData(null);
      setStatistics(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (hours) => {
    setTimeRange(hours);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await ExposureTrackingService.updateEnvironmentalData();
      updateSnapshot();
      await loadExposureData();
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Auto-tracking is always active - no manual start/stop needed

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#4CAF50" />

      <LinearGradient colors={['#4CAF50', '#45A049']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Exposure History</Text>
          <Text style={styles.headerSubtitle}>Start and stop tracking sessions</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <MaterialIcons name="location-on" size={16} color="#4CAF50" />
            <Text style={styles.statusText}>Auto-Tracking Active</Text>
          </View>
                   <View style={styles.statusItem}>
           <MaterialIcons name="access-time" size={16} color="#666" />
           <Text style={styles.statusText}>Every hour</Text>
         </View>
        </View>

        {/* Auto-tracking status */}
        <View style={styles.autoTrackingStatus}>
          <View style={styles.autoTrackingCard}>
            <MaterialIcons name="auto-awesome" size={24} color="#4CAF50" />
            <Text style={styles.autoTrackingTitle}>Auto-Tracking Active</Text>
                      <Text style={styles.autoTrackingSubtitle}>
            Environmental data is being sampled every hour
          </Text>
          </View>
        </View>

        <View style={styles.snapshot}>
          <Text style={styles.sectionTitle}>Latest Snapshot</Text>
          <View style={styles.snapshotRow}>
            <Text style={styles.label}>UV:</Text>
            <Text style={styles.value}>
              {currentData.uv ? `${currentData.uv.value ?? '-'} (${currentData.uv.level ?? '-'})` : '—'}
            </Text>
          </View>
          <View style={styles.snapshotRow}>
            <Text style={styles.label}>Pollen:</Text>
            <Text style={styles.value}>
              {currentData.pollen ? `${currentData.pollen.value ?? '-'} (${currentData.pollen.level ?? '-'})` : '—'}
            </Text>
          </View>
          <View style={styles.snapshotRow}>
            <Text style={styles.label}>Air Quality:</Text>
            <Text style={styles.value}>
              {currentData.airQuality ? `${currentData.airQuality.value ?? '-'} (${currentData.airQuality.level ?? '-'})` : '—'}
            </Text>
          </View>
        </View>

        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          <Text style={styles.sectionTitle}>Time Range</Text>
          <View style={styles.timeRangeButtons}>
            {[6, 12, 24, 48].map((hours) => (
              <TouchableOpacity
                key={hours}
                style={[
                  styles.timeRangeButton,
                  timeRange === hours && styles.timeRangeButtonActive
                ]}
                onPress={() => handleTimeRangeChange(hours)}
              >
                <Text style={[
                  styles.timeRangeButtonText,
                  timeRange === hours && styles.timeRangeButtonTextActive
                ]}>
                  {hours}h
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Statistics Summary */}
        {statistics && (
          <View style={styles.statisticsContainer}>
            <Text style={styles.sectionTitle}>Cumulative Exposure Summary</Text>
            <View style={styles.statisticsGrid}>
              <View style={styles.statisticItem}>
                <Text style={styles.statisticLabel}>Total Air Quality</Text>
                <Text style={styles.statisticValue}>{statistics.totalAirQuality.toFixed(1)} AQI</Text>
              </View>
              <View style={styles.statisticItem}>
                <Text style={styles.statisticLabel}>Total Pollen (UPI)</Text>
                <Text style={styles.statisticValue}>{statistics.totalPollen.toFixed(1)} UPI</Text>
              </View>
              <View style={styles.statisticItem}>
                <Text style={styles.statisticLabel}>Sampling Status</Text>
                <Text style={styles.statisticValue}>
                  {samplingStatus?.isSampling ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Exposure Charts */}
        <View style={styles.chartsContainer}>
          <Text style={styles.sectionTitle}>Environmental Exposure Tracking</Text>
          
          {loading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading real exposure data...</Text>
            </View>
          )}

          {!loading && !exposureData && (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="warning" size={48} color="#FF9800" />
              <Text style={styles.noDataTitle}>No Real Data Available</Text>
              <Text style={styles.noDataText}>
                Real environmental data sampling is required. The system needs to sample heatmap tiles at your location to display exposure charts.
              </Text>
              <Text style={styles.noDataSubtext}>
                Please ensure location services are enabled and try again later.
              </Text>
            </View>
          )}

          {exposureData && (
            <>
              <ExposureChart
                title={`Air Quality Exposure (US AQI) - Last ${timeRange}h`}
                data={{
                  labels: exposureData.labels,
                  cumulative: exposureData.cumulativeAirQuality
                }}
                color="#FF6B6B"
                icon="air"
                unit=" AQI"
                showCumulative={true}
              />

              <ExposureChart
                title={`Pollen Exposure (UPI Scale) - Last ${timeRange}h`}
                data={{
                  labels: exposureData.labels,
                  cumulative: exposureData.cumulativePollen
                }}
                color="#4ECDC4"
                icon="local-florist"
                unit=" UPI"
                showCumulative={true}
              />

              <ComingSoonChart
                title="UV Exposure"
                icon="wb-sunny"
                color="#FFE66D"
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  headerSubtitle: { fontSize: 16, color: '#ffffff', opacity: 0.9 },
  content: { flex: 1 },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  statusItem: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 14, color: '#666', marginLeft: 4 },
  actions: { padding: 20 },
  actionButton: { borderRadius: 12, overflow: 'hidden' },
  actionButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  start: {},
  stop: {},
  snapshot: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 12 },
  snapshotRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontSize: 14, color: '#666' },
  value: { fontSize: 14, color: '#333', fontWeight: '500' },
  timeRangeContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 24,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  timeRangeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  timeRangeButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timeRangeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  timeRangeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  timeRangeButtonTextActive: {
    color: '#ffffff',
  },
  statisticsContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 24,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  statisticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statisticItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  statisticLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  statisticValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  chartsContainer: {
    paddingVertical: 10,
  },
  loadingContainer: {
    backgroundColor: '#ffffff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  noDataContainer: {
    backgroundColor: '#ffffff',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF9800',
    marginTop: 16,
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  autoTrackingStatus: {
    margin: 20,
  },
  autoTrackingCard: {
    backgroundColor: '#F8FFF8',
    borderRadius: 20,
    padding: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  autoTrackingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 12,
    flex: 1,
  },
  autoTrackingSubtitle: {
    fontSize: 12,
    color: '#666',
    marginLeft: 12,
    marginTop: 4,
  },
});

export default HistoryScreen;


