import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Use the Mapbox token directly since env might not be working
const MAPBOX_TOKEN = "pk.eyJ1IjoibWlsaW5kc29uaTIwMSIsImEiOiJjbWV3MHZzcWYwcWU3Mm1wd2wxZHIxcDh2In0.-UXuMHp7FvoJ6NuKpZ5T-w";

mapboxgl.accessToken = MAPBOX_TOKEN;

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
      });

      map.current.on("move", () => {
        setLng(map.current.getCenter().lng.toFixed(4));
        setLat(map.current.getCenter().lat.toFixed(4));
        setZoom(map.current.getZoom().toFixed(2));
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

  return (
    <section className="h-full w-full flex flex-col gap-2">
      <div className="bg-gray-50 rounded-md p-2">
        <h2 className="text-lg font-bold mb-1">Map View</h2>
        <div className="text-xs text-gray-600">
          Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
        </div>
      </div>
      <div ref={mapContainer} className="flex-1 rounded-md overflow-hidden" />
    </section>
  );
}