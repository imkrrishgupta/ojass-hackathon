import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { icons } from "../utils/MarkerIcons.jsx";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useEffect, useState, useRef, useMemo } from "react";
import { registerLocation, socket } from "../socket.js";
import { axiosInstance } from "../api/axios.js";

/* ── Haversine distance (km) ── */
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── Auto-fit bounds to user + incidents ── */
function FitBounds({ position, incidents }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (!position || fitted.current) return;
    if (incidents.length > 0) {
      const pts = [position, ...incidents.map((i) => [i.lat, i.lng])];
      map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 15 });
    } else {
      map.setView(position, 14);
    }
    fitted.current = true;
  }, [position, incidents, map]);

  return null;
}

/* ── Helper: icon for incident type ── */
function getIcon(type) {
  const t = (type || "").toLowerCase();
  if (icons[t]) return icons[t];
  if (t.includes("medical") || t.includes("health")) return icons.medical;
  if (t.includes("gas")) return icons.gas_leak;
  if (t.includes("car") || t.includes("breakdown")) return icons.car_breakdown;
  if (t.includes("urgent") || t.includes("help")) return icons.urgent_help;
  return icons.others;
}

/* ── Severity colour ── */
function sevColor(s) {
  if (s === "high") return "#e53935";
  if (s === "medium") return "#fb8c00";
  return "#43a047";
}

