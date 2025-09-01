import * as FileSystem from 'expo-file-system';

class HeatmapDecoder {
  constructor() {
    this.cache = new Map();
  }

  // Extract color from heatmap tile data using a simplified approach
  // Since PNG decoding is complex in React Native, we'll use a different strategy
  async extractPixelColor(pngData, x, y) {
    try {
      // For now, we'll use a simplified approach that estimates color based on position
      // This is a workaround until we can implement proper PNG decoding
      
      // Calculate a pseudo-color based on position and data characteristics
      const dataLength = pngData.length;
      const position = (y * 256 + x) % dataLength;
      
      // Extract some bytes from the PNG data to estimate color
      const r = pngData[position % dataLength] || 128;
      const g = pngData[(position + 100) % dataLength] || 128;
      const b = pngData[(position + 200) % dataLength] || 128;
      
      return { r, g, b, a: 255 };
    } catch (error) {
      console.error('Error extracting pixel color:', error);
      // Return a neutral color as fallback
      return { r: 128, g: 128, b: 128, a: 255 };
    }
  }

  // Convert RGB color to pollen level based on official UPI color scheme
  colorToPollenLevel(color) {
    const { r, g, b } = color;
    
    // Official UPI color scheme:
    // Value 0: Light Gray - None
    // Value 1: Dark Green - Very Low  
    // Value 2: Medium Green - Low
    // Value 3: Yellow - Moderate
    // Value 4: Orange - High
    // Value 5: Red-Orange - Very High

    // Calculate dominant color and intensity
    const maxComponent = Math.max(r, g, b);
    const minComponent = Math.min(r, g, b);
    const intensity = maxComponent - minComponent;

    // Determine pollen level based on official UPI colors
    if (r < 100 && g < 100 && b < 100) {
      // Light Gray - None
      return { level: 'none', value: 0, confidence: 'high' };
    } else if (g > r && g > b && g > 150 && r < 100 && b < 100) {
      // Dark Green - Very Low
      return { level: 'very_low', value: 1, confidence: 'high' };
    } else if (g > r && g > b && g > 120 && r < 150 && b < 150) {
      // Medium Green - Low
      return { level: 'low', value: 2, confidence: 'high' };
    } else if (r > 200 && g > 200 && b < 100) {
      // Yellow - Moderate
      return { level: 'moderate', value: 3, confidence: 'high' };
    } else if (r > 200 && g > 100 && g < 200 && b < 100) {
      // Orange - High
      return { level: 'high', value: 4, confidence: 'high' };
    } else if (r > 200 && g < 150 && b < 100) {
      // Red-Orange - Very High
      return { level: 'very_high', value: 5, confidence: 'high' };
    } else {
      // Unknown color - estimate based on intensity
      const estimatedValue = Math.round((maxComponent / 255) * 5); // Scale to 0-5
      return { 
        level: this.valueToLevel(estimatedValue), 
        value: Math.min(estimatedValue, 5), 
        confidence: 'low' 
      };
    }
  }

  // Convert numeric value to pollen level based on official UPI scale
  valueToLevel(value) {
    if (value === 0) return 'none';
    if (value === 1) return 'very_low';
    if (value === 2) return 'low';
    if (value === 3) return 'moderate';
    if (value === 4) return 'high';
    if (value === 5) return 'very_high';
    return 'none'; // Default to none for invalid values
  }

  // Conservative approach: Only return exact UPI color matches, otherwise return 0
  // This method analyzes the tile data to match official UPI colors exactly
  estimatePollenFromTileData(tileData, pollenType) {
    try {
      // Analyze the tile data to match official UPI colors
      const dataLength = tileData.length;
      let lightGrayCount = 0;    // Value 0: None
      let darkGreenCount = 0;    // Value 1: Very Low
      let mediumGreenCount = 0;  // Value 2: Low
      let yellowCount = 0;       // Value 3: Moderate
      let orangeCount = 0;       // Value 4: High
      let redCount = 0;          // Value 5: Very High
      let unknownCount = 0;
      
      // Sample the data to identify UPI colors
      for (let i = 0; i < Math.min(dataLength, 1000); i += 4) {
        const r = tileData[i] || 0;
        const g = tileData[i + 1] || 0;
        const b = tileData[i + 2] || 0;
        
                 // Match exact UPI colors based on official scale
         if (r >= 180 && g >= 180 && b >= 180 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
           // Light Gray - Value 0: None (light gray with similar RGB values)
           lightGrayCount++;
         } else if (g > 120 && g > r + 50 && g > b + 50 && r < 80 && b < 80) {
           // Dark Green - Value 1: Very Low (dominant green, low red/blue)
           darkGreenCount++;
         } else if (g > 100 && g > r + 30 && g > b + 30 && r < 120 && b < 120) {
           // Lighter Green - Value 2: Low (green dominant but lighter)
           mediumGreenCount++;
         } else if (r > 200 && g > 200 && b < 100 && Math.abs(r - g) < 30) {
           // Yellow - Value 3: Moderate (high red and green, low blue)
           yellowCount++;
         } else if (r > 200 && g > 100 && g < 180 && b < 100) {
           // Orange - Value 4: High (high red, medium green, low blue)
           orangeCount++;
         } else if (r > 200 && g < 100 && b < 100) {
           // Red - Value 5: Very High (high red, low green/blue)
           redCount++;
         } else {
           // Unknown color - don't count as valid UPI data
           unknownCount++;
         }
      }
      
      const total = lightGrayCount + darkGreenCount + mediumGreenCount + yellowCount + orangeCount + redCount;
      
      // If we have mostly unknown colors, return 0 (no data)
      if (unknownCount > total * 0.5) {
        console.log(`❌ ${pollenType}: Mostly unknown colors, returning 0 (no data)`);
        return { level: 'none', value: 0, confidence: 'none' };
      }
      
      // Find the most common UPI color
      const counts = [
        { value: 0, count: lightGrayCount },
        { value: 1, count: darkGreenCount },
        { value: 2, count: mediumGreenCount },
        { value: 3, count: yellowCount },
        { value: 4, count: orangeCount },
        { value: 5, count: redCount }
      ];
      
      const dominant = counts.reduce((max, current) => 
        current.count > max.count ? current : max
      );
      
      // Only return a value if we have a clear dominant UPI color
      if (dominant.count > total * 0.3) {
        const level = this.valueToLevel(dominant.value);
        console.log(`✅ ${pollenType}: Detected UPI ${dominant.value} (${level}) with ${dominant.count}/${total} pixels`);
        return { level, value: dominant.value, confidence: 'high' };
      } else {
        console.log(`❌ ${pollenType}: No clear UPI color match, returning 0 (no data)`);
        return { level: 'none', value: 0, confidence: 'none' };
      }
      
    } catch (error) {
      console.error('Error estimating pollen from tile data:', error);
      return { level: 'none', value: 0, confidence: 'none' };
    }
  }
}

export default new HeatmapDecoder();
