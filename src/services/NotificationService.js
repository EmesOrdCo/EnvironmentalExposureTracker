import * as Notifications from 'expo-notifications';
import { NOTIFICATION_MESSAGES } from '../constants/api';

class NotificationService {
  constructor() {
    this.isInitialized = false;
    this.notificationListener = null;
    this.responseListener = null;
  }

  // Initialize notification service
  async init() {
    if (this.isInitialized) return;

    try {
      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      // Set up notification listeners
      this.notificationListener = Notifications.addNotificationReceivedListener(
        this.handleNotificationReceived.bind(this)
      );

      this.responseListener = Notifications.addNotificationResponseReceivedListener(
        this.handleNotificationResponse.bind(this)
      );

      this.isInitialized = true;
      console.log('Notification service initialized');
      return true;
    } catch (error) {
      console.error('Error initializing notification service:', error);
      return false;
    }
  }

  // Handle received notification
  handleNotificationReceived(notification) {
    console.log('Notification received:', notification);
    // You can add custom logic here to handle received notifications
  }

  // Handle notification response (when user taps notification)
  handleNotificationResponse(response) {
    console.log('Notification response:', response);
    // You can add custom logic here to handle notification taps
  }

  // Send UV exposure notification
  async sendUVNotification(level, value) {
    if (!this.isInitialized) {
      await this.init();
    }

    const message = NOTIFICATION_MESSAGES.UV[level] || 
      `UV Index is ${value.toFixed(1)} - ${level} level`;

    return this.sendNotification({
      title: 'UV Exposure Alert',
      body: message,
      data: { type: 'uv', level, value },
      sound: true,
    });
  }

  // Send pollen exposure notification
  async sendPollenNotification(level, value) {
    if (!this.isInitialized) {
      await this.init();
    }

    const message = NOTIFICATION_MESSAGES.POLLEN[level] || 
      `Pollen level is ${value.toFixed(1)} - ${level} level`;

    return this.sendNotification({
      title: 'Pollen Alert',
      body: message,
      data: { type: 'pollen', level, value },
      sound: true,
    });
  }

  // Send air quality notification
  async sendAirQualityNotification(level, value) {
    if (!this.isInitialized) {
      await this.init();
    }

    const message = NOTIFICATION_MESSAGES.AIR_QUALITY[level] || 
      `Air Quality Index is ${value.toFixed(1)} - ${level} level`;

    return this.sendNotification({
      title: 'Air Quality Alert',
      body: message,
      data: { type: 'airQuality', level, value },
      sound: true,
    });
  }

  // Send custom notification
  async sendNotification(notificationConfig) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationConfig.title,
          body: notificationConfig.body,
          data: notificationConfig.data || {},
          sound: notificationConfig.sound || false,
        },
        trigger: notificationConfig.trigger || null, // null means send immediately
      });

      console.log('Notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error sending notification:', error);
      return null;
    }
  }

  // Schedule notification for later
  async scheduleNotification(notificationConfig, trigger) {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notificationConfig.title,
          body: notificationConfig.body,
          data: notificationConfig.data || {},
          sound: notificationConfig.sound || false,
        },
        trigger: trigger,
      });

      console.log('Notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
      return true;
    } catch (error) {
      console.error('Error cancelling notifications:', error);
      return false;
    }
  }

  // Cancel specific notification
  async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notification cancelled:', notificationId);
      return true;
    } catch (error) {
      console.error('Error cancelling notification:', error);
      return false;
    }
  }

  // Get all scheduled notifications
  async getScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Check notification permissions
  async checkPermissions() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  // Request notification permissions
  async requestPermissions() {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Get notification settings
  async getNotificationSettings() {
    try {
      const settings = await Notifications.getPermissionsAsync();
      return settings;
    } catch (error) {
      console.error('Error getting notification settings:', error);
      return null;
    }
  }

  // Set badge count (iOS only)
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
      return true;
    } catch (error) {
      console.error('Error setting badge count:', error);
      return false;
    }
  }

  // Get badge count (iOS only)
  async getBadgeCount() {
    try {
      const count = await Notifications.getBadgeCountAsync();
      return count;
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  // Clear badge count (iOS only)
  async clearBadgeCount() {
    try {
      await Notifications.setBadgeCountAsync(0);
      return true;
    } catch (error) {
      console.error('Error clearing badge count:', error);
      return false;
    }
  }

  // Clean up notification listeners
  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }

    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }

    this.isInitialized = false;
    console.log('Notification service cleaned up');
  }

  // Send exposure alert based on type and level
  async sendExposureAlert(type, level, value) {
    switch (type) {
      case 'uv':
        return this.sendUVNotification(level, value);
      case 'pollen':
        return this.sendPollenNotification(level, value);
      case 'airQuality':
        return this.sendAirQualityNotification(level, value);
      default:
        console.warn('Unknown exposure type:', type);
        return null;
    }
  }
}

export default new NotificationService();
