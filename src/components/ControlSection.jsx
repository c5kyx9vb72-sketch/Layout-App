import { useState } from "react";
import * as turf from "@turf/turf";
import { PROCESS_TYPES, DEFAULT_TRUCK_TURN_RADIUS_M } from "../constants";
import { generateBlocks, validateLayout } from "../utils/geometry";
import { HeatmapSection } from "./heatmap-section";
import { ExportSection } from "./ExportSection";

// -----------------------------
// Controls (UI panel)
// -----------------------------
export function ControlSection({
  site,
  blocks, setBlocks,
  setValidation,
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
    <div 
      className="absolute top-4 left-14 z-[1000] w-[450px] max-h-[90vh] overflow-auto bg-white/90 backdrop-blur rounded-2xl shadow-xl p-4 space-y-4"
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
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
      <div className="grid grid-cols-3 gap-3 text-sm">
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
        <label className="flex flex-col col-span-1">Random Seed
          <input type="number" className="mt-1 rounded border p-1" value={seed} onChange={(e)=>setSeed(Number(e.target.value)||0)} />
        </label>
      </div>
 
      {/* Snapping & grid (bound to parent state) */}
      <div className="grid grid-cols-3 gap-3 text-sm items-center">
        <label className="flex items-center gap-2"><input type="checkbox" checked={snapGrid} onChange={e=>setSnapGrid(e.target.checked)} /> Snap to grid</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={orthogonal} onChange={e=>setOrthogonal(e.target.checked)} /> Ortho edges</label>
        <label className="flex items-center justify-between gap-2">
          <span>Grid (m)</span>
          <input type="number" className="rounded border p-1 w-1/2" value={gridSize} onChange={(e)=>setGridSize(Number(e.target.value)||1)} />
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
 
        <ExportSection site={site} blocks={blocks} />
      </div>
 
      <HeatmapSection site={site} heat={heat} setHeat={setHeat} />
 
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
