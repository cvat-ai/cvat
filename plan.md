# 2D↔3D Fusion Viewer Plugin + COCO Export — Implementation Plan

## Overview

Build a CVAT UI plugin (`plugins/fusion`) that adds a `/fusion` route showing a **side-by-side editable 2D + 3D annotation workspace** in a single GUI. Annotators can **draw, edit, move, resize, and rotate** both 2D rectangles and 3D cuboids without leaving the fusion viewer. Annotations are linked via a `link_id` text attribute on shared labels. Visual linking uses synchronized color-coding and cross-panel selection highlighting. A companion Python script (`utils/fusion_export.py`) exports two cross-referenced COCO JSON files.

**Zero core CVAT modifications** — everything goes through the plugin system, the real `cvat-canvas` / `cvat-canvas3d` libraries, and public APIs.

---

## Architecture (v2 — Editable Side-by-Side)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  /fusion?task2d=X&task3d=Y  (plugin route via components.router)        │
│                                                                          │
│  ┌─ Toolbar ────────────────────────────────────────────────────────┐   │
│  │  [Select] [Draw Rect▾] [Draw Cuboid▾] | Label: [car ▾] | [Save] │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌── Left Half ──────────────┐  ┌── Right Half ─────────────────────┐   │
│  │                            │  │                                    │   │
│  │   2D Canvas (cvat-canvas) │  │   3D Perspective (cvat-canvas3d)  │   │
│  │   • draw rectangles       │  │   • draw cuboids                   │   │
│  │   • drag / resize / rotate│  │   • orbit camera                   │   │
│  │   • click to select       │  │   • click to select                │   │
│  │                            │  │                                    │   │
│  │                            │  ├──────────┬──────────┬─────────────┤   │
│  │                            │  │   Top    │   Side   │   Front     │   │
│  │                            │  │  (ortho) │  (ortho) │  (ortho)    │   │
│  │                            │  │  drag to │  drag to │  drag to    │   │
│  │                            │  │  edit    │  edit    │  edit       │   │
│  └────────────────────────────┘  └──────────┴──────────┴─────────────┘   │
│                                                                          │
│  ┌── Bottom Bar ────────────────────────────────────────────────────┐   │
│  │  Link Controls  |  Annotation List (linked / unlinked)           │   │
│  │  [Link] [Unlink] [Save All]  | joined table by link_id          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌── Auto-Link Prompt (modal, shown after drawing) ─────────────────┐   │
│  │  "Link this rectangle to a 3D cuboid? Select one or [Skip]"      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. Plugin mounts → load 2D + 3D tasks by ID (query params) or by project dimension
2. Get jobs from each task → store `Job` instances
3. Frame slider change → fetch `frameData` + `objectStates[]` from both jobs
4. Instantiate real `Canvas` (2D) and `Canvas3d` (3D) → call `canvas.setup(frameData, objectStates)` on each
5. Annotations with matching `link_id` get color-coded via `ObjectState.color` = `linkIdToColor(link_id)`
6. Canvas events (`canvas.drawn`, `canvas.edited`, `canvas.selected`) drive annotation CRUD and cross-panel sync
7. After drawing, an auto-link prompt encourages pairing the new annotation in the other view

### Editing Capabilities (NEW in v2)

- **2D Panel**: Full `cvat-canvas` — draw rectangles, drag, resize, rotate, undo/redo
- **3D Panel**: Full `cvat-canvas3d` — draw cuboids in perspective view, translate/resize/rotate in orthographic sub-views (top/side/front)
- **Cross-selection sync**: selecting a linked annotation in one panel activates its partner in the other
- **Auto-link prompt**: after drawing in either panel, a modal prompts linking to the other view

### Linking Mechanism

- Each project label has a **text attribute** named `link_id` (mutable, no default)
- When linking: `generateUUID()` → written to both the 2D bbox and 3D cuboid
- Colors: `hashCode(link_id) % 360 → HSL hue`, unlinked = gray
- Persisted via `job.annotations.put([state])` + `job.annotations.save()`

---

## File Structure (v2)

```
cvat-ui/plugins/fusion/
├── src/ts/
│   ├── index.tsx                        # Plugin entry: register route + task action
│   ├── fusion-page.tsx                  # Main page: orchestration, state, layout
│   ├── consts.ts                        # Shared constants (LINK_ID_ATTR_NAME, etc.)
│   ├── utils/
│   │   └── color.ts                     # link_id → color hashing
│   └── panels/
│       ├── editable-canvas2d-panel.tsx   # NEW: wraps real cvat-canvas for 2D editing
│       ├── editable-canvas3d-panel.tsx   # NEW: wraps real cvat-canvas3d for 3D editing
│       ├── fusion-toolbar.tsx            # NEW: draw/select toolbar + label picker
│       ├── link-controls.tsx             # Link/Unlink/Save buttons (existing)
│       └── annotation-list.tsx           # Linked annotations table (existing)

utils/
└── fusion_export.py                     # Python COCO export script (uses cvat-sdk)
```

