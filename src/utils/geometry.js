import * as turf from "@turf/turf";

// -----------------------------
// Utility helpers
// -----------------------------
export function metersToKm(m) { return m / 1000; }
export function kmToMeters(km) { return km * 1000; }

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Build a rectangle polygon (GeoJSON Polygon) centered at [lng, lat]
export function buildRect(centerLngLat, width, height, rotationDeg, properties = {}) {
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
export function gridCenters(sitePoly, stepMeters) {
  const bbox = turf.bbox(sitePoly);
  const stepKm = metersToKm(stepMeters);
  const grid = turf.pointGrid(bbox, stepKm, { units: "kilometers" });
  return grid.features.filter((pt) => turf.booleanPointInPolygon(pt, sitePoly));
}

// Snap a coordinate [lng,lat] to a geodesic grid spacing (meters) relative to origin
export function snapLngLat([lng, lat], spacingM, origin = [0, 0]) {
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

export function snapFeatureToGrid(feature, spacingM, origin = [0, 0], orthogonal = false) {
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
export function generateBlocks({ sitePolygon, types, aisleWidth, rotation, seed, jitter, maxBlocks }) {
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
export function validateLayout({ site, blocks, minAisle, boundaryClearance, turnRadius }) {
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
export function generateHeatSquares(site, sources, cellM) {
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

export function layerToFeature(layer) {
  if (!layer) return null;
  try { return layer.toGeoJSON(); } catch { return null; }
}
