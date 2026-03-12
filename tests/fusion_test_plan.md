# Fusion Viewer Plugin — Test Plan

## Overview

Three independent test components covering the fusion viewer plugin and COCO export script.
Components 1 and 2 are fully parallelizable (different layers, separate directories).

**Test data**: Reuses existing files from `tests/mounted_file_share/`:
- 2D: `images/image_0.jpg` … `image_5.jpg`
- 3D: `test_canvas3d.zip` (PCD + PNG)

---

## Component 1 — Python: Export Script Tests

**File**: `tests/python/rest_api/test_fusion_export.py`
**Run**: `pytest tests/python/rest_api/test_fusion_export.py -v`

### Unit tests (no server required)
| Test | What it checks |
|------|---------------|
| `test_parse_args_valid` | `parse_args()` with all required flags returns correct namespace |
| `test_parse_args_missing_host` | Missing `--host` raises `SystemExit` |
| `test_parse_args_env_fallback` | `CVAT_USERNAME` / `CVAT_PASSWORD` env vars populate args |
| `test_get_link_id_found` | `_get_link_id()` finds `link_id` by spec_id in attribute list |
| `test_get_link_id_missing` | Returns `None` when attribute list has no `link_id` |
| `test_get_link_id_empty_value` | Returns `None` when `link_id` value is empty string |
| `test_shape_helpers` | `_shape_points`, `_shape_type`, `_shape_frame` work with both SDK objects and plain dicts |
| `test_build_images_list` | Correct id/file_name/width/height from mock frames |
| `test_print_summary` | Linked/unlinked counts are correct (capture stdout) |

### Integration tests (requires running CVAT stack)
| Test | What it checks |
|------|---------------|
| `test_full_export_pipeline` | Creates project (label "car" + `link_id` attr), 2D task, 3D task, annotations with matching `link_id`, runs `main()`, verifies COCO JSON structure and cross-references |
| `test_export_no_3d_task` | Project with only 2D task → `SystemExit` |
| `test_export_unlinked_annotations` | Annotations without `link_id` → `attributes.link_id: null` in output |
| `test_non_rectangle_shapes_skipped` | Polygon 2D shapes are not exported; only rectangles |

---

## Component 2 — Cypress E2E: Fusion Viewer UI

**Config**: `tests/cypress.fusion.config.js`
**Run**: `cd tests && npx cypress run --config-file cypress.fusion.config.js`

### Files
- `tests/cypress/support/const_fusion.js` — test constants
- `tests/cypress/e2e/fusion/setup_fusion.js` — fixture creation
- `tests/cypress/e2e/fusion/fusion_viewer.js` — interaction tests

### Tests
| Test | What it checks |
|------|---------------|
| Setup: create project + 2D/3D tasks | `headlessCreateProject` + `headlessCreateTask` with `link_id` attr |
| Project action menu | "Open Fusion Viewer" item exists in project dropdown |
| Fusion page loads | `/fusion/:projectId` renders both 2D and 3D panels |
| 2D panel has canvas | `<canvas>` or `<img>` visible inside 2D panel |
| 3D panel has canvas | THREE.js `<canvas>` element exists inside 3D panel |
| Annotation list renders | Table component exists and is visible |
| Frame slider works | Moving slider updates displayed frame number |

---

## Component 3 — Manual Smoke Test Checklist

**File**: `tests/fusion_smoke_test.md`

Visual verification steps that cannot be reliably automated:
1. Panel layout (2D left, 3D right, controls below)
2. 2D image rendering + bbox overlays
3. 3D point cloud + cuboid wireframes + OrbitControls
4. Selection highlighting (2D border change, 3D glow)
5. Linking flow (select both → Link → matching colors)
6. Unlinking flow (Unlink → colors revert)
7. Save persistence (reload verifies link_ids)
8. Frame navigation syncs both panels
9. Export script produces valid COCO JSON with matching link_ids

---

## CI Integration

Add a new job to `.github/workflows/main.yml` (optional, post-merge):
```yaml
fusion_testing:
  needs: build
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Start CVAT
      run: docker compose up -d
    - name: Python tests
      run: pytest tests/python/rest_api/test_fusion_export.py -v
    - name: Cypress tests
      run: cd tests && npx cypress run --config-file cypress.fusion.config.js
```