Old view-only panels (`canvas2d-panel.tsx`, `canvas3d-panel.tsx`) are kept for reference
but no longer imported by `fusion-page.tsx`.

---

## Implementation Streams (Parallelizable)

### Stream A — Editable 2D Panel (`editable-canvas2d-panel.tsx`)

**Independent. No deps on B/C/D.**

- React component wrapping the real `Canvas` from `cvat-canvas/src/typescript/canvas`
- On mount: `new Canvas()`, append `canvas.html()` into container ref, `canvas.configure()`, `canvas.fitCanvas()`
- On `job`/`frame` change: `job.frames.get(frame)` → `canvas.setup(frameData, objectStates)`
- DOM events on `canvas.html()`: `canvas.drawn`, `canvas.edited`, `canvas.selected`, `canvas.clicked`, `canvas.deactivated`, `canvas.setup`, `canvas.error`
- `canvas.drawn` → construct `ObjectState`, `job.annotations.put(...)`, re-fetch, fire `onAnnotationCreated`
- `canvas.edited` → update `state.points`/`state.rotation`, `state.save()`, re-fetch
- `canvas.selected` → `onSelectAnnotation(clientID)` to parent
- Expose via `forwardRef` + `useImperativeHandle`: `startDraw(shapeType, label)`, `cancelDraw()`, `activate(clientID)`, `getMode()`
- `ResizeObserver` → `canvas.fitCanvas()` on container resize
- Import CSS from `cvat-canvas` scoped within `.fusion-canvas2d-container`

### Stream B — Editable 3D Panel (`editable-canvas3d-panel.tsx`)

**Independent. No deps on A/C/D.**

- React component wrapping the real `Canvas3d` from `cvat-canvas3d/src/typescript/canvas3d`
- On mount: `new Canvas3d()`, get `ViewsDOM`, append `perspective` + `top`/`side`/`front` into sub-containers
- Start `requestAnimationFrame` loop calling `canvas3d.render()`
- Keyboard: `keydown`/`keyup` → `canvas3d.keyControls(event)` for camera
- On `job`/`frame` change: `job.frames.get(frame)` → `canvas3d.setup(frameData, objectStates)`
- Events on `.html().perspective`: `canvas.drawn`, `canvas.edited`, `canvas.selected`, `canvas.clicked`, `canvas.setup`, `canvas.error`
- `canvas.drawn` → construct cuboid `ObjectState`, persist, fire `onAnnotationCreated`
- `canvas.edited` → update `state.points`, save, re-fetch
- Expose: `startDraw(label)`, `cancelDraw()`, `activate(clientID)`, `getMode()`
- CSS grid layout: perspective ~70% height, 3 ortho views split remaining 30%

### Stream C — Toolbar (`fusion-toolbar.tsx`)

**Independent. No deps on A/B/D.**

- Controls: Draw Rectangle (2D), Draw Cuboid (3D), Select, Label Picker dropdown, Save All
- Tracks `activeControl: 'select' | 'draw2d' | 'draw3d'` and `selectedLabel`
- Callbacks: `onStartDraw2d(label)`, `onStartDraw3d(label)`, `onCancelDraw()`, `onSave()`
- Visual: active tool highlighted, label color indicator

### Stream D — Fusion Page Orchestration (`fusion-page.tsx` rewrite)

**Depends on A/B/C interfaces (not implementations).**

- Hold refs to both editable panels via `useRef`
- Annotation state: `annotations2d[]`, `annotations3d[]` re-fetched after every CRUD op
- Both panels call `canvas.setup()` when annotations change
- Cross-selection sync: `onSelectAnnotation` → look up `link_id` → `activate(partnerClientID)` on other panel
- Auto-link prompt: after `onAnnotationCreated`, show Ant Design `Modal.confirm` — "Link this annotation?" Next selection in opposite panel auto-links
- Color-coding: set `ObjectState.color = linkIdToColor(getLinkId(state))` before `setup()`
- Frame navigation: `Slider`, re-fetch + re-setup both canvases on change
- Keyboard shortcuts: `S` = save, `Ctrl+Z` = undo, `N` = draw rect, `M` = draw cuboid, `Esc` = cancel

### Stream E — Tests & Demo Updates

**Independent. Runs after A+B merge.**

