import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import APIService from '../services/APIService';
import { GOOGLE_CLOUD_API_CONFIG, HEATMAP_DESCRIPTIONS } from '../constants/googleCloudAPI';

const GoogleCloudAPISettings = () => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [availableTypes, setAvailableTypes] = useState(null);
  const [selectedAirQualityType, setSelectedAirQualityType] = useState('US_AQI');
  const [selectedPollenType, setSelectedPollenType] = useState('TREE_POLLEN');

  useEffect(() => {
    checkConfiguration();
    loadAvailableTypes();
  }, []);

  const checkConfiguration = () => {
    setIsConfigured(APIService.isGoogleCloudAvailable());
  };

  const loadAvailableTypes = async () => {
    try {
      const types = await APIService.getAvailableHeatmapTypes();
      setAvailableTypes(types);
    } catch (error) {
      console.error('Error loading heatmap types:', error);
    }
  };

  const handleSaveAPIKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter a valid API key');
      return;
    }

    setIsLoading(true);
    try {
      const success = await APIService.initGoogleCloudAPI(apiKey.trim());
      if (success) {
        setIsConfigured(true);
        Alert.alert('Success', 'Google Cloud API configured successfully!');
        setApiKey(''); // Clear the input for security
      } else {
        Alert.alert('Error', 'Failed to configure Google Cloud API. Please check your API key.');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to configure API: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!isConfigured) {
      Alert.alert('Error', 'Please configure the API key first');
      return;
    }

    setIsLoading(true);
    try {
      // Test by fetching available heatmap types
      const types = await APIService.getAvailableHeatmapTypes();
      Alert.alert('Success', 'Google Cloud API connection is working!');
      setAvailableTypes(types);
    } catch (error) {
      Alert.alert('Error', `Connection test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = () => {
    APIService.clearCache();
    Alert.alert('Success', 'Cache cleared successfully');
  };

  const getCacheStats = () => {
    return APIService.getCacheStats();
  };

  const renderHeatmapTypeSelector = (type, selectedType, onSelect) => {
    const types = type === 'airQuality' 
      ? GOOGLE_CLOUD_API_CONFIG.AIR_QUALITY_HEATMAP_TYPES
      : GOOGLE_CLOUD_API_CONFIG.POLLEN_HEATMAP_TYPES;

    return (
      <View style={styles.selectorContainer}>
        <Text style={styles.selectorTitle}>
          {type === 'airQuality' ? 'Air Quality' : 'Pollen'} Heatmap Type
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {Object.entries(types).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.typeButton,
                selectedType === value && styles.typeButtonActive,
              ]}
              onPress={() => onSelect(value)}
            >
              <Text style={[
                styles.typeButtonText,
                selectedType === value && styles.typeButtonTextActive,
              ]}>
                {HEATMAP_DESCRIPTIONS[key]?.name || key}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#4CAF50', '#45A049']}
        style={styles.header}
      >
        <MaterialIcons name="cloud" size={32} color="#ffffff" />
        <Text style={styles.headerTitle}>Google Cloud API Settings</Text>
        <Text style={styles.headerSubtitle}>
          Configure your Google Cloud API for real-time environmental data
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* API Key Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>API Configuration</Text>
          
          <View style={styles.statusContainer}>
            <MaterialIcons
              name={isConfigured ? 'check-circle' : 'error'}
              size={24}
              color={isConfigured ? '#4CAF50' : '#FF5722'}
            />
            <Text style={styles.statusText}>
              {isConfigured ? 'API Configured' : 'API Not Configured'}
            </Text>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Enter your Google Cloud API key"
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleSaveAPIKey}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Configuring...' : 'Save API Key'}
            </Text>
          </TouchableOpacity>

          {isConfigured && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleTestConnection}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Test Connection</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Heatmap Type Selection */}
        {isConfigured && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Heatmap Configuration</Text>
            
            {renderHeatmapTypeSelector('airQuality', selectedAirQualityType, setSelectedAirQualityType)}
            {renderHeatmapTypeSelector('pollen', selectedPollenType, setSelectedPollenType)}
          </View>
        )}

        {/* Cache Management */}
        {isConfigured && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cache Management</Text>
            
            <View style={styles.cacheStats}>
              <Text style={styles.cacheStatsText}>
                Cached Tiles: {getCacheStats().size}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.warningButton]}
              onPress={handleClearCache}
            >
              <Text style={styles.buttonText}>Clear Cache</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information</Text>
          
          <View style={styles.infoContainer}>
            <MaterialIcons name="info" size={20} color="#2196F3" />
            <Text style={styles.infoText}>
              Google Cloud APIs provide real-time environmental data with heatmap overlays.
            </Text>
          </View>
          
          <View style={styles.infoContainer}>
            <MaterialIcons name="security" size={20} color="#4CAF50" />
            <Text style={styles.infoText}>
              Your API key is stored securely and never shared.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: '#2196F3',
  },
  warningButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  selectorContainer: {
    marginBottom: 20,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 12,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  typeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  cacheStats: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  cacheStatsText: {
    fontSize: 14,
    color: '#666',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
});

export default GoogleCloudAPISettings;
