const axios = require('axios');

// Test Google Cloud API key
async function testGoogleCloudAPI() {
  const apiKey = 'AIzaSyCCNN19KhPTamJDozHgega-hoojK-n-a7Y';
  
  console.log('🔍 POLLEN API - CORRECT MAP TYPES TEST');
  console.log('API Key (first 10 chars):', apiKey.substring(0, 10) + '...');
  console.log('');
  
  // Test 1: Air Quality (working reference)
  console.log('📡 Test 1: Air Quality (WORKING REFERENCE)');
  try {
    const response = await axios.post('https://airquality.googleapis.com/v1/currentConditions:lookup', {
      location: { latitude: 40.7128, longitude: -74.0060 }
    }, {
      params: { key: apiKey },
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('✅ SUCCESS:', response.status, response.statusText);
  } catch (error) {
    console.log('❌ ERROR:', error.response?.status, error.response?.statusText);
  }
  
  console.log('');
  console.log('🌸 POLLEN API - CORRECT MAP TYPES:');
  
  // Test 2: Pollen heatmap tiles - correct map types from documentation
  console.log('📡 Test 2: Pollen heatmap - correct map types (TREE_UPI, GRASS_UPI, WEED_UPI)');
  const correctMapTypes = ['TREE_UPI', 'GRASS_UPI', 'WEED_UPI'];
  
  for (const mapType of correctMapTypes) {
    try {
      // Use zoom=0, x=0, y=0 for testing (valid coordinates)
      const url = `https://pollen.googleapis.com/v1/mapTypes/${mapType}/heatmapTiles/0/0/0?key=${apiKey}`;
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      console.log(`✅ SUCCESS (${mapType}):`, response.status, response.statusText);
      console.log(`   Data size: ${response.data.length} bytes`);
      console.log(`   Content-Type: ${response.headers['content-type']}`);
      break; // If one works, we found the right format
    } catch (error) {
      console.log(`❌ ERROR (${mapType}):`, error.response?.status, error.response?.statusText);
      if (error.response?.data) {
        console.log(`   Error details: ${error.response.data.toString()}`);
      }
    }
  }
  
  // Test 3: Try different zoom levels with working map type
  console.log('📡 Test 3: Pollen heatmap - different zoom levels');
  const zoomLevels = [0, 1, 2, 3];
  
  for (const zoom of zoomLevels) {
    try {
      const url = `https://pollen.googleapis.com/v1/mapTypes/TREE_UPI/heatmapTiles/${zoom}/0/0?key=${apiKey}`;
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      console.log(`✅ SUCCESS (zoom=${zoom}):`, response.status, response.statusText);
      console.log(`   Data size: ${response.data.length} bytes`);
      break; // If one works, we found the right format
    } catch (error) {
      console.log(`❌ ERROR (zoom=${zoom}):`, error.response?.status, error.response?.statusText);
    }
  }
  
  console.log('');
  console.log('📋 SUMMARY:');
  console.log('🎯 GOAL: Test correct map types from documentation');
  console.log('📖 USING: TREE_UPI, GRASS_UPI, WEED_UPI with zoom=0, x=0, y=0');
  console.log('🔍 FOCUS: Heatmap tiles only (forecast API not priority)');
}

testGoogleCloudAPI().catch(console.error);
