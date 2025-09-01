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
  onRegionChange,
  onOverlayStateChange
}) => {
  const [isLoadingTiles, setIsLoadingTiles] = useState(false);
  const [isClearingOverlays, setIsClearingOverlays] = useState(false);
  const [currentActiveOverlay, setCurrentActiveOverlay] = useState(null);
  const [activeOverlayCount, setActiveOverlayCount] = useState(0);
     const webViewRef = useRef(null);
   const [mapReady, setMapReady] = useState(false);
   const [currentViewport, setCurrentViewport] = useState(null);
   const [lastViewport, setLastViewport] = useState(null);
   const updateTimeoutRef = useRef(null);
   const lastUpdateTimeRef = useRef({});
   const tileCacheRef = useRef(new Map()); // Cache actual tile data
   const CACHE_DURATION = 60 * 60 * 1000; // 1 hour (increased for better caching)
   const ZOOM_CACHE_THRESHOLD = 6; // Lower threshold for more aggressive caching
   const GRID_SIZE = 0.25; // Smaller grid for more precise caching
   const DEBOUNCE_DELAY = 200; // Reduced debounce for faster response
   const MAX_CONCURRENT_TILES = 8; // Increased concurrent requests
   const ZOOM_DEBOUNCE_DELAY = 100; // Faster debounce for zoom changes
   const PAN_DEBOUNCE_DELAY = 150; // Medium debounce for pan changes
   
   // Data freshness per type (in milliseconds) - optimized for faster response
   const DATA_FRESHNESS = {
     airQuality: 30 * 60 * 1000,    // 30 minutes (reduced for more frequent updates)
     pollen: 12 * 60 * 60 * 1000,   // 12 hours (reduced for better responsiveness)
     uv: 15 * 60 * 1000             // 15 minutes (reduced for more frequent updates)
   };

   // Clear cache for specific overlay type
   const clearCacheForOverlay = (overlayType) => {
     const keysToRemove = Object.keys(lastUpdateTimeRef.current).filter(key => 
       key.startsWith(`${overlayType}_`)
     );
     keysToRemove.forEach(key => {
       delete lastUpdateTimeRef.current[key];
     });
     
     // Clear tile cache for this overlay type
     const tileKeysToRemove = Array.from(tileCacheRef.current.keys()).filter(key => 
       key.includes(overlayType)
     );
     tileKeysToRemove.forEach(key => {
       tileCacheRef.current.delete(key);
     });
     
     console.log(`Cleared cache for ${overlayType} (${keysToRemove.length} time entries, ${tileKeysToRemove.length} tile entries)`);
   };

   // Cleanup old cache entries to prevent memory issues
   const cleanupCache = () => {
     const now = Date.now();
     const maxCacheAge = 60 * 60 * 1000; // 1 hour
     
     // Cleanup time cache
     Object.keys(lastUpdateTimeRef.current).forEach(key => {
       if (now - lastUpdateTimeRef.current[key] > maxCacheAge) {
         delete lastUpdateTimeRef.current[key];
       }
     });
     
     // Cleanup tile cache (keep only recent entries)
     const maxTileCacheSize = 50;
     if (tileCacheRef.current.size > maxTileCacheSize) {
       const entries = Array.from(tileCacheRef.current.entries());
       const sortedEntries = entries.sort((a, b) => {
         // Sort by access time (we'll use a simple timestamp for now)
         return 0; // Keep it simple for now
       });
       
       // Remove oldest entries
       const toRemove = sortedEntries.slice(0, tileCacheRef.current.size - maxTileCacheSize);
       toRemove.forEach(([key]) => {
         tileCacheRef.current.delete(key);
       });
       
       console.log(`Cleaned up ${toRemove.length} old tile cache entries`);
     }
   };

   // Cleanup function to prevent memory leaks
   const cleanup = () => {
     if (updateTimeoutRef.current) {
       clearTimeout(updateTimeoutRef.current);
       updateTimeoutRef.current = null;
     }
     cleanupCache();
   };

   // Detect if viewport change is zoom or pan
   const getViewportChangeType = (newViewport, oldViewport) => {
     if (!oldViewport) return 'initial';
     
     const zoomChanged = newViewport.zoom !== oldViewport.zoom;
     const centerChanged = 
       Math.abs(newViewport.center.lat - oldViewport.center.lat) > 0.001 ||
       Math.abs(newViewport.center.lng - oldViewport.center.lng) > 0.001;
     
     if (zoomChanged) return 'zoom';
     if (centerChanged) return 'pan';
     return 'none';
   };

   // Get appropriate debounce delay based on change type
   const getDebounceDelay = (changeType) => {
     switch (changeType) {
       case 'zoom': return ZOOM_DEBOUNCE_DELAY;
       case 'pan': return PAN_DEBOUNCE_DELAY;
       default: return DEBOUNCE_DELAY;
     }
   };

   // Fetch tiles with progressive loading
   const fetchTilesWithProgress = async (type, heatmapType, viewport, zoom) => {
     try {
       const tiles = await HeatmapService.getTilesForViewport(type, heatmapType, viewport, zoom);
       return tiles;
     } catch (error) {
       console.error('Error in fetchTilesWithProgress:', error);
       return [];
     }
   };

   // Send tiles to WebView with optimization and faster response
   const sendTilesToWebView = (tiles, overlayType, heatmapType) => {
     if (!webViewRef.current) {
       console.log('WebView not ready');
       return;
     }
     
     if (tiles.length > 0) {
       console.log(`Sending ${tiles.length} tiles to WebView for ${overlayType} ${heatmapType}`);
       
       // Optimize data transfer by compressing tile data
       const optimizedTiles = tiles.map(({ x, y, tile }) => ({
         x,
         y,
         data: Array.from(new Uint8Array(tile.data)),
         bounds: HeatmapService.tileToLatLngBounds(x, y, currentViewport.zoom)
       }));
       
       webViewRef.current.postMessage(JSON.stringify({
         type: 'update_heatmap',
         overlayType: overlayType,
         heatmapType: heatmapType,
         tiles: optimizedTiles
       }));
     } else {
       console.log('No tiles available from API');
       webViewRef.current.postMessage(JSON.stringify({
         type: 'update_heatmap',
         overlayType: overlayType,
         heatmapType: heatmapType,
         tiles: []
       }));
     }
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
               
               // ALWAYS clear ALL overlays first to ensure only one type is active
               clearAllOverlays();
               
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
               
               // Send overlay count to React Native
               window.ReactNativeWebView.postMessage(JSON.stringify({
                 type: 'overlays_updated',
                 count: heatmapOverlays.length,
                 overlayType: overlayType
               }));
             }
            
                         function clearHeatmapOverlays(overlayType) {
               console.log('WebView: Clearing overlays for type:', overlayType);
               console.log('WebView: Current overlays count:', heatmapOverlays.length);
               
               // Remove overlays for specific type or all if no type specified
               const overlaysToRemove = [];
               heatmapOverlays = heatmapOverlays.filter(overlay => {
                 const overlayTypeAttr = overlay.dataset.overlayType;
                 console.log('WebView: Checking overlay with type:', overlayTypeAttr, 'against:', overlayType);
                 
                 if (overlayType && overlayTypeAttr !== overlayType) {
                   return true; // Keep this overlay
                 }
                 
                 // Mark for removal
                 overlaysToRemove.push(overlay);
                 return false; // Remove this overlay
               });
               
               // Remove from DOM
               overlaysToRemove.forEach(overlay => {
                 if (overlay.parentNode) {
                   overlay.parentNode.removeChild(overlay);
                 }
               });
               
               console.log('WebView: Removed', overlaysToRemove.length, 'overlays for type:', overlayType);
               console.log('WebView: Remaining overlays:', heatmapOverlays.length);
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
               
               // Send confirmation to React Native
               window.ReactNativeWebView.postMessage(JSON.stringify({
                 type: 'overlays_cleared'
               }));
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
             
             // Debug function to show current overlays
             window.debugOverlays = function() {
               console.log('WebView: Current overlays count:', heatmapOverlays.length);
               heatmapOverlays.forEach((overlay, index) => {
                 console.log('WebView: Overlay', index, 'type:', overlay.dataset.overlayType, 'visible:', overlay.style.display !== 'none');
               });
             };
             
                          // Listen for messages from React Native
             window.addEventListener('message', function(event) {
               try {
                 const data = JSON.parse(event.data);
                 console.log('WebView: Received message:', data.type);
                 
                 // Process messages immediately for faster response
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
                   case 'overlays_cleared':
                     console.log('WebView: Confirmed all overlays cleared');
                     break;
                   case 'debug_overlays':
                     console.log('WebView: Debug overlays requested');
                     window.debugOverlays();
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
          
                 case 'overlays_cleared':
           console.log('React Native: Received overlays cleared confirmation');
           setIsClearingOverlays(false);
           setActiveOverlayCount(0);
           if (onOverlayStateChange) {
             onOverlayStateChange({ isClearing: false, isLoading: false });
           }
           break;
           
         case 'overlays_updated':
           console.log('React Native: Overlays updated - count:', data.count, 'type:', data.overlayType);
           setActiveOverlayCount(data.count);
           setCurrentActiveOverlay(data.overlayType);
           if (onOverlayStateChange) {
             onOverlayStateChange({ isClearing: false, isLoading: false });
           }
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
       
       // Clear any existing timeout to prevent race conditions
       if (updateTimeoutRef.current) {
         clearTimeout(updateTimeoutRef.current);
       }
       
       // Debounce the overlay update to prevent rapid changes
       updateTimeoutRef.current = setTimeout(() => {
         // Only clear overlays if we're switching to a different type or disabling current type
         const shouldClear = !overlaySettings[selectedType] || 
                           (currentActiveOverlay && currentActiveOverlay !== selectedType);
         
         if (shouldClear && webViewRef.current) {
           console.log('Clearing overlays due to type change or disable');
           setIsClearingOverlays(true);
           if (onOverlayStateChange) {
             onOverlayStateChange({ isClearing: true, isLoading: false });
           }
           webViewRef.current.postMessage(JSON.stringify({
             type: 'clear_all_overlays'
           }));
           
           // Wait for clearing to complete before loading new overlay
           setTimeout(() => {
             if (overlaySettings[selectedType]) {
               console.log(`Loading new overlay for selected type: ${selectedType}`);
               setIsClearingOverlays(false);
               setCurrentActiveOverlay(selectedType);
               if (onOverlayStateChange) {
                 onOverlayStateChange({ isClearing: false, isLoading: true });
               }
               updateHeatmapOverlay(selectedType);
             } else {
               setIsClearingOverlays(false);
               setCurrentActiveOverlay(null);
               if (onOverlayStateChange) {
                 onOverlayStateChange({ isClearing: false, isLoading: false });
               }
             }
           }, 200); // Increased delay for more stable clearing
         } else if (overlaySettings[selectedType]) {
           // Just update the current overlay without clearing
           console.log(`Updating existing overlay for selected type: ${selectedType}`);
           setCurrentActiveOverlay(selectedType);
           updateHeatmapOverlay(selectedType);
         }
       }, 150); // Debounce delay for settings changes
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
     if (mapReady && currentViewport && overlaySettings[selectedType]) {
       const changeType = getViewportChangeType(currentViewport, lastViewport);
       const debounceDelay = getDebounceDelay(changeType);
       
       console.log(`Viewport change detected: ${changeType} (delay: ${debounceDelay}ms)`);
       
       // Clear any existing timeout
       if (updateTimeoutRef.current) {
         clearTimeout(updateTimeoutRef.current);
       }
       
       // Use different debounce delays for different change types
       updateTimeoutRef.current = setTimeout(() => {
         console.log(`Viewport ${changeType} complete, updating selected overlay: ${selectedType}`);
         cleanupCache(); // Cleanup old cache entries
         updateHeatmapOverlay(selectedType);
       }, debounceDelay);
       
       // Update last viewport for next comparison
       setLastViewport(currentViewport);
     }
   }, [currentViewport?.bounds?.north, currentViewport?.bounds?.south, currentViewport?.bounds?.east, currentViewport?.bounds?.west, currentViewport?.zoom, selectedType, overlaySettings]);

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
       setIsLoadingTiles(true);
       const type = overlayType === 'airQuality' ? 'airquality' : overlayType;
       const heatmapType = overlayType === 'pollen' 
         ? (selectedHeatmapTypes?.pollen || 'TREE_UPI')
         : (selectedHeatmapTypes?.airQuality || 'US_AQI');
       
       console.log('Fetching tiles for:', { type, heatmapType, viewport: currentViewport });
       
       // Check tile cache first
       const cacheKey = `${type}_${heatmapType}_${currentViewport.zoom}_${preciseCacheKey}`;
       const cachedTiles = tileCacheRef.current.get(cacheKey);
       
       if (cachedTiles) {
         console.log(`Using cached tiles for ${cacheKey} (${cachedTiles.length} tiles)`);
         sendTilesToWebView(cachedTiles, overlayType, heatmapType);
         return;
       }
       
       // Fetch tiles with progress tracking
       const tiles = await fetchTilesWithProgress(
         type,
         heatmapType,
         currentViewport,
         currentViewport.zoom
       );

       console.log(`Received ${tiles.length} tiles from HeatmapService`);

       // Cache the tiles
       tileCacheRef.current.set(cacheKey, tiles);
       
       // Update the cache timestamp for both grid and precise cache
       lastUpdateTimeRef.current[gridCacheKey] = now;
       lastUpdateTimeRef.current[preciseCacheKey] = now;

       // Send tiles to WebView (overlays already cleared by settings effect if needed)
       sendTilesToWebView(tiles, overlayType, heatmapType);
       
     } catch (error) {
       console.error('Error updating heatmap overlay:', error);
     } finally {
       setIsLoadingTiles(false);
       if (onOverlayStateChange) {
         onOverlayStateChange({ isClearing: false, isLoading: false });
       }
     }
   };

     // Cleanup on unmount
     useEffect(() => {
       return () => {
         cleanup();
       };
     }, []);

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
