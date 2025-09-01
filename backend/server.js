require('dotenv').config({ path: '../.env' });
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'your_supabase_url';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your_supabase_anon_key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'your_supabase_service_key';

// Google Cloud API configuration
const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY || 'AIzaSyCCNN19KhPTamJDozHgega-hoojK-n-a7Y';

// Cache durations in minutes
const CACHE_DURATIONS = {
  airquality: 60,    // 1 hour
  pollen: 1440,      // 24 hours
  uv: 30             // 30 minutes
};

// Create Supabase client
let supabase;

async function initializeSupabase() {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Test connection
    const { data, error } = await supabase
      .from('heatmap_tiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Supabase connected successfully');
  } catch (error) {
    console.error('❌ Supabase initialization failed:', error);
    process.exit(1);
  }
}

// Google Cloud API service
class GoogleCloudAPIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.airQualityBaseURL = 'https://airquality.googleapis.com';
    this.pollenBaseURL = 'https://pollen.googleapis.com';
  }

  async fetchTile(dataType, heatmapType, zoom, x, y) {
    const baseURL = dataType === 'airquality' ? this.airQualityBaseURL : this.pollenBaseURL;
    const url = `${baseURL}/v1/mapTypes/${heatmapType}/heatmapTiles/${zoom}/${x}/${y}`;
    
    try {
      console.log(`🌐 Fetching from Google Cloud: ${dataType} ${heatmapType} ${zoom}/${x}/${y}`);
      
      const response = await axios.get(url, {
        params: { key: this.apiKey },
        responseType: 'arraybuffer',
        timeout: 30000 // Increased to 30 seconds for Google Cloud API
      });

      return {
        data: response.data,
        contentType: response.headers['content-type'] || 'image/png',
        success: true
      };
    } catch (error) {
      console.error(`❌ Google Cloud API error:`, error.response?.status, error.message);
      return {
        data: null,
        contentType: null,
        success: false,
        error: error.message
      };
    }
  }
}

const googleAPI = new GoogleCloudAPIService(GOOGLE_CLOUD_API_KEY);

// Cache service for Supabase
class SupabaseCacheService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  async getCachedTile(dataType, heatmapType, zoom, x, y) {
    try {
      const { data, error } = await this.supabase
        .from('heatmap_tiles')
        .select('tile_data, content_type, created_at, expires_at')
        .eq('data_type', dataType)
        .eq('heatmap_type', heatmapType)
        .eq('zoom_level', zoom)
        .eq('tile_x', x)
        .eq('tile_y', y)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !data) {
        console.log(`❌ Cache miss: ${dataType} ${heatmapType} ${zoom}/${x}/${y}`);
        return { cached: false };
      }

      // Update access metrics - increment access count
      const { data: currentData } = await this.supabase
        .from('heatmap_tiles')
        .select('access_count')
        .eq('data_type', dataType)
        .eq('heatmap_type', heatmapType)
        .eq('zoom_level', zoom)
        .eq('tile_x', x)
        .eq('tile_y', y)
        .single();

      const newAccessCount = (currentData?.access_count || 0) + 1;
      
      await this.supabase
        .from('heatmap_tiles')
        .update({
          access_count: newAccessCount,
          last_accessed: new Date().toISOString()
        })
        .eq('data_type', dataType)
        .eq('heatmap_type', heatmapType)
        .eq('zoom_level', zoom)
        .eq('tile_x', x)
        .eq('tile_y', y);

