const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestData() {
  try {
    console.log('Adding test exposure data...');

    // First, create a test session
    const { data: sessionData, error: sessionError } = await supabase
      .from('user_exposure_sessions')
      .insert({
        session_id: 'test_session_123',
        device_id: 'test_device',
        location_lat: 40.7128,
        location_lng: -74.0060
      })
      .select()
      .single();

    if (sessionError && sessionError.code !== '23505') { // Ignore duplicate key errors
      console.error('Error creating session:', sessionError);
      return;
    }

    console.log('Session created or already exists');

    // Generate test readings for the last 24 hours
    const now = new Date();
    const readings = [];

    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - (i * 60 * 60 * 1000)); // Each hour
      
      // Add 4 readings per hour (every 15 minutes)
      for (let j = 0; j < 4; j++) {
        const readingTime = new Date(time.getTime() + (j * 15 * 60 * 1000));
        
        readings.push({
          session_id: 'test_session_123',
          reading_time: readingTime.toISOString(),
          location_lat: 40.7128,
          location_lng: -74.0060,
          
          // Air Quality - varying throughout the day
          air_quality_index: Math.floor(50 + Math.sin(i / 24 * Math.PI) * 30 + Math.random() * 20),
          air_quality_level: 'moderate',
          pm25_value: 15 + Math.random() * 10,
          pm10_value: 25 + Math.random() * 15,
          
          // Pollen - higher in morning
          total_pollen_index: Math.floor(2 + Math.sin((i - 6) / 24 * Math.PI) * 3 + Math.random() * 2),
          pollen_level: 'moderate',
          
          // UV - higher in afternoon
          uv_index: Math.floor(1 + Math.sin((i - 12) / 24 * Math.PI) * 4 + Math.random() * 2),
          uv_level: 'moderate',
          
          // Weather
          temperature_celsius: 20 + Math.sin(i / 24 * Math.PI) * 5 + Math.random() * 3,
          humidity_percent: 60 + Math.random() * 20,
          
          // Exposure scores
          air_quality_exposure_score: Math.floor(30 + Math.random() * 40),
          pollen_exposure_score: Math.floor(20 + Math.random() * 30),
          uv_exposure_score: Math.floor(10 + Math.random() * 20),
          overall_exposure_score: Math.floor(20 + Math.random() * 30)
        });
      }
    }

    console.log(`Generated ${readings.length} test readings`);

    // Insert readings in batches
    const batchSize = 50;
    for (let i = 0; i < readings.length; i += batchSize) {
      const batch = readings.slice(i, i + batchSize);
      const { error } = await supabase
        .from('exposure_readings')
        .insert(batch);

      if (error) {
        console.error('Error inserting batch:', error);
        return;
      }
      
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(readings.length / batchSize)}`);
    }

    console.log('✅ Test data added successfully!');
    console.log(`📊 Added ${readings.length} exposure readings`);
    console.log('🕐 Time range: Last 24 hours with 15-minute intervals');
    console.log('📍 Location: New York City (40.7128, -74.0060)');

  } catch (error) {
    console.error('Error adding test data:', error);
  }
}

addTestData();
