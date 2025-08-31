import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet } from 'react-native';

// Import screens
import DashboardScreen from './src/screens/DashboardScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import MapScreen from './src/screens/MapScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Import services
import ExposureTrackingService from './src/services/ExposureTrackingService';
import APIService from './src/services/APIService';

const Tab = createBottomTabNavigator();

// Fixed ExposureHistoryScreen with proper React Native components
const ExposureHistoryScreen = () => (
  <View style={styles.container}>
    <Text style={styles.title}>Exposure History Screen</Text>
    <Text style={styles.subtitle}>Coming soon...</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});

export default function App() {
  useEffect(() => {
    // Initialize the exposure tracking service when app starts
    const initializeApp = async () => {
      try {
            // Initialize Google Cloud API with the known API key
            const apiKey = 'AIzaSyCCNN19KhPTamJDozHgega-hoojK-n-a7Y';
            console.log('Initializing Google Cloud API with key:', apiKey.substring(0, 10) + '...');
            await APIService.initGoogleCloudAPI(apiKey);
        
        // Initialize exposure tracking service
        await ExposureTrackingService.init();
        console.log('App initialized successfully');
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();

    // Cleanup when app unmounts
    return () => {
      ExposureTrackingService.cleanup();
    };
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#4CAF50" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Dashboard') {
              iconName = 'dashboard';
            } else if (route.name === 'Alerts') {
              iconName = 'notifications';
            } else if (route.name === 'Map') {
              iconName = 'map';
            } else if (route.name === 'History') {
              iconName = 'timeline';
            } else if (route.name === 'Settings') {
              iconName = 'settings';
            }

            return <MaterialIcons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#4CAF50',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#f0f0f0',
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
        })}
      >
        <Tab.Screen 
          name="Dashboard" 
          component={DashboardScreen}
          options={{ title: 'Dashboard' }}
        />
        <Tab.Screen 
          name="Alerts" 
          component={AlertsScreen}
          options={{ title: 'Alerts' }}
        />
        <Tab.Screen 
          name="Map" 
          component={MapScreen}
          options={{ title: 'Map' }}
        />
        <Tab.Screen 
          name="History" 
          component={ExposureHistoryScreen}
          options={{ title: 'History' }}
        />
        <Tab.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