      console.log(`✅ Cache hit: ${dataType} ${heatmapType} ${zoom}/${x}/${y}`);
      return {
        data: Buffer.from(data.tile_data, 'base64'),
        contentType: data.content_type,
        cached: true,
        expiresAt: data.expires_at
      };
    } catch (error) {
      console.error('❌ Database error:', error);
      return { cached: false, error: error.message };
    }
  }

  async storeTile(dataType, heatmapType, zoom, x, y, tileData, contentType) {
    try {
      const cacheDuration = CACHE_DURATIONS[dataType] || 60;
      const expiresAt = new Date(Date.now() + cacheDuration * 60 * 1000);
      
      const { error } = await this.supabase
        .from('heatmap_tiles')
        .upsert({
          data_type: dataType,
          heatmap_type: heatmapType,
          zoom_level: zoom,
          tile_x: x,
          tile_y: y,
          tile_data: tileData.toString('base64'),
          content_type: contentType,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'data_type,heatmap_type,zoom_level,tile_x,tile_y'
        });

      if (error) {
        console.error('❌ Store error:', error);
        return false;
      }

      console.log(`💾 Stored in cache: ${dataType} ${heatmapType} ${zoom}/${x}/${y}`);
      return true;
    } catch (error) {
      console.error('❌ Store error:', error);
      return false;
    }
  }

  async trackAPIUsage(dataType) {
    try {
      const now = new Date();
      const hourKey = `google_cloud_api_${dataType}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${now.getHours()}`;
      
      const { error } = await this.supabase
        .from('api_usage')
        .upsert({
          api_endpoint: 'google_cloud_api',
          data_type: dataType,
          request_count: 1,
          last_request_at: now.toISOString(),
          hour_key: hourKey
        }, {
          onConflict: 'hour_key'
        });

      if (error) {
        console.error('❌ Track usage error:', error);
      }
    } catch (error) {
      console.error('❌ Track usage error:', error);
    }
  }

  async getCacheStats() {
    try {
      const { data, error } = await this.supabase
        .rpc('get_cache_stats');

      if (error) {
        console.error('❌ Get stats error:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('❌ Get stats error:', error);
      return [];
    }
  }

  async cleanupExpiredTiles() {
    try {
      const { error } = await this.supabase
        .from('heatmap_tiles')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('❌ Cleanup error:', error);
      } else {
        console.log('🧹 Cleaned up expired tiles');
      }
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  }
}

// Exposure tracking service
class ExposureTrackingService {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  // Start a new exposure tracking session
  async startExposureSession(deviceId, userId = null, location = null) {
    try {
      const sessionId = `session_${deviceId}_${Date.now()}`;
      
      const { data, error } = await this.supabase
        .from('user_exposure_sessions')
        .insert({
          session_id: sessionId,
          user_id: userId,
          device_id: deviceId,
          location_lat: location?.lat,
          location_lng: location?.lng
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Start session error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Started exposure session: ${sessionId}`);
      return { success: true, sessionId, data };
    } catch (error) {
      console.error('❌ Start session error:', error);
      return { success: false, error: error.message };
    }
  }

  // End an exposure tracking session
  async endExposureSession(sessionId) {
    try {
      const endTime = new Date().toISOString();
      
      const { data, error } = await this.supabase
        .from('user_exposure_sessions')
        .update({
          end_time: endTime,
          total_duration_minutes: this.supabase.sql`EXTRACT(EPOCH FROM (${endTime}::timestamp - start_time)) / 60`
        })
        .eq('session_id', sessionId)
        .select()
        .single();

      if (error) {
        console.error('❌ End session error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Ended exposure session: ${sessionId}`);
      return { success: true, data };
    } catch (error) {
      console.error('❌ End session error:', error);
      return { success: false, error: error.message };
    }
  }

  // Record an exposure reading
  async recordExposureReading(sessionId, readingData) {
    try {
      // Calculate exposure scores
      const { data: scores } = await this.supabase
        .rpc('calculate_exposure_scores', {
          p_air_quality_index: readingData.air_quality_index || 0,
          p_pollen_index: readingData.total_pollen_index || 0,
          p_uv_index: readingData.uv_index || 0
        });

      const score = scores[0];
      
      const { data, error } = await this.supabase
        .from('exposure_readings')
        .insert({
          session_id: sessionId,
          location_lat: readingData.location?.lat,
          location_lng: readingData.location?.lng,
          
          // Air Quality
          air_quality_index: readingData.air_quality_index,
          air_quality_level: readingData.air_quality_level,
          pm25_value: readingData.pm25_value,
          pm10_value: readingData.pm10_value,
          ozone_value: readingData.ozone_value,
          no2_value: readingData.no2_value,
          co_value: readingData.co_value,
          
          // Pollen
          tree_pollen_index: readingData.tree_pollen_index,
          grass_pollen_index: readingData.grass_pollen_index,
          weed_pollen_index: readingData.weed_pollen_index,
          total_pollen_index: readingData.total_pollen_index,
          pollen_level: readingData.pollen_level,
          
          // UV
          uv_index: readingData.uv_index,
          uv_level: readingData.uv_level,
          
          // Weather
          temperature_celsius: readingData.temperature_celsius,
          humidity_percent: readingData.humidity_percent,
          wind_speed_kmh: readingData.wind_speed_kmh,
          
          // Calculated scores
          air_quality_exposure_score: score.air_quality_score,
          pollen_exposure_score: score.pollen_score,
          uv_exposure_score: score.uv_score,
          overall_exposure_score: score.overall_score
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Record reading error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Recorded exposure reading for session: ${sessionId}`);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Record reading error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get daily exposure summary
  async getDailyExposureSummary(deviceId, date) {
    try {
      const { data, error } = await this.supabase
        .from('daily_exposure_summaries')
        .select('*')
        .eq('device_id', deviceId)
        .eq('summary_date', date)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Get daily summary error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('❌ Get daily summary error:', error);
      return { success: false, error: error.message };
    }
  }

  // Update daily exposure summary
  async updateDailyExposureSummary(deviceId, date) {
    try {
      const { error } = await this.supabase
        .rpc('update_daily_exposure_summary', {
          p_device_id: deviceId,
          p_summary_date: date
        });

      if (error) {
        console.error('❌ Update daily summary error:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Updated daily exposure summary for ${deviceId} on ${date}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Update daily summary error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get exposure alerts
  async getExposureAlerts(sessionId) {
    try {
      const { data, error } = await this.supabase
        .from('exposure_alerts')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true)
        .order('triggered_at', { ascending: false });

      if (error) {
        console.error('❌ Get alerts error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('❌ Get alerts error:', error);
      return { success: false, error: error.message };
    }
  }

  // Get exposure history
  async getExposureHistory(startTime, endTime, interval = '15min') {
    try {
      // Convert interval to minutes
      const intervalMinutes = this.parseInterval(interval);
      
      // Get all exposure readings within the time range
      const { data, error } = await this.supabase
        .from('exposure_readings')
        .select(`
          reading_time,
          air_quality_index,
          total_pollen_index,
          uv_index,
          location_lat,
          location_lng
        `)
        .gte('reading_time', startTime)
        .lte('reading_time', endTime)
        .order('reading_time', { ascending: true });

      if (error) {
        console.error('❌ Get exposure history error:', error);
        return { success: false, error: error.message };
      }

      // Group data by intervals
      const groupedData = this.groupDataByInterval(data, startTime, endTime, intervalMinutes);
      
      return { success: true, data: groupedData };
    } catch (error) {
      console.error('❌ Get exposure history error:', error);
      return { success: false, error: error.message };
    }
  }

  // Parse interval string to minutes
  parseInterval(interval) {
    const match = interval.match(/^(\d+)(min|h|d)$/);
    if (!match) return 15; // default to 15 minutes
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'min': return value;
      case 'h': return value * 60;
      case 'd': return value * 60 * 24;
      default: return 15;
    }
  }

  // Group data by time intervals
  groupDataByInterval(data, startTime, endTime, intervalMinutes) {
    const intervals = [];
    const current = new Date(startTime);
    const end = new Date(endTime);
    
    while (current <= end) {
      const intervalStart = new Date(current);
      const intervalEnd = new Date(current.getTime() + (intervalMinutes * 60 * 1000));
      
      // Find all readings in this interval
      const intervalData = data.filter(reading => {
        const readingTime = new Date(reading.reading_time);
        return readingTime >= intervalStart && readingTime < intervalEnd;
      });
      
      // Calculate averages for this interval
      const aggregated = this.aggregateIntervalData(intervalData);
      
      intervals.push({
        timestamp: intervalStart.toISOString(),
        airQuality: aggregated.airQuality,
        pollen: aggregated.pollen,
        uv: aggregated.uv,
        readingCount: intervalData.length
      });
      
      current.setMinutes(current.getMinutes() + intervalMinutes);
    }
    
    return intervals;
  }

  // Aggregate data for a single interval
  aggregateIntervalData(readings) {
    if (readings.length === 0) {
      return { airQuality: 0, pollen: 0, uv: 0 };
    }
    
    const total = readings.reduce((acc, reading) => {
      acc.airQuality += reading.air_quality_index || 0;
      acc.pollen += reading.total_pollen_index || 0;
      acc.uv += reading.uv_index || 0;
      return acc;
    }, { airQuality: 0, pollen: 0, uv: 0 });
    
    return {
      airQuality: total.airQuality / readings.length,
      pollen: total.pollen / readings.length,
      uv: total.uv / readings.length
    };
  }
}

let exposureService;
let cacheService;

// Main heatmap tile endpoint
app.get('/api/heatmap/:dataType/:heatmapType/:zoom/:x/:y', async (req, res) => {
  const { dataType, heatmapType, zoom, x, y } = req.params;
  
  try {
    // 1. Check cache first
    const cachedTile = await cacheService.getCachedTile(dataType, heatmapType, parseInt(zoom), parseInt(x), parseInt(y));
    
    if (cachedTile.cached) {
      // Return cached data
      res.set('Content-Type', cachedTile.contentType);
      res.set('X-Cache', 'HIT');
      res.set('X-Cache-Expires', cachedTile.expiresAt);
      return res.send(cachedTile.data);
    }

    // 2. Fetch from Google Cloud API
    const apiResult = await googleAPI.fetchTile(dataType, heatmapType, parseInt(zoom), parseInt(x), parseInt(y));
    
    if (!apiResult.success) {
      return res.status(500).json({
        error: 'Failed to fetch from Google Cloud API',
        details: apiResult.error
      });
    }

    // 3. Store in cache
    await cacheService.storeTile(dataType, heatmapType, parseInt(zoom), parseInt(x), parseInt(y), apiResult.data, apiResult.contentType);
    
    // 4. Track API usage
    await cacheService.trackAPIUsage(dataType);

    // 5. Return data
    res.set('Content-Type', apiResult.contentType);
    res.set('X-Cache', 'MISS');
    res.set('X-Cache-Stored', 'true');
    res.send(apiResult.data);

  } catch (error) {
    console.error('❌ Endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('heatmap_tiles')
      .select('count')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    res.json({
      status: 'healthy',
      database: 'connected',
      supabase_url: supabaseUrl,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Cache statistics endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await cacheService.getCacheStats();
    
    res.json({
      cache_stats: stats,
      cache_durations: CACHE_DURATIONS,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get statistics',
      details: error.message
    });
  }
});

// Geographic region endpoint (for grid-based caching)
app.get('/api/region/:dataType/:heatmapType/:zoom/:gridLat/:gridLng', async (req, res) => {
  const { dataType, heatmapType, zoom, gridLat, gridLng } = req.params;
  
  try {
    // Get all tiles for this geographic region
    const { data, error } = await supabase
      .from('heatmap_tiles')
      .select('tile_x, tile_y, tile_data, content_type, expires_at')
      .eq('data_type', dataType)
      .eq('heatmap_type', heatmapType)
      .eq('zoom_level', parseInt(zoom))
      .gt('expires_at', new Date().toISOString());

    if (error) {
      throw error;
    }

    // Filter by grid coordinates (simplified)
    const filteredTiles = data.filter(row => {
      const gridX = Math.floor(row.tile_x / 10);
      const gridY = Math.floor(row.tile_y / 10);
      return gridX === parseInt(gridLat) && gridY === parseInt(gridLng);
    });

    res.json({
      region: `${dataType}_${heatmapType}_${zoom}_${gridLat}_${gridLng}`,
      tiles: filteredTiles.map(row => ({
        x: row.tile_x,
        y: row.tile_y,
        data: row.tile_data,
        contentType: row.content_type,
        expiresAt: row.expires_at
      })),
      count: filteredTiles.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Region endpoint error:', error);
    res.status(500).json({
      error: 'Failed to get region data',
      details: error.message
    });
  }
});

// Cleanup endpoint (for manual cleanup)
app.post('/api/cleanup', async (req, res) => {
  try {
    await cacheService.cleanupExpiredTiles();
    res.json({
      message: 'Cleanup completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Cleanup failed',
      details: error.message
    });
  }
});

// =====================================================
// EXPOSURE TRACKING ENDPOINTS
// =====================================================

// Start exposure tracking session
app.post('/api/exposure/session/start', async (req, res) => {
  try {
    const { deviceId, userId, location } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({
        error: 'deviceId is required'
      });
    }

    const result = await exposureService.startExposureSession(deviceId, userId, location);
    
    if (result.success) {
      res.json({
        sessionId: result.sessionId,
        message: 'Exposure session started',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Failed to start exposure session',
        details: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// End exposure tracking session
app.post('/api/exposure/session/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'sessionId is required'
      });
    }

    const result = await exposureService.endExposureSession(sessionId);
    
    if (result.success) {
      res.json({
        message: 'Exposure session ended',
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Failed to end exposure session',
        details: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Record exposure reading
app.post('/api/exposure/reading', async (req, res) => {
  try {
    const { sessionId, readingData } = req.body;
    
    if (!sessionId || !readingData) {
      return res.status(400).json({
        error: 'sessionId and readingData are required'
      });
    }

    const result = await exposureService.recordExposureReading(sessionId, readingData);
    
    if (result.success) {
      res.json({
        message: 'Exposure reading recorded',
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Failed to record exposure reading',
        details: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get daily exposure summary
app.get('/api/exposure/summary/:deviceId/:date', async (req, res) => {
  try {
    const { deviceId, date } = req.params;
    
    const result = await exposureService.getDailyExposureSummary(deviceId, date);
    
    if (result.success) {
      res.json({
        deviceId,
        date,
        summary: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Failed to get daily summary',
        details: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Update daily exposure summary
app.post('/api/exposure/summary/update', async (req, res) => {
  try {
    const { deviceId, date } = req.body;
    
    if (!deviceId || !date) {
      return res.status(400).json({
        error: 'deviceId and date are required'
      });
    }

    const result = await exposureService.updateDailyExposureSummary(deviceId, date);
    
    if (result.success) {
      res.json({
        message: 'Daily exposure summary updated',
        deviceId,
        date,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Failed to update daily summary',
        details: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get exposure alerts
app.get('/api/exposure/alerts/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await exposureService.getExposureAlerts(sessionId);
    
    if (result.success) {
      res.json({
        sessionId,
        alerts: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Failed to get exposure alerts',
        details: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get exposure history
app.get('/api/exposure/history', async (req, res) => {
  try {
    const { startTime, endTime, interval = '15min' } = req.query;
    
    if (!startTime || !endTime) {
      return res.status(400).json({
        error: 'startTime and endTime are required'
      });
    }

    const result = await exposureService.getExposureHistory(startTime, endTime, interval);
    
    if (result.success) {
      res.json({
        records: result.data,
        metadata: {
          startTime,
          endTime,
          interval,
          recordCount: result.data.length,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.status(500).json({
        error: 'Failed to get exposure history',
        details: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Start server
async function startServer() {
  await initializeSupabase();
  // Instantiate services only after Supabase has been initialized
  exposureService = new ExposureTrackingService(supabase);
  cacheService = new SupabaseCacheService(supabase);
  
  app.listen(PORT, () => {
    console.log(`🚀 Environmental Cache Backend running on port ${PORT}`);
    console.log(`📊 Cache durations:`, CACHE_DURATIONS);
    console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📈 Stats: http://localhost:${PORT}/api/stats`);
    console.log(`🧹 Cleanup: http://localhost:${PORT}/api/cleanup`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  process.exit(0);
});

startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
