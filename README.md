# F&B Plant Layout Application

## Project Description

The F&B Plant Layout Application is a generative tool designed to assist in the optimal layout planning for food & beverage processing plants. It leverages interactive mapping capabilities, geometric algorithms, and validation checks to create efficient and functional plant designs. Users can define site boundaries, generate production blocks based on various process types, analyze material flow, and identify potential layout issues.

## Features

*   **Interactive Map Interface:** Built on Leaflet, providing pan, zoom, and satellite imagery (Google Maps).
*   **Drawing Tools:** Utilize `react-leaflet-draw` to define site boundaries, individual blocks, or other spatial elements (polygons, polylines, rectangles).
*   **Generative Layout:** Automatically generates plant layout blocks based on user-defined process types (Receiving, Processing, Packaging, Utilities, Warehouse) and parameters like aisle width, rotation, random seed, and jitter.
*   **Grid Snapping & Orthogonal Edges:** Ensures precise placement of elements on a configurable grid with optional orthogonal alignment.
*   **Layout Validation:** Runs checks to identify common layout issues such as:
    *   Block clashes/overlaps.
    *   Insufficient aisle widths.
    *   Violation of boundary clearances.
    *   Tight turning radii for vehicles.
*   **Heatmap Analysis:** Visualizes material flow or utility proximity on the layout by defining heat sources and generating heat grids.
*   **Data Import/Export:**
    *   **Export:** Generate GeoJSON of the layout or a PDF report of the current map view.
    *   **Import:** Load existing spatial data from GeoJSON, KML, or WKT files.
*   **Responsive UI:** Floating control panels for intuitive interaction.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

*   Node.js (LTS version recommended)
*   npm (Node Package Manager) or Yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/Layout-App.git
    cd Layout-App
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

### Running the Application

To run the application in development mode:

```bash
npm run dev
# or
yarn dev
```

This will start the Vite development server, and the application will be accessible at `http://localhost:5173` (or another port if 5173 is in use).

## Usage

The application presents an interactive map. Use the floating panel on the left to:

1.  **Draw a site boundary:** Select the polygon tool from the map's top-right drawing controls, draw your site, and use the popup to "Set as Site."
2.  **Configure Process Types:** Enable/disable various process types (Receiving, Processing, etc.) and their dimensions.
3.  **Set Generation Parameters:** Adjust aisle width, block rotation, random seed, jitter, and maximum number of blocks.
4.  **Generate Layout:** Click "Generate Layout" to populate the site with blocks.
5.  **Run Checks:** Use "Run Checks" to identify and visualize validation issues.
6.  **Add Heat Sources:** Go to the "Heatmaps" section, click "Add Sources," then click on the map to place heat sources. Click "Generate Heat" to visualize the heatmap.
7.  **Export/Import Data:** Use the "Export" options to save your layout or "Import" to load existing data.

## Project Structure

```
.
├── .github/                     # GitHub Actions workflows and commands
├── documentation/               # Detailed documentation files
│   ├── components.md            # Component structure and responsibilities
│   ├── function-registry.md     # Registry of key functions
│   └── style-guide.md           # Coding style and conventions
├── public/                      # Static assets
├── src/                         # Source code
│   ├── app.jsx                  # Main application component
│   ├── constants.js             # Global constants and process type definitions
│   ├── index.css                # Global styles and CSS variables
│   ├── main.jsx                 # Entry point for React application
│   ├── components/              # Reusable React components
│   │   ├── ControlSection.jsx   # Main control panel UI
│   │   ├── ExportSection.jsx    # Export/Import functionality
│   │   ├── HeatmapSection.jsx   # Heatmap configuration and interaction
│   │   └── MapWithDraw.jsx      # Map rendering, drawing tools, and map-specific logic
│   └── utils/                   # Utility functions
│       └── geometry.js          # Core geometric calculations and algorithms
└── ...                          # Other configuration and build files (package.json, vite.config.js, etc.)
```

## Technologies Used

*   **React:** Frontend JavaScript library for building user interfaces.
*   **Vite:** Fast frontend build tool.
*   **Tailwind CSS:** Utility-first CSS framework for rapid UI development.
*   **Leaflet:** Open-source JavaScript library for mobile-friendly interactive maps.
*   **React-Leaflet:** React components for Leaflet maps.
*   **Leaflet.Draw:** Plugin for Leaflet to enable drawing and editing of shapes.
*   **Turf.js:** Advanced geospatial analysis library for browser and Node.js.
*   **html2canvas:** JavaScript HTML renderer.
*   **jsPDF:** JavaScript PDF generation library.

## Contributing

Contributions are welcome! Please follow the guidelines outlined in `documentation/style-guide.md`. For bug reports or feature requests, please open an issue on GitHub.

## License

[MIT License](LICENSE) (Assuming an MIT license based on common project practices. A `LICENSE` file would typically contain the full text.)