/* ── Format distance for display ── */
function fmtDist(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(2)} km`;
}

const FALLBACK = [28.6139, 77.209];

/* ═══════════════════════  MapView  ═══════════════════════ */
export default function MapView({
  points = [],
  mapHeight = 320,
  showRadius = true,
  radiusMeters = 2000,
}) {
  const [myLocation, setMyLocation] = useState(null);
  const [incidents, setIncidents] = useState([]);

  /* ── 1. Browser geolocation ── */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (p) => setMyLocation([p.coords.latitude, p.coords.longitude]),
      () => setMyLocation(FALLBACK),
    );
  }, []);

  /* ── 2. Register socket location ── */
  useEffect(() => {
    if (myLocation) registerLocation({ lat: myLocation[0], lng: myLocation[1] });
  }, [myLocation]);

  /* ── 3. Fetch open incidents (REST) ── */
  useEffect(() => {
    if (!myLocation) return;

    const load = async () => {
      try {
        const res = await axiosInstance.get("/incidents/open");
        const raw = res.data?.data || [];
        console.log("[MapView] API returned", raw.length, "open incidents");

        const mapped = raw
          .map((inc) => {
            const lat = inc.location?.coordinates?.[1];
            const lng = inc.location?.coordinates?.[0];
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            const dist = getDistanceKm(myLocation[0], myLocation[1], lat, lng);
            return {
              id: inc._id,
              lat,
              lng,
              type: inc.type,
              description: inc.description,
              severity: inc.severity,
              status: inc.status,
              responders: inc.responders,
              createdBy: inc.createdBy,
              distance: dist,
            };
          })
          .filter(Boolean);

        console.log("[MapView] Mapped incidents:", mapped.map((m) => `${m.type} @ ${m.lat},${m.lng} (${fmtDist(m.distance)})`));
        setIncidents(mapped);
      } catch (err) {
        console.error("[MapView] Fetch failed:", err);
      }
    };

    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [myLocation]);

  /* ── 4. Real-time socket events ── */
  useEffect(() => {
    const onNew = (inc) => {
      const lat = Number(inc.lat ?? inc.location?.coordinates?.[1]);
      const lng = Number(inc.lng ?? inc.location?.coordinates?.[0]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const id = inc.id || inc._id;
      const dist = myLocation ? getDistanceKm(myLocation[0], myLocation[1], lat, lng) : 0;
      setIncidents((prev) => [
        ...prev.filter((p) => p.id !== id),
        { ...inc, id, lat, lng, distance: dist },
      ]);
    };
    const onClose = (p) => {
      const rid = p?.incidentId || p?.id || p?._id;
      if (rid) setIncidents((prev) => prev.filter((i) => i.id !== rid));
    };

    socket.on("INCIDENT_NEARBY", onNew);
    socket.on("INCIDENT_CLOSED", onClose);
    return () => { socket.off("INCIDENT_NEARBY", onNew); socket.off("INCIDENT_CLOSED", onClose); };
  }, [myLocation]);

  /* ── Sort by distance ── */
  const sorted = useMemo(
    () => [...incidents].sort((a, b) => a.distance - b.distance),
    [incidents],
  );

  if (!myLocation) {
    return <div style={{ height: mapHeight, display: "grid", placeItems: "center" }}>Loading location…</div>;
  }

  return (
    <div>
      {/* ═══ MAP ═══ */}
      <MapContainer center={myLocation} zoom={14} style={{ height: mapHeight, width: "100%", borderRadius: 12 }}>
        <FitBounds position={myLocation} incidents={sorted} />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* My location marker */}
        <Marker position={myLocation} icon={icons.me}>
          <Popup><strong>📍 You are here</strong></Popup>
        </Marker>

        {/* Radius circle */}
        {showRadius && (
          <Circle
            center={myLocation}
            radius={radiusMeters}
            pathOptions={{ color: "#5d78d7", fillOpacity: 0.08, weight: 2, dashArray: "6 4" }}
          />
        )}

        {/* Incident markers */}
        {sorted.map((item) => (
          <Marker
            key={item.id}
            position={[item.lat, item.lng]}
            icon={getIcon(item.type)}
          >
            <Popup>
              <div style={{ minWidth: 170 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{
                    background: sevColor(item.severity), color: "#fff", borderRadius: 4,
                    padding: "1px 7px", fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                  }}>
                    {item.severity || "unknown"}
                  </span>
                  <strong style={{ fontSize: 14 }}>
                    🚨 {(item.type || "Incident").replace(/_/g, " ")}
                  </strong>
                </div>
                {item.description && (
                  <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>{item.description}</div>
                )}
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  📏 {fmtDist(item.distance)} away
                </div>
                {item.responders?.length > 0 && (
                  <div style={{ fontSize: 12, color: "#43a047", marginTop: 2 }}>
                    👥 {item.responders.length} responder{item.responders.length > 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Extra provided points */}
        {points
          .map((p) => {
            const lat = p.lat ?? p.location?.coordinates?.[1];
            const lng = p.lng ?? p.location?.coordinates?.[0];
            return Number.isFinite(lat) && Number.isFinite(lng) ? { ...p, lat, lng } : null;
          })
          .filter(Boolean)
          .map((p) => (
            <Marker key={`pt-${p.id || p._id || `${p.lat},${p.lng}`}`} position={[p.lat, p.lng]} icon={getIcon(p.type)}>
              <Popup>{p.label || p.description || p.type || "Location"}</Popup>
            </Marker>
          ))}
      </MapContainer>

      {/* ═══ Nearby incidents list below map ═══ */}
      {sorted.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <h4 style={{ margin: "0 0 6px", fontSize: 14, color: "#333" }}>
            🚨 Nearby Incidents ({sorted.length})
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {sorted.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 8,
                  background: item.distance <= radiusMeters / 1000 ? "#fff3e0" : "#f5f5f5",
                  border: `1px solid ${item.distance <= radiusMeters / 1000 ? "#ffcc80" : "#e0e0e0"}`,
                  fontSize: 13,
                }}
              >
                <span style={{
                  background: sevColor(item.severity), color: "#fff", borderRadius: 4,
                  padding: "2px 8px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", flexShrink: 0,
                }}>
                  {item.severity || "—"}
                </span>
                <span style={{ flex: 1, fontWeight: 500 }}>
                  {(item.type || "incident").replace(/_/g, " ")}
                </span>
                <span style={{ fontWeight: 700, color: "#1565c0", flexShrink: 0 }}>
                  📏 {fmtDist(item.distance)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}