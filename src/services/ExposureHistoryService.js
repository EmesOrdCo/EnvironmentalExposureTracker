import ExposureSamplingService from './ExposureSamplingService';

class ExposureHistoryService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Get cumulative exposure data for the last N hours
  async getCumulativeExposureData(hours = 24) {
    try {
      console.log(`📊 Getting cumulative exposure data for last ${hours} hours`);
      
      // Get samples from the sampling service
      const samples = ExposureSamplingService.getSamplesForHours(hours);
      
      if (samples.length === 0) {
        console.log('No samples available for the time range');
        return { 
          success: false, 
          error: 'No environmental data available. Please ensure location services are enabled and try again later.' 
        };
      }

      // Process the data into chart format
      const chartData = this.processDataForCharts(samples, hours);
      
      console.log(`✅ Processed ${samples.length} samples into chart data`);
      return { success: true, data: chartData };
    } catch (error) {
      console.error('Error getting cumulative exposure data:', error);
      return { success: false, error: error.message };
    }
  }

  // Process raw samples into chart data
  processDataForCharts(samples, hours) {
    // Create time intervals for the last N hours (hourly intervals)
    const intervals = this.createTimeIntervals(hours);
    
    const chartData = {
      labels: [],
      airQuality: [],
      pollen: [],
      cumulativeAirQuality: [],
      cumulativePollen: []
    };

    let cumulativeAQ = 0;
    let cumulativePollen = 0;

    intervals.forEach((interval, index) => {
      // Find samples that fall within this interval
      const intervalSamples = samples.filter(sample => {
        const sampleTime = new Date(sample.timestamp);
        return sampleTime >= interval.start && sampleTime < interval.end;
      });

      // Calculate average values for this interval
      let airQualitySum = 0;
      let pollenSum = 0;
      let sampleCount = intervalSamples.length;

      intervalSamples.forEach(sample => {
        airQualitySum += sample.airQuality?.value || 0;
        pollenSum += sample.pollen?.value || 0;
      });

      const avgAirQuality = sampleCount > 0 ? airQualitySum / sampleCount : 0;
      const avgPollen = sampleCount > 0 ? pollenSum / sampleCount : 0;

      // Add to cumulative totals
      cumulativeAQ += avgAirQuality;
      cumulativePollen += avgPollen;

      // Create label (show hour every 4 intervals = every 4 hours for 24h, every 2 intervals = every 2 hours for shorter ranges)
      const labelInterval = hours >= 24 ? 4 : 2; // Show every 4 hours for 24h, every 2 hours for shorter
      const label = index % labelInterval === 0 ? 
        `${interval.start.getHours().toString().padStart(2, '0')}` : '';

      chartData.labels.push(label);
      chartData.airQuality.push(avgAirQuality);
      chartData.pollen.push(avgPollen);
      chartData.cumulativeAirQuality.push(cumulativeAQ);
      chartData.cumulativePollen.push(cumulativePollen);
    });

    return chartData;
  }

  // Create time intervals for the last N hours
  createTimeIntervals(hours) {
    const intervals = [];
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (hours * 60 * 60 * 1000));
    
    let current = new Date(startTime);
    
    while (current < endTime) {
      const intervalStart = new Date(current);
      const intervalEnd = new Date(current.getTime() + (60 * 60 * 1000)); // 1 hour
      
      intervals.push({
        start: intervalStart,
        end: intervalEnd
      });
      
      current = intervalEnd;
    }
    
    return intervals;
  }

  // Get exposure statistics
  async getExposureStatistics(hours = 24) {
    try {
      const samples = ExposureSamplingService.getSamplesForHours(hours);
      
      if (samples.length === 0) {
        return {
          success: false,
          error: 'No data available for statistics'
        };
      }

      // Calculate statistics
      let totalAirQuality = 0;
      let totalPollen = 0;
      let maxAirQuality = 0;
      let maxPollen = 0;
      let minAirQuality = Infinity;
      let minPollen = Infinity;

      samples.forEach(sample => {
        const aq = sample.airQuality?.value || 0;
        const pollen = sample.pollen?.value || 0;
        
        totalAirQuality += aq;
        totalPollen += pollen;
        maxAirQuality = Math.max(maxAirQuality, aq);
        maxPollen = Math.max(maxPollen, pollen);
        minAirQuality = Math.min(minAirQuality, aq);
        minPollen = Math.min(minPollen, pollen);
      });

      const avgAirQuality = totalAirQuality / samples.length;
      const avgPollen = totalPollen / samples.length;

      return {
        success: true,
        statistics: {
          totalAirQuality: totalAirQuality,
          totalPollen: totalPollen,
          averageAirQuality: avgAirQuality,
          averagePollen: avgPollen,
          maxAirQuality: maxAirQuality,
          maxPollen: maxPollen,
          minAirQuality: minAirQuality,
          minPollen: minPollen,
          sampleCount: samples.length
        }
      };
    } catch (error) {
      console.error('Error getting exposure statistics:', error);
      return { success: false, error: error.message };
    }
  }

  // Get cached data
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  // Cache data
  cacheData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}

export default new ExposureHistoryService();
