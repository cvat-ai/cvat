# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-alpha] - Unreleased
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

## [0.6.1] - 2020-03-21
### Changed
- VOC task export now does not use official label map by default, but takes one
  from the source task to avoid primary-class and class part name
  clashing ([#1275](https://github.com/opencv/cvat/issues/1275))

### Fixed
- File names in LabelMe format export are no longer truncated ([#1259](https://github.com/opencv/cvat/issues/1259))
- `occluded` and `z_order` annotation attributes are now correctly passed to Datumaro ([#1271](https://github.com/opencv/cvat/pull/1271))
- Annotation-less tasks now can be exported as empty datasets in COCO ([#1277](https://github.com/opencv/cvat/issues/1277))
- Frame name matching for video annotations import -
  allowed `frame_XXXXXX[.ext]` format ([#1274](https://github.com/opencv/cvat/pull/1274))

### Security
- Bump acorn from 6.3.0 to 6.4.1 in /cvat-ui ([#1270](https://github.com/opencv/cvat/pull/1270))

## [0.6.0] - 2020-03-15
### Added
- Server only support for projects. Extend REST API v1 (/api/v1/projects*)
- Ability to get basic information about users without admin permissions ([#750](https://github.com/opencv/cvat/issues/750))
- Changed REST API: removed PUT and added DELETE methods for /api/v1/users/ID
- Mask-RCNN Auto Annotation Script in OpenVINO format
- Yolo Auto Annotation Script
- Auto segmentation using Mask_RCNN component (Keras+Tensorflow Mask R-CNN Segmentation)
- REST API to export an annotation task (images + annotations)
- [Datumaro](https://github.com/opencv/cvat/tree/develop/datumaro) - a framework to build, analyze, debug and visualize datasets
- Text Detection Auto Annotation Script in OpenVINO format for version 4
- Added in OpenVINO Semantic Segmentation for roads
- Ability to visualize labels when using Auto Annotation runner
- MOT CSV format support ([#830](https://github.com/opencv/cvat/pull/830))
- LabelMe format support ([#844](https://github.com/opencv/cvat/pull/844))
- Segmentation MASK format import (as polygons) ([#1163](https://github.com/opencv/cvat/pull/1163))
- Git repositories can be specified with IPv4 address ([#827](https://github.com/opencv/cvat/pull/827))

### Changed
- page_size parameter for all REST API methods
- React & Redux & Antd based dashboard
- Yolov3 interpretation script fix and changes to mapping.json
- YOLO format support ([#1151](https://github.com/opencv/cvat/pull/1151))
- Added support for OpenVINO 2020

### Fixed
- Exception in Git plugin [#826](https://github.com/opencv/cvat/issues/826)
- Label ids in TFrecord format now start from 1 [#866](https://github.com/opencv/cvat/issues/866)
- Mask problem in COCO JSON style [#718](https://github.com/opencv/cvat/issues/718)
- Datasets (or tasks) can be joined and split to subsets with Datumaro [#791](https://github.com/opencv/cvat/issues/791)
- Output labels for VOC format can be specified with Datumaro [#942](https://github.com/opencv/cvat/issues/942)
- Annotations can be filtered before dumping with Datumaro [#994](https://github.com/opencv/cvat/issues/994)

## [0.5.2] - 2019-12-15
### Fixed
- Frozen version of scikit-image==0.15 in requirements.txt because next releases don't support Python 3.5

## [0.5.1] - 2019-10-17
### Added
- Integration with Zenodo.org (DOI)

## [0.5.0] - 2019-09-12
### Added
- A converter to YOLO format
- Installation guide
- Linear interpolation for a single point
- Video frame filter
- Running functional tests for REST API during a build
- Admins are no longer limited to a subset of python commands in the auto annotation application
- Remote data source (list of URLs to create an annotation task)
- Auto annotation using Faster R-CNN with Inception v2 (utils/open_model_zoo)
- Auto annotation using Pixel Link mobilenet v2 - text detection (utils/open_model_zoo)
- Ability to create a custom extractors for unsupported media types
- Added in PDF extractor
- Added in a command line model manager tester
- Ability to dump/load annotations in several formats from UI (CVAT, Pascal VOC, YOLO, MS COCO, png mask, TFRecord)
- Auth for REST API (api/v1/auth/): login, logout, register, ...
- Preview for the new CVAT UI (dashboard only) is available: http://localhost:9080/
- Added command line tool for performing common task operations (/utils/cli/)

### Changed
- Outside and keyframe buttons in the side panel for all interpolation shapes (they were only for boxes before)
- Improved error messages on the client side (#511)

### Removed
- "Flip images" has been removed. UI now contains rotation features.

### Fixed
- Incorrect width of shapes borders in some cases
- Annotation parser for tracks with a start frame less than the first segment frame
- Interpolation on the server near outside frames
- Dump for case when task name has a slash
- Auto annotation fail for multijob tasks
- Installation of CVAT with OpenVINO on the Windows platform
- Background color was always black in utils/mask/converter.py
- Exception in attribute annotation mode when a label are switched to a value without any attributes
- Handling of wrong labelamp json file in auto annotation (<https://github.com/opencv/cvat/issues/554>)
- No default attributes in dumped annotation (<https://github.com/opencv/cvat/issues/601>)
- Required field "Frame Filter" on admin page during a task modifying (#666)
- Dump annotation errors for a task with several segments (#610, #500)
- Invalid label parsing during a task creating (#628)
- Button "Open Task" in the annotation view
- Creating a video task with 0 overlap

### Security
- Upgraded Django, djangorestframework, and other packages

## [0.4.2] - 2019-06-03
### Fixed
- Fixed interaction with the server share in the auto annotation plugin

## [0.4.1] - 2019-05-14
### Fixed
- JavaScript syntax incompatibility with Google Chrome versions less than 72

## [0.4.0] - 2019-05-04
### Added
- OpenVINO auto annotation: it is possible to upload a custom model and annotate images automatically.
- Ability to rotate images/video in the client part (Ctrl+R, Shift+Ctrl+R shortcuts) (#305)
- The ReID application for automatic bounding box merging has been added (#299)
- Keyboard shortcuts to switch next/previous default shape type (box, polygon etc) [Alt + <, Alt + >] (#316)
- Converter for VOC now supports interpolation tracks
- REST API (/api/v1/*, /api/docs)
- Semi-automatic semantic segmentation with the [Deep Extreme Cut](http://www.vision.ee.ethz.ch/~cvlsegmentation/dextr/) work

### Changed
- Propagation setup has been moved from settings to bottom player panel
- Additional events like "Debug Info" or "Fit Image" have been added for analitics
- Optional using LFS for git annotation storages (#314)

### Deprecated
- "Flip images" flag in the create task dialog will be removed. Rotation functionality in client part have been added instead.

### Removed
-

### Fixed
- Django 2.1.5 (security fix, https://nvd.nist.gov/vuln/detail/CVE-2019-3498)
- Several scenarious which cause code 400 after undo/redo/save have been fixed (#315)

## [0.3.0] - 2018-12-29
### Added
- Ability to copy Object URL and Frame URL via object context menu and player context menu respectively.
- Ability to change opacity for selected shape with help "Selected Fill Opacity" slider.
- Ability to remove polyshapes points by double click.
- Ability to draw/change polyshapes (except for points) by slip method. Just press ENTER and moving a cursor.
- Ability to switch lock/hide properties via label UI element (in right menu) for all objects with same label.
- Shortcuts for outside/keyframe properties
- Support of Intel OpenVINO for accelerated model inference
- Tensorflow annotation now works without CUDA. It can use CPU only. OpenVINO and CUDA are supported optionally.
- Incremental saving of annotations.
- Tutorial for using polygons (screencast)
- Silk profiler to improve development process
- Admin panel can be used to edit labels and attributes for annotation tasks
- Analytics component to manage a data annotation team, monitor exceptions, collect client and server logs
- Changeable job and task statuses (annotation, validation, completed). A job status can be changed manually, a task status is computed automatically based on job statuses (#153)
- Backlink to a task from its job annotation view (#156)
- Buttons lock/hide for labels. They work for all objects with the same label on a current frame (#116)

### Changed
- Polyshape editing method has been improved. You can redraw part of shape instead of points cloning.
- Unified shortcut (Esc) for close any mode instead of different shortcuts (Alt+N, Alt+G, Alt+M etc.).
- Dump file contains information about data source (e.g. video name, archive name, ...)
- Update requests library due to https://nvd.nist.gov/vuln/detail/CVE-2018-18074
- Per task/job permissions to create/access/change/delete tasks and annotations
- Documentation was improved
- Timeout for creating tasks was increased (from 1h to 4h) (#136)
- Drawing has become more convenience. Now it is possible to draw outside an image. Shapes will be automatically truncated after drawing process (#202)

### Fixed
- Performance bottleneck has been fixed during you create new objects (draw, copy, merge etc).
- Label UI elements aren't updated after changelabel.
- Attribute annotation mode can use invalid shape position after resize or move shapes.
- Labels order is preserved now (#242)
- Uploading large XML files (#123)
- Django vulnerability (#121)
- Grammatical cleanup of README.md (#107)
- Dashboard loading has been accelerated (#156)
- Text drawing outside of a frame in some cases (#202)

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
