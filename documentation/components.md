# Application Components

This document outlines the component structure and responsibilities for the F&B Plant Layout application.

## Core Components

### 1. App (`src/App.jsx`)
**Role:** Root Container & State Manager  
The top-level component that orchestrates the entire application.
*   **Responsibilities:**
    *   Initializes and manages global application state (site boundary, generated blocks, validation results, heatmap data, grid settings).
    *   Renders the Leaflet `MapContainer`.
    *   Composes the `ControlSection`, `HeatmapSection`, `ExportSection`, and `MapWithDraw` components.
    *   Includes development-only self-tests for geometric utilities.

### 2. ControlSection (`src/components/ControlSection.jsx`)
**Role:** Main User Interface Panel  
A floating overlay panel that houses all user inputs and configuration options.
*   **Responsibilities:**
    *   **Process Selection:** Checkboxes to enable/disable different plant process types (Receiving, Processing, etc.).
    *   **Generation Parameters:** Inputs for aisle width, rotation, random seed, jitter, and block limits.
    *   **Grid Settings:** Toggles for grid snapping and orthogonal edges.
    *   **Action Buttons:** Triggers layout generation, clearing blocks, and running validation checks.
    *   **Interaction:** Blocks map interactions (clicks/scrolls) when the cursor is over the panel.

### 3. MapWithDraw (`src/components/MapWithDraw.jsx`)
**Role:** Map Logic & Rendering Layer  
Handles the interactive map elements, drawing tools, and layer visualization.
*   **Responsibilities:**
    *   **Drawing Tools:** Integrates `react-leaflet-draw` (`EditControl`) to allow users to draw polygons, rectangles, and polylines.
        *   **Polygon Drawing:** Configured with `repeatMode: true` for continuous drawing beyond three points.
    *   **Rendering:** Visualizes the:
        *   Site boundary.
        *   Generated layout blocks (color-coded by type).
        *   Heatmap grids and source markers.
        *   Validation issues (clashes, boundary violations) with specific styling.
    *   **Logic:**
        *   Handles `onCreated` events to snap drawn shapes to the grid.
        *   Provides a popup interface to "Set as Site" for drawn polygons.
        *   Listens for `layout:import` events to render imported geometry.
        *   Uses `useRef` for the `heat` state in its `useEffect` hook to ensure up-to-date values for map click event handling.
        *   Conditionally disables Leaflet Draw tools when in "Add Sources" mode (`heat.adding`).
        *   Makes existing heat source markers non-interactive when in "Add Sources" mode (`heat.adding`) to prevent event consumption.

### 4. HeatmapSection (`src/components/HeatmapSection.jsx`)
**Role:** Heatmap Configuration UI  
A sub-section of the ControlSection panel dedicated to heatmap features.
*   **Responsibilities:**
    *   **Configuration:** Selects heatmap mode (e.g., Material Flow, Utilities) and grid cell size.
    *   **Interaction:** Toggles "Add Sources" mode, allowing users to click on the map to define heat sources.
    *   **Actions:** Triggers the generation of the heatmap grid based on distance to sources.

### 5. ExportSection (`src/components/ExportSection.jsx`)
**Role:** Data Import/Export Manager  
Handles the serialization and persistence of layout data.
*   **Responsibilities:**
    *   **Export (GeoJSON):** Bundles the site boundary and generated blocks into a standard GeoJSON `FeatureCollection`.
    *   **Export (PDF):** Captures the current map view using `html2canvas` and generates a downloadable PDF report using `jspdf`.
    *   **Import:** specific handling for uploading and parsing GeoJSON, KML, and WKT files to populate the map.

## Utility Modules

*   **`src/utils/geometry.js`**: Contains all core geometric logic, including unit conversion (`metersToKm`), shape generation (`buildRect`), grid snapping (`snapLngLat`), and the main layout generation algorithm (`generateBlocks`).
*   **`src/constants.js`**: Defines static configuration data such as `PROCESS_TYPES` (colors, dimensions) and default settings. Colors for `PROCESS_TYPES` are now defined using CSS variables.