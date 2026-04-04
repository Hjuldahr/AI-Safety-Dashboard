# Drag-and-Drop Grid Rework: SortableJS to Gridstack.js

## Why We Migrated

The dashboard previously used **SortableJS** for chart drag-and-drop reordering. SortableJS treats items as a **1D list** (flat array of DOM children), but the dashboard displays charts in a **2D grid** with mixed sizes (tiny, regular, large, massive). This mismatch caused persistent bugs:

- Drag targets didn't match visual positions — dropping a chart "to the right" might place it below instead
- Tiny charts were grouped into wrapper `<div>`s with their own Sortable instances, creating a two-level ordering system with complex edge cases
- Editing a tiny chart required pulling it out of its wrapper, expanding it, then reinserting on close

**Gridstack.js** is purpose-built for dashboard widget grids. Each widget has explicit `(x, y, w, h)` coordinates in a column-based grid, giving true 2D awareness.

---

## Architecture Overview

### Data Model

Each chart config in MongoDB now has four grid coordinate fields alongside the existing `chartSize`:

```
gridX: Number (column position, 0-based)
gridY: Number (row position, 0-based)  
gridW: Number (width in columns)
gridH: Number (height in rows)
```

The `chartSize` enum (`tiny`, `regular`, `large`, `massive`) is still stored and used for **chart rendering decisions** (font sizes, legend visibility, axis display). The grid coordinate fields are used purely for **layout positioning**.

Default values are `null`, which signals "not yet positioned" — Gridstack auto-places these widgets.

### Size Mapping

A `SIZE_TO_GRID` constant maps size enums to grid dimensions. This constant is defined in 4 places (must be kept in sync):

| File | Purpose |
|------|---------|
| `controllers/chartController.js` | Backend — sets grid dims when creating charts |
| `public/js/charts/chartDataManager.js` | Frontend — fallback dims when loading charts |
| `public/js/charts/chartAdmin.js` | Frontend — computes dims when user changes size in edit form |
| `helpers/migrateToGridstack.js` | Migration — computes dims for existing data |

Current mapping with `cellHeight: 150`:

```javascript
const SIZE_TO_GRID = {
    tiny:    { w: 2, h: 1 },   // ~150px tall, 2/12 columns wide
    regular: { w: 4, h: 2 },   // ~300px tall, 4/12 columns wide  
    large:   { w: 6, h: 2 },   // ~300px tall, 6/12 columns wide
    massive: { w: 12, h: 4 }   // ~600px tall, full width
};
```

---

## Frontend Implementation

### Gridstack Initialization (`chartDataManager.js`)

The grid is initialized inside `rebuildChartDOM()`, which is called on every page load and after any chart CRUD operation:

```javascript
const grid = GridStack.init({
    column: 12,          // 12-column grid (matches old CSS Grid)
    cellHeight: 150,     // Each row unit = 150px
    margin: 10,          // 10px gap between widgets
    animate: true,       // Smooth transitions
    float: true,         // Free-form placement (no auto-compact upward)
    disableResize: true, // Users can drag but not resize
    columnOpts: {        // Responsive breakpoints
        breakpoints: [
            { w: 768, c: 1 },
            { w: 1200, c: 6 },
            { w: 1500, c: 12 }
        ]
    }
}, gridEl);
```

Key decisions:
- **`float: true`**: Widgets stay where you put them. Without this, Gridstack auto-compacts everything upward, making it hard to arrange charts with intentional spacing.
- **`disableResize: true`**: Users reorder by dragging, but don't resize. Size changes happen through the edit form's size selector.
- **`cellHeight: 150`**: Chosen so that `h:2` = 300px and `h:4` = 600px, matching the old chart heights exactly.

### Widget DOM Structure

Each chart is wrapped in Gridstack's required structure:

```html
<div class="grid-stack-item" gs-w="4" gs-h="2" gs-id="chartId123" gs-no-resize="true">
    <div class="grid-stack-item-content">
        <div class="chart-card dynamic-chart-card chart-regular" data-id="chartId123">
            <!-- chart header, canvas, edit form, etc. -->
        </div>
    </div>
</div>
```

Grid dimensions are set via `gs-*` attributes directly on the element (not passed as a second argument to `addWidget`). This is the most reliable approach for Gridstack v12.

### Auto-Save on Drag (`handleGridChange`)

When the user drags a widget to a new position, Gridstack fires a `change` event. A debounced handler extracts the layout and POSTs it:

```javascript
grid.on('change', handleGridChange);

function handleGridChange() {
    // Debounced 500ms to avoid rapid-fire saves during drag
    clearTimeout(gridSaveTimeout);
    gridSaveTimeout = setTimeout(() => {
        const items = grid.save(false);  // false = don't include HTML content
        const layout = items.map(item => ({
            id: item.id, x: item.x, y: item.y, w: item.w, h: item.h
        }));
        fetch('api/gridLayout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ layout })
        });
    }, 500);
}
```

### Chart.js Canvas Resizing

Chart.js canvases must be told to resize when their container dimensions change. Two mechanisms handle this:

1. **ResizeObserver**: Watches every `.grid-stack-item-content` element. When Gridstack moves or resizes a widget, the observer fires and calls `chart.resize()` on the affected Chart.js instance.

2. **Post-layout resize pass**: After `grid.batchUpdate(false)` completes the initial layout, a `requestAnimationFrame` callback resizes all Chart.js instances to ensure they match their final container sizes.

