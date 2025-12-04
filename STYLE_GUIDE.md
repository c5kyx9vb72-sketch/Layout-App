# Codebase Style Guide & Conventions

This document serves as the authoritative style guide for the **Layout App** project. It is intended for both human developers and LLM assistants to ensure consistency, readability, and maintainability across the codebase.

## 1. Architecture

**Style:** Client-Side Component-Based SPA (Single Page Application)

*   **Core Framework:** React + Vite (No backend server-side rendering).
*   **State Management:** Lifted State. The root component (`App.jsx`) acts as the central store for application data (site geometry, blocks, validation state), distributing it down to functional child components via props.
*   **Layered Design:**
    *   **Visualization Layer:** `react-leaflet` handles map rendering and tile management.
    *   **Interaction Layer:** `react-leaflet-draw` manages user input (drawing, editing).
    *   **Computation Layer:** `src/utils/geometry.js` (powered by `Turf.js`) handles all geometric logic, decoupled from the UI.

## 2. File Structure & Naming

*   **Component Filenames:** Use **kebab-case** for all component files (e.g., `map-with-draw.jsx`, `heatmap-panel.jsx`).
    *   *Rationale:* Avoids case-sensitivity issues on different OS file systems.
*   **Component Names:** Use **PascalCase** for the actual React component function names (e.g., `function MapWithDraw()`).
*   **Utility Files:** Use **camelCase** for utility files (e.g., `geometry.js`) and **kebab-case** for folders if they don't export a single module.
*   **Directories:**
    *   `src/components/`: UI and functional React components.
    *   `src/utils/`: Pure logic, helper functions, and math/geometry calculations.
    *   `src/constants.js`: Global configuration, enumerations, and static data.

## 3. React Patterns

### Functional Components
*   Always use **Functional Components** with Hooks. Class components are not permitted.
*   **Named Exports:** Prefer named exports (`export function MyComponent`) over default exports, except for `App.jsx` or lazy-loaded routes.

### Props & State
*   **Destructuring:** Destructure props in the function signature for clarity.
    ```jsx
    // Good
    export function MyComponent({ title, isActive }) { ... }

    // Avoid
    export function MyComponent(props) { ... props.title ... }
    ```
*   **State Placement:**
    *   Local UI state (e.g., "is dropdown open") stays in the component.
    *   Data state (e.g., "site polygon", "generated blocks") should be lifted to `App.jsx` (or a Context provider) to be shared between the `Controls` UI and the `Map` visualization.

### Event Handlers
*   Prefix event handler props with `on` (e.g., `onCreated`, `onDeleted`).
*   Prefix handler functions with `handle` (e.g., `handleImport`).

## 4. Geospatial & Geometry (Turf.js)

*   **Turf.js for Logic:** Do **not** perform complex geometric math manually. Use `@turf/turf` functions.
*   **GeoJSON Standard:** All spatial data must be stored and passed as standard **GeoJSON** objects (`Feature`, `FeatureCollection`, `Polygon`).
*   **Units:**
    *   The UI displays **meters**.
    *   Turf.js often defaults to **kilometers**.
    *   **Rule:** Always specify units explicitly in Turf calls: `{ units: "kilometers" }`.
    *   Use helper functions `metersToKm()` and `kmToMeters()` from `src/utils/geometry.js` for conversions.

## 5. Leaflet / Map Guidelines

*   **Refs:** When accessing the Leaflet instance directly, use `useRef` and capture it via the `ref` prop on the React-Leaflet component (e.g., `<FeatureGroup ref={fgRef}>`).
*   **Context:** Remember that `useMap()` hooks only work inside components that are children of `<MapContainer>`.
*   **Drawing:** Use `react-leaflet-draw`'s `<EditControl>`. Configure it by passing empty objects `edit={{ edit: {}, remove: {} }}` to enable features with defaults, rather than `true`.

## 6. CSS & Styling (Tailwind)

*   **Utility-First:** Use Tailwind classes for all styling. Avoid writing custom CSS files unless absolutely necessary for global resets or complex Leaflet overrides.
*   **Leaflet Overrides:** If Leaflet styles need modification, do so in `index.css` or via specific class names passed to `MapContainer`.
*   **Z-Index:** Be mindful of z-indexes for floating panels (`z-[1000]`) to ensure they appear above the map tiles.

## 7. Code Quality & Comments

*   **Self-Documenting Code:** Variable and function names should be descriptive (e.g., `generateBlocks`, `validateLayout`).
*   **Comments:**
    *   Use comments to explain **Why**, not **What**.
    *   Document complex geometric logic or algorithm steps (e.g., "Snap + Ortho post-process").
*   **Linting:** Ensure code passes the ESLint rules defined in `.eslintrc.cjs`. Remove unused variables and imports.

## 8. Import Order

1.  React & Standard Hooks (`useState`, `useRef`, etc.)
2.  Third-party Libraries (`react-leaflet`, `leaflet`, `@turf/turf`)
3.  CSS Imports (`leaflet/dist/...`)
4.  Internal Components (`./components/...`)
5.  Internal Utilities & Constants (`./utils/...`, `./constants`)
