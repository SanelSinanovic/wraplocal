import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Fix Leaflet default icon path (broken by bundlers)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom orange marker for WrapBridge
const shopIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: "wrapbridge-marker",
});

// Fit map bounds to visible markers
function FitBounds({ shops }) {
  const map = useMap();
  const prevLen = useRef(0);
  useEffect(() => {
    const coords = shops.filter(s => s.latitude && s.longitude).map(s => [s.latitude, s.longitude]);
    if (coords.length === 0) return;
    if (coords.length !== prevLen.current) {
      map.fitBounds(coords, { padding: [40, 40], maxZoom: 13 });
      prevLen.current = coords.length;
    }
  }, [shops, map]);
  return null;
}

export default function ShopMap({ shops, onShopClick, refCoords }) {
  const mappableShops = shops.filter(s => s.latitude && s.longitude);

  // Default center: US center, or ref coords, or first shop
  const center = refCoords
    ? [refCoords.lat, refCoords.lon]
    : mappableShops.length > 0
      ? [mappableShops[0].latitude, mappableShops[0].longitude]
      : [39.8283, -98.5795]; // US center

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <MapContainer
        center={center}
        zoom={refCoords ? 10 : 5}
        style={{ width: "100%", height: "100%", background: "#0A0A0A" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds shops={mappableShops} />
        {mappableShops.map(shop => (
          <Marker key={shop.id} position={[shop.latitude, shop.longitude]} icon={shopIcon}>
            <Popup>
              <div style={{ fontFamily: "'DM Sans', sans-serif", minWidth: 180, cursor: "pointer" }} onClick={() => onShopClick(shop)}>
                <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 18, letterSpacing: 1, color: "#111", marginBottom: 4 }}>{shop.name}</div>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>
                  {(() => {
                    const rc = shop.reviews ?? shop.review_count ?? 0;
                    const rt = shop.rating ?? 0;
                    return rc > 0 && rt > 0 ? `★ ${rt} (${rc} review${rc !== 1 ? "s" : ""})` : "";
                  })()}
                  {shop.location || [shop.city, shop.state].filter(Boolean).join(", ")}
                </div>
                {shop._distanceMi != null && (
                  <div style={{ fontSize: 11, color: "#FF4D00", marginBottom: 4 }}>{shop._distanceMi < 10 ? shop._distanceMi.toFixed(1) : Math.round(shop._distanceMi)} mi away</div>
                )}
                {(shop.tags || []).length > 0 && (
                  <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>{shop.tags.slice(0, 3).join(" · ")}</div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {(shop.price ?? shop.price_from) ? (
                    <span style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 20, color: "#FF4D00" }}>From ${(shop.price ?? shop.price_from).toLocaleString()}</span>
                  ) : (
                    <span style={{ fontSize: 12, color: "#888" }}>Get a Quote</span>
                  )}
                  <span style={{ fontSize: 11, color: "#FF4D00", fontWeight: 600 }}>View →</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {mappableShops.length === 0 && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ background: "rgba(0,0,0,0.8)", padding: "20px 32px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
            No shops with location data to display on the map
          </div>
        </div>
      )}
    </div>
  );
}
