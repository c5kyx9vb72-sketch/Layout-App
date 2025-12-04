import { useState, useMemo } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import * as turf from "@turf/turf";
import { ControlSection } from "./components/ControlSection";
import { MapWithDraw } from "./components/MapWithDraw";
import { buildRect, gridCenters, generateBlocks, snapLngLat, snapFeatureToGrid, validateLayout } from "./utils/geometry";
 
/**
* =============================================================
* Generative F&B Plant Layout – React + Leaflet + Turf
* =============================================================
*/
 
// -----------------------------
// App (uses Google Satellite tiles)
// -----------------------------
export default function App() {
  const [site, setSite] = useState(null);
  const [blocks, setBlocks] = useState(turf.featureCollection([]));
  const [validation, setValidation] = useState([]);
  const [heat, setHeat] = useState({ mode: "flow", cell: 10, sources: [], squares: turf.featureCollection([]), adding: false });
 
  const [snapGrid, setSnapGrid] = useState(true);
  const [gridSize, setGridSize] = useState(5);
  const [orthogonal, setOrthogonal] = useState(true);
 
  const defaultCenter = useMemo(() => ({ lat: 52.370216, lng: 4.895168 }), []); // Amsterdam
 
  // --- Dev-only lightweight tests --- (existing + new)
  if (import.meta && import.meta.env && import.meta.env.DEV) {
    try {
      // Existing tests (unchanged)
      const rect = buildRect([4.895, 52.37], 40, 20, 0);
      console.assert(rect.geometry.type === "Polygon", "buildRect should return Polygon");
      const siteTest = turf.polygon([[
        [4.89, 52.365],[4.91, 52.365],[4.91, 52.375],[4.89, 52.375],[4.89, 52.365]
      ]]);
      const grid = gridCenters(siteTest, 20);
      console.assert(Array.isArray(grid), "gridCenters should return array of points");
      const gen = generateBlocks({ sitePolygon: siteTest, types: [{ id:"t", w:10, h:10 }], aisleWidth: 5, rotation: 0, seed: 1, jitter: 0, maxBlocks: 10 });
      console.assert(gen.type === "FeatureCollection", "generateBlocks should return FeatureCollection");
 
      // Additional tests
      const snapped = snapLngLat([4.9, 52.37], 5, [4.9, 52.37]);
      console.assert(Array.isArray(snapped) && snapped.length===2, "snapLngLat should return [lng,lat]");
 
      const poly = turf.polygon([[[4.9,52.37],[4.901,52.37],[4.901,52.371],[4.9,52.371],[4.9,52.37]]]);
      const snappedPoly = snapFeatureToGrid(poly, 5, [4.9,52.37], true);
      console.assert(snappedPoly.geometry.type === "Polygon", "snapFeatureToGrid returns Polygon");
 
      const a = buildRect([4.9,52.37], 20, 20, 0);
      const b = buildRect([4.9002,52.3702], 20, 20, 0);
      const issues = validateLayout({ site: siteTest, blocks: turf.featureCollection([a,b]), minAisle: 0, boundaryClearance: 0, turnRadius: 0 });
      console.assert(Array.isArray(issues), "validateLayout returns issues array");
    } catch (e) {
      console.warn("Dev tests failed:", e);
    }
  }
 
  return (
    <div className="w-full h-screen relative">
      <MapContainer center={[defaultCenter.lat, defaultCenter.lng]} zoom={16} scrollWheelZoom className="w-full h-full" id="map-root">
        <ControlSection
          site={site}
          setSite={setSite}
          blocks={blocks}
          setBlocks={setBlocks}
          validation={validation}
          setValidation={setValidation}
          heat={heat}
          setHeat={setHeat}
          snapGrid={snapGrid}
          setSnapGrid={setSnapGrid}
          gridSize={gridSize}
          setGridSize={setGridSize}
          orthogonal={orthogonal}
          setOrthogonal={setOrthogonal}
        />
        {/* Google Maps Satellite Imagery */}
        <TileLayer
          attribution='&copy; Google Maps'
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
        />
 
        <MapWithDraw
          site={site}
          setSite={setSite}
          blocks={blocks}
          setBlocks={setBlocks}
          validation={validation}
          setValidation={setValidation}
          heat={heat}
          setHeat={setHeat}
          snapGrid={snapGrid}
          gridSize={gridSize}
          orthogonal={orthogonal}
        />
      </MapContainer>
 
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] bg-white/80 backdrop-blur rounded-full px-3 py-1 shadow">Pan, zoom, draw polygons/lines/rectangles; tooltips show live distance/area for measuring. Using Google Maps satellite imagery.</div>
    </div>
  );
}
