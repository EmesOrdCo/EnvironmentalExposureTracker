import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ExposureCard from '../components/ExposureCard';
import { formatTimestamp } from '../utils/exposureUtils';

const DashboardScreen = ({ navigation }) => {
  const [currentData, setCurrentData] = useState({
    uv: null,
    pollen: null,
    airQuality: null,
  });
  const [isTracking] = useState(true); // Always tracking
  const [lastUpdate] = useState(null);
  const [refreshing] = useState(false);

  useEffect(() => {
    // Dashboard no longer manages tracking lifecycle
  }, []);

  const handleStartTracking = async () => {};
  const handleStopTracking = async () => {};

  const updateData = () => {};

  const onRefresh = async () => {};

  const handleCardPress = (type) => {
    navigation.navigate('ExposureHistory', { type });
  };

  const renderTrackingButton = () => (
    <TouchableOpacity
      style={[styles.trackingButton, isTracking && styles.trackingButtonActive]}
      onPress={isTracking ? handleStopTracking : handleStartTracking}
    >
      <LinearGradient
        colors={isTracking ? ['#FF5722', '#E91E63'] : ['#4CAF50', '#45A049']}
        style={styles.trackingButtonGradient}
      >
        <MaterialIcons
          name={isTracking ? 'stop' : 'play-arrow'}
          size={24}
          color="#ffffff"
        />
        <Text style={styles.trackingButtonText}>
          {isTracking ? 'Stop Tracking' : 'Start Tracking'}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderStatusBar = () => (
    <View style={styles.statusBar}>
      <View style={styles.statusItem}>
        <MaterialIcons name="location-on" size={16} color="#4CAF50" />
        <Text style={styles.statusText}>
          Auto-Tracking Active
        </Text>
      </View>
      <View style={styles.statusItem}>
        <MaterialIcons name="access-time" size={16} color="#666" />
        <Text style={styles.statusText}>
          Every 15 minutes
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#4CAF50" />
      
      {/* Header */}
      <LinearGradient
        colors={['#4CAF50', '#45A049']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Environmental Exposure</Text>
          <Text style={styles.headerSubtitle}>Track your environmental health</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <MaterialIcons name="settings" size={24} color="#ffffff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Status Bar */}
        {renderStatusBar()}

        {/* Auto-tracking status */}
        <View style={styles.autoTrackingSection}>
          <View style={styles.autoTrackingCard}>
            <MaterialIcons name="auto-awesome" size={24} color="#4CAF50" />
            <Text style={styles.autoTrackingTitle}>Auto-Tracking Active</Text>
            <Text style={styles.autoTrackingSubtitle}>
              Environmental data is being sampled every 15 minutes
            </Text>
          </View>
        </View>

        {/* Exposure Cards */}
        <View style={styles.cardsSection}>
          <Text style={styles.sectionTitle}>Current Exposure</Text>
          
          {!currentData.uv && !currentData.airQuality && !currentData.pollen ? (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="cloud-off" size={48} color="#999" />
              <Text style={styles.noDataTitle}>No Data Available</Text>
              <Text style={styles.noDataSubtitle}>
                Pull down to refresh and try again
              </Text>
            </View>
          ) : (
            <>
              <ExposureCard
                type="uv"
                value={currentData.uv?.value}
                level={currentData.uv?.level}
                title="UV Index"
                subtitle="Sun exposure risk"
                onPress={() => handleCardPress('uv')}
                style={styles.card}
              />

          <ExposureCard
            type="pollen"
            value={currentData.pollen?.value}
            level={currentData.pollen?.level}
            title="Pollen Count"
            subtitle="Allergy risk"
            onPress={() => handleCardPress('pollen')}
            style={styles.card}
          />

          <ExposureCard
            type="airQuality"
            value={currentData.airQuality?.value}
            level={currentData.airQuality?.level}
            title="Air Quality"
            subtitle="Pollution levels"
            onPress={() => handleCardPress('airQuality')}
            style={styles.card}
          />
            </>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Alerts')}
            >
              <View style={styles.quickActionIcon}>
                <MaterialIcons name="notifications" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.quickActionText}>Alerts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('ExposureHistory')}
            >
              <View style={styles.quickActionIcon}>
                <MaterialIcons name="timeline" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.quickActionText}>History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <View style={styles.quickActionIcon}>
                <MaterialIcons name="tune" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.quickActionText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
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
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  noDataSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  trackingSection: {
    padding: 20,
  },
  trackingButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  trackingButtonActive: {
    elevation: 4,
  },
  trackingButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  trackingButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cardsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionButton: {
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  quickActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  autoTrackingSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  autoTrackingCard: {
    backgroundColor: '#f8fff8',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
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

export default DashboardScreen;
