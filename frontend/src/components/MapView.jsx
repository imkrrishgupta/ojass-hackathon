import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { icons } from "../utils/MarkerIcons.jsx";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

import { useEffect, useState } from "react";
import { registerLocation, socket } from "../socket.js";

// 📏 Calculate distance between two points in km (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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
  const [incidents, setIncidents] = useState([]);

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

  // 🔌 register location for socket distance filtering
  useEffect(() => {
    if (!myLocation) return;

    registerLocation({ lat: myLocation[0], lng: myLocation[1] });
  }, [myLocation]);

  // 🚨 receive nearby incidents from socket
  useEffect(() => {
    const handleNearby = (incident) => {
      const id = incident.id || incident._id || `${incident.lat},${incident.lng}`;

      setIncidents((prev) => {
        const filtered = prev.filter(
          (item) => (item.id || item._id || `${item.lat},${item.lng}`) !== id
        );
        return [...filtered, incident];
      });
    };

    socket.on("INCIDENT_NEARBY", handleNearby);

    return () => {
      socket.off("INCIDENT_NEARBY", handleNearby);
    };
  }, []);

  if (!myLocation) return null;

  const normalizedPoints = points
    .map((item) => {
      if (Array.isArray(item?.location?.coordinates) && item.location.coordinates.length === 2) {
        return {
          ...item,
          lat: item.location.coordinates[1],
          lng: item.location.coordinates[0],
        };
      }

      return item;
    })
    .filter((item) => Number.isFinite(item?.lat) && Number.isFinite(item?.lng));

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

      {/* 🚨 Incident markers */}
      {incidents.map((item) => {
        if (!Number.isFinite(item?.lat) || !Number.isFinite(item?.lng)) {
          return null;
        }

        const distance = item.distance || getDistance(
          myLocation[0],
          myLocation[1],
          item.lat,
          item.lng
        );
        
        return (
          <Marker
            key={item.id || item._id || `${item.lat},${item.lng}`}
            position={[item.lat, item.lng]}
          >
            <Popup>
              <div>
                <strong>🚨 Incident</strong>
                <br />
                <span>Distance: {distance.toFixed(2)} km</span>
                {item.type && (
                  <>
                    <br />
                    <span>Type: {item.type}</span>
                  </>
                )}
                {item.title && (
                  <>
                    <br />
                    <span>Title: {item.title}</span>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* 📍 Provided points */}
      {normalizedPoints.map((item) => (
        <Marker key={`pt-${item.id || item._id || `${item.lat},${item.lng}`}`} position={[item.lat, item.lng]}>
          <Popup>{item.label || item.description || item.type || "Location"}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}