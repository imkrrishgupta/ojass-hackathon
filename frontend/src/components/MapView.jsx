import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

import { useEffect, useState } from "react";
import API from "../api/axios.js";

// auto recenter map when location updates
function Recenter({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) map.setView(position, 14);
  }, [position, map]);

  return null;
}

export default function MapView() {
  const [myLocation, setMyLocation] = useState(null);
  const [incident, setIncident] = useState(null);

  // 📍 get browser location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMyLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => console.log(err.message)
    );
  }, []);

  // 🚨 fetch incident from backend (AXIOS)
  useEffect(() => {
    const fetchIncident = async () => {
      try {
        const response = await API.get("/incident");  // check this

        const data = response.data.data;  // had to work on this when backend will be connected

        // expected {lat, lng, type}
        setIncident(data);
      } catch (err) {
        console.log(err);
      }
    };

    fetchIncident();
  }, []);

  if (!myLocation) return null;

  return (
    <MapContainer
      center={myLocation}
      zoom={14}
      style={{ height: "100vh", width: "100%" }}
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
      <Circle
        center={myLocation}
        radius={2000}
        pathOptions={{ color: "blue", fillOpacity: 0.1 }}
      />

      {/* 🚨 Incident marker */}
      {incident && (
        <Marker position={[incident.lat, incident.lng]}>
          <Popup>🚨 Incident Location</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}