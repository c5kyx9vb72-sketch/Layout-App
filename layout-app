import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, FeatureGroup, GeoJSON, useMap, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from "leaflet";
import { EditControl } from "react-leaflet-draw";
import * as turf from "@turf/turf";
import { kml as kmlToGeoJSON } from "@tmcw/togeojson"; // KML -> GeoJSON
import { parse as parseWKT } from "wellknown"; // WKT -> GeoJSON
import jsPDF from "jspdf"; // PDF export
import html2canvas from "html2canvas"; // Map to canvas for PDF
 
/**
* =============================================================
* Generative F&B Plant Layout – React + Leaflet + Turf
* =============================================================
* Build-fix version:
* - Uses react-leaflet v4 refs (no `.leafletElement`), captures FeatureGroup properly
* - Replaced default imports for `wellknown` and `@tmcw/togeojson` with named exports
* - Keeps Google Maps satellite tiles (as requested)
* - Added more dev-time test cases (asserts) without changing previous ones
*/
 
// -----------------------------
// Constants & palettes
// -----------------------------
const PROCESS_TYPES = [
  { id: "receiving", label: "Receiving", w: 40, h: 40, color: "#6b7280" },
  { id: "processing", label: "Processing", w: 60, h: 80, color: "#2563eb" },
  { id: "packaging", label: "Packaging", w: 50, h: 60, color: "#10b981" },
  { id: "utilities", label: "Utilities", w: 30, h: 30, color: "#f59e0b" },
  { id: "warehouse", label: "Warehouse", w: 80, h: 120, color: "#7c3aed" },
];
 
const DEFAULT_TRUCK_TURN_RADIUS_M = 12.5; // simplified typical inner radius
 
// -----------------------------
// Utility helpers
// -----------------------------
function metersToKm(m) { return m / 1000; }
function kmToMeters(km) { return km * 1000; }
 
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
 
// Build a rectangle polygon (GeoJSON Polygon) centered at [lng, lat]
function buildRect(centerLngLat, width, height, rotationDeg, properties = {}) {
  const cx = centerLngLat[0];
  const cy = centerLngLat[1];
  const center = turf.point([cx, cy]);
  const halfW = width / 2.0;
  const halfH = height / 2.0;
  const move = (pt, distM, bearingDeg) => turf.destination(pt, distM / 1000.0, bearingDeg, { units: "kilometers" });
  const TL = move(move(center, halfW, rotationDeg), halfH, rotationDeg + 90);
  const TR = move(move(center, halfW, rotationDeg), -halfH, rotationDeg + 90);
  const BR = move(move(center, -halfW, rotationDeg), -halfH, rotationDeg + 90);
  const BL = move(move(center, -halfW, rotationDeg), halfH, rotationDeg + 90);
  const coords = [TL, TR, BR, BL, TL].map((p) => p.geometry.coordinates);
  return turf.polygon([coords], properties);
}
 
// Grid of candidate rectangle centers
function gridCenters(sitePoly, stepMeters) {
  const bbox = turf.bbox(sitePoly);
  const stepKm = metersToKm(stepMeters);
  const grid = turf.pointGrid(bbox, stepKm, { units: "kilometers" });
  return grid.features.filter((pt) => turf.booleanPointInPolygon(pt, sitePoly));
}
 
// Snap a coordinate [lng,lat] to a geodesic grid spacing (meters) relative to origin
function snapLngLat([lng, lat], spacingM, origin = [0, 0]) {
  // Approximate via local degrees->meters conversion around origin
  const originPt = turf.point(origin);
  const north = turf.distance(originPt, turf.point([origin[0], origin[1] + 0.01]));
  const east = turf.distance(originPt, turf.point([origin[0] + 0.01, origin[1]]));
  const mPerDegLat = kmToMeters(north) / 0.01;
  const mPerDegLng = kmToMeters(east) / 0.01;
  const x = (lng - origin[0]) * mPerDegLng;
  const y = (lat - origin[1]) * mPerDegLat;
  const sx = Math.round(x / spacingM) * spacingM;
  const sy = Math.round(y / spacingM) * spacingM;
  const snappedLng = origin[0] + sx / mPerDegLng;
  const snappedLat = origin[1] + sy / mPerDegLat;
  return [snappedLng, snappedLat];
}
 
function snapFeatureToGrid(feature, spacingM, origin = [0, 0], orthogonal = false) {
  const f = JSON.parse(JSON.stringify(feature));
  if (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon") {
    const rings = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    const newRings = rings.map((ring) =>
      ring.map((linear) =>
        linear.map((c, i) => {
          const snapped = snapLngLat(c, spacingM, origin);
          if (!orthogonal || i === 0) return snapped;
          const prev = linear[i - 1];
          const dx = snapped[0] - prev[0];
          const dy = snapped[1] - prev[1];
          if (Math.abs(dx) > Math.abs(dy)) return [snapped[0], prev[1]]; // horizontal
          return [prev[0], snapped[1]]; // vertical
        })
      )
    );
    if (f.geometry.type === "Polygon") f.geometry.coordinates = newRings[0];
    else f.geometry.coordinates = newRings;
  }
  return f;
}
 
// Generative placement by type buckets
function generateBlocks({ sitePolygon, types, aisleWidth, rotation, seed, jitter, maxBlocks }) {
  if (!sitePolygon) return turf.featureCollection([]);
  const rng = mulberry32(seed ?? 1);
  const maxTypeW = Math.max(...types.map((t) => t.w));
  const step = Math.max(5, maxTypeW + aisleWidth);
  const centers = gridCenters(sitePolygon, step);
  const out = [];
  let count = 0;
  for (const pt of centers) {
    for (const t of types) {
      const center = pt.geometry.coordinates;
      const jw = (rng() - 0.5) * jitter;
      const jh = (rng() - 0.5) * jitter;
      const jCenter = turf.destination(turf.point(center), Math.hypot(jw, jh) / 1000.0,
        Math.atan2(jw, jh) * 180 / Math.PI, { units: "kilometers" });
      const rect = buildRect(jCenter.geometry.coordinates, t.w, t.h, rotation, { role: "block", type: t.id });
      if (!turf.booleanWithin(rect, sitePolygon)) continue;
      // Keep buffer off boundary by 0.5 * aisle
      const inset = turf.buffer(sitePolygon, -aisleWidth / 2 / 1000, { units: "kilometers" });
      if (!inset || inset.geometry.type === "GeometryCollection") continue;
      if (!turf.booleanWithin(rect, inset)) continue;
      out.push(rect);
      count++;
      if (maxBlocks && count >= maxBlocks) return turf.featureCollection(out);
    }
  }
  return turf.featureCollection(out);
}
 
// Validation checks
function validateLayout({ site, blocks, minAisle, boundaryClearance, turnRadius }) {
  const issues = [];
  // (1) Clash detection (block-block overlap)
  for (let i = 0; i < blocks.features.length; i++) {
    for (let j = i + 1; j < blocks.features.length; j++) {
      const a = blocks.features[i];
      const b = blocks.features[j];
      if (turf.booleanIntersects(a, b)) {
        const inter = turf.intersect(a, b);
        if (inter) {
          issues.push({ kind: "clash", a: i, b: j, area: turf.area(inter), geom: inter });
        }
      }
    }
  }
  // (2) Min aisle width: buffer out each block and ensure buffers don't intersect
  if (minAisle > 0) {
    const buf = blocks.features.map((f) => turf.buffer(f, minAisle / 1000, { units: "kilometers" }));
    for (let i = 0; i < buf.length; i++) {
      for (let j = i + 1; j < buf.length; j++) {
        if (turf.booleanIntersects(buf[i], buf[j])) {
          const inter = turf.intersect(buf[i], buf[j]);
          if (inter) issues.push({ kind: "aisle", a: i, b: j, geom: inter });
        }
      }
    }
  }
  // (3) Boundary clearance
  if (boundaryClearance > 0) {
    const inset = turf.buffer(site, -boundaryClearance / 1000, { units: "kilometers" });
    for (let i = 0; i < blocks.features.length; i++) {
      const f = blocks.features[i];
      if (!turf.booleanWithin(f, inset)) {
        issues.push({ kind: "boundary", a: i, geom: f });
      }
    }
  }
  // (4) Truck turning: ensure a circle of radius fits fully inside site
  if (turnRadius > 0) {
    const c = turf.centroid(site);
    const circle = turf.circle(c, metersToKm(turnRadius), { steps: 64, units: "kilometers" });
    if (!turf.booleanWithin(circle, site)) {
      issues.push({ kind: "turning", geom: circle });
    }
  }
  return issues;
}
 
