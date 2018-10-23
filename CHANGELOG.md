# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Ability to copy Object URL and Frame URL via object context menu and player context menu respectively.
- Ability to change opacity for selected shape with help "Selected Fill Opacity" slider.
- Ability to remove polyshapes points by double click.
- Ability to draw/change polyshapes (except for points) by slip method. Just press ENTER and moving a cursor.
- Ability to switch lock/hide properties via label UI element (in right menu) for all objects with same label.
- Shortcuts for outside/keyframe properties
- OpenVINO for accelerated model inference
- Tensorflow annotation now works without CUDA. It can use CPU only. OpenVINO and CUDA are supported optionally.
- Incremental saving, client ID field for all annotated objects.

### Changed
- Polyshape editing method has been improved. You can redraw part of shape instead of points cloning.
- Unified shortcut (Esc) for close any mode instead of different shortcuts (Alt+N, Alt+G, Alt+M etc.).
- Dump file contains information about data source (e.g. video name, archive name, ...)

### Fixed
- Performance bottleneck has been fixed during you create new objects (draw, copy, merge etc).
- Label UI elements aren't updated after changelabel.
- Attribute annotation mode can use invalid shape position after resize or move shapes.


## [0.2.0] - 2018-09-28
### Added
- New annotation shapes: polygons, polylines, points
- Undo/redo feature
- Grid to estimate size of objects
- Context menu for shapes
- A converter to PASCAL VOC format
- A converter to MS COCO format
- A converter to mask format
- License header for most of all files
- .gitattribute to avoid problems with bash scripts inside a container
- CHANGELOG.md itself
- Drawing size of a bounding box during resize
- Color by instance, group, label
- Group objects
- Object propagation on next frames
- Full screen view

### Changed
- Documentation, screencasts, the primary screenshot
- Content-type for save_job request is application/json

### Fixed
- Player navigation if the browser's window is scrolled
- Filter doesn't support dash (-)
- Several memory leaks
- Inconsistent extensions between filenames in an annotation file and real filenames

## [0.1.2] - 2018-08-07
### Added
- 7z archive support when creating a task
- .vscode/launch.json file for developing with VS code

### Fixed
- #14: docker-compose down command as written in the readme does not remove volumes
- #15: all checkboxes in temporary attributes are checked when reopening job after saving the job
- #18: extend CONTRIBUTING.md
- #19: using the same attribute for label twice -> stuck

### Changed
- More strict verification for labels with attributes

## [0.1.1] - 2018-07-6
### Added
- Links on a screenshot, documentation, screencasts into README.md
- CONTRIBUTORS.md

### Fixed
- GitHub documentation

## 0.1.0 - 2018-06-29
### Added
- Initial version

## Template
```
## [Unreleased]
### Added
-

### Changed
-

### Deprecated
-

### Removed
-

### Fixed
-

### Security
-
```
