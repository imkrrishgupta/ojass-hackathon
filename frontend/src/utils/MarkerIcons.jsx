import L from "leaflet";

// Inline SVG data URIs — no external CDN dependency, guaranteed to load
function svgIcon(svgStr, size = [32, 32]) {
  const encoded = encodeURIComponent(svgStr);
  return new L.Icon({
    iconUrl: `data:image/svg+xml,${encoded}`,
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -size[1]],
  });
}

const medicalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#e53935"/><rect x="26" y="14" width="12" height="36" rx="3" fill="#fff"/><rect x="14" y="26" width="36" height="12" rx="3" fill="#fff"/></svg>`;

const gasLeakSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#ff9800"/><path d="M30 16h4l-2 24h-2z" fill="#fff"/><circle cx="32" cy="46" r="3" fill="#fff"/></svg>`;

const carBreakdownSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#1565c0"/><rect x="14" y="28" width="36" height="14" rx="4" fill="#fff"/><circle cx="22" cy="44" r="4" fill="#fff" stroke="#1565c0" stroke-width="2"/><circle cx="42" cy="44" r="4" fill="#fff" stroke="#1565c0" stroke-width="2"/><polygon points="18,28 22,18 42,18 46,28" fill="#fff"/></svg>`;

const urgentHelpSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#d32f2f"/><rect x="28" y="12" width="8" height="28" rx="3" fill="#fff"/><circle cx="32" cy="48" r="4" fill="#fff"/></svg>`;

const othersSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#7b1fa2"/><circle cx="32" cy="24" r="6" fill="#fff"/><path d="M32 34 L22 56 h20z" fill="#fff"/></svg>`;

const meSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#1976d2" stroke="#fff" stroke-width="3"/><circle cx="24" cy="18" r="6" fill="#fff"/><ellipse cx="24" cy="32" rx="10" ry="7" fill="#fff"/></svg>`;

/* ── Community resource SVGs ── */
const aedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="12" fill="#43a047"/><path d="M32 16 L26 30 h5 l-3 18 l12-22 h-5z" fill="#fff"/></svg>`;
const fireExtSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="12" fill="#e53935"/><rect x="24" y="10" width="16" height="44" rx="4" fill="#fff"/><rect x="22" y="18" width="20" height="6" rx="2" fill="#ffcdd2"/><circle cx="32" cy="40" r="5" fill="#e53935"/></svg>`;
const firstAidSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="12" fill="#fff" stroke="#e53935" stroke-width="3"/><rect x="26" y="18" width="12" height="28" rx="2" fill="#e53935"/><rect x="18" y="26" width="28" height="12" rx="2" fill="#e53935"/></svg>`;
const hospitalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="12" fill="#1565c0"/><rect x="20" y="12" width="24" height="40" rx="3" fill="#fff"/><rect x="28" y="16" width="8" height="14" rx="1" fill="#1565c0"/><rect x="28" y="40" width="8" height="12" rx="1" fill="#1565c0"/></svg>`;
const fireStationSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="12" fill="#ff5722"/><polygon points="32,10 14,32 50,32" fill="#fff"/><rect x="18" y="32" width="28" height="22" rx="2" fill="#fff"/><rect x="27" y="40" width="10" height="14" rx="1" fill="#ff5722"/></svg>`;
const policeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="12" fill="#283593"/><polygon points="32,8 36,20 48,20 38,28 42,40 32,32 22,40 26,28 16,20 28,20" fill="#ffd600"/></svg>`;
const pharmacySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="12" fill="#00897b"/><rect x="26" y="16" width="12" height="32" rx="2" fill="#fff"/><rect x="16" y="26" width="32" height="12" rx="2" fill="#fff"/></svg>`;
const shelterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="12" fill="#6d4c41"/><polygon points="32,10 10,34 54,34" fill="#fff"/><rect x="18" y="34" width="28" height="20" rx="2" fill="#fff"/><rect x="26" y="40" width="12" height="14" rx="1" fill="#6d4c41"/></svg>`;
const emergencyPhoneSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="12" fill="#f57c00"/><rect x="22" y="12" width="20" height="40" rx="4" fill="#fff"/><circle cx="32" cy="46" r="3" fill="#f57c00"/></svg>`;
const skilledResponderSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#00c853" stroke="#fff" stroke-width="3"/><circle cx="24" cy="16" r="7" fill="#fff"/><ellipse cx="24" cy="32" rx="11" ry="8" fill="#fff"/><text x="24" y="36" text-anchor="middle" fill="#00c853" font-size="10" font-weight="bold">+</text></svg>`;

export const icons = {
  medical:       svgIcon(medicalSvg, [36, 36]),
  gas_leak:      svgIcon(gasLeakSvg, [36, 36]),
  car_breakdown: svgIcon(carBreakdownSvg, [36, 36]),
  urgent_help:   svgIcon(urgentHelpSvg, [36, 36]),
  others:        svgIcon(othersSvg, [36, 36]),
  me:            svgIcon(meSvg, [44, 44]),
  default:       svgIcon(othersSvg, [36, 36]),

  // Community resources
  aed:              svgIcon(aedSvg, [30, 30]),
  fire_extinguisher: svgIcon(fireExtSvg, [30, 30]),
  first_aid_kit:    svgIcon(firstAidSvg, [30, 30]),
  hospital:         svgIcon(hospitalSvg, [30, 30]),
  fire_station:     svgIcon(fireStationSvg, [30, 30]),
  police_station:   svgIcon(policeSvg, [30, 30]),
  pharmacy:         svgIcon(pharmacySvg, [30, 30]),
  shelter:          svgIcon(shelterSvg, [30, 30]),
  emergency_phone:  svgIcon(emergencyPhoneSvg, [30, 30]),

  // Skilled responder
  skilled_responder: svgIcon(skilledResponderSvg, [40, 40]),
};