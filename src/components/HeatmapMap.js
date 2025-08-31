import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import HeatmapService from '../services/HeatmapService';

const { width, height } = Dimensions.get('window');

const HeatmapMap = ({ 
  location, 
  overlaySettings, 
  selectedType, 
  selectedHeatmapTypes,
  onMapReady,
  onRegionChange 
}) => {
     const webViewRef = useRef(null);
   const [mapReady, setMapReady] = useState(false);
   const [currentViewport, setCurrentViewport] = useState(null);
   const updateTimeoutRef = useRef(null);
   const lastUpdateTimeRef = useRef({});
   const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes instead of 5
   const ZOOM_CACHE_THRESHOLD = 8; // Only fetch fresh data at zoom > 8
   const GRID_SIZE = 0.5; // 0.5 degree geographic grid
   
   // Data freshness per type (in milliseconds)
   const DATA_FRESHNESS = {
     airQuality: 60 * 60 * 1000,    // 1 hour
     pollen: 24 * 60 * 60 * 1000,   // 24 hours
     uv: 30 * 60 * 1000             // 30 minutes
   };

   // Clear cache for specific overlay type
   const clearCacheForOverlay = (overlayType) => {
     const keysToRemove = Object.keys(lastUpdateTimeRef.current).filter(key => 
       key.startsWith(`${overlayType}_`)
     );
     keysToRemove.forEach(key => {
       delete lastUpdateTimeRef.current[key];
     });
     console.log(`Cleared cache for ${overlayType} (${keysToRemove.length} entries)`);
   };

   // Generate grid-based cache key for geographic clustering
   const generateGridCacheKey = (overlayType, viewport) => {
     const gridLat = Math.floor(viewport.bounds.north / GRID_SIZE);
     const gridLng = Math.floor(viewport.bounds.west / GRID_SIZE);
     return `${overlayType}_grid_${gridLat}_${gridLng}_${viewport.zoom}`;
   };

   // Check if zoom level should use cached data
   const shouldUseCachedData = (zoom) => {
     return zoom <= ZOOM_CACHE_THRESHOLD;
   };

   // Get appropriate cache duration for overlay type
   const getCacheDuration = (overlayType) => {
     const type = overlayType === 'airQuality' ? 'airQuality' : 'pollen';
     return DATA_FRESHNESS[type] || CACHE_DURATION;
   };

  // Generate HTML for the map
  const generateMapHTML = () => {
    const apiKey = 'AIzaSyCCNN19KhPTamJDozHgega-hoojK-n-a7Y';
    const lat = location?.latitude || 40.7128;
    const lng = location?.longitude || -74.0060;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; }
            #map { width: 100%; height: 100vh; }
                         .heatmap-overlay { 
               position: absolute; 
               top: 0; 
               left: 0; 
               width: 100%;
               height: 100%;
               pointer-events: none; 
               z-index: 1000; 
             }
            .heatmap-tile { 
              position: absolute; 
              opacity: 0.7; 
              mix-blend-mode: multiply; 
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <div id="heatmap-overlays" class="heatmap-overlay"></div>
          
          <script>
            let map;
            let heatmapOverlays = [];
            let currentZoom = 10;
            let currentCenter = { lat: ${lat}, lng: ${lng} };
            
                         function initMap() {
               map = new google.maps.Map(document.getElementById('map'), {
                 center: currentCenter,
                 zoom: currentZoom,
                 mapTypeId: google.maps.MapTypeId.ROADMAP,
                 disableDefaultUI: false,
                 zoomControl: true,
                 mapTypeControl: true,
                 scaleControl: true,
                 streetViewControl: true,
                 rotateControl: true,
                 fullscreenControl: true
               });
               
               
              
                             // Add current location marker
               new google.maps.Marker({
                 position: currentCenter,
                 map: map,
                 title: 'Your Location',
                 icon: {
                   url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8" fill="#4CAF50" stroke="white" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="white"/></svg>'),
                   scaledSize: new google.maps.Size(24, 24)
                 }
               });
              
              // Listen for map events
              map.addListener('bounds_changed', function() {
                const bounds = map.getBounds();
                const center = map.getCenter();
                const zoom = map.getZoom();
                
                currentZoom = zoom;
                currentCenter = { lat: center.lat(), lng: center.lng() };
                
                // Send viewport change to React Native
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'viewport_changed',
                  bounds: {
                    north: bounds.getNorthEast().lat(),
                    south: bounds.getSouthWest().lat(),
                    east: bounds.getNorthEast().lng(),
                    west: bounds.getSouthWest().lng()
                  },
                  center: currentCenter,
                  zoom: zoom
                }));
              });
              
              // Notify React Native that map is ready
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'map_ready',
                center: currentCenter,
                zoom: currentZoom
              }));
            }
            
                                      function updateHeatmapOverlay(overlayType, heatmapType, tiles) {
               console.log('WebView: Updating heatmap overlay for', overlayType, 'with', tiles.length, 'tiles');
               
               // Clear existing overlays for this type only
               clearHeatmapOverlays(overlayType);
               
                                               if (!tiles || tiles.length === 0) {
                  console.log('WebView: No real tiles available from API');
                  return;
                }
               
               const overlayContainer = document.getElementById('heatmap-overlays');
               const mapDiv = document.getElementById('map');
               
               
               
               
                
                                                 console.log('WebView: About to process', tiles.length, 'tiles');
                tiles.forEach((tile, index) => {
                  console.log('WebView: Processing tile ' + index, 'with data:', tile);
                  
                  if (!tile.bounds) {
                    console.log('WebView: Skipping tile ' + index + ' - missing bounds');
                    return;
                  }
                  
                  // Create image element for real heatmap tiles
                  const img = document.createElement('img');
                  img.className = 'heatmap-tile';
                  img.dataset.overlayType = overlayType;
                  
                  // Convert tile data to blob URL if data is provided
                  if (tile.data && tile.data.length > 0) {
                    const blob = new Blob([new Uint8Array(tile.data)], { type: 'image/png' });
                    const blobUrl = URL.createObjectURL(blob);
                    img.src = blobUrl;
                    console.log('WebView: Created blob URL for tile ' + index);
                  } else {
                    console.log('WebView: No image data for tile ' + index);
                    return;
                  }
                  
                  // Calculate position using Google Maps projection
                  const bounds = tile.bounds;
                  const mapDiv = document.getElementById('map');
                  
                  // Get the pixel coordinates for the tile bounds
                  const topLeft = map.getProjection().fromLatLngToPoint(
                    new google.maps.LatLng(bounds.north, bounds.west)
                  );
                  const bottomRight = map.getProjection().fromLatLngToPoint(
                    new google.maps.LatLng(bounds.south, bounds.east)
                  );
                  
                  // Get the map's current projection
                  const mapCenter = map.getCenter();
                  const mapCenterPoint = map.getProjection().fromLatLngToPoint(mapCenter);
                  
                  // Calculate the scale factor
                  const scale = Math.pow(2, currentZoom);
                  
                                     // Calculate pixel positions relative to map center
                   const left = (topLeft.x - mapCenterPoint.x) * scale + mapDiv.offsetWidth / 2;
                   const top = (topLeft.y - mapCenterPoint.y) * scale + mapDiv.offsetHeight / 2;
                  const width = (bottomRight.x - topLeft.x) * scale;
                  const height = (topLeft.y - bottomRight.y) * scale;
                  
                  // Set the image position and size
                  img.style.position = 'absolute';
                  img.style.left = left + 'px';
                  img.style.top = top + 'px';
                  img.style.width = width + 'px';
                  img.style.height = height + 'px';
                  img.style.opacity = '0.8';
                  img.style.pointerEvents = 'none';
                  img.style.zIndex = '1001';
                  
                  overlayContainer.appendChild(img);
                  heatmapOverlays.push(img);
                  
                  console.log('WebView: Added real tile ' + index + ' at position (' + left + ', ' + top + ') with size (' + width + ', ' + height + ')');
                });
               
               console.log('WebView: Heatmap overlay update complete');
             }
            
                         function clearHeatmapOverlays(overlayType) {
               // Remove overlays for specific type or all if no type specified
               heatmapOverlays = heatmapOverlays.filter(overlay => {
                 if (overlayType && overlay.dataset.overlayType !== overlayType) {
                   return true; // Keep this overlay
                 }
                 if (overlay.parentNode) {
                   overlay.parentNode.removeChild(overlay);
                 }
                 return false; // Remove this overlay
               });
             }
             
             function clearAllOverlays() {
               // Remove all overlays
               heatmapOverlays.forEach(overlay => {
                 if (overlay.parentNode) {
                   overlay.parentNode.removeChild(overlay);
                 }
               });
               heatmapOverlays = [];
               console.log('WebView: Cleared all overlays');
             }
            
                         function setOverlayVisibility(overlayType, visible) {
               // Show/hide overlays for specific type
               const overlays = document.querySelectorAll('[data-overlay-type="' + overlayType + '"]');
               overlays.forEach(overlay => {
                 overlay.style.display = visible ? 'block' : 'none';
               });
               console.log('WebView: Set visibility for', overlayType, 'to', visible);
             }
            
                         // Expose functions to React Native
             window.updateHeatmapOverlay = updateHeatmapOverlay;
             window.setOverlayVisibility = setOverlayVisibility;
             window.clearHeatmapOverlays = clearHeatmapOverlays;
             window.clearAllOverlays = clearAllOverlays;
             
                          // Listen for messages from React Native
             window.addEventListener('message', function(event) {
               try {
                 const data = JSON.parse(event.data);
                 console.log('WebView: Received message:', data.type);
                 
                                    switch (data.type) {
                     case 'update_heatmap':
                       console.log('WebView: Calling updateHeatmapOverlay with', data.tiles ? data.tiles.length : 0, 'tiles');
                       if (data.tiles && data.tiles.length > 0) {
                         console.log('WebView: First tile data length:', data.tiles[0].data ? data.tiles[0].data.length : 'no data');
                         console.log('WebView: First tile bounds:', data.tiles[0].bounds);
                       }
                       updateHeatmapOverlay(data.overlayType || 'airQuality', data.heatmapType || 'US_AQI', data.tiles);
                       break;
                     case 'set_overlay_visibility':
                       console.log('WebView: Setting overlay visibility for', data.overlayType, 'to', data.visible);
                       setOverlayVisibility(data.overlayType || 'airQuality', data.visible);
                       break;
                     case 'clear_all_overlays':
                       console.log('WebView: Clearing all overlays');
                       clearAllOverlays();
                       break;
                   }
               } catch (error) {
                 console.error('WebView: Error handling message:', error);
               }
             });
          </script>
          
          <script async defer
            src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap">
          </script>
        </body>
      </html>
    `;
  };

  // Handle messages from WebView
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'map_ready':
          setMapReady(true);
          if (onMapReady) onMapReady();
          break;
          
        case 'viewport_changed':
          setCurrentViewport({
            bounds: data.bounds,
            center: data.center,
            zoom: data.zoom
          });
          if (onRegionChange) onRegionChange(data);
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

     // Update heatmap overlay when settings change
   useEffect(() => {
     console.log('=== OVERLAY SETTINGS CHANGED ===');
     console.log('Map ready:', mapReady);
     console.log('Has viewport:', !!currentViewport);
     console.log('Overlay settings:', overlaySettings);
     console.log('Selected type:', selectedType);
     console.log('Selected heatmap types:', selectedHeatmapTypes);
     
     if (mapReady && currentViewport) {
       console.log('Map is ready and has viewport, updating overlays...');
       
       // Clear cache for the selected overlay type to ensure fresh data
       clearCacheForOverlay(selectedType);
       
       // Only update the currently selected overlay type
       if (overlaySettings[selectedType]) {
         console.log(`Updating overlay for selected type: ${selectedType}`);
         updateHeatmapOverlay(selectedType);
       } else {
         console.log(`Selected type ${selectedType} is disabled, clearing all overlays`);
         // Clear all overlays if selected type is disabled
         if (webViewRef.current) {
           webViewRef.current.postMessage(JSON.stringify({
             type: 'clear_all_overlays'
           }));
         }
       }
     } else {
       console.log('Cannot update overlays - map not ready or no viewport');
     }
   }, [mapReady, currentViewport, overlaySettings, selectedType, selectedHeatmapTypes]);

   // Clear cache when heatmap types change (different overlay type selected)
   useEffect(() => {
     if (mapReady && currentViewport) {
       console.log(`Heatmap type changed for ${selectedType}, clearing cache`);
       clearCacheForOverlay(selectedType);
       
       if (overlaySettings[selectedType]) {
         console.log(`Fetching fresh data for ${selectedType} with new heatmap type`);
         updateHeatmapOverlay(selectedType);
       }
     }
   }, [selectedHeatmapTypes[selectedType]]);

     // Update overlays when viewport changes (map movement/zoom)
   useEffect(() => {
     if (mapReady && currentViewport) {
       // Only update the currently selected overlay type when map moves
       if (overlaySettings[selectedType]) {
         // Clear any existing timeout
         if (updateTimeoutRef.current) {
           clearTimeout(updateTimeoutRef.current);
         }
         
         // Debounce the update to prevent rapid calls
         updateTimeoutRef.current = setTimeout(() => {
           console.log(`Viewport changed, updating selected overlay: ${selectedType}`);
           updateHeatmapOverlay(selectedType);
         }, 300); // 300ms delay
       }
     }
   }, [currentViewport?.bounds?.north, currentViewport?.bounds?.south, currentViewport?.bounds?.east, currentViewport?.bounds?.west, currentViewport?.zoom]);

     // Update heatmap overlay
   const updateHeatmapOverlay = async (overlayType = selectedType) => {
     if (!mapReady || !currentViewport || !overlaySettings[overlayType]) {
       console.log('Skipping overlay update:', { mapReady, hasViewport: !!currentViewport, overlayEnabled: overlaySettings[overlayType], overlayType });
       return;
     }

     // Use grid-based caching for geographic clustering
     const gridCacheKey = generateGridCacheKey(overlayType, currentViewport);
     const preciseCacheKey = `${overlayType}_${currentViewport.bounds.north.toFixed(2)}_${currentViewport.bounds.south.toFixed(2)}_${currentViewport.bounds.east.toFixed(2)}_${currentViewport.bounds.west.toFixed(2)}_${currentViewport.zoom}`;
     
     // Check if zoom level should use cached data
     const useCachedForZoom = shouldUseCachedData(currentViewport.zoom);
     const cacheDuration = getCacheDuration(overlayType);
     
     // Check if we have recent data for this viewport
     const now = Date.now();
     const lastUpdate = lastUpdateTimeRef.current[preciseCacheKey] || 0;
     const gridLastUpdate = lastUpdateTimeRef.current[gridCacheKey] || 0;
     const timeSinceLastUpdate = now - lastUpdate;
     const gridTimeSinceLastUpdate = now - gridLastUpdate;
     
     // Use grid cache for low zoom levels, precise cache for high zoom
     const isCacheValid = useCachedForZoom ? 
       (gridTimeSinceLastUpdate < cacheDuration) : 
       (timeSinceLastUpdate < cacheDuration);
     
     if (isCacheValid) {
       const remainingTime = useCachedForZoom ? 
         Math.round((cacheDuration - gridTimeSinceLastUpdate) / 1000) :
         Math.round((cacheDuration - timeSinceLastUpdate) / 1000);
       console.log(`Using cached data for ${overlayType} (${remainingTime}s remaining, zoom: ${currentViewport.zoom})`);
       return;
     } else {
       console.log(`Cache expired for ${overlayType}, fetching fresh data (zoom: ${currentViewport.zoom})`);
     }

     try {
       const type = overlayType === 'airQuality' ? 'airquality' : overlayType;
       const heatmapType = overlayType === 'pollen' 
         ? (selectedHeatmapTypes?.pollen || 'TREE_UPI')
         : (selectedHeatmapTypes?.airQuality || 'US_AQI');
       
       console.log('Fetching tiles for:', { type, heatmapType, viewport: currentViewport });
       
       const tiles = await HeatmapService.getTilesForViewport(
         type,
         heatmapType,
         currentViewport,
         currentViewport.zoom
       );

       console.log(`Received ${tiles.length} tiles from HeatmapService`);

       // Update the cache timestamp for both grid and precise cache
       lastUpdateTimeRef.current[gridCacheKey] = now;
       lastUpdateTimeRef.current[preciseCacheKey] = now;

       // Send tiles to WebView
       if (webViewRef.current) {
         if (tiles.length > 0) {
           console.log(`Sending ${tiles.length} tiles to WebView for ${type} ${heatmapType}`);
           webViewRef.current.postMessage(JSON.stringify({
             type: 'update_heatmap',
             overlayType: overlayType,
             heatmapType: type,
             tiles: tiles.map(({ x, y, tile }) => ({
               x,
               y,
               data: Array.from(new Uint8Array(tile.data)),
               bounds: HeatmapService.tileToLatLngBounds(x, y, currentViewport.zoom)
             }))
           }));
         } else {
           console.log('No tiles available from API');
           webViewRef.current.postMessage(JSON.stringify({
             type: 'update_heatmap',
             overlayType: overlayType,
             heatmapType: type,
             tiles: []
           }));
         }
       } else {
         console.log('WebView not ready');
       }
     } catch (error) {
       console.error('Error updating heatmap overlay:', error);
     }
   };

     // Remove the overlay visibility toggle effect since we enforce single overlay visibility

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: generateMapHTML() }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={false}
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  webview: {
    flex: 1,
  },
});

export default HeatmapMap;
