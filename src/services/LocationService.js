import * as Location from 'expo-location';
import { isValidLocation } from '../utils/exposureUtils';

class LocationService {
  constructor() {
    this.locationSubscription = null;
    this.currentLocation = null;
    this.isTracking = false;
  }

  // Request location permissions
  async requestLocationPermission() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  // Check if location permission is granted
  async checkLocationPermission() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }

  // Get current location
  async getCurrentLocation() {
    try {
      const hasPermission = await this.checkLocationPermission();
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          throw new Error('Location permission denied');
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 10,
      });

      const { latitude, longitude } = location.coords;
      
      if (!isValidLocation(latitude, longitude)) {
        throw new Error('Invalid location coordinates');
      }

      this.currentLocation = {
        latitude,
        longitude,
        timestamp: location.timestamp,
        accuracy: location.coords.accuracy,
      };

      return this.currentLocation;
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  // Start location tracking
  async startLocationTracking(callback) {
    try {
      const hasPermission = await this.checkLocationPermission();
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          throw new Error('Location permission denied');
        }
      }

      if (this.isTracking) {
        console.warn('Location tracking is already active');
        return;
      }

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 100, // Update every 100 meters
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          
          if (isValidLocation(latitude, longitude)) {
            this.currentLocation = {
              latitude,
              longitude,
              timestamp: location.timestamp,
              accuracy: location.coords.accuracy,
            };

            if (callback && typeof callback === 'function') {
              callback(this.currentLocation);
            }
          }
        }
      );

      this.isTracking = true;
      console.log('Location tracking started');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  // Stop location tracking
  async stopLocationTracking() {
    try {
      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }
      
      this.isTracking = false;
      console.log('Location tracking stopped');
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }

  // Get last known location
  getLastKnownLocation() {
    return this.currentLocation;
  }

  // Check if location tracking is active
  isLocationTrackingActive() {
    return this.isTracking;
  }

  // Get location accuracy description
  getAccuracyDescription(accuracy) {
    if (accuracy <= 5) return 'Excellent';
    if (accuracy <= 10) return 'Good';
    if (accuracy <= 20) return 'Fair';
    if (accuracy <= 50) return 'Poor';
    return 'Very Poor';
  }

  // Calculate distance between current location and a point
  calculateDistanceToPoint(latitude, longitude) {
    if (!this.currentLocation) return null;
    
    const { calculateDistance } = require('../utils/exposureUtils');
    return calculateDistance(
      this.currentLocation.latitude,
      this.currentLocation.longitude,
      latitude,
      longitude
    );
  }

  // Get location status
  async getLocationStatus() {
    try {
      const hasPermission = await this.checkLocationPermission();
      const isEnabled = await Location.hasServicesEnabledAsync();
      
      return {
        hasPermission,
        isEnabled,
        isTracking: this.isTracking,
        currentLocation: this.currentLocation,
      };
    } catch (error) {
      console.error('Error getting location status:', error);
      return {
        hasPermission: false,
        isEnabled: false,
        isTracking: false,
        currentLocation: null,
      };
    }
  }

  // Get location with timeout
  async getLocationWithTimeout(timeoutMs = 10000) {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Location request timed out'));
      }, timeoutMs);

      try {
        const location = await this.getCurrentLocation();
        clearTimeout(timeout);
        resolve(location);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }
}

export default new LocationService();
