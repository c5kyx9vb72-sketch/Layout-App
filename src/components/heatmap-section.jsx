import * as turf from "@turf/turf";
import { generateHeatSquares } from "../utils/geometry";

// -----------------------------
// Heatmap Panel
// -----------------------------
export function HeatmapSection({ site, heat, setHeat }) {
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
          const squares = generateHeatSquares(site, heat.sources, heat.cell||10);
          setHeat({ ...heat, squares });
        }}>Generate Heat</button>
        <button className="px-3 py-2 rounded-xl text-sm font-medium shadow bg-white border" onClick={()=>setHeat({ mode:"flow", cell:10, sources:[], squares:turf.featureCollection([]), adding:false })}>Clear Heat</button>
      </div>
      <div className="text-[11px] text-gray-500">Tip: Add sources (loading bays, utility tie-ins). Heat = 1 / distance to nearest source.</div>
    </div>
  );
}
