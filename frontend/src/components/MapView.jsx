import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

import { useEffect, useMemo, useState } from "react";

// auto recenter map when location updates
function Recenter({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) map.setView(position, 14);
  }, [position, map]);

  return null;
}

const fallbackCenter = [28.6139, 77.209];

export default function MapView({ points = [], mapHeight = 320, showRadius = true }) {
  const [myLocation, setMyLocation] = useState(null);

  const safePoints = useMemo(
    () =>
      points.filter(
        (point) =>
          Number.isFinite(point?.lat) &&
          Number.isFinite(point?.lng) &&
          typeof point?.label === "string"
      ),
    [points]
  );

  // 📍 get browser location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
        setMyLocation(fallbackCenter);
      }
    );
  }, []);

  if (!myLocation) return null;

  return (
    <MapContainer
      center={myLocation}
      zoom={14}
      style={{ height: mapHeight, width: "100%" }}
    >
      <Recenter position={myLocation} />

      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* 📍 My location */}
      <Marker position={myLocation}>
        <Popup>My Location</Popup>
      </Marker>

      {/* 🔵 2km radius */}
      {showRadius && (
        <Circle
          center={myLocation}
          radius={2000}
          pathOptions={{ color: "#5d78d7", fillOpacity: 0.1 }}
        />
      )}

      {/* 🚨 Incident marker */}
      {safePoints.map((point) => (
        <Marker key={point.id} position={[point.lat, point.lng]}>
          <Popup>{point.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}