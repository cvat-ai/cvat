# 2D↔3D Fusion Viewer Plugin + COCO Export — Implementation Plan

## Overview

Build a CVAT UI plugin (`plugins/fusion`) that adds a `/fusion/:projectId` route showing a **side-by-side 2D image + 3D point cloud viewer**. Annotations are linked via a `link_id` text attribute on shared labels. Visual linking uses synchronized color-coding and selection highlighting. A companion Python script (`utils/fusion_export.py`) exports two cross-referenced COCO JSON files.

**Zero core CVAT modifications** — everything goes through the plugin system and public APIs.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  /fusion/:projectId  (custom route via plugins.components.router)│
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────┐             │
│  │   2D Panel           │  │   3D Panel           │             │
│  │   <canvas> + SVG     │  │   THREE.js scene     │             │
│  │   bbox overlays      │  │   point cloud +      │             │
│  │   click to select    │  │   cuboid wireframes   │             │
│  │                      │  │   click to select     │             │
│  └──────────────────────┘  └──────────────────────┘             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Link Controls  |  Annotation List (linked / unlinked)    │   │
│  │  [Link] [Unlink] [Save All]  | filter by label/status    │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. Plugin mounts → `core.projects.get({ id })` → find 2D task + 3D task by `dimension`
2. Get jobs from each task → store `Job` instances
3. Frame slider change → fetch frame data + annotations from both jobs via `cvat-core` API
4. Annotations with matching `link_id` attribute get the same color (UUID → HSL hue hash)
5. Selecting an annotation in one panel highlights its linked pair in the other
6. "Link" button: generate UUID, write to `link_id` attribute on both annotations, save

### Linking Mechanism

- Each project label has a **text attribute** named `link_id` (mutable, no default)
- When linking: `crypto.randomUUID()` → written to both the 2D bbox and 3D cuboid
- Colors: `hashCode(link_id) % 360 → HSL hue`, unlinked = gray
- Persisted via `job.annotations.put([state])` + `job.annotations.save()`

---

## File Structure

```
cvat-ui/plugins/fusion/
├── src/ts/
│   ├── index.tsx              # Plugin entry: register route + project action
│   ├── fusion-page.tsx        # Main page: layout, data fetching, frame nav
│   ├── consts.ts              # Shared constants (LINK_ID_ATTR_NAME, etc.)
│   ├── utils/
│   │   └── color.ts           # link_id → color hashing
│   └── panels/
│       ├── canvas2d-panel.tsx  # 2D image + bbox overlay panel
│       ├── canvas3d-panel.tsx  # THREE.js point cloud + cuboid panel
│       ├── link-controls.tsx   # Link/Unlink/Save buttons
│       └── annotation-list.tsx # Linked annotations table

utils/
└── fusion_export.py           # Python COCO export script (uses cvat-sdk)
```

---

## Implementation Steps

### Step 1: Shared Types & Utilities (in plugin)

**consts.ts** — shared constants:
```ts
export const LINK_ID_ATTR_NAME = 'link_id';
```

**utils/color.ts** — deterministic color from link_id:
```ts
export function linkIdToColor(linkId: string | null): string  // returns HSL string
export function hashString(str: string): number               // djb2 hash
```

### Step 2: Plugin Shell + Router (`index.tsx`)

- Listen for `plugins.ready`, call `window.cvatUI.registerComponent(builder)`
- In builder:
  - `addUIComponent('router', FusionRouteComponent, { weight: 10, shouldBeRendered: () => true })`
  - `addUIComponent('projectActions.items', FusionActionItem, { weight: 50, shouldBeRendered: () => true })`
- `FusionRouteComponent` returns `<Route exact path="/fusion/:projectId" component={FusionPage} />`
- `FusionActionItem` renders a menu item that navigates to `/fusion/:projectId`

### Step 3: Fusion Page (`fusion-page.tsx`)

- Route param: `projectId`
- On mount: fetch project → find 2D/3D tasks → get first job from each
- State: `{ frame, annotations2d, annotations3d, selectedLinkId, loading }`
- Layout: Ant Design `Row`/`Col` grid — 2D panel (span 12), 3D panel (span 12), bottom bar (span 24)
- Frame slider: `<Slider>` from 0 to `min(task2d.size, task3d.size) - 1`
- On frame change: `job2d.annotations.get(frame)` + `job3d.annotations.get(frame)` → update state

### Step 4: 2D Canvas Panel (`canvas2d-panel.tsx`)

- Props: `{ job, frame, annotations, selectedLinkId, onSelectAnnotation }`
- Fetch image: `job.frames.get(frame)` → `frameData.data()` → `ImageBitmap`
- Render to `<canvas>` via `drawImage()`
- Overlay: SVG layer on top, one `<rect>` per rectangle annotation
- Colors: `linkIdToColor(getLinkId(annotation))` — shared with 3D panel
- Click handler: find which rect was clicked → call `onSelectAnnotation(state)`
- Selected annotation: thicker border + pulsing animation

### Step 5: 3D Canvas Panel (`canvas3d-panel.tsx`)

