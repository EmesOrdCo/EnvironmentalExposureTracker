import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ExposureTrackingService from '../services/ExposureTrackingService';
import APIService from '../services/APIService';

const SettingsScreen = () => {
  const [settings, setSettings] = useState({
    uvThreshold: 6,
    pollenThreshold: 4.8,
    airQualityThreshold: 100,
    skinSensitivity: 'medium',
    allergyTypes: [],
    notificationEnabled: true,
    updateInterval: 15,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userSettings = await ExposureTrackingService.getUserSettings();
      if (userSettings) {
        setSettings(userSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Keep default settings if loading fails
    }
  };

  const updateSetting = async (key, value) => {
    try {
      setLoading(true);
      const newSettings = { ...settings, [key]: value };
      const success = await ExposureTrackingService.updateUserSettings(newSettings);
      
      if (success) {
        setSettings(newSettings);
      } else {
        // Even if database update fails, update local state for better UX
        setSettings(newSettings);
        console.warn('Database update failed, but settings updated locally');
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      // Update local state even if there's an error
      setSettings({ ...settings, [key]: value });
      Alert.alert('Warning', 'Settings updated locally but may not persist');
    } finally {
      setLoading(false);
    }
  };

  const renderThresholdSlider = (title, value, key, min, max, step) => (
    <View style={styles.settingItem}>
      <View style={styles.settingHeader}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingValue}>{value}</Text>
      </View>
      <View style={styles.sliderContainer}>
        <TouchableOpacity
          style={styles.sliderTrack}
          onPress={() => {
            const newValue = Math.max(min, value - step);
            updateSetting(key, newValue);
          }}
        >
          <View style={[styles.sliderFill, { width: `${((value - min) / (max - min)) * 100}%` }]} />
        </TouchableOpacity>
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabel}>{min}</Text>
          <Text style={styles.sliderLabel}>{max}</Text>
        </View>
      </View>
    </View>
  );

  const renderPicker = (title, value, key, options) => (
    <View style={styles.settingItem}>
      <Text style={styles.settingTitle}>{title}</Text>
      <View style={styles.pickerContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.pickerOption,
              value === option.value && styles.pickerOptionActive,
            ]}
            onPress={() => updateSetting(key, option.value)}
          >
            <Text style={[
              styles.pickerOptionText,
              value === option.value && styles.pickerOptionTextActive,
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSwitch = (title, value, key) => (
    <View style={styles.settingItem}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Switch
        value={value}
        onValueChange={(newValue) => updateSetting(key, newValue)}
        trackColor={{ false: '#e0e0e0', true: '#4CAF50' }}
        thumbColor={value ? '#ffffff' : '#f4f3f4'}
      />
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
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Customize your environmental monitoring</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Alert Thresholds */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Thresholds</Text>
          
          {renderThresholdSlider(
            'UV Index Threshold',
            settings.uvThreshold,
            'uvThreshold',
            1,
            11,
            0.5
          )}
          
          {renderThresholdSlider(
            'Pollen Count Threshold',
            settings.pollenThreshold,
            'pollenThreshold',
            1,
            10,
            0.2
          )}
          
          {renderThresholdSlider(
            'Air Quality Threshold',
            settings.airQualityThreshold,
            'airQualityThreshold',
            50,
            300,
            10
          )}
        </View>

        {/* Personal Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Settings</Text>
          
          {renderPicker(
            'Skin Sensitivity',
            settings.skinSensitivity,
            'skinSensitivity',
            [
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]
          )}
          
          {renderPicker(
            'Update Interval',
            settings.updateInterval,
            'updateInterval',
            [
              { value: 5, label: '5 minutes' },
              { value: 15, label: '15 minutes' },
              { value: 30, label: '30 minutes' },
              { value: 60, label: '1 hour' },
            ]
          )}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          {renderSwitch(
            'Enable Notifications',
            settings.notificationEnabled,
            'notificationEnabled'
          )}
        </View>

        {/* Google Cloud API */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Google Cloud API</Text>
          
          <View style={styles.infoItem}>
            <MaterialIcons 
              name={APIService.isGoogleCloudAvailable() ? 'check-circle' : 'error'} 
              size={20} 
              color={APIService.isGoogleCloudAvailable() ? '#4CAF50' : '#FF5722'} 
            />
            <Text style={styles.infoText}>
              {APIService.isGoogleCloudAvailable() ? 'API Configured' : 'API Not Configured'}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.apiButton}
            onPress={() => {
              Alert.alert(
                'Google Cloud API',
                'Google Cloud API is configured with your key. The app will use real-time environmental data from Google Cloud APIs for Air Quality and Pollen data.',
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={styles.apiButtonText}>View API Status</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          
          <View style={styles.infoItem}>
            <MaterialIcons name="info" size={20} color="#666" />
            <Text style={styles.infoText}>Environmental Exposure Tracker</Text>
          </View>
          
          <View style={styles.infoItem}>
            <MaterialIcons name="code" size={20} color="#666" />
            <Text style={styles.infoText}>Version 1.0.0</Text>
          </View>
          
          <View style={styles.infoItem}>
            <MaterialIcons name="build" size={20} color="#666" />
            <Text style={styles.infoText}>Expo SDK 53</Text>
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
  content: {
    flex: 1,
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  sliderContainer: {
    marginTop: 8,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    position: 'relative',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
  },
  pickerContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  pickerOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  pickerOptionActive: {
    backgroundColor: '#4CAF50',
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  pickerOptionTextActive: {
    color: '#ffffff',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  apiButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  apiButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SettingsScreen;
