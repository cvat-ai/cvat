# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0-beta] - Unreleased
### Added
-

### Changed
- Smaller object details (<https://github.com/opencv/cvat/pull/1877>)

### Deprecated
-

### Removed
-

### Fixed
- Some objects aren't shown on canvas sometimes. For example after propagation on of objects is invisible (<https://github.com/opencv/cvat/pull/1834>)
- CVAT doesn't offer to restore state after an error (<https://github.com/opencv/cvat/pull/1874>)
- Cannot read property 'shapeType' of undefined because of zOrder related issues (<https://github.com/opencv/cvat/pull/1874>)
- Cannot read property 'pinned' of undefined because of zOrder related issues (<https://github.com/opencv/cvat/pull/1874>)
- Do not iterate over hidden objects in aam (which are invisible because of zOrder) (<https://github.com/opencv/cvat/pull/1874>)
- Cursor position is reset after changing a text field (<https://github.com/opencv/cvat/pull/1874>)
- Hidden points and cuboids can be selected to be groupped (<https://github.com/opencv/cvat/pull/1874>)
- `outside` annotations should not be in exported images (<https://github.com/opencv/cvat/issues/1620>)
- `CVAT for video format` import error with interpolation (<https://github.com/opencv/cvat/issues/1893>)
- `Image compression` definition mismatch (<https://github.com/opencv/cvat/issues/1900>)
- Points are dublicated during polygon interpolation sometimes (<https://github.com/opencv/cvat/pull/1892>)
- When redraw a shape with activated autobordering, previous points are visible (<https://github.com/opencv/cvat/pull/1892>)

### Security
-

## [1.1.0-alpha] - 2020-06-30
### Added
- Throttling policy for unauthenticated users (<https://github.com/opencv/cvat/pull/1531>)
- Added default label color table for mask export (<https://github.com/opencv/cvat/pull/1549>)
- Added environment variables for Redis and Postgres hosts for Kubernetes deployment support (<https://github.com/opencv/cvat/pull/1641>)
- Added visual identification for unavailable formats (<https://github.com/opencv/cvat/pull/1567>)
- Shortcut to change color of an activated shape in new UI (Enter) (<https://github.com/opencv/cvat/pull/1683>)
- Shortcut to switch split mode (<https://github.com/opencv/cvat/pull/1683>)
- Built-in search for labels when create an object or change a label (<https://github.com/opencv/cvat/pull/1683>)
- Better validation of labels and attributes in raw viewer (<https://github.com/opencv/cvat/pull/1727>)
- ClamAV antivirus integration (<https://github.com/opencv/cvat/pull/1712>)
- Added canvas background color selector (<https://github.com/opencv/cvat/pull/1705>)
- SCSS files linting with Stylelint tool (<https://github.com/opencv/cvat/pull/1766>)
- Supported import and export or single boxes in MOT format (https://github.com/opencv/cvat/pull/1764)
- [Datumaro] Added `stats` command, which shows some dataset statistics like image mean and std (https://github.com/opencv/cvat/pull/1734)
- Add option to upload annotations upon task creation on CLI
- Polygon and polylines interpolation (<https://github.com/opencv/cvat/pull/1571>)
- Ability to redraw shape from scratch (Shift + N) for an activated shape (<https://github.com/opencv/cvat/pull/1571>)
- Highlights for the first point of a polygon/polyline and direction (<https://github.com/opencv/cvat/pull/1571>)
- Ability to change orientation for poylgons/polylines in context menu (<https://github.com/opencv/cvat/pull/1571>)
- Ability to set the first point for polygons in points context menu (<https://github.com/opencv/cvat/pull/1571>)
- Added new tag annotation workspace (<https://github.com/opencv/cvat/pull/1570>)
- Appearance block in attribute annotation mode (<https://github.com/opencv/cvat/pull/1820>)
- Keyframe navigations and some switchers in attribute annotation mode (<https://github.com/opencv/cvat/pull/1820>)
- [Datumaro] Added `convert` command to convert datasets directly (<https://github.com/opencv/cvat/pull/1837>)
- [Datumaro] Added an option to specify image extension when exporting datasets (<https://github.com/opencv/cvat/pull/1799>)
- [Datumaro] Added image copying when exporting datasets, if possible (<https://github.com/opencv/cvat/pull/1799>)

### Changed
- Removed information about e-mail from the basic user information (<https://github.com/opencv/cvat/pull/1627>)
- Update https install manual. Makes it easier and more robust. Includes automatic renewing of lets encrypt certificates.
- Settings page move to the modal. (<https://github.com/opencv/cvat/pull/1705>)
- Implemented import and export of annotations with relative image paths (<https://github.com/opencv/cvat/pull/1463>)
- Using only single click to start editing or remove a point (<https://github.com/opencv/cvat/pull/1571>)
- Added support for attributes in VOC XML format (https://github.com/opencv/cvat/pull/1792)
- Added annotation attributes in COCO format (https://github.com/opencv/cvat/pull/1782)
- Colorized object items in the side panel (<https://github.com/opencv/cvat/pull/1753>)
- [Datumaro] Annotation-less files are not generated anymore in COCO format, unless tasks explicitly requested (<https://github.com/opencv/cvat/pull/1799>)

### Deprecated
-

### Removed
-

### Fixed
- Problem with exported frame stepped image task (<https://github.com/opencv/cvat/issues/1613>)
- Fixed dataset filter item representation for imageless dataset items (<https://github.com/opencv/cvat/pull/1593>)
- Fixed interpreter crash when trying to import `tensorflow` with no AVX instructions available (<https://github.com/opencv/cvat/pull/1567>)
- Kibana wrong working time calculation with new annotation UI use (<https://github.com/opencv/cvat/pull/1654>)
- Wrong rexex for account name validation (<https://github.com/opencv/cvat/pull/1667>)
- Wrong description on register view for the username field (<https://github.com/opencv/cvat/pull/1667>)
- Wrong resolution for resizing a shape (<https://github.com/opencv/cvat/pull/1667>)
- React warning because of not unique keys in labels viewer (<https://github.com/opencv/cvat/pull/1727>)
- Fixed issue tracker (<https://github.com/opencv/cvat/pull/1705>)
- Fixed canvas fit after sidebar open/close event (<https://github.com/opencv/cvat/pull/1705>)
- A couple of exceptions in AAM related with early object activation (<https://github.com/opencv/cvat/pull/1755>)
- Propagation from the latest frame (<https://github.com/opencv/cvat/pull/1800>)
- Number attribute value validation (didn't work well with floats) (<https://github.com/opencv/cvat/pull/1800>)
- Logout doesn't work (<https://github.com/opencv/cvat/pull/1812>)
- Annotations aren't updated after reopening a task (<https://github.com/opencv/cvat/pull/1753>)
- Labels aren't updated after reopening a task (<https://github.com/opencv/cvat/pull/1753>)
- Canvas isn't fitted after collapsing side panel in attribute annotation mode (<https://github.com/opencv/cvat/pull/1753>)
- Error when interpolating polygons (<https://github.com/opencv/cvat/pull/1878>)

### Security
- SQL injection in Django `CVE-2020-9402` (<https://github.com/opencv/cvat/pull/1657>)

## [1.0.0] - 2020-05-29
### Added
- cvat-ui: cookie policy drawer for login page (<https://github.com/opencv/cvat/pull/1511>)
- `datumaro_project` export format (<https://github.com/opencv/cvat/pull/1352>)
- Ability to configure user agreements for the user registration form (<https://github.com/opencv/cvat/pull/1464>)
- Cuboid interpolation and cuboid drawing from rectangles (<https://github.com/opencv/cvat/pull/1560>)
- Ability to configure custom pageViewHit, which can be useful for web analytics integration (<https://github.com/opencv/cvat/pull/1566>)
- Ability to configure access to the analytics page based on roles (<https://github.com/opencv/cvat/pull/1592>)

### Changed
- Downloaded file name in annotations export became more informative (<https://github.com/opencv/cvat/pull/1352>)
- Added auto trimming for trailing whitespaces style enforcement (<https://github.com/opencv/cvat/pull/1352>)
- REST API: updated `GET /task/<id>/annotations`: parameters are `format`, `filename` (now optional), `action` (optional) (<https://github.com/opencv/cvat/pull/1352>)
- REST API: removed `dataset/formats`, changed format of `annotation/formats` (<https://github.com/opencv/cvat/pull/1352>)
- Exported annotations are stored for N hours instead of indefinitely (<https://github.com/opencv/cvat/pull/1352>)
- Formats: CVAT format now accepts ZIP and XML (<https://github.com/opencv/cvat/pull/1352>)
- Formats: COCO format now accepts ZIP and JSON (<https://github.com/opencv/cvat/pull/1352>)
- Formats: most of formats renamed, no extension in title (<https://github.com/opencv/cvat/pull/1352>)
- Formats: definitions are changed, are not stored in DB anymore (<https://github.com/opencv/cvat/pull/1352>)
- cvat-core: session.annotations.put() now returns ids of added objects (<https://github.com/opencv/cvat/pull/1493>)
- Images without annotations now also included in dataset/annotations export (<https://github.com/opencv/cvat/issues/525>)

### Removed
- `annotation` application is replaced with `dataset_manager` (<https://github.com/opencv/cvat/pull/1352>)
- `_DATUMARO_INIT_LOGLEVEL` env. variable is removed in favor of regular `--loglevel` cli parameter (<https://github.com/opencv/cvat/pull/1583>)

### Fixed
- Categories for empty projects with no sources are taken from own dataset (<https://github.com/opencv/cvat/pull/1352>)
- Added directory removal on error during `extract` command (<https://github.com/opencv/cvat/pull/1352>)
- Added debug error message on incorrect XPath (<https://github.com/opencv/cvat/pull/1352>)
- Exporting frame stepped task (<https://github.com/opencv/cvat/issues/1294, https://github.com/opencv/cvat/issues/1334>)
- Fixed broken command line interface for `cvat` export format in Datumaro (<https://github.com/opencv/cvat/issues/1494>)
- Updated Rest API document, Swagger document serving instruction issue (<https://github.com/opencv/cvat/issues/1495>)
- Fixed cuboid occluded view (<https://github.com/opencv/cvat/pull/1500>)
- Non-informative lock icon (<https://github.com/opencv/cvat/pull/1434>)
- Sidebar in AAM has no hide/show button (<https://github.com/opencv/cvat/pull/1420>)
- Task/Job buttons has no "Open in new tab" option (<https://github.com/opencv/cvat/pull/1419>)
- Delete point context menu option has no shortcut hint (<https://github.com/opencv/cvat/pull/1416>)
- Fixed issue with unnecessary tag activation in cvat-canvas (<https://github.com/opencv/cvat/issues/1540>)
- Fixed an issue with large number of instances in instance mask (<https://github.com/opencv/cvat/issues/1539>)
- Fixed full COCO dataset import error with conflicting labels in keypoints and detection (<https://github.com/opencv/cvat/pull/1548>)
- Fixed COCO keypoints skeleton parsing and saving (<https://github.com/opencv/cvat/issues/1539>)
- `tf.placeholder() is not compatible with eager execution` exception for auto_segmentation (<https://github.com/opencv/cvat/pull/1562>)
- Canvas cannot be moved with move functionality on left mouse key (<https://github.com/opencv/cvat/pull/1573>)
- Deep extreme cut request is sent when draw any shape with Make AI polygon option enabled  (<https://github.com/opencv/cvat/pull/1573>)
- Fixed an error when exporting a task with cuboids to any format except CVAT (<https://github.com/opencv/cvat/pull/1577>)
- Synchronization with remote git repo (<https://github.com/opencv/cvat/pull/1582>)
- A problem with mask to polygons conversion when polygons are too small (<https://github.com/opencv/cvat/pull/1581>)
- Unable to upload video with uneven size (<https://github.com/opencv/cvat/pull/1594>)
- Fixed an issue with `z_order` having no effect on segmentations (<https://github.com/opencv/cvat/pull/1589>)

### Security
- Permission group whitelist check for analytics view (<https://github.com/opencv/cvat/pull/1608>)

## [1.0.0-beta.2] - 2020-04-30
### Added
- Re-Identification algorithm to merging bounding boxes automatically to the new UI (<https://github.com/opencv/cvat/pull/1406>)
- Methods ``import`` and ``export`` to import/export raw annotations for Job and Task in ``cvat-core`` (<https://github.com/opencv/cvat/pull/1406>)
- Versioning of client packages (``cvat-core``, ``cvat-canvas``, ``cvat-ui``). Initial versions are set to 1.0.0  (<https://github.com/opencv/cvat/pull/1448>)
- Cuboids feature was migrated from old UI to new one. (<https://github.com/opencv/cvat/pull/1451>)

### Removed
- Annotation convertation utils, currently supported natively via Datumaro framework (https://github.com/opencv/cvat/pull/1477)

### Fixed
- Auto annotation, TF annotation and Auto segmentation apps (https://github.com/opencv/cvat/pull/1409)
- Import works with truncated images now: "OSError:broken data stream" on corrupt images (https://github.com/opencv/cvat/pull/1430)
- Hide functionality (H) doesn't work (<https://github.com/opencv/cvat/pull/1445>)
- The highlighted attribute doesn't correspond to the chosen attribute in AAM (<https://github.com/opencv/cvat/pull/1445>)
- Inconvinient image shaking while drawing a polygon (hold Alt key during drawing/editing/grouping to drag an image) (<https://github.com/opencv/cvat/pull/1445>)
- Filter property "shape" doesn't work and extra operator in description (<https://github.com/opencv/cvat/pull/1445>)
- Block of text information doesn't disappear after deactivating for locked shapes (<https://github.com/opencv/cvat/pull/1445>)
- Annotation uploading fails in annotation view (<https://github.com/opencv/cvat/pull/1445>)
- UI freezes after canceling pasting with escape (<https://github.com/opencv/cvat/pull/1445>)
- Duplicating keypoints in COCO export (https://github.com/opencv/cvat/pull/1435)
- CVAT new UI: add arrows on a mouse cursor (<https://github.com/opencv/cvat/pull/1391>)
- Delete point bug (in new UI) (<https://github.com/opencv/cvat/pull/1440>)
- Fix apache startup after PC restart (https://github.com/opencv/cvat/pull/1467)
- Open task button doesn't work (https://github.com/opencv/cvat/pull/1474)

## [1.0.0-beta.1] - 2020-04-15
### Added
- Special behaviour for attribute value ``__undefined__`` (invisibility, no shortcuts to be set in AAM)
- Dialog window with some helpful information about using filters
- Ability to display a bitmap in the new UI
- Button to reset colors settings (brightness, saturation, contrast) in the new UI
- Option to display shape text always
- Dedicated message with clarifications when share is unmounted (https://github.com/opencv/cvat/pull/1373)
- Ability to create one tracked point (https://github.com/opencv/cvat/pull/1383)
- Ability to draw/edit polygons and polylines with automatic bordering feature (https://github.com/opencv/cvat/pull/1394)
- Tutorial: instructions for CVAT over HTTPS
- Deep extreme cut (semi-automatic segmentation) to the new UI (https://github.com/opencv/cvat/pull/1398)

### Changed
- Increase preview size of a task till 256, 256 on the server
- Public ssh-keys are displayed in a dedicated window instead of console when create a task with a repository
- React UI is the primary UI

### Fixed
- Cleaned up memory in Auto Annotation to enable long running tasks on videos
- New shape is added when press ``esc`` when drawing instead of cancellation
- Dextr segmentation doesn't work.
- `FileNotFoundError` during dump after moving format files
- CVAT doesn't append outside shapes when merge polyshapes in old UI
- Layout sometimes shows double scroll bars on create task, dashboard and settings pages
- UI fails after trying to change frame during resizing, dragging, editing
- Hidden points (or outsided) are visible after changing a frame
- Merge is allowed for points, but clicks on points conflict with frame dragging logic
- Removed objects are visible for search
- Add missed task_id and job_id fields into exception logs for the new UI (https://github.com/opencv/cvat/pull/1372)
- UI fails when annotations saving occurs during drag/resize/edit (https://github.com/opencv/cvat/pull/1383)
- Multiple savings when hold Ctrl+S (a lot of the same copies of events were sent with the same working time) (https://github.com/opencv/cvat/pull/1383)
- UI doesn't have any reaction when git repos synchronization failed (https://github.com/opencv/cvat/pull/1383)
- Bug when annotations cannot be saved after (delete - save - undo - save) (https://github.com/opencv/cvat/pull/1383)
- VOC format exports Upper case labels correctly in lower case (https://github.com/opencv/cvat/pull/1379)
- Fixed polygon exporting bug in COCO dataset (https://github.com/opencv/cvat/issues/1387)
- Task creation from remote files (https://github.com/opencv/cvat/pull/1392)
- Job cannot be opened in some cases when the previous job was failed during opening (https://github.com/opencv/cvat/issues/1403)
- Deactivated shape is still highlighted on the canvas (https://github.com/opencv/cvat/issues/1403)
- AttributeError: 'tuple' object has no attribute 'read' in ReID algorithm (https://github.com/opencv/cvat/issues/1403)
- Wrong semi-automatic segmentation near edges of an image (https://github.com/opencv/cvat/issues/1403)
- Git repos paths (https://github.com/opencv/cvat/pull/1400)
- Uploading annotations for tasks with multiple jobs (https://github.com/opencv/cvat/pull/1396)

## [1.0.0-alpha] - 2020-03-31
### Added
- Data streaming using chunks (https://github.com/opencv/cvat/pull/1007)
- New UI: showing file names in UI (https://github.com/opencv/cvat/pull/1311)
- New UI: delete a point from context menu (https://github.com/opencv/cvat/pull/1292)

### Fixed
- Git app cannot clone a repository (https://github.com/opencv/cvat/pull/1330)
- New UI: preview position in task details (https://github.com/opencv/cvat/pull/1312)
- AWS deployment (https://github.com/opencv/cvat/pull/1316)

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
