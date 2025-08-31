# 🌍 Environmental Exposure Tracker

A comprehensive React Native mobile application that tracks environmental exposure using real-time data from Google Cloud APIs and provides heatmap visualizations for air quality, pollen, and other environmental metrics.

## 🚀 Features

### 📱 Core Functionality
- **Real-time Environmental Monitoring**: Track air quality, pollen levels, and UV exposure
- **Interactive Heatmaps**: Visualize environmental data with Google Maps integration
- **Location-based Tracking**: Monitor exposure based on user's current location
- **Cumulative Exposure History**: Track long-term environmental exposure patterns
- **Offline Capability**: Cached data for offline viewing

### 🗺️ Map Features
- **Google Maps Integration**: Full-featured map with environmental overlays
- **Heatmap Tiles**: Real-time environmental data visualization
- **Toggle Overlays**: Switch between different environmental metrics
- **Geographic Resolution**: ~19.5 km resolution at zoom level 10
- **Global Coverage**: Worldwide environmental data support

### 📊 Environmental Metrics
- **Air Quality Index (AQI)**: Real-time air pollution levels
- **Pollen Count**: Allergen exposure tracking
- **UV Index**: Sun exposure monitoring
- **Temperature**: Current weather conditions
- **Humidity**: Environmental moisture levels

## 🏗️ Architecture

### Frontend (React Native/Expo)
- **React Native**: Cross-platform mobile development
- **Expo**: Development framework and build tools
- **Google Maps React Native**: Map integration
- **React Navigation**: Screen navigation
- **AsyncStorage**: Local data persistence

### Backend (Node.js/Express)
- **Express.js**: RESTful API server
- **Google Cloud APIs**: Environmental data sources
- **Supabase**: PostgreSQL database backend
- **Caching System**: API call optimization
- **Rate Limiting**: API quota management

### Database (Supabase/PostgreSQL)
- **Environmental Data**: Cached API responses
- **User Exposure**: Cumulative exposure tracking
- **Geographic Tiles**: Tile-based data storage
- **Cache Management**: Data freshness tracking

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Google Cloud Platform account
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/EmesOrdCo/EnvironmentalExposureTracker.git
   cd EnvironmentalExposureTracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key
   GOOGLE_CLOUD_API_SECRET=your_google_cloud_api_secret
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   ```

4. **Database Setup**
   Run the Supabase migration:
   ```bash
   cd backend
   node database/setup.js
   ```

5. **Start the backend server**
   ```bash
   cd backend
   node server.js
   ```

6. **Start the mobile app**
   ```bash
   npm start
   ```

## 🔧 API Integration

### Google Cloud APIs
- **Air Quality API**: Real-time air pollution data
- **Pollen API**: Allergen exposure information
- **Maps JavaScript API**: Map visualization
- **Geocoding API**: Location services

### Geographic Resolution
- **Tile System**: Google Maps tile-based data
- **Zoom Level 10**: ~19.5 km resolution
- **Global Coverage**: Worldwide environmental data
- **Cache Strategy**: 5-minute cache invalidation

### API Optimization
- **Rate Limiting**: Prevents API quota exhaustion
- **Caching**: Reduces redundant API calls
- **Batch Requests**: Efficient data retrieval
- **Geographic Filtering**: Location-based queries

## 📱 Usage

### Main Features
1. **Map View**: Interactive map with environmental overlays
2. **Environmental Overlays**: Toggle between air quality, pollen, and UV data
3. **Exposure Tracking**: Monitor cumulative environmental exposure
4. **Settings**: Configure app preferences and data sources

### Navigation
- **Home**: Main map view with environmental overlays
- **Exposure History**: View cumulative exposure data
- **Settings**: App configuration and preferences

## 🗄️ Database Schema

### Tables
- **environmental_data**: Cached API responses
- **user_exposure**: Cumulative exposure tracking
- **tile_cache**: Geographic tile data
- **api_logs**: API call monitoring

### Data Flow
1. **API Calls**: Fetch environmental data from Google Cloud
2. **Caching**: Store data in Supabase with timestamps
3. **Exposure Tracking**: Sample data based on user location
4. **Visualization**: Display data as heatmap overlays

## 🔒 Security

### API Key Management
- Environment variables for sensitive data
- Secure API key storage
- Rate limiting and quota management
- Request signing for authenticated APIs

### Data Privacy
- Local data storage for user preferences
- Secure API communication
- No personal data collection
- GDPR compliance considerations

## 🚀 Deployment

### Mobile App
- **Expo Build**: Cross-platform builds
- **App Store**: iOS deployment
- **Google Play**: Android deployment
- **OTA Updates**: Over-the-air updates

### Backend
- **Node.js Hosting**: Vercel, Heroku, or AWS
- **Database**: Supabase cloud hosting
- **Environment Variables**: Secure configuration
- **Monitoring**: API usage and performance

## 📈 Performance

### Optimization Strategies
- **API Caching**: 5-minute cache invalidation
- **Geographic Filtering**: Location-based queries
- **Batch Processing**: Efficient data retrieval
- **Offline Support**: Cached data access

### Monitoring
- **API Usage**: Track quota consumption
- **Response Times**: Monitor API performance
- **Cache Hit Rates**: Optimize caching strategy
- **Error Rates**: Monitor API reliability

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Google Cloud Platform**: Environmental data APIs
- **Supabase**: Database and backend services
- **Expo**: React Native development framework
- **React Native Maps**: Map integration

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API documentation

---

**Built with ❤️ for environmental health awareness**
