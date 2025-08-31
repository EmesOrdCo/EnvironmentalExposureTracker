import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DatabaseService from '../services/DatabaseService';
import { formatTimestamp, getExposureColor, getExposureIcon } from '../utils/exposureUtils';

const AlertsScreen = () => {
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const alertsData = await DatabaseService.getAlerts();
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAlerts();
    setRefreshing(false);
  };

  const markAsRead = async (alertId) => {
    try {
      await DatabaseService.markAlertAsRead(alertId);
      await loadAlerts(); // Reload to update UI
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const renderAlert = (alert) => {
    const color = getExposureColor(alert.type, alert.level);
    const icon = getExposureIcon(alert.type);

    return (
      <TouchableOpacity
        key={alert.id}
        style={[
          styles.alertCard,
          !alert.isRead && styles.unreadAlert,
        ]}
        onPress={() => markAsRead(alert.id)}
      >
        <LinearGradient
          colors={[color + '20', color + '10']}
          style={styles.alertGradient}
        >
          <View style={styles.alertHeader}>
            <View style={[styles.iconContainer, { backgroundColor: color + '30' }]}>
              <MaterialIcons name={icon} size={20} color={color} />
            </View>
            <View style={styles.alertInfo}>
              <Text style={styles.alertType}>
                {alert.type === 'uv' ? 'UV Alert' : 
                 alert.type === 'pollen' ? 'Pollen Alert' : 'Air Quality Alert'}
              </Text>
              <Text style={styles.alertLevel}>
                {alert.level.charAt(0).toUpperCase() + alert.level.slice(1)} Level
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: color }]}>
              <Text style={styles.statusText}>
                {alert.isRead ? 'Read' : 'New'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.alertMessage}>{alert.message}</Text>
          
          <View style={styles.alertFooter}>
            <Text style={styles.alertTime}>
              {formatTimestamp(alert.timestamp)}
            </Text>
            {!alert.isRead && (
              <TouchableOpacity
                style={styles.markReadButton}
                onPress={() => markAsRead(alert.id)}
              >
                <Text style={styles.markReadText}>Mark as Read</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#4CAF50" />
      
      {/* Header */}
      <LinearGradient
        colors={['#4CAF50', '#45A049']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Alerts & Notifications</Text>
        <Text style={styles.headerSubtitle}>Stay informed about environmental risks</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="notifications-none" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Alerts Yet</Text>
            <Text style={styles.emptySubtitle}>
              You'll see alerts here when environmental conditions require attention
            </Text>
          </View>
        ) : (
          <View style={styles.alertsContainer}>
            {alerts.map(renderAlert)}
          </View>
        )}
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
  },
  alertsContainer: {
    padding: 20,
  },
  alertCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unreadAlert: {
    elevation: 4,
    shadowOpacity: 0.2,
  },
  alertGradient: {
    padding: 16,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertInfo: {
    flex: 1,
  },
  alertType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  alertLevel: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  alertMessage: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertTime: {
    fontSize: 12,
    color: '#666',
  },
  markReadButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  markReadText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AlertsScreen;
