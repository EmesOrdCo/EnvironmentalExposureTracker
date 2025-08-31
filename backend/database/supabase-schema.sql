-- Environmental Data Caching Backend Database Schema for Supabase
-- This system handles massive scale with minimal Google Cloud API calls

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Heatmap tiles cache table
CREATE TABLE heatmap_tiles (
    id BIGSERIAL PRIMARY KEY,
    data_type TEXT NOT NULL CHECK (data_type IN ('airquality', 'pollen', 'uv')),
    heatmap_type TEXT NOT NULL, -- e.g., 'US_AQI', 'TREE_UPI'
    zoom_level INTEGER NOT NULL,
    tile_x INTEGER NOT NULL,
    tile_y INTEGER NOT NULL,
    tile_data TEXT NOT NULL, -- Base64 encoded PNG image data
    content_type TEXT DEFAULT 'image/png',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite unique key for efficient lookups
    UNIQUE(data_type, heatmap_type, zoom_level, tile_x, tile_y)
);

-- Geographic regions for grid-based caching
CREATE TABLE geographic_regions (
    id BIGSERIAL PRIMARY KEY,
    region_key TEXT NOT NULL UNIQUE, -- e.g., 'airquality_US_AQI_8_10_5'
    data_type TEXT NOT NULL CHECK (data_type IN ('airquality', 'pollen', 'uv')),
    heatmap_type TEXT NOT NULL,
    zoom_level INTEGER NOT NULL,
    grid_lat INTEGER NOT NULL, -- Grid latitude (0.5 degree increments)
    grid_lng INTEGER NOT NULL, -- Grid longitude (0.5 degree increments)
    north_bound DECIMAL(10,6) NOT NULL,
    south_bound DECIMAL(10,6) NOT NULL,
    east_bound DECIMAL(10,6) NOT NULL,
    west_bound DECIMAL(10,6) NOT NULL,
    tile_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- API usage tracking and rate limiting
CREATE TABLE api_usage (
    id BIGSERIAL PRIMARY KEY,
    api_endpoint TEXT NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('airquality', 'pollen', 'uv')),
    request_count INTEGER DEFAULT 1,
    last_request_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Track usage per hour (using a simple unique key)
    hour_key TEXT NOT NULL,
    UNIQUE(hour_key)
);

-- User session tracking for analytics
CREATE TABLE user_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    user_agent TEXT,
    ip_address INET,
    location_lat DECIMAL(10,6),
    location_lng DECIMAL(10,6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_requests INTEGER DEFAULT 0,
    cache_hits INTEGER DEFAULT 0,
    cache_misses INTEGER DEFAULT 0
);

-- Cache performance metrics
CREATE TABLE cache_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_date DATE NOT NULL,
    data_type TEXT NOT NULL CHECK (data_type IN ('airquality', 'pollen', 'uv')),
    total_requests INTEGER DEFAULT 0,
    cache_hits INTEGER DEFAULT 0,
    cache_misses INTEGER DEFAULT 0,
    api_calls_made INTEGER DEFAULT 0,
    avg_response_time_ms DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(metric_date, data_type)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Heatmap tiles indexes
CREATE INDEX idx_heatmap_tiles_data_type ON heatmap_tiles(data_type);
CREATE INDEX idx_heatmap_tiles_heatmap_type ON heatmap_tiles(heatmap_type);
CREATE INDEX idx_heatmap_tiles_zoom_level ON heatmap_tiles(zoom_level);
CREATE INDEX idx_heatmap_tiles_expires_at ON heatmap_tiles(expires_at);
CREATE INDEX idx_heatmap_tiles_last_accessed ON heatmap_tiles(last_accessed);

-- Geographic regions indexes
CREATE INDEX idx_geographic_regions_region_key ON geographic_regions(region_key);
CREATE INDEX idx_geographic_regions_grid_coords ON geographic_regions(grid_lat, grid_lng);
CREATE INDEX idx_geographic_regions_bounds ON geographic_regions(north_bound, south_bound, east_bound, west_bound);
CREATE INDEX idx_geographic_regions_expires_at ON geographic_regions(expires_at);