**Important CSS note**: The old `canvas { width: 100% !important; height: 100% !important; }` rule was removed. This was fighting with Chart.js's own responsive sizing system (`responsive: true`), causing resolution mismatches and blurry rendering. Chart.js handles its own canvas sizing when `responsive: true` is set.

### Edit Form Behavior

When a user clicks the edit button on a chart:

1. **Open**: The Gridstack widget is expanded to full width (`w:12, h:6`) using `grid.update(widgetEl, { w: 12, h: 6 })`. The original dimensions are stored on the element as `data-orig-w` and `data-orig-h`.

2. **Close/Cancel**: The widget is reverted to its original dimensions using `grid.update()`. A 300ms timeout then calls `chart.resize()` to let the animation complete before recalculating the canvas.

3. **Save**: If the user changes the chart size (e.g., regular to large), the new grid dimensions are computed from `SIZE_TO_GRID` and included in the PATCH request alongside `chartSize`, `gridW`, and `gridH`.

There is no longer any need to pull tiny charts out of wrapper divs for editing — wrapper divs don't exist anymore.

---

## Backend Implementation

### New Endpoint: `POST /api/gridLayout`

Accepts `{ layout: [{ id, x, y, w, h }] }` and bulk-updates all chart configs:

```javascript
const saveGridLayout = async (req, res) => {
    const { layout } = req.body;
    const operations = layout.map(item => ({
        updateOne: {
            filter: { _id: item.id },
            update: { $set: { gridX: item.x, gridY: item.y, gridW: item.w, gridH: item.h } }
        }
    }));
    await ChartConfig.bulkWrite(operations);
};
```

Route: `router.post("/api/gridLayout", isAuthenticated, authorize('edit:graph'), chartController.saveGridLayout);`

### Chart Creation (`saveGraph`)

When a new chart is created, grid dimensions are computed from the size enum:

```javascript
const dims = SIZE_TO_GRID[size] || SIZE_TO_GRID.regular;
// gridX: 0, gridY: 9999 — Gridstack auto-places at the bottom
```

### Data Fetching (`getRecentData`)

Configs are sorted by grid coordinates if migrated, with fallback to the old `order` field:

```javascript
const hasMigrated = configs.every(c => c.gridY !== null);
if (hasMigrated) {
    configs.sort((a, b) => (a.gridY - b.gridY) || (a.gridX - b.gridX));
} else {
    configs.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
}
```

### Old Endpoint: `POST /api/reorder`

The old SortableJS reorder endpoint (`reorderCharts`) is still in the codebase for backward compatibility but is no longer called by the frontend. It can be removed once the migration is confirmed stable.

---

## Migration

### Existing Databases

Run the migration script to convert `order` + `chartSize` into grid coordinates:

```bash
node helpers/migrateToGridstack.js
```

This script:
1. Connects to MongoDB using `MONGO_URL` from `.env`
2. Fetches all charts sorted by `order`
3. Simulates Gridstack's column-packing algorithm to compute `(x, y)` positions
4. Maps `chartSize` to `(w, h)` via `SIZE_TO_GRID`
5. Bulk-writes the grid coordinates

Alternatively, delete all chart configs and let the database re-seed from `config/seed_data/defaultCharts.json`. Fresh charts will get `gridX/Y: null` and Gridstack will auto-place them on first load.

### Fresh Installs

Seed data doesn't include grid coordinates (schema defaults to `null`). On first load, `autoPosition: true` is set on each widget, and Gridstack places them automatically. After the user drags anything, positions are saved.

---

## Files Changed

| File | What Changed |
|------|-------------|
| `models/Chart_Config.js` | Added `gridX`, `gridY`, `gridW`, `gridH` fields + compound index |
| `controllers/chartController.js` | Added `SIZE_TO_GRID`, `saveGridLayout` endpoint, updated `saveGraph` and `getRecentData` |
| `routers/controlPanelRouter.js` | Added `POST /api/gridLayout` route |
| `views/index.ejs` | Replaced SortableJS CDN with Gridstack CSS + JS, replaced chart containers with `<div class="grid-stack" id="dashboard-grid">` |
| `public/js/charts/chartDataManager.js` | Rewrote `rebuildChartDOM` with Gridstack init/addWidget, added `handleGridChange` auto-save, `ResizeObserver`, removed all Sortable code |
| `public/js/charts/chartAdmin.js` | Rewrote `saveNewOrder`/`openEditForm`/`closeEditForm` to use `grid.update()`, updated `handleSaveEdit` to include grid dims |
| `public/js/charts/chartRenderer.js` | Changed tiny chart `maintainAspectRatio` from `true` to `false` |
| `public/css/pages/dashboard.css` | Removed CSS Grid layout, size spans, wrapper styles, SortableJS feedback; added Gridstack content styling + drag feedback; removed canvas `!important` override |
| `public/js/dashboardFullscreen.js` | Updated element ID from `static-charts-container` to `dashboard-grid` |
| `helpers/migrateToGridstack.js` | New migration script |

## Dependencies

- **Gridstack.js v12** — loaded from jsDelivr CDN (`gridstack.min.css` + `gridstack-all.js`)
- **SortableJS** — removed entirely (CDN link deleted from `index.ejs`)

## Known Considerations

- The old `order` field and its index are still in the schema. They're unused by the frontend but harmless.
- The `--tiny-group-border` CSS variable is now unused across all 7 theme files. It can be cleaned up.
- When `float: true`, deleting a chart leaves a gap. Users can drag remaining charts to fill it.
- Gridstack's responsive breakpoints (`columnOpts`) collapse the grid to fewer columns on smaller screens. Widget positions are recalculated automatically.
