import backendService from './BackendService';
import HeatmapService from './HeatmapService';
import LocationService from './LocationService';
import GoogleCloudAPIService from './GoogleCloudAPIService';
import HeatmapDecoder from '../utils/pngDecoder';

class ExposureSamplingService {
  constructor() {
    this.isSampling = false;
    this.samplingInterval = null;
    this.lastSampleTime = null;
    this.samples = []; // Simple array to store last 24 hours of samples
    this.maxSamples = 24; // 24 hours * 1 sample per hour
  }

  // Start environmental sampling
  async startSampling() {
    if (this.isSampling) {
      console.log('Sampling already in progress');
      return;
    }

    this.isSampling = true;
    console.log('Environmental sampling started - sampling every hour');

    // Take initial sample
    await this.takeSample();

    // Set up periodic sampling
    this.samplingInterval = setInterval(async () => {
      await this.takeSample();
    }, 60 * 60 * 1000); // 1 hour
  }

  // Stop environmental sampling
  stopSampling() {
    if (this.samplingInterval) {
      clearInterval(this.samplingInterval);
      this.samplingInterval = null;
    }
    this.isSampling = false;
    console.log('Environmental sampling stopped');
  }

  // Take a single sample of environmental data
  async takeSample() {
    try {
      const timestamp = new Date();
      console.log(`Taking environmental sample at ${timestamp.toISOString()}`);

      // Get current location
      const location = await LocationService.getCurrentLocation();
      if (!location) {
        console.error('No location available for sampling');
        return { success: false, error: 'Location not available' };
      }

      // Sample air quality data
      const airQualityData = await this.sampleAirQuality(location);
      
      // Sample pollen data
      const pollenData = await this.samplePollen(location);

      // Store the sample
      const sample = {
        timestamp: timestamp.toISOString(),
        location: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        airQuality: airQualityData,
        pollen: pollenData,
        source: 'heatmap_sampling'
      };

      // Add to samples array
      this.addSample(sample);

      // Store in backend (if available)
      await this.storeSampleInBackend(sample);

      this.lastSampleTime = timestamp;
      console.log('Environmental sample completed:', sample);

      return { success: true, data: sample };
    } catch (error) {
      console.error('Error taking environmental sample:', error);
      return { success: false, error: error.message };
    }
  }

  // Add sample to array and maintain 24-hour window
  addSample(sample) {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24 hours ago

    // Remove old samples (older than 24 hours)
    this.samples = this.samples.filter(s => {
      const sampleTime = new Date(s.timestamp);
      return sampleTime > cutoffTime;
    });

    // Add new sample
    this.samples.push(sample);

    // Keep only the most recent samples if we exceed maxSamples
    if (this.samples.length > this.maxSamples) {
      this.samples = this.samples.slice(-this.maxSamples);
    }

    console.log(`✅ Sample added. Total samples: ${this.samples.length}`);
  }