-- API usage indexes
CREATE INDEX idx_api_usage_endpoint ON api_usage(api_endpoint);
CREATE INDEX idx_api_usage_data_type ON api_usage(data_type);
CREATE INDEX idx_api_usage_last_request ON api_usage(last_request_at);

-- User sessions indexes
CREATE INDEX idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity);
CREATE INDEX idx_user_sessions_location ON user_sessions(location_lat, location_lng);

-- Cache metrics indexes
CREATE INDEX idx_cache_metrics_date ON cache_metrics(metric_date);
CREATE INDEX idx_cache_metrics_data_type ON cache_metrics(data_type);

-- =====================================================
-- FUNCTIONS AND STORED PROCEDURES
-- =====================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to get cache statistics
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE (
    data_type TEXT,
    total_tiles BIGINT,
    active_tiles BIGINT,
    expired_tiles BIGINT,
    total_accesses BIGINT,
    avg_accesses_per_tile NUMERIC,
    oldest_tile TIMESTAMP WITH TIME ZONE,
    newest_tile TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ht.data_type,
        COUNT(*)::BIGINT as total_tiles,
        COUNT(*) FILTER (WHERE ht.expires_at > NOW())::BIGINT as active_tiles,
        COUNT(*) FILTER (WHERE ht.expires_at <= NOW())::BIGINT as expired_tiles,
        COALESCE(SUM(ht.access_count), 0)::BIGINT as total_accesses,
        COALESCE(AVG(ht.access_count), 0) as avg_accesses_per_tile,
        MIN(ht.created_at) as oldest_tile,
        MAX(ht.created_at) as newest_tile
    FROM heatmap_tiles ht
    GROUP BY ht.data_type;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired tiles
CREATE OR REPLACE FUNCTION cleanup_expired_tiles()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM heatmap_tiles 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to automatically update updated_at column
CREATE TRIGGER update_heatmap_tiles_updated_at 
    BEFORE UPDATE ON heatmap_tiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_geographic_regions_updated_at 
    BEFORE UPDATE ON geographic_regions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- Cache hit rate view
CREATE VIEW cache_hit_rate AS
SELECT 
    DATE(created_at) as date,
    data_type,
    COUNT(*) as total_requests,
    COALESCE(SUM(access_count), 0) as total_accesses,
    ROUND(
        CASE 
            WHEN COUNT(*) > 0 THEN (COALESCE(SUM(access_count), 0)::NUMERIC / COUNT(*)::NUMERIC) * 100
            ELSE 0 
        END, 2
    ) as hit_rate_percentage
FROM heatmap_tiles
GROUP BY DATE(created_at), data_type;

-- Geographic coverage view
CREATE VIEW geographic_coverage AS
SELECT 
    data_type,
    heatmap_type,
    zoom_level,
    COUNT(*) as tiles_available,
    MIN(north_bound) as max_north,
    MAX(south_bound) as max_south,
    MIN(west_bound) as max_west,
    MAX(east_bound) as max_east
FROM geographic_regions
WHERE expires_at > NOW()
GROUP BY data_type, heatmap_type, zoom_level;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default cache durations
INSERT INTO cache_metrics (metric_date, data_type, total_requests, cache_hits, cache_misses, api_calls_made)
VALUES 
    (CURRENT_DATE, 'airquality', 0, 0, 0, 0),
    (CURRENT_DATE, 'pollen', 0, 0, 0, 0),
    (CURRENT_DATE, 'uv', 0, 0, 0, 0)
ON CONFLICT (metric_date, data_type) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE heatmap_tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
CREATE POLICY "Service role can access all data" ON heatmap_tiles
    FOR ALL USING (true);

CREATE POLICY "Service role can access all data" ON geographic_regions
    FOR ALL USING (true);

CREATE POLICY "Service role can access all data" ON api_usage
    FOR ALL USING (true);

CREATE POLICY "Service role can access all data" ON user_sessions
    FOR ALL USING (true);

CREATE POLICY "Service role can access all data" ON cache_metrics
    FOR ALL USING (true);

-- =====================================================
-- EXPOSURE TRACKING INDEXES
-- =====================================================

-- User exposure sessions indexes
CREATE INDEX idx_user_exposure_sessions_device_id ON user_exposure_sessions(device_id);
CREATE INDEX idx_user_exposure_sessions_start_time ON user_exposure_sessions(start_time);
CREATE INDEX idx_user_exposure_sessions_location ON user_exposure_sessions(location_lat, location_lng);

-- Exposure readings indexes
CREATE INDEX idx_exposure_readings_session_id ON exposure_readings(session_id);
CREATE INDEX idx_exposure_readings_reading_time ON exposure_readings(reading_time);
CREATE INDEX idx_exposure_readings_location ON exposure_readings(location_lat, location_lng);
CREATE INDEX idx_exposure_readings_overall_score ON exposure_readings(overall_exposure_score);

-- Daily summaries indexes
CREATE INDEX idx_daily_exposure_summaries_device_date ON daily_exposure_summaries(device_id, summary_date);
CREATE INDEX idx_daily_exposure_summaries_total_exposure ON daily_exposure_summaries(total_overall_exposure);

-- Exposure alerts indexes
CREATE INDEX idx_exposure_alerts_session_id ON exposure_alerts(session_id);
CREATE INDEX idx_exposure_alerts_alert_type ON exposure_alerts(alert_type);
CREATE INDEX idx_exposure_alerts_is_active ON exposure_alerts(is_active);

-- =====================================================
-- EXPOSURE TRACKING FUNCTIONS
-- =====================================================

-- Function to calculate exposure scores
CREATE OR REPLACE FUNCTION calculate_exposure_scores(
    p_air_quality_index INTEGER,
    p_pollen_index INTEGER,
    p_uv_index DECIMAL
) RETURNS TABLE (
    air_quality_score INTEGER,
    pollen_score INTEGER,
    uv_score INTEGER,
    overall_score INTEGER
) AS $$
BEGIN
    -- Air Quality Score (0-100)
    air_quality_score := CASE 
        WHEN p_air_quality_index <= 50 THEN 0
        WHEN p_air_quality_index <= 100 THEN (p_air_quality_index - 50) * 2
        WHEN p_air_quality_index <= 150 THEN 100 + (p_air_quality_index - 100) * 2
        WHEN p_air_quality_index <= 200 THEN 200 + (p_air_quality_index - 150) * 2
        WHEN p_air_quality_index <= 300 THEN 300 + (p_air_quality_index - 200) * 2
        ELSE 500
    END;
    
    -- Pollen Score (0-100)
    pollen_score := CASE 
        WHEN p_pollen_index <= 2.4 THEN 0
        WHEN p_pollen_index <= 4.8 THEN (p_pollen_index - 2.4) * 20.8
        WHEN p_pollen_index <= 9.7 THEN 50 + (p_pollen_index - 4.8) * 10.2
        WHEN p_pollen_index <= 12.0 THEN 100 + (p_pollen_index - 9.7) * 13.0
        ELSE 130
    END;
    
    -- UV Score (0-100)
    uv_score := CASE 
        WHEN p_uv_index <= 2 THEN 0
        WHEN p_uv_index <= 5 THEN (p_uv_index - 2) * 33.3
        WHEN p_uv_index <= 7 THEN 100 + (p_uv_index - 5) * 50
        WHEN p_uv_index <= 10 THEN 200 + (p_uv_index - 7) * 33.3
        ELSE 300
    END;
    
    -- Overall Score (weighted average)
    overall_score := (air_quality_score * 0.4 + pollen_score * 0.3 + uv_score * 0.3)::INTEGER;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to update daily exposure summary
CREATE OR REPLACE FUNCTION update_daily_exposure_summary(
    p_device_id TEXT,
    p_summary_date DATE
) RETURNS VOID AS $$
BEGIN
    INSERT INTO daily_exposure_summaries (
        device_id,
        summary_date,
        total_sessions,
        total_duration_minutes,
        total_readings,
        avg_air_quality_index,
        avg_pollen_index,
        avg_uv_index,
        avg_temperature,
        max_air_quality_index,
        max_pollen_index,
        max_uv_index,
        total_air_quality_exposure,
        total_pollen_exposure,
        total_uv_exposure,
        total_overall_exposure,
        time_good_air_quality_minutes,
        time_moderate_air_quality_minutes,
        time_unhealthy_air_quality_minutes,
        time_low_pollen_minutes,
        time_high_pollen_minutes,
        time_low_uv_minutes,
        time_high_uv_minutes
    )
    SELECT 
        p_device_id,
        p_summary_date,
        COUNT(DISTINCT ues.session_id),
        COALESCE(SUM(ues.total_duration_minutes), 0),
        COUNT(er.id),
        AVG(er.air_quality_index),
        AVG(er.total_pollen_index),
        AVG(er.uv_index),
        AVG(er.temperature_celsius),
        MAX(er.air_quality_index),
        MAX(er.total_pollen_index),
        MAX(er.uv_index),
        SUM(er.air_quality_exposure_score),
        SUM(er.pollen_exposure_score),
        SUM(er.uv_exposure_score),
        SUM(er.overall_exposure_score),
        COUNT(*) FILTER (WHERE er.air_quality_level = 'good') * 5, -- Assuming 5-minute intervals
        COUNT(*) FILTER (WHERE er.air_quality_level IN ('moderate', 'unhealthy_sensitive')) * 5,
        COUNT(*) FILTER (WHERE er.air_quality_level IN ('unhealthy', 'very_unhealthy', 'hazardous')) * 5,
        COUNT(*) FILTER (WHERE er.pollen_level IN ('low', 'moderate')) * 5,
        COUNT(*) FILTER (WHERE er.pollen_level IN ('high', 'very_high')) * 5,
        COUNT(*) FILTER (WHERE er.uv_level IN ('low', 'moderate')) * 5,
        COUNT(*) FILTER (WHERE er.uv_level IN ('high', 'very_high', 'extreme')) * 5
    FROM user_exposure_sessions ues
    LEFT JOIN exposure_readings er ON ues.session_id = er.session_id
    WHERE ues.device_id = p_device_id 
    AND DATE(ues.start_time) = p_summary_date
    ON CONFLICT (device_id, summary_date) 
    DO UPDATE SET
        total_sessions = EXCLUDED.total_sessions,
        total_duration_minutes = EXCLUDED.total_duration_minutes,
        total_readings = EXCLUDED.total_readings,
        avg_air_quality_index = EXCLUDED.avg_air_quality_index,
        avg_pollen_index = EXCLUDED.avg_pollen_index,
        avg_uv_index = EXCLUDED.avg_uv_index,
        avg_temperature = EXCLUDED.avg_temperature,
        max_air_quality_index = EXCLUDED.max_air_quality_index,
        max_pollen_index = EXCLUDED.max_pollen_index,
        max_uv_index = EXCLUDED.max_uv_index,
        total_air_quality_exposure = EXCLUDED.total_air_quality_exposure,
        total_pollen_exposure = EXCLUDED.total_pollen_exposure,
        total_uv_exposure = EXCLUDED.total_uv_exposure,
        total_overall_exposure = EXCLUDED.total_overall_exposure,
        time_good_air_quality_minutes = EXCLUDED.time_good_air_quality_minutes,
        time_moderate_air_quality_minutes = EXCLUDED.time_moderate_air_quality_minutes,
        time_unhealthy_air_quality_minutes = EXCLUDED.time_unhealthy_air_quality_minutes,
        time_low_pollen_minutes = EXCLUDED.time_low_pollen_minutes,
        time_high_pollen_minutes = EXCLUDED.time_high_pollen_minutes,
        time_low_uv_minutes = EXCLUDED.time_low_uv_minutes,
        time_high_uv_minutes = EXCLUDED.time_high_uv_minutes,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- EXPOSURE TRACKING TABLES
-- =====================================================

-- User exposure tracking
CREATE TABLE user_exposure_sessions (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    user_id TEXT, -- Optional: for future user authentication
    device_id TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    total_duration_minutes INTEGER DEFAULT 0,
    location_lat DECIMAL(10,6),
    location_lng DECIMAL(10,6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual exposure readings
CREATE TABLE exposure_readings (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES user_exposure_sessions(session_id) ON DELETE CASCADE,
    reading_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location_lat DECIMAL(10,6),
    location_lng DECIMAL(10,6),
    
    -- Air Quality metrics
    air_quality_index INTEGER,
    air_quality_level TEXT CHECK (air_quality_level IN ('good', 'moderate', 'unhealthy_sensitive', 'unhealthy', 'very_unhealthy', 'hazardous')),
    pm25_value DECIMAL(5,2),
    pm10_value DECIMAL(5,2),
    ozone_value DECIMAL(5,2),
    no2_value DECIMAL(5,2),
    co_value DECIMAL(5,2),
    
    -- Pollen metrics
    tree_pollen_index INTEGER,
    grass_pollen_index INTEGER,
    weed_pollen_index INTEGER,
    total_pollen_index INTEGER,
    pollen_level TEXT CHECK (pollen_level IN ('low', 'moderate', 'high', 'very_high')),
    
    -- UV metrics
    uv_index DECIMAL(3,1),
    uv_level TEXT CHECK (uv_level IN ('low', 'moderate', 'high', 'very_high', 'extreme')),
    
    -- Weather metrics
    temperature_celsius DECIMAL(4,1),
    humidity_percent INTEGER,
    wind_speed_kmh DECIMAL(4,1),
    
    -- Calculated exposure scores
    air_quality_exposure_score INTEGER, -- 0-100 scale
    pollen_exposure_score INTEGER, -- 0-100 scale
    uv_exposure_score INTEGER, -- 0-100 scale
    overall_exposure_score INTEGER, -- 0-100 scale
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily exposure summaries
CREATE TABLE daily_exposure_summaries (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT,
    device_id TEXT NOT NULL,
    summary_date DATE NOT NULL,
    
    -- Session counts
    total_sessions INTEGER DEFAULT 0,
    total_duration_minutes INTEGER DEFAULT 0,
    total_readings INTEGER DEFAULT 0,
    
    -- Average exposure levels
    avg_air_quality_index DECIMAL(5,2),
    avg_pollen_index DECIMAL(5,2),
    avg_uv_index DECIMAL(3,1),
    avg_temperature DECIMAL(4,1),
    
    -- Peak exposure levels
    max_air_quality_index INTEGER,
    max_pollen_index INTEGER,
    max_uv_index DECIMAL(3,1),
    
    -- Cumulative exposure scores
    total_air_quality_exposure INTEGER,
    total_pollen_exposure INTEGER,
    total_uv_exposure INTEGER,
    total_overall_exposure INTEGER,
    
    -- Time spent in different exposure levels
    time_good_air_quality_minutes INTEGER DEFAULT 0,
    time_moderate_air_quality_minutes INTEGER DEFAULT 0,
    time_unhealthy_air_quality_minutes INTEGER DEFAULT 0,
    
    time_low_pollen_minutes INTEGER DEFAULT 0,
    time_high_pollen_minutes INTEGER DEFAULT 0,
    
    time_low_uv_minutes INTEGER DEFAULT 0,
    time_high_uv_minutes INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(device_id, summary_date)
);

-- Exposure alerts and recommendations
CREATE TABLE exposure_alerts (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT REFERENCES user_exposure_sessions(session_id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('air_quality', 'pollen', 'uv', 'combined')),
    alert_level TEXT NOT NULL CHECK (alert_level IN ('warning', 'caution', 'danger')),
    alert_message TEXT NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE heatmap_tiles IS 'Stores cached PNG tile data from Google Cloud APIs';
COMMENT ON TABLE geographic_regions IS 'Grid-based caching for geographic areas';
COMMENT ON TABLE api_usage IS 'Tracks API usage for rate limiting and analytics';
COMMENT ON TABLE user_sessions IS 'User session tracking for analytics';
COMMENT ON TABLE cache_metrics IS 'Daily performance metrics for cache system';
COMMENT ON TABLE user_exposure_sessions IS 'Tracks user exposure sessions';
COMMENT ON TABLE exposure_readings IS 'Individual environmental readings with exposure scores';
COMMENT ON TABLE daily_exposure_summaries IS 'Daily aggregated exposure data';
COMMENT ON TABLE exposure_alerts IS 'Environmental alerts and recommendations';

COMMENT ON FUNCTION get_cache_stats() IS 'Returns comprehensive cache statistics by data type';
COMMENT ON FUNCTION cleanup_expired_tiles() IS 'Removes expired tiles and returns count of deleted rows';
COMMENT ON FUNCTION calculate_exposure_scores() IS 'Calculates exposure scores from environmental data';
COMMENT ON FUNCTION update_daily_exposure_summary() IS 'Updates daily exposure summary for a device';
