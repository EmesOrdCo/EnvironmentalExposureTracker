import 'dotenv/config';

export default {
  expo: {
    name: "Environmental Exposure Tracker",
    slug: "environmentalexposuretracker",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "This app needs access to location to track environmental exposures in your area.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "This app needs access to location to track environmental exposures in your area.",
        UIBackgroundModes: ["location", "fetch"]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#4CAF50"
      },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_CLOUD_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY"
        }
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow Environmental Exposure Tracker to use your location to track environmental conditions in your area."
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#4CAF50"
        }
      ]
    ],
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION"
    ],
    extra: {
      eas: {
        projectId: "your-project-id"
      },
      googleCloudApiKey: process.env.GOOGLE_CLOUD_API_KEY
    }
  }
};