- Props: same as 2D panel
- THREE.js setup: `Scene`, `PerspectiveCamera`, `WebGLRenderer`, `OrbitControls`
- Point cloud: `job.frames.get(frame)` → load PCD data → `PCDLoader` or direct `BufferGeometry`
- Cuboid rendering: for each cuboid annotation, `points` array → `THREE.EdgesGeometry` from `BoxGeometry` with position/rotation/scale
- Colors: same `linkIdToColor()` function
- Selection: `Raycaster` on click → find intersected cuboid → `onSelectAnnotation(state)`
- Selected cuboid: emissive highlight or thicker wireframe

### Step 6: Link Controls (`link-controls.tsx`)

- Props: `{ selected2d, selected3d, onLink, onUnlink, onSave }`
- "Link" button (enabled when both selected):
  - `uuid = crypto.randomUUID()`
  - Update `link_id` attribute on both ObjectStates
  - `job2d.annotations.put([state2d])` + `job3d.annotations.put([state3d])`
  - Notify parent to refresh
- "Unlink" button (enabled when a linked annotation is selected):
  - Clear `link_id` on both the 2D and 3D annotations
- "Save" button: `job2d.annotations.save()` + `job3d.annotations.save()`

### Step 7: Annotation List (`annotation-list.tsx`)

- Table columns: `[Color | Link ID | 2D (label, bbox) | 3D (label, cuboid) | Actions]`
- Rows built by joining 2D and 3D annotations on `link_id`
- Status badges: ✅ Linked (both present), ⚠️ 2D only, ⚠️ 3D only
- Click row → set `selectedLinkId` → both panels highlight

### Step 8: COCO Export Script (`utils/fusion_export.py`)

- CLI: `python utils/fusion_export.py --host URL --project-id N --output-dir DIR`
- Uses `cvat_sdk.core` to authenticate and fetch data
- Fetches project → tasks → jobs → annotations (CVAT API)
- Output `coco_2d.json`:
  ```json
  {
    "images": [{"id": 0, "file_name": "frame_000000.png", "width": W, "height": H}],
    "categories": [{"id": 1, "name": "car"}],
    "annotations": [{
      "id": 1, "image_id": 0, "category_id": 1,
      "bbox": [x, y, w, h], "area": w*h, "iscrowd": 0,
      "attributes": {"link_id": "uuid-here"}
    }]
  }
  ```
- Output `coco_3d.json`:
  ```json
  {
    "images": [{"id": 0, "file_name": "frame_000000.pcd"}],
    "categories": [{"id": 1, "name": "car"}],
    "annotations": [{
      "id": 1, "image_id": 0, "category_id": 1,
      "bbox_3d": {"center": [cx,cy,cz], "dimensions": [dx,dy,dz], "rotation": [rx,ry,rz]},
      "attributes": {"link_id": "uuid-here"}
    }]
  }
  ```
- Join key: `attributes.link_id` across both files

### Step 9: Webpack Config Update

Add `'plugins/fusion'` to `defaultPlugins` in `cvat-ui/webpack.config.js` line 15:
```js
const defaultPlugins = ['plugins/sam', 'plugins/fusion'];
```

---

## Parallelization — Agent Assignment

| Agent | Scope | Files Created | Depends On |
|-------|-------|---------------|------------|
| **A: Plugin Shell** | index.tsx, fusion-page.tsx, consts.ts, utils/color.ts, link-controls.tsx, annotation-list.tsx | 6 files | None |
| **B: 2D Panel** | canvas2d-panel.tsx | 1 file | Shared interface contract only |
| **C: 3D Panel** | canvas3d-panel.tsx | 1 file | Shared interface contract only |
| **D: COCO Export** | fusion_export.py | 1 file | Completely independent (Python) |

**Shared interface contract** (all agents use):
```ts
// Props for panel components
interface PanelProps {
    job: any;          // cvat-core Job instance
    frame: number;
    annotations: any[];  // ObjectState[]
    selectedLinkId: string | null;
    onSelectAnnotation: (state: any) => void;
}

// Constants
LINK_ID_ATTR_NAME = 'link_id'

// Color utility
linkIdToColor(linkId: string | null): string
```

**Integration order**: D finishes independently. B and C produce standalone panel components. A produces the shell that imports B+C. Final wiring: webpack config edit + build test.

---

## Verification Checklist

- [ ] `yarn workspace cvat-ui run start` compiles with plugin
- [ ] Navigate to `/fusion/1` → page renders without errors
- [ ] 2D panel shows image with bbox overlays
- [ ] 3D panel shows point cloud with cuboid wireframes
- [ ] Clicking annotation in 2D highlights linked pair in 3D (and vice versa)
- [ ] "Link" assigns same UUID to both annotations and colors match
- [ ] "Unlink" clears link_id from both
- [ ] "Save" persists to server
- [ ] Export: `python utils/fusion_export.py` produces valid coco_2d.json + coco_3d.json
- [ ] link_id values match across both export files

---

## Decisions & Rationale

| Decision | Why |
|----------|-----|
| **Plugin route** over core CVAT changes | Avoids modifying Redux single-job constraint. Uses existing `components.router` plugin slot |
| **View-only panels** (no annotation drawing) | Users create annotations in native CVAT. Fusion viewer is for linking + reviewing. Avoids reimplementing canvas draw logic |
| **`link_id` text attribute** over group IDs | Groups are job-scoped integers; a UUID text attribute crosses task boundaries and survives export |
| **Two COCO files** over one merged | Each remains valid COCO schema; `link_id` in `attributes` is the join key |
| **4-way parallelism** | 2D panel, 3D panel, plugin shell, Python export are independent with clean interface |