// Heatmap generation (simple: inverse distance to nearest source)
function generateHeatSquares(site, sources, cellM, mode) {
  if (!site || sources.length === 0) return turf.featureCollection([]);
  const bbox = turf.bbox(site);
  const grid = turf.squareGrid(bbox, metersToKm(cellM), { units: "kilometers" });
  const feats = [];
  for (const cell of grid.features) {
    const center = turf.center(cell);
    if (!turf.booleanPointInPolygon(center, site)) continue;
    const dists = sources.map((s) => turf.distance(center, turf.point(s), { units: "kilometers" }));
    let val = 1 / (Math.min(...dists) + 0.001);
    feats.push(turf.feature(cell.geometry, { value: val }));
  }
  return turf.featureCollection(feats);
}
 
function layerToFeature(layer) {
  if (!layer) return null;
  try { return layer.toGeoJSON(); } catch { return null; }
}
 
// -----------------------------
// Controls (UI panel)
// -----------------------------
function Controls({
  site, setSite,
  blocks, setBlocks,
  validation, setValidation,
  heat, setHeat,
  snapGrid, setSnapGrid,
  gridSize, setGridSize,
  orthogonal, setOrthogonal,
}) {
  const [selectedTypes, setSelectedTypes] = useState(PROCESS_TYPES.map(t => ({ ...t, enabled: true })));
  const [aisle, setAisle] = useState(20);
  const [rotation, setRotation] = useState(0);
  const [seed, setSeed] = useState(1);
  const [jitter, setJitter] = useState(0);
  const [maxBlocks, setMaxBlocks] = useState(800);
 
  const [boundaryClearance, setBoundaryClearance] = useState(5);
  const [turnRadius, setTurnRadius] = useState(DEFAULT_TRUCK_TURN_RADIUS_M);
 
  const canGenerate = !!site;
 
  return (
    <div className="absolute top-4 left-4 z-[1000] w-[380px] max-h-[90vh] overflow-auto bg-white/90 backdrop-blur rounded-2xl shadow-xl p-4 space-y-4">
      <div className="flex items-start justify-between">
        <h2 className="text-lg font-semibold">F&B Plant Layout</h2>
        <span className="text-xs text-gray-500">Generative · Draw · Measure</span>
      </div>
 
      {/* Process palette */}
      <div>
        <p className="text-sm font-medium mb-2">Process Types</p>
        <div className="grid grid-cols-2 gap-2">
          {selectedTypes.map((t, i) => (
            <label key={t.id} className="flex items-center gap-2 text-xs border rounded-xl p-2">
              <input type="checkbox" checked={t.enabled} onChange={(e)=>{
                const next=[...selectedTypes]; next[i] = { ...t, enabled: e.target.checked }; setSelectedTypes(next);
              }} />
              <span className="inline-block w-3 h-3 rounded" style={{ background: t.color }} />
              <span className="font-medium">{t.label}</span>
              <span className="ml-auto text-[10px] text-gray-500">{t.w}×{t.h} m</span>
            </label>
          ))}
        </div>
      </div>
 
      {/* Generation params */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col">Aisle (m)
          <input type="number" className="mt-1 rounded border p-1" value={aisle} onChange={(e)=>setAisle(Number(e.target.value)||0)} />
        </label>
        <label className="flex flex-col">Rotation (°)
          <input type="number" className="mt-1 rounded border p-1" value={rotation} onChange={(e)=>setRotation(Number(e.target.value)||0)} />
        </label>
        <label className="flex flex-col">Jitter (m)
          <input type="number" className="mt-1 rounded border p-1" value={jitter} onChange={(e)=>setJitter(Number(e.target.value)||0)} />
        </label>
        <label className="flex flex-col">Max Blocks
          <input type="number" className="mt-1 rounded border p-1" value={maxBlocks} onChange={(e)=>setMaxBlocks(Number(e.target.value)||0)} />
        </label>
        <label className="flex flex-col col-span-2">Random Seed
          <input type="number" className="mt-1 rounded border p-1" value={seed} onChange={(e)=>setSeed(Number(e.target.value)||0)} />
        </label>
      </div>
 
      {/* Snapping & grid (bound to parent state) */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={snapGrid} onChange={e=>setSnapGrid(e.target.checked)} /> Snap to grid</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={orthogonal} onChange={e=>setOrthogonal(e.target.checked)} /> Ortho edges</label>
        <label className="flex flex-col">Grid (m)
          <input type="number" className="mt-1 rounded border p-1" value={gridSize} onChange={(e)=>setGridSize(Number(e.target.value)||1)} />
        </label>
      </div>
 
      {/* Validation params */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="flex flex-col">Boundary clear (m)
          <input type="number" className="mt-1 rounded border p-1" value={boundaryClearance} onChange={(e)=>setBoundaryClearance(Number(e.target.value)||0)} />
        </label>
        <label className="flex flex-col">Truck radius (m)
          <input type="number" className="mt-1 rounded border p-1" value={turnRadius} onChange={(e)=>setTurnRadius(Number(e.target.value)||0)} />
        </label>
      </div>
 
      <div className="flex gap-2 flex-wrap">
        <button
          className={`px-3 py-2 rounded-xl text-sm font-medium shadow ${canGenerate?"bg-black text-white":"bg-gray-200 text-gray-500 cursor-not-allowed"}`}
          disabled={!canGenerate}
          onClick={() => {
            const types = selectedTypes.filter(t=>t.enabled);
            const gen = generateBlocks({ sitePolygon: site, types, aisleWidth: aisle, rotation, seed, jitter, maxBlocks });
            setBlocks(gen);
          }}
        >Generate Layout</button>
 
        <button className="px-3 py-2 rounded-xl text-sm font-medium shadow bg-white border" onClick={()=>setBlocks(turf.featureCollection([]))}>Clear Blocks</button>
 
        <button className="px-3 py-2 rounded-xl text-sm font-medium shadow bg-white border" onClick={()=>{
          const issues = validateLayout({ site, blocks, minAisle: aisle, boundaryClearance, turnRadius });
          setValidation(issues);
        }}>Run Checks</button>
 
        <ExportMenu site={site} blocks={blocks} />
      </div>
 
      <HeatmapPanel site={site} heat={heat} setHeat={setHeat} />
 
      <div className="rounded-xl border p-3 text-xs bg-gray-50 leading-relaxed">
        <p className="font-medium mb-1">How to use</p>
        <ol className="list-decimal ml-4 space-y-1">
          <li>Draw your <b>site boundary</b> (polygon) and set as Site.</li>
          <li>Toggle process types, tweak parameters, then Generate.</li>
          <li>Use <b>Run Checks</b> for clashes, aisles, boundary, turning radius.</li>
          <li>Import KML/GeoJSON/WKT; Export GeoJSON; Print PDF.</li>
        </ol>
      </div>
 
      <div className="text-[11px] text-gray-500">Tiles: Google Satellite. Draw/measure: Leaflet Draw. Geometry: Turf.js.</div>
    </div>
  );
}
 
// -----------------------------
// Heatmap Panel
// -----------------------------
function HeatmapPanel({ site, heat, setHeat }) {
  const mode = heat.mode || "flow";
  const cell = heat.cell || 10;
 
  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex items-center justify-between"><p className="text-sm font-medium">Heatmaps</p></div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <select className="col-span-1 border rounded p-1" value={mode} onChange={(e)=>setHeat({ ...heat, mode: e.target.value })}>
          <option value="flow">Material Flow</option>
          <option value="utilities">Utilities</option>
        </select>
        <label className="col-span-1 flex flex-col">Cell (m)
          <input type="number" className="mt-1 rounded border p-1" value={cell} onChange={(e)=>setHeat({ ...heat, cell: Number(e.target.value)||1 })} />
        </label>
        <button className={`col-span-1 px-3 py-2 rounded-xl text-sm font-medium shadow ${heat.adding?"bg-emerald-600 text-white":"bg-white border"}`} onClick={()=>setHeat({ ...heat, adding: !heat.adding })}>{heat.adding?"Click map to add sources":"Add Sources"}</button>
      </div>
      <div className="flex gap-2">
        <button className="px-3 py-2 rounded-xl text-sm font-medium shadow bg-white border" onClick={()=>{
          if (!site || (heat.sources?.length||0)===0) return;
          const squares = generateHeatSquares(site, heat.sources, heat.cell||10, heat.mode||"flow");
          setHeat({ ...heat, squares });
        }}>Generate Heat</button>
        <button className="px-3 py-2 rounded-xl text-sm font-medium shadow bg-white border" onClick={()=>setHeat({ mode:"flow", cell:10, sources:[], squares:turf.featureCollection([]), adding:false })}>Clear Heat</button>
      </div>
      <div className="text-[11px] text-gray-500">Tip: Add sources (loading bays, utility tie-ins). Heat = 1 / distance to nearest source.</div>
    </div>
  );
}
 
// -----------------------------
// Export / Import / Print
// -----------------------------
function ExportMenu({ site, blocks }) {
  const map = useMap();
  const exportGeoJSON = () => {
    const out = turf.featureCollection([
      ...(site ? [turf.feature(site.geometry, { role: "site" })] : []),
      ...((blocks?.features || []).map((f, i) => ({ ...f, properties: { ...(f.properties || {}), role: "block", id: i } })))
    ]);
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `fb_layout_${Date.now()}.geojson`; a.click(); URL.revokeObjectURL(url);
  };
 
  const printPDF = async () => {
    const mapEl = map.getContainer();
    const canvas = await html2canvas(mapEl, { useCORS: true, scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const margin = 10;
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const w = pageW - margin*2, h = pageH - margin*2 - 20; // leave room for title block
    pdf.addImage(imgData, "PNG", margin, margin, w, h);
    // Title block
    pdf.setFontSize(12); pdf.text("F&B Plant Layout", margin, pageH - 12);
    const date = new Date().toISOString().slice(0,10);
    pdf.setFontSize(8); pdf.text(`Date: ${date}`, margin + 80, pageH - 12);
    pdf.text("Scale: not to scale", margin + 130, pageH - 12);
    pdf.save(`fb_layout_${Date.now()}.pdf`);
  };
 
  return (
    <div className="relative inline-block">
      <button className="px-3 py-2 rounded-xl text-sm font-medium shadow bg-white border">Export…</button>
      <div className="mt-2 flex gap-2">
        <button className="px-3 py-2 rounded-xl text-sm font-medium shadow bg-white border" onClick={exportGeoJSON}>GeoJSON</button>
        <ImportButtons />
        <button className="px-3 py-2 rounded-xl text-sm font-medium shadow bg-white border" onClick={printPDF}>Print PDF</button>
      </div>
    </div>
  );
}
 
function ImportButtons() {
  const [_, setDummy] = useState(0); // rerender trigger
  const handleImport = async (file) => {
    const text = await file.text();
    let geo;
    try {
      if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
        geo = JSON.parse(text);
      } else if (text.includes("<kml")) {
        const xml = new DOMParser().parseFromString(text, "text/xml");
        geo = kmlToGeoJSON(xml);
      } else {
        // assume WKT
        const geom = parseWKT(text.trim());
        geo = turf.featureCollection([turf.feature(geom)]);
      }
      window.dispatchEvent(new CustomEvent("layout:import", { detail: { geo } }));
      setDummy(x=>x+1);
    } catch (e) {
      alert("Import failed: " + e.message);
    }
  };
 
  return (
    <label className="px-3 py-2 rounded-xl text-sm font-medium shadow bg-white border cursor-pointer">Import
      <input type="file" accept=".geojson,.json,.kml,.wkt,.txt" className="hidden" onChange={(e)=>{
        const f = e.target.files?.[0]; if (f) handleImport(f);
      }} />
    </label>
  );
}
 
// -----------------------------
// Map + Draw (v4-friendly ref handling)
// -----------------------------
function MapWithDraw({ site, setSite, blocks, setBlocks, validation, heat, setHeat, snapGrid, gridSize, orthogonal, setValidation }) {
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
    setBlocks(turf.featureCollection([]));
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
          polygon: { allowIntersection: false, showArea: true, metric: true, shapeOptions: { color: "#2563eb" } },
          polyline: { metric: true, shapeOptions: { color: "#10b981" } },
          rectangle: { showArea: true, metric: true, shapeOptions: { color: "#f59e0b" } },
          circle: false,
          circlemarker: false,
          marker: false,
        }}
        edit={{ edit: true, remove: true }}
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
      // eslint-disable-next-line no-console
      console.warn("Dev tests failed:", e);
    }
  }
 
  return (
    <div className="w-full h-screen relative">
      <Controls
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
 
      <MapContainer center={[defaultCenter.lat, defaultCenter.lng]} zoom={16} scrollWheelZoom className="w-full h-full" id="map-root">
        {/* Google Maps Satellite Imagery */}
        <TileLayer
          attribution='&copy; Google Maps'
          url=https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}
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
