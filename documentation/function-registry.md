# Codebase Function Registry

This document provides a registry of all functions found in the JSX files of the application, detailing their location and purpose.

## `src/App.jsx`
The root component of the application.

*   **`App()`**
    *   **Purpose:** Initializes the application state (site, blocks, validation, heatmaps), configures the main Leaflet `MapContainer`, and orchestrates the `ControlSection`, `HeatmapSection`, `ExportSection`, and `MapWithDraw` child components. It also runs development-only geometric self-tests on initialization.

## `src/components/ControlSection.jsx`
Handles the user interface for configuring and interacting with the layout generation.

*   **`ControlSection(props)`**
    *   **Purpose:** Renders the floating control panel. It manages local state for generation parameters (aisle width, rotation, jitter, process types) and delegates actions (generation, validation, clearing) to the parent `App` component via props. It directly renders `HeatmapSection` and `ExportSection`.

## `src/components/MapWithDraw.jsx`
Manages map interactions, drawing logic, and layer rendering.

*   **`MapWithDraw(props)`**
    *   **Purpose:** The main component that renders the `FeatureGroup` containing all map layers (site, blocks, heatmaps, validation issues). It initializes the `EditControl` for drawing, conditionally disabling drawing tools when in "Add Sources" mode and making existing heat source markers non-interactive to prevent event consumption. It uses a `useRef` for the `heat` state in its `useEffect` hook to ensure up-to-date values for map click event handling.
*   **`onFGReady(fgInstance)`**
    *   **Purpose:** A ref callback to capture the Leaflet `FeatureGroup` instance, enabling direct manipulation of layers (e.g., adding imported GeoJSON).
*   **`onCreated(e)`**
    *   **Purpose:** Event handler for when a new shape is drawn. It snaps the shape to the grid if enabled, adds it to the feature group, and binds a popup allowing the user to designate the shape as the "Site". Polygons are configured with `repeatMode: true` for continuous drawing.
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

## `src/components/HeatmapSection.jsx`
A sub-panel for configuring and generating heatmaps.

*   **`HeatmapSection(props)`**
    *   **Purpose:** Renders the heatmap configuration UI. It allows users to switch modes (Flow vs. Utility), set grid cell size, toggle "Add Source" mode, and trigger heatmap generation or clearing.

## `src/components/ExportSection.jsx`
Handles data export (GeoJSON, PDF) and import.

*   **`ExportSection(props)`**
    *   **Purpose:** Renders the "Export..." button and its dropdown menu, along with import functionality. It includes logic to trigger GeoJSON download, PDF generation (capturing the current map view using `html2canvas` and `jspdf`), and handling uploaded file parsing (GeoJSON, KML, or WKT) to update the map via a custom `layout:import` window event.