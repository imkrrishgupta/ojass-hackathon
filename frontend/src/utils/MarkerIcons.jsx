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

export const icons = {
  medical:       svgIcon(medicalSvg, [36, 36]),
  gas_leak:      svgIcon(gasLeakSvg, [36, 36]),
  car_breakdown: svgIcon(carBreakdownSvg, [36, 36]),
  urgent_help:   svgIcon(urgentHelpSvg, [36, 36]),
  others:        svgIcon(othersSvg, [36, 36]),
  me:            svgIcon(meSvg, [44, 44]),
  default:       svgIcon(othersSvg, [36, 36]),
};