import { useState } from "react";
import { useMap } from "react-leaflet";
import * as turf from "@turf/turf";
import { kml as kmlToGeoJSON } from "@tmcw/togeojson"; // KML -> GeoJSON
import { parse as parseWKT } from "wellknown"; // WKT -> GeoJSON
import jsPDF from "jspdf"; // PDF export
import html2canvas from "html2canvas"; // Map to canvas for PDF

// -----------------------------
// Export / Import / Print
// -----------------------------
export function ExportSection({ site, blocks }) {
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
