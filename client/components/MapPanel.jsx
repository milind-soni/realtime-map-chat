import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Use the Mapbox token directly since env might not be working
const MAPBOX_TOKEN = "pk.eyJ1IjoibWlsaW5kc29uaTIwMSIsImEiOiJjbWV3MHZzcWYwcWU3Mm1wd2wxZHIxcDh2In0.-UXuMHp7FvoJ6NuKpZ5T-w";

mapboxgl.accessToken = MAPBOX_TOKEN;

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const samplePoints = [
  {
    id: 1,
    coordinates: [-122.4194, 37.7749],
    name: "San Francisco",
    description: "Golden Gate Bridge"
  },
  {
    id: 2,
    coordinates: [-122.3321, 47.6062],
    name: "Seattle",
    description: "Space Needle"
  },
  {
    id: 3,
    coordinates: [-118.2437, 34.0522],
    name: "Los Angeles",
    description: "Hollywood Sign"
  },
  {
    id: 4,
    coordinates: [-73.9857, 40.7580],
    name: "New York",
    description: "Times Square"
  },
  {
    id: 5,
    coordinates: [-87.6298, 41.8781],
    name: "Chicago",
    description: "Willis Tower"
  }
];

export default function MapPanel({ isSessionActive, sendClientEvent, events }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(-100);
  const [lat, setLat] = useState(40);
  const [zoom, setZoom] = useState(3);
  const [isSendingContext, setIsSendingContext] = useState(false);
  const [markers, setMarkers] = useState([]);
  const markersRef = useRef([]);
  const [toolsRegistered, setToolsRegistered] = useState(false);
  const lastSentContext = useRef(null);

  // Function to send map context updates to AI
  const sendMapContextUpdate = useCallback((mapData) => {
    if (!isSessionActive || !sendClientEvent) return;

    // Create a simple user message about current map view
    const contextMessage = {
      type: "conversation.item.create",
      item: {
        type: "message", 
        role: "user",
        content: [
          {
            type: "input_text",
            text: `[Map Context] I'm currently viewing the map at longitude ${mapData.center.lng.toFixed(4)}, latitude ${mapData.center.lat.toFixed(4)}, zoom level ${mapData.zoom.toFixed(2)}. The visible area covers approximately ${mapData.approxArea} km².`
          }
        ]
      }
    };

    console.log("Sending map context update to AI");
    sendClientEvent(contextMessage);
    
    // Brief visual feedback
    setIsSendingContext(true);
    setTimeout(() => setIsSendingContext(false), 300);
  }, [isSessionActive, sendClientEvent]);

  // Debounced function to handle map movement
  const debouncedMapUpdate = useCallback(
    debounce((currentMap) => {
      if (!isSessionActive) return;
      
      const center = currentMap.getCenter();
      const bounds = currentMap.getBounds();
      const zoom = currentMap.getZoom();
      
      // Calculate approximate visible area
      const north = bounds.getNorth();
      const south = bounds.getSouth();
      const east = bounds.getEast();
      const west = bounds.getWest();
      
      // Rough calculation of area in km²
      const latDistance = Math.abs(north - south) * 111; // 1 degree latitude ≈ 111 km
      const lngDistance = Math.abs(east - west) * 111 * Math.cos((north + south) / 2 * Math.PI / 180);
      const approxArea = (latDistance * lngDistance).toFixed(0);

      const mapData = {
        center,
        bounds,
        zoom,
        approxArea
      };

      // Only send update if map has moved significantly
      const currentContext = `${center.lng.toFixed(2)},${center.lat.toFixed(2)},${zoom.toFixed(1)}`;
      if (lastSentContext.current !== currentContext) {
        sendMapContextUpdate(mapData);
        lastSentContext.current = currentContext;
      }
    }, 2000), // 2 second debounce to avoid spam
    [isSessionActive, sendMapContextUpdate]
  );

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return;
    
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [lng, lat],
        zoom: zoom
      });

      map.current.on("load", () => {
        samplePoints.forEach((point) => {
          new mapboxgl.Marker({
            color: "#3B82F6"
          })
            .setLngLat(point.coordinates)
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(
                `<h3 class="font-bold">${point.name}</h3>
                 <p>${point.description}</p>`
              )
            )
            .addTo(map.current);
        });

        // Map is loaded and ready
      });

      map.current.on("move", () => {
        const currentMap = map.current;
        setLng(currentMap.getCenter().lng.toFixed(4));
        setLat(currentMap.getCenter().lat.toFixed(4));
        setZoom(currentMap.getZoom().toFixed(2));
        
        // We'll handle map updates in a separate effect
      });
    } catch (error) {
      console.error("Error initializing map:", error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Add map movement tracking when session is active
  useEffect(() => {
    if (!map.current || !isSessionActive) return;

    const handleMapMove = () => {
      debouncedMapUpdate(map.current);
    };

    map.current.on("moveend", handleMapMove);

    return () => {
      if (map.current) {
        map.current.off("moveend", handleMapMove);
      }
    };
  }, [isSessionActive, debouncedMapUpdate]);

  // Register tools when session is created
  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    
    // Wait for session.created event to register tools
    if (!toolsRegistered && firstEvent.type === "session.created") {
      console.log("Session created, registering map tools...");
      
      const sessionUpdate = {
        type: "session.update",
        session: {
          instructions: "You are a helpful assistant with access to an interactive map. You can help users explore locations, add markers, and navigate the map. Always acknowledge map actions you take. When users ask about locations or want to see places on the map, use your available map functions. Respond in English only.",
          tools: [
            {
              type: "function",
              name: "get_current_map_view",
              description: "Get the current map view information including center coordinates, zoom level, and visible bounds",
              parameters: {
                type: "object",
                properties: {},
                required: []
              }
            },
            {
              type: "function",
              name: "move_map_to_location",
              description: "Move the map to a specific location",
              parameters: {
                type: "object",
                properties: {
                  longitude: {
                    type: "number",
                    description: "Longitude coordinate"
                  },
                  latitude: {
                    type: "number",
                    description: "Latitude coordinate"
                  },
                  zoom: {
                    type: "number",
                    description: "Zoom level (1-20, optional)",
                    minimum: 1,
                    maximum: 20
                  }
                },
                required: ["longitude", "latitude"]
              }
            },
            {
              type: "function",
              name: "add_marker_to_map",
              description: "Add a marker to the map at specified coordinates",
              parameters: {
                type: "object",
                properties: {
                  longitude: {
                    type: "number",
                    description: "Longitude coordinate"
                  },
                  latitude: {
                    type: "number",
                    description: "Latitude coordinate"  
                  },
                  label: {
                    type: "string",
                    description: "Label for the marker"
                  },
                  description: {
                    type: "string",
                    description: "Description for the marker popup"
                  }
                },
                required: ["longitude", "latitude", "label"]
              }
            },
            {
              type: "function",
              name: "clear_all_markers",
              description: "Remove all markers from the map",
              parameters: {
                type: "object",
                properties: {},
                required: []
              }
            }
          ],
          tool_choice: "auto"
        }
      };

      console.log("Sending session update with tools:", sessionUpdate);
      sendClientEvent(sessionUpdate);
      setToolsRegistered(true);
    }
  }, [events, toolsRegistered, sendClientEvent]);

  // Reset tools when session becomes inactive
  useEffect(() => {
    if (!isSessionActive) {
      setToolsRegistered(false);
    }
  }, [isSessionActive]);

  // Listen for AI function calls
  useEffect(() => {
    if (!map.current || !events || events.length === 0 || !sendClientEvent) return;

    const latestEvent = events[0];
    console.log("Latest event:", latestEvent);
    
    // Check if the AI is making a function call
    if (latestEvent.type === "response.done" && latestEvent.response?.output) {
      console.log("Response done with output:", latestEvent.response.output);
      latestEvent.response.output.forEach((output) => {
        if (output.type === "function_call") {
          const { name, call_id, arguments: args } = output;
          const parsedArgs = JSON.parse(args);
          let result = {};

          // Handle different function calls
          switch (name) {
            case "get_current_map_view":
              const center = map.current.getCenter();
              const bounds = map.current.getBounds();
              const zoom = map.current.getZoom();
              
              result = {
                center: {
                  longitude: center.lng,
                  latitude: center.lat
                },
                zoom: zoom,
                bounds: {
                  north: bounds.getNorth(),
                  south: bounds.getSouth(),
                  east: bounds.getEast(),
                  west: bounds.getWest()
                },
                visible_markers: markers.map(m => ({
                  label: m.label,
                  longitude: m.longitude,
                  latitude: m.latitude
                }))
              };
              break;

            case "move_map_to_location":
              const { longitude, latitude, zoom: targetZoom = 12 } = parsedArgs;
              map.current.flyTo({
                center: [longitude, latitude],
                zoom: targetZoom,
                duration: 2000
              });
              result = { success: true, message: `Moved map to [${longitude}, ${latitude}] at zoom ${targetZoom}` };
              break;

            case "add_marker_to_map":
              const newMarker = new mapboxgl.Marker({ color: "#FF0000" })
                .setLngLat([parsedArgs.longitude, parsedArgs.latitude])
                .setPopup(
                  new mapboxgl.Popup({ offset: 25 }).setHTML(
                    `<h3 class="font-bold">${parsedArgs.label}</h3>
                     ${parsedArgs.description ? `<p>${parsedArgs.description}</p>` : ''}`
                  )
                )
                .addTo(map.current);
              
              const markerData = {
                marker: newMarker,
                label: parsedArgs.label,
                longitude: parsedArgs.longitude,
                latitude: parsedArgs.latitude,
                description: parsedArgs.description
              };
              
              markersRef.current.push(markerData);
              setMarkers([...markersRef.current]);
              
              result = { success: true, message: `Added marker "${parsedArgs.label}" at [${parsedArgs.longitude}, ${parsedArgs.latitude}]` };
              break;

            case "clear_all_markers":
              markersRef.current.forEach(m => m.marker.remove());
              markersRef.current = [];
              setMarkers([]);
              result = { success: true, message: "Cleared all markers from the map" };
              break;

            default:
              result = { error: `Unknown function: ${name}` };
          }

          // Send function call result back to the AI
          const functionResult = {
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: call_id,
              output: JSON.stringify(result)
            }
          };

          sendClientEvent(functionResult);
          
          // Trigger a response after providing function result
          setTimeout(() => {
            sendClientEvent({ type: "response.create" });
          }, 100);
        }
      });
    }
  }, [events, sendClientEvent, markers]);

  return (
    <section className="h-full w-full flex flex-col gap-2">
      <div className="bg-gray-50 rounded-md p-2">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold">Map View</h2>
          {isSessionActive && (
            <div className="flex items-center gap-2">
              {isSendingContext && (
                <span className="text-xs text-green-600 animate-pulse">
                  📍 Sending location context...
                </span>
              )}
            </div>
          )}
        </div>
        <div className="text-xs text-gray-600">
          Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
        </div>
        {isSessionActive && (
          <div className="text-xs text-blue-600 mt-1">
            AI can see and interact with this map! Map context sent as you navigate (2s delay)
          </div>
        )}
        {markers.length > 0 && (
          <div className="text-xs text-green-600 mt-1">
            Active markers: {markers.length}
          </div>
        )}
      </div>
      <div ref={mapContainer} className="flex-1 rounded-md overflow-hidden" />
    </section>
  );
}