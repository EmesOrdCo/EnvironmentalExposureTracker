import * as SQLite from 'expo-sqlite';

class DatabaseService {
  constructor() {
    this.database = null;
    this.initDatabase();
  }

  // Initialize database tables
  async initDatabase() {
    try {
      // Check if SQLite is available
      if (!SQLite || !SQLite.openDatabase) {
        console.warn('SQLite not available, using in-memory storage');
        this.database = null;
        return;
      }

      this.database = SQLite.openDatabase('EnvironmentalExposure.db');
      
      return new Promise((resolve, reject) => {
        this.database.transaction(tx => {
          // Create exposure records table
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS exposure_records (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              type TEXT NOT NULL,
              value REAL NOT NULL,
              level TEXT NOT NULL,
              timestamp TEXT NOT NULL,
              latitude REAL,
              longitude REAL,
              source TEXT
            )`,
            [],
            () => {
              // Create alerts table
              tx.executeSql(
                `CREATE TABLE IF NOT EXISTS alerts (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  type TEXT NOT NULL,
                  level TEXT NOT NULL,
                  message TEXT NOT NULL,
                  timestamp TEXT NOT NULL,
                  isRead INTEGER DEFAULT 0
                )`,
                [],
                () => {
                  // Create user settings table
                  tx.executeSql(
                    `CREATE TABLE IF NOT EXISTS user_settings (
                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                      uvThreshold REAL DEFAULT 6,
                      pollenThreshold REAL DEFAULT 4.8,
                      airQualityThreshold REAL DEFAULT 100,
                      skinSensitivity TEXT DEFAULT 'medium',
                      allergyTypes TEXT DEFAULT '[]',
                      notificationEnabled INTEGER DEFAULT 1,
                      updateInterval INTEGER DEFAULT 15
                    )`,
                    [],
                    () => {
                      // Insert default settings if table is empty
                      tx.executeSql(
                        'SELECT COUNT(*) as count FROM user_settings',
                        [],
                        (_, result) => {
                          if (result.rows._array[0].count === 0) {
                            tx.executeSql(
                              'INSERT INTO user_settings (uvThreshold, pollenThreshold, airQualityThreshold, skinSensitivity, allergyTypes, notificationEnabled, updateInterval) VALUES (?, ?, ?, ?, ?, ?, ?)',
                              [6, 4.8, 100, 'medium', '[]', 1, 15],
                              () => resolve(),
                              (_, error) => reject(error)
                            );
                          } else {
                            resolve();
                          }
                        },
                        (_, error) => reject(error)
                      );
                    },
                    (_, error) => reject(error)
                  );
                },
                (_, error) => reject(error)
              );
            },
            (_, error) => reject(error)
          );
        });
      });
    } catch (error) {
      console.error('Error initializing database:', error);
      this.database = null;
    }
  }

  // Helper method for executing SQL queries
  async executeSql(sql, params = []) {
    if (!this.database) {
      console.warn('Database not available');
      return { rows: { _array: [] } };
    }

    return new Promise((resolve, reject) => {
      this.database.transaction(tx => {
        tx.executeSql(
          sql,
          params,
          (_, result) => resolve(result),
          (_, error) => reject(error)
        );
      });
    });
  }

  // Save exposure record
  async saveExposureRecord(record) {
    if (!this.database) {
      console.warn('Database not available, skipping save');
      return false;
    }

    const { type, value, level, timestamp, latitude, longitude, source } = record;
    
    try {
      await this.executeSql(
        `INSERT INTO exposure_records (type, value, level, timestamp, latitude, longitude, source)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [type, value, level, timestamp, latitude, longitude, source]
      );
      return true;
    } catch (error) {
      console.error('Error saving exposure record:', error);
      return false;
    }
  }

  // Get exposure records by type and time range
  async getExposureRecordsByType(type, timeRange = 'daily') {
    if (!this.database) {
      console.warn('Database not available, returning empty array');
      return [];
    }

    const timeRanges = {
      daily: "datetime('now', '-1 day')",
      weekly: "datetime('now', '-7 days')",
      monthly: "datetime('now', '-30 days')",
    };
    
    const timeFilter = timeRanges[timeRange] || timeRanges.daily;
    
    try {
      const result = await this.executeSql(
        `SELECT * FROM exposure_records 
         WHERE type = ? AND timestamp >= ${timeFilter}
         ORDER BY timestamp DESC`,
        [type]
      );
      return result.rows._array;
    } catch (error) {
      console.error('Error getting exposure records:', error);
      return [];
    }
  }

  // Get latest exposure record for each type
  async getLatestExposureRecords() {
    if (!this.database) {
      console.warn('Database not available, returning empty array');
      return [];
    }

    try {
      const result = await this.executeSql(
        `SELECT * FROM exposure_records 
         WHERE id IN (
           SELECT MAX(id) FROM exposure_records 
           GROUP BY type
         )
         ORDER BY timestamp DESC`
      );
      return result.rows._array;
    } catch (error) {
      console.error('Error getting latest exposure records:', error);
      return [];
    }
  }

  // Save alert
  async saveAlert(alert) {
    if (!this.database) {
      console.warn('Database not available, skipping alert save');
      return false;
    }

    const { type, level, message, timestamp } = alert;
    
    try {
      await this.executeSql(
        `INSERT INTO alerts (type, level, message, timestamp)
         VALUES (?, ?, ?, ?)`,
        [type, level, message, timestamp]
      );
      return true;
    } catch (error) {
      console.error('Error saving alert:', error);
      return false;
    }
  }

  // Get alerts
  async getAlerts(limit = 50) {
    if (!this.database) {
      console.warn('Database not available, returning empty array');
      return [];
    }

    try {
      const result = await this.executeSql(
        `SELECT * FROM alerts 
         ORDER BY timestamp DESC 
         LIMIT ?`,
        [limit]
      );
      return result.rows._array;
    } catch (error) {
      console.error('Error getting alerts:', error);
      return [];
    }
  }

  // Mark alert as read
  async markAlertAsRead(alertId) {
    if (!this.database) {
      console.warn('Database not available, skipping mark as read');
      return false;
    }

    try {
      await this.executeSql(
        'UPDATE alerts SET isRead = 1 WHERE id = ?',
        [alertId]
      );
      return true;
    } catch (error) {
      console.error('Error marking alert as read:', error);
      return false;
    }
  }

  // Get unread alerts count
  async getUnreadAlertsCount() {
    if (!this.database) {
      console.warn('Database not available, returning 0');
      return 0;
    }

    try {
      const result = await this.executeSql(
        'SELECT COUNT(*) as count FROM alerts WHERE isRead = 0'
      );
      return result.rows._array[0].count;
    } catch (error) {
      console.error('Error getting unread alerts count:', error);
      return 0;
    }
  }

  // Get user settings
  async getUserSettings() {
    if (!this.database) {
      console.warn('Database not available, returning default settings');
      return {
        uvThreshold: 6,
        pollenThreshold: 4.8,
        airQualityThreshold: 100,
        skinSensitivity: 'medium',
        allergyTypes: [],
        notificationEnabled: true,
        updateInterval: 15,
      };
    }

    try {
      const result = await this.executeSql('SELECT * FROM user_settings LIMIT 1');
      const settings = result.rows._array[0];
      
      if (settings) {
        return {
          ...settings,
          allergyTypes: JSON.parse(settings.allergyTypes),
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user settings:', error);
      return null;
    }
  }

  // Update user settings
  async updateUserSettings(settings) {
    if (!this.database) {
      console.warn('Database not available, skipping settings update');
      return false;
    }

    const {
      uvThreshold,
      pollenThreshold,
      airQualityThreshold,
      skinSensitivity,
      allergyTypes,
      notificationEnabled,
      updateInterval,
    } = settings;
    
    try {
      await this.executeSql(
        `UPDATE user_settings SET 
         uvThreshold = ?, 
         pollenThreshold = ?, 
         airQualityThreshold = ?, 
         skinSensitivity = ?, 
         allergyTypes = ?, 
         notificationEnabled = ?, 
         updateInterval = ?
         WHERE id = 1`,
        [
          uvThreshold,
          pollenThreshold,
          airQualityThreshold,
          skinSensitivity,
          JSON.stringify(allergyTypes),
          notificationEnabled ? 1 : 0,
          updateInterval,
        ]
      );
      return true;
    } catch (error) {
      console.error('Error updating user settings:', error);
      return false;
    }
  }

  // Clear old records (older than 30 days)
  async clearOldRecords() {
    if (!this.database) {
      console.warn('Database not available, skipping clear old records');
      return false;
    }

    try {
      await this.executeSql(
        "DELETE FROM exposure_records WHERE timestamp < datetime('now', '-30 days')"
      );
      return true;
    } catch (error) {
      console.error('Error clearing old records:', error);
      return false;
    }
  }

  // Get statistics for a specific type and time range
  async getExposureStatistics(type, timeRange = 'daily') {
    const records = await this.getExposureRecordsByType(type, timeRange);
    
    if (records.length === 0) {
      return {
        average: 0,
        max: 0,
        min: 0,
        total: 0,
        count: 0,
      };
    }
    
    const values = records.map(r => r.value);
    const total = values.reduce((sum, val) => sum + val, 0);
    const average = total / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    return {
      average: parseFloat(average.toFixed(2)),
      max: parseFloat(max.toFixed(2)),
      min: parseFloat(min.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      count: records.length,
    };
  }
}

export default new DatabaseService();