  // Get samples for the last N hours
  getSamplesForHours(hours = 24) {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));
    
    const filteredSamples = this.samples.filter(sample => {
      const sampleTime = new Date(sample.timestamp);
      return sampleTime >= cutoffTime;
    });

    console.log(`📊 Retrieved ${filteredSamples.length} samples for last ${hours} hours`);
    return filteredSamples.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  // Sample air quality data using real-time API
  async sampleAirQuality(location) {
    try {
      console.log('🔍 Sampling air quality from real-time API...');
      
      // Use the real-time currentConditions endpoint for precise air quality data
      const airQualityData = await GoogleCloudAPIService.getCurrentAirQuality(
        location.latitude, 
        location.longitude
      );

      if (!airQualityData || !airQualityData.indexes) {
        throw new Error('No air quality data received from API');
      }

      // Find US AQI index
      const usAqiIndex = airQualityData.indexes.find(index => index.code === 'usa_epa');
      const universalIndex = airQualityData.indexes.find(index => index.code === 'uaqi');
      
      // Use US AQI if available, otherwise fall back to Universal AQI
      const aqiData = usAqiIndex || universalIndex;
      
      if (!aqiData) {
        throw new Error('No AQI data found in response');
      }

      const aqiValue = aqiData.aqi;
      const level = this.getAirQualityLevel(aqiValue);
      
      console.log(`✅ Air quality sampled: ${aqiValue} AQI (${level})`);
      
      return {
        value: aqiValue,
        level: level,
        source: 'real_time_api',
        category: aqiData.category,
        dominantPollutant: aqiData.dominantPollutant,
        timestamp: airQualityData.dateTime
      };
    } catch (error) {
      console.error('Error sampling air quality:', error);
      return {
        value: 0,
        level: 'unknown',
        source: 'error'
      };
    }
  }

  // Sample pollen data from heatmap tiles
  async samplePollen(location) {
    try {
      console.log('🔍 Sampling pollen from heatmap tiles...');
      
      // Convert location to tile coordinates
      const zoom = 10;
      const { x, y } = this.latLngToTile(location.latitude, location.longitude, zoom);
      
      // Sample each pollen type
      const treePollen = await this.samplePollenType(location, zoom, x, y, 'TREE_UPI');
      const grassPollen = await this.samplePollenType(location, zoom, x, y, 'GRASS_UPI');
      const weedPollen = await this.samplePollenType(location, zoom, x, y, 'WEED_UPI');
      
      // Calculate total pollen (sum of all types)
      const totalPollen = treePollen + grassPollen + weedPollen;
      const level = this.getPollenLevel(totalPollen);
      
      console.log(`✅ Pollen sampled: Tree=${treePollen}, Grass=${grassPollen}, Weed=${weedPollen}, Total=${totalPollen}`);
      
      return {
        tree: treePollen,
        grass: grassPollen,
        weed: weedPollen,
        value: totalPollen,
        level: level,
        source: 'heatmap_png_decoding'
      };
    } catch (error) {
      console.error('Error sampling pollen:', error);
      return {
        tree: 0,
        grass: 0,
        weed: 0,
        value: 0,
        level: 'none',
        source: 'error'
      };
    }
  }

  // Sample specific pollen type using heatmap tile analysis
  async samplePollenType(location, zoom, x, y, pollenType) {
    try {
      const tile = await HeatmapService.getPollenHeatmapTile(zoom, x, y, pollenType);
      if (tile && tile.data) {
        const pollenLevel = HeatmapDecoder.estimatePollenFromTileData(tile.data, pollenType);
        console.log(`✅ ${pollenType} sampled: ${pollenLevel.value} (${pollenLevel.level}) [confidence: ${pollenLevel.confidence}]`);
        return pollenLevel.value;
      }
      return 0;
    } catch (error) {
      console.error(`Error sampling ${pollenType}:`, error);
      return 0;
    }
  }

  // Convert lat/lng to tile coordinates
  latLngToTile(lat, lng, zoom) {
    const n = Math.pow(2, zoom);
    const xtile = Math.floor((lng + 180) / 360 * n);
    const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);
    return { x: xtile, y: ytile };
  }

  // Get air quality level from AQI value
  getAirQualityLevel(aqi) {
    if (aqi <= 50) return 'good';
    if (aqi <= 100) return 'moderate';
    if (aqi <= 150) return 'unhealthy_sensitive';
    if (aqi <= 200) return 'unhealthy';
    if (aqi <= 300) return 'very_unhealthy';
    return 'hazardous';
  }

  // Get pollen level from total pollen value based on UPI scale
  getPollenLevel(totalPollen) {
    if (totalPollen === 0) return 'none';
    if (totalPollen <= 1) return 'very_low';
    if (totalPollen <= 2) return 'low';
    if (totalPollen <= 3) return 'moderate';
    if (totalPollen <= 4) return 'high';
    if (totalPollen <= 5) return 'very_high';
    return 'very_high'; // Cap at very high for any values above 5
  }

  // Store sample in backend
  async storeSampleInBackend(sample) {
    try {
      // This would store the sample in your database
      // For now, just log it
      console.log('Storing sample in backend:', sample);
      
      // You could implement actual backend storage here
      // await backendService.apiClient.post('/api/exposure/sample', sample);
    } catch (error) {
      console.error('Error storing sample in backend:', error);
    }
  }

  // Get sampling status
  getSamplingStatus() {
    return {
      isSampling: this.isSampling,
      lastSampleTime: this.lastSampleTime,
      totalSamples: this.samples.length
    };
  }
}

export default new ExposureSamplingService();