- Update `utils/fusion_demo_seed.sh` — more frames/annotations for editing exercises
- Update `tests/fusion_smoke_test.md` — add editing test cases
- Verify `utils/fusion_export.py` still works with annotations from editable panels

---

## Parallelization — Agent Assignment

| Agent | Scope | Files Created/Modified | Depends On |
|-------|-------|------------------------|------------|
| **A: Editable 2D Panel** | `editable-canvas2d-panel.tsx` | 1 new file | None (interface contract only) |
| **B: Editable 3D Panel** | `editable-canvas3d-panel.tsx` | 1 new file | None (interface contract only) |
| **C: Toolbar** | `fusion-toolbar.tsx` | 1 new file | None (interface contract only) |
| **D: Fusion Page** | `fusion-page.tsx` rewrite | 1 modified file | A+B+C interfaces (not impls) |
| **E: Tests/Demo** | Demo scripts, test docs | TBD | A+B merged |

**Shared interface contracts** (all agents use):

```ts
// Imperative handle for 2D panel (forwardRef)
interface Canvas2DHandle {
    startDraw(shapeType: 'rectangle', label: any): void;
    cancelDraw(): void;
    activate(clientID: number | null): void;
    getMode(): string;
}

// Imperative handle for 3D panel (forwardRef)
interface Canvas3DHandle {
    startDraw(label: any): void;
    cancelDraw(): void;
    activate(clientID: number | null): void;
    getMode(): string;
}

// Props for editable panel components
interface EditablePanelProps {
    job: any;                                  // cvat-core Job instance
    frame: number;
    annotations: ObjectState[];
    onAnnotationCreated: (state: ObjectState) => void;
    onAnnotationEdited: (state: ObjectState) => void;
    onSelectAnnotation: (clientID: number) => void;
}

// Toolbar props
interface FusionToolbarProps {
    labels: any[];                             // from job.labels
    activeControl: 'select' | 'draw2d' | 'draw3d';
    selectedLabel: any;
    onStartDraw2d: (label: any) => void;
    onStartDraw3d: (label: any) => void;
    onCancelDraw: () => void;
    onSave: () => void;
    onLabelChange: (label: any) => void;
}

// Constants (existing)
LINK_ID_ATTR_NAME = 'link_id';

// Color utility (existing)
linkIdToColor(linkId: string | null): string;
getLinkIdFromState(state: ObjectState): string | null;
```

**Integration order**: A, B, C build independently. D integrates them. E validates.

---

## Verification Checklist

- [ ] `yarn workspace cvat-ui run start` compiles with updated plugin
- [ ] Navigate to `/fusion/:projectId` → page renders with side-by-side layout
- [ ] 2D panel shows real image with CVAT canvas bboxes (not custom rendering)
- [ ] 3D panel shows point cloud with cuboid overlays via `Canvas3d`
- [ ] Draw rectangle in 2D panel → annotation persists via `job.annotations.put()`
- [ ] Draw cuboid in 3D panel → annotation persists
- [ ] Edit annotation by dragging/resizing → changes persist via `state.save()`
- [ ] Click annotation in 2D → linked annotation highlights in 3D (and vice versa)
- [ ] Auto-link prompt appears after drawing, next opposite-panel click links them
- [ ] "Link" assigns same UUID; colors match across both panels
- [ ] "Unlink" clears `link_id` from both 2D and 3D annotations
- [ ] "Save" persists all changes to server
- [ ] Frame slider: both panels update correctly on frame change
- [ ] Resize: both panels refit correctly (2D `fitCanvas()`, 3D layout recalculates)
- [ ] Export: `fusion_export.py` still produces valid COCO with `link_id` join keys

---

## Decisions & Rationale

| Decision | Why |
|----------|-----|
| **Embed real CVAT canvases** over custom renderers | Full annotation parity (draw, edit, resize, rotate, undo) without re-implementing canvas logic |
| **Draw + Edit** over view-only | Annotators need a single GUI — creating and modifying annotations in place |
| **Plugin route** over core CVAT changes | Avoids modifying Redux single-job constraint. Uses existing `components.router` plugin slot |
| **`link_id` text attribute** over group IDs | Groups are job-scoped integers; a UUID text attribute crosses task boundaries and survives export |
| **Auto-link prompt** after drawing | Reduces manual linking burden — prompt when intent is fresh |
| **Left 2D / Right 3D + ortho** layout | Mirrors standard AV annotation workflows; ortho views give precise 3D alignment |
| **forwardRef + useImperativeHandle** | Clean parent→child control for draw/activate without prop drilling |
| **5-stream parallelism** | 2D panel, 3D panel, toolbar, orchestration, tests — minimal cross-deps |
