# Fusion Viewer Plugin — Manual Smoke Test Checklist

**Estimated time:** 15–20 minutes
**Route under test:** `/fusion/:projectId`

---

## Prerequisites

- [ ] CVAT is running locally (`docker compose up -d`)
- [ ] A project exists containing **one 2D task** and **one 3D task**
- [ ] Both tasks have labels with a `link_id` **text attribute** defined
- [ ] Several annotations exist on both tasks (at least 3–4 per task across multiple frames)

---

## 1. Setup & Navigation

- [ ] Open the Projects list page — verify the **"Open Fusion Viewer"** item appears in the project actions dropdown for eligible projects
- [ ] Click "Open Fusion Viewer" — browser navigates to `/fusion/<projectId>` without errors
- [ ] The Fusion Viewer page loads with a **side-by-side layout**: 2D panel (left) and 3D panel (right)
- [ ] Directly visiting `/fusion/<projectId>` in the URL bar also loads correctly
- [ ] Visiting `/fusion/<invalidId>` shows a sensible error or empty state (no crash)

---

## 2. 2D Panel

- [ ] The first frame image loads and is visible in the 2D panel
- [ ] Bounding-box overlays render on top of the image for annotations present on that frame
- [ ] Each bbox has a visible **colored border** (linked = HSL color, unlinked = gray)
- [ ] Clicking a bbox **selects** it — selection is visually indicated (highlight, thicker border, or similar)
- [ ] Clicking empty canvas area **deselects** the current selection
- [ ] Panel resizes gracefully when the browser window is resized

---

## 3. 3D Panel

- [ ] Point cloud data loads via `PCDLoader` and renders in the THREE.js scene
- [ ] Cuboid wireframes are drawn for 3D annotations on the current frame
- [ ] **OrbitControls** work: left-drag rotates, scroll zooms, right-drag pans
- [ ] Clicking a cuboid wireframe **selects** it via raycasting — selection is visually indicated
- [ ] Clicking empty space **deselects** the current 3D selection
- [ ] Scene renders without console errors (`THREE.js` warnings acceptable but no red errors)

---

## 4. Linking Flow

- [ ] Select one annotation in the **2D panel** and one in the **3D panel**
- [ ] Click the **Link** button — both annotations receive a shared `link_id` UUID
- [ ] After linking, both annotations update to the **same deterministic HSL color** derived from the new `link_id`
- [ ] The annotation list table shows the two annotations grouped under the same `link_id`
- [ ] Link button is **disabled / no-op** when fewer than two annotations (one per panel) are selected
- [ ] Linking a second pair produces a **different** `link_id` and a different color

---

## 5. Unlinking Flow

- [ ] Select a linked annotation (either panel)
- [ ] Click the **Unlink** button — the `link_id` is cleared from both the 2D and 3D annotations in the pair
- [ ] Both annotations revert to **gray** color
- [ ] The annotation table shows them as **unlinked**
- [ ] Unlink button is **disabled / no-op** when the selected annotation is already unlinked

---

## 6. Save & Persistence

- [ ] Make linking/unlinking changes, then click **Save**
- [ ] Verify no error toasts or console errors appear on save
- [ ] **Reload the page** (`F5`) — all previously saved link states persist (colors, groupings intact)
- [ ] Open CVAT's native annotation view for the 2D task — confirm `link_id` attribute values match those set in Fusion Viewer
- [ ] Repeat for the 3D task — `link_id` values are consistent
- [ ] Save with **no changes** — succeeds silently (no spurious errors)

---

## 7. Frame Navigation

- [ ] The **Ant Design Slider** is visible and shows the correct frame range
- [ ] Dragging the slider updates **both** the 2D image and the 3D point cloud to the new frame
- [ ] Annotations update to reflect the selected frame (different bboxes / cuboids appear)
- [ ] Navigating to a frame with **no annotations** shows empty overlays in both panels (no crash)
- [ ] Navigating back to an annotated frame restores overlays correctly
- [ ] First frame and last frame are reachable via the slider

---

## 8. Annotation Table

- [ ] The annotation list table is visible and populated
- [ ] Linked annotations are **grouped by `link_id`**
- [ ] Each row shows a **colored swatch** matching the annotation color in the panels
- [ ] Linked pairs display a "linked" status indicator; unlinked annotations show "unlinked"
- [ ] Clicking a row in the table **selects** the corresponding annotation in the relevant panel
- [ ] Table updates when navigating to a different frame

---

## 9. Color Consistency

- [ ] Linked annotations with the **same `link_id`** have the **exact same** HSL color in 2D panel, 3D panel, and annotation table swatch
- [ ] Different `link_id` values produce **visually distinct** colors
- [ ] Unlinked annotations are consistently rendered in **gray** across all views
- [ ] Colors remain stable after frame navigation (no flicker or reassignment)
- [ ] Reload the page — colors for the same `link_id` values are identical (deterministic djb2 hash)

---

## 10. Export Script

- [ ] Run `python utils/fusion_export.py --project-id <projectId>` from the repo root
- [ ] Script exits without errors
- [ ] Output files `coco_2d.json` and `coco_3d.json` are generated
- [ ] `coco_2d.json` contains 2D annotations with a `link_id` field in each annotation's attributes
- [ ] `coco_3d.json` contains 3D annotations with a matching `link_id` field
- [ ] Cross-reference: for each linked pair, the `link_id` in `coco_2d.json` matches the corresponding `link_id` in `coco_3d.json`
- [ ] Unlinked annotations have an **empty or null** `link_id` in both files
- [ ] Running the export a second time **overwrites** cleanly (no duplicate or corrupt output)

---

## 11. Edge Cases

- [ ] Open Fusion Viewer for a project with **only a 2D task** (no 3D) — 3D panel shows empty state or informative message, no crash
- [ ] Open Fusion Viewer for a project with **only a 3D task** (no 2D) — 2D panel shows empty state or informative message, no crash
- [ ] Navigate to a frame where **2D has annotations but 3D does not** — 2D overlays render, 3D panel is empty, no errors
- [ ] Navigate to a frame where **3D has annotations but 2D does not** — 3D cuboids render, 2D panel is empty, no errors
- [ ] Attempt to link when **only one panel** has a selection — Link button should be disabled or show a warning
- [ ] Rapidly click the slider across multiple frames — no rendering glitches or stale overlays
- [ ] Open Fusion Viewer in a **second browser tab** for the same project — both tabs function independently
- [ ] Browser back button from Fusion Viewer returns to the Projects list
