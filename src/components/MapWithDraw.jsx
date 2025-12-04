import { useEffect, useRef } from "react";
import { FeatureGroup, GeoJSON, useMap, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from "leaflet";
import { EditControl } from "react-leaflet-draw";
import { PROCESS_TYPES } from "../constants";
import { layerToFeature, snapFeatureToGrid } from "../utils/geometry";

// -----------------------------
// Map + Draw (v4-friendly ref handling)
// -----------------------------
export function MapWithDraw({ site, setSite, blocks, setBlocks, validation, heat, setHeat, snapGrid, gridSize, orthogonal, setValidation }) {
  const fgRef = useRef(null); // Leaflet FeatureGroup instance
  const map = useMap();
 
  // Capture L.FeatureGroup instance immediately when created
  const onFGReady = (fgInstance) => {
    if (fgInstance && !fgRef.current) {
      fgRef.current = fgInstance;
    }
  };
 
  // Listen for imported data
  useEffect(() => {
    const onImport = (e) => {
      const { geo } = e.detail || {};
      if (!geo || !fgRef.current) return;
      L.geoJSON(geo).eachLayer((layer) => fgRef.current.addLayer(layer));
    };
    window.addEventListener("layout:import", onImport);
    return () => window.removeEventListener("layout:import", onImport);
  }, []);
 
  // Add source points when heat panel is in adding mode
  useEffect(() => {
    const onClick = (e) => {
      if (!heat.adding) return;
      const ll = [e.latlng.lng, e.latlng.lat];
      setHeat({ ...heat, sources: [...(heat.sources||[]), ll] });
    };
    map.on("click", onClick);
    return () => map.off("click", onClick);
  }, [map, heat, setHeat]);
 
  const onCreated = (e) => {
    const { layerType, layer } = e;
    if (!fgRef.current) return;
 
    // Snap + Ortho post-process
    let feat = layerToFeature(layer);
    if (feat && (snapGrid || orthogonal)) {
      feat = snapFeatureToGrid(feat, gridSize, [0,0], orthogonal);
      const snappedLayer = L.geoJSON(feat);
      fgRef.current.addLayer(snappedLayer);
      fgRef.current.removeLayer(layer);
    }
 
    // Bind quick action popup
    const activeLayer = feat ? L.geoJSON(feat).getLayers()[0] : layer;
    if (activeLayer) {
      activeLayer.bindPopup(`<div style="display:flex;flex-direction:column;gap:8px">`+
        `<strong>${layerType}</strong>`+
        `<button id="setSiteBtn" style="padding:6px 10px;border:1px solid #ddd;border-radius:10px;cursor:pointer">Set as Site</button>`+
      `</div>`);
      activeLayer.openPopup(); // Explicitly open the popup after binding
      activeLayer.on("popupopen", () => {
        const btn = document.getElementById("setSiteBtn");
        if (btn) btn.onclick = () => {
          const f = activeLayer.toGeoJSON();
          if (f && f.geometry.type === "Polygon") setSite(f);
          activeLayer.closePopup();
        };
      });
    }
  };
 
  const onEdited = () => {
    if (validation?.length) setValidation?.([]);
  };
 
  const onDeleted = () => {
    setSite(null);
    setBlocks({ type: "FeatureCollection", features: [] });
    setValidation?.([]);
  };
 
  // Styling functions
  const blockStyle = (f) => {
    const t = PROCESS_TYPES.find((x) => x.id === f.properties?.type);
    return { color: t?.color || "#0ea5e9", weight: 1, fillOpacity: 0.35 };
  };
 
  const heatStyle = (f) => {
    const v = f.properties.value;
    const cl = Math.max(0, Math.min(1, v / 0.2));
    const hue = (1 - cl) * 240; // blue->red
    return { color: `hsl(${hue} 80% 40%)`, weight: 0.5, fillOpacity: 0.35 };
  };
 
  const issueStyle = (k) => ({
    clash: { color: "#ef4444", weight: 2, fillOpacity: 0.2 },
    aisle: { color: "#dc2626", weight: 1.5, dashArray: "4 4", fillOpacity: 0.15 },
    boundary: { color: "#b91c1c", weight: 2, dashArray: "2 6", fillOpacity: 0.0 },
    turning: { color: "#111827", weight: 2, dashArray: "6 6", fillOpacity: 0.0 },
  }[k] || { color: "#ef4444" });
 
  return (
    <FeatureGroup ref={onFGReady}>
      <EditControl
        position="topright"
        onCreated={onCreated}
        onEdited={onEdited}
        onDeleted={onDeleted}
        draw={{
          polygon: { allowIntersection: false, showArea: true, metric: true, repeatMode: true, shapeOptions: { color: "#2563eb" } },
          polyline: { metric: true, shapeOptions: { color: "#10b981" } },
          rectangle: { showArea: true, metric: true, shapeOptions: { color: "#f59e0b" } },
          circle: false,
          circlemarker: false,
          marker: false,
        }}
        edit={{ edit: {}, remove: {} }}
      />
 
      {/* Site */}
      {site && <GeoJSON data={site} style={{ color: "#111827", weight: 2, fillOpacity: 0.08 }} />}
 
      {/* Blocks */}
      {blocks && blocks.features?.length > 0 && <GeoJSON data={blocks} style={blockStyle} />}
 
      {/* Heat squares */}
      {heat?.squares?.features?.length > 0 && <GeoJSON data={heat.squares} style={heatStyle} />}
 
      {/* Heat sources markers */}
      {(heat?.sources||[]).map((s, i) => (
        <Marker key={i} position={[s[1], s[0]]}>
          <Popup>Heat source #{i+1}</Popup>
        </Marker>
      ))}
 
      {/* Validation Issues */}
      {(validation||[]).map((iss, i) => (
        <GeoJSON key={i} data={iss.geom} style={issueStyle(iss.kind)} />
      ))}
    </FeatureGroup>
  );
}
