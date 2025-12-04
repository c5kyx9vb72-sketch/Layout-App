# Codebase Function Registry

This document provides a registry of all functions found in the JSX files of the application, detailing their location and purpose.

## `src/App.jsx`
The root component of the application.

*   **`App()`**
    *   **Purpose:** Initializes the application state (site, blocks, validation, heatmaps), configures the main Leaflet `MapContainer`, and orchestrates the `Controls` and `MapWithDraw` child components. It also runs development-only geometric self-tests on initialization.

## `src/components/Controls.jsx`
Handles the user interface for configuring and interacting with the layout generation.

*   **`Controls(props)`**
    *   **Purpose:** Renders the floating control panel. It manages local state for generation parameters (aisle width, rotation, jitter, process types) and delegates actions (generation, validation, clearing) to the parent `App` component via props. It also wraps `HeatmapPanel` and `ExportMenu`.

## `src/components/map-with-draw.jsx`
Manages map interactions, drawing logic, and layer rendering.

*   **`MapWithDraw(props)`**
    *   **Purpose:** The main component that renders the `FeatureGroup` containing all map layers (site, blocks, heatmaps, validation issues). It initializes the `EditControl` for drawing.
*   **`onFGReady(fgInstance)`**
    *   **Purpose:** A ref callback to capture the Leaflet `FeatureGroup` instance, enabling direct manipulation of layers (e.g., adding imported GeoJSON).
*   **`onCreated(e)`**
    *   **Purpose:** Event handler for when a new shape is drawn. It snaps the shape to the grid if enabled, adds it to the feature group, and binds a popup allowing the user to designate the shape as the "Site".
*   **`onEdited()`**
    *   **Purpose:** Event handler for when shapes are edited. Resets validation results to clear stale error markers.
*   **`onDeleted()`**
    *   **Purpose:** Event handler for when shapes are deleted. Clears the site, blocks, and validation results.
*   **`blockStyle(f)`**
    *   **Purpose:** Returns the Leaflet style object (color, weight, opacity) for a generated block based on its process type (e.g., "processing" gets blue, "warehouse" gets purple).
*   **`heatStyle(f)`**
    *   **Purpose:** Calculates the color of a heatmap grid cell based on its value (proximity to source), mapping it to a hue gradient (blue to red).
*   **`issueStyle(k)`**
    *   **Purpose:** Returns specific style configurations (color, dash array) for different types of validation issues (clash, aisle violation, boundary violation, turning radius failure).

## `src/components/heatmap-panel.jsx`
A sub-panel for configuring and generating heatmaps.

*   **`HeatmapPanel(props)`**
    *   **Purpose:** Renders the heatmap configuration UI. It allows users to switch modes (Flow vs. Utility), set grid cell size, toggle "Add Source" mode, and trigger heatmap generation or clearing.

## `src/components/export-menu.jsx`
Handles data export (GeoJSON, PDF) and import.

*   **`ExportMenu(props)`**
    *   **Purpose:** Renders the "Export..." button and its dropdown menu. It provides functions to trigger GeoJSON download and PDF generation.
*   **`exportGeoJSON()`** (inside `ExportMenu`)
    *   **Purpose:** Bundles the current `site` and `blocks` into a GeoJSON `FeatureCollection`, creates a Blob, and triggers a browser download of the `.geojson` file.
*   **`printPDF()`** (inside `ExportMenu`)
    *   **Purpose:** Uses `html2canvas` to screenshot the map container and `jspdf` to generate a PDF report containing the image, title, date, and scale note.
*   **`ImportButtons()`**
    *   **Purpose:** Renders the "Import" file input. It handles the file selection event.
*   **`handleImport(file)`** (inside `ImportButtons`)
    *   **Purpose:** Reads the uploaded file (text), parses it based on format (JSON, KML, or WKT), converts it to GeoJSON, and dispatches a custom `layout:import` window event to update the map.
