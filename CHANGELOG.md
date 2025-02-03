# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!--
  Developers: this project uses scriv (<https://scriv.readthedocs.io/en/stable/index.html>)
  to maintain the changelog. To add an entry, create a fragment:

    $ scriv create --edit

  Fragments will be merged into this file whenever a release is made.
-->

<!-- scriv-insert-here -->

<a id='changelog-2.26.1'></a>
## \[2.26.1\] - 2025-01-29

### Added

- A button to copy a filename of the image into the clipboard
  (<https://github.com/cvat-ai/cvat/pull/8989>)

### Changed

- Changed location of events cache dir
  (<https://github.com/cvat-ai/cvat/pull/9015>)

### Removed

- \[Helm\] Removed `disableDistinctCachePerService` settings
  (<https://github.com/cvat-ai/cvat/pull/9008>)

### Fixed

- The backend now rejects invalid label types
  (<https://github.com/cvat-ai/cvat/pull/8980>)

- \[Helm\] Impossible to download exported annotations
  (<https://github.com/cvat-ai/cvat/pull/9008>)

<a id='changelog-2.26.0'></a>
## \[2.26.0\] - 2025-01-27

### Added

- Setting `TMP_FILE_OR_DIR_RETENTION_DAYS`, which defines maximum retention period
  of a file or dir in temporary directory
  (<https://github.com/cvat-ai/cvat/pull/8804>)
- Cron job to remove outdated files and directories from CVAT tmp directory
  (<https://github.com/cvat-ai/cvat/pull/8804>)

- Ability to set Django's secret key using an environment variable
  (<https://github.com/cvat-ai/cvat/pull/8566>)

### Changed

- Export cache cleaning moved to a separate cron job
  (<https://github.com/cvat-ai/cvat/pull/8804>)

- Improved UX of quality management page: better table layout, file name search, ability to download table as `.csv`
  (<https://github.com/cvat-ai/cvat/pull/8865>)

- Enhanced MIL tracker. Optimized memory usage. Now it is runnable on many frames, and applicable to drawn rectangles.
  (<https://github.com/cvat-ai/cvat/pull/8942>)

- The UI only displays one version for the whole client component,
  which is now aligned with the server version
  (<https://github.com/cvat-ai/cvat/pull/8948>)

### Fixed

- Fixed webhook worker not restarting after losing Redis connection
  (<https://github.com/cvat-ai/cvat/pull/8921>)

- Fixed incorrect results being returned from lambda functions when all
  detected shapes have labels that aren't mapped
  (<https://github.com/cvat-ai/cvat/pull/8931>)

- Optimized importing from cloud storage
  (<https://github.com/cvat-ai/cvat/pull/8930>)

- A job cannot be opened if to remove an image with the latest keyframe of a track
  (<https://github.com/cvat-ai/cvat/pull/8952>)

- A track will be interpolated incorrectly if to delete an image containing the object keyframe
  (<https://github.com/cvat-ai/cvat/pull/8951>)

- Error: Cannot read properties of undefined (reading 'startPoints') when dragging an object
  (<https://github.com/cvat-ai/cvat/pull/8966>)

- Extra shortcuts enabled from brush tools on views where not necessary
  (<https://github.com/cvat-ai/cvat/pull/8971>)

- \[Helm\] Fixed Nuclio dashboard crashes when running in a cluster
  that doesn't use Docker
  (<https://github.com/cvat-ai/cvat/pull/8825>)

- \[SDK\] `cvat_sdk.auto_annotation.functions.torchvision_detection` and
  `torchvision_instance_segmentation` no longer declare meaningless "N/A" labels
  (<https://github.com/cvat-ai/cvat/pull/8997>)

### Security

- Protected tracker functions against deserializing untrusted input
  (<https://github.com/cvat-ai/cvat/security/advisories/GHSA-wq36-mxf8-hv62>)

<a id='changelog-2.25.0'></a>
## \[2.25.0\] - 2025-01-09

### Added

- \[CLI\] Added commands for working with native functions
  (<https://github.com/cvat-ai/cvat/pull/8821>)

- Ultralytics YOLO formats now support tracks
  (<https://github.com/cvat-ai/cvat/pull/8883>)

### Changed

- YOLOv8 formats renamed to Ultralytics YOLO formats
  (<https://github.com/cvat-ai/cvat/pull/8863>)

- The `match_empty_frames` quality setting is changed to `empty_is_annotated`.
  The updated option includes any empty frames in the final metrics instead of only
  matching empty frames. This makes metrics such as Precision much more representative and useful.
  (<https://github.com/cvat-ai/cvat/pull/8888>)

### Fixed

- Changing rotation after export/import in Ultralytics YOLO Oriented Boxes format
  (<https://github.com/cvat-ai/cvat/pull/8891>)

- Export to yolo formats if both Train and default dataset are present
  (<https://github.com/cvat-ai/cvat/pull/8884>)

- Issue with deleting frames
  (<https://github.com/cvat-ai/cvat/pull/8872>)

<a id='changelog-2.24.0'></a>
## \[2.24.0\] - 2024-12-20

### Added

- \[CLI\] Added new commands: `project create`, `project delete`, `project ls`
  (<https://github.com/cvat-ai/cvat/pull/8787>)

- \[SDK\] You can now use `client.projects.remove_by_ids` to remove multiple
  projects
  (<https://github.com/cvat-ai/cvat/pull/8787>)

- Support for boolean parameters in annotations actions
  (<https://github.com/cvat-ai/cvat/pull/8798>)

### Changed

- Improved uniformity of validation frames distribution in honeypot tasks and
  random honeypot rerolls
  (<https://github.com/cvat-ai/cvat/pull/8776>)

- \[CLI\] Switched to a new subcommand hierarchy; now CLI subcommands
  have the form `cvat-cli <resource> <action>`
  (<https://github.com/cvat-ai/cvat/pull/8787>)

- \[CLI\] The output of the `task create`, `task create-from-backup` and
  `project create` commands is now just the created resource ID,
  making it machine-readable
  (<https://github.com/cvat-ai/cvat/pull/8833>)

- /api/events can now be used to receive events from several sources
  (<https://github.com/cvat-ai/cvat/pull/8799>)

### Deprecated

- \[CLI\] All existing CLI commands of the form `cvat-cli <action>`
  are now deprecated. Use `cvat-cli task <action>` instead
  (<https://github.com/cvat-ai/cvat/pull/8787>)

### Removed

- Automatic calculation of quality reports in tasks
  (<https://github.com/cvat-ai/cvat/pull/8790>)

### Fixed

- Uploading a skeleton template in configurator does not work
  (<https://github.com/cvat-ai/cvat/pull/8822>)

- Installation of YOLOv7 on GPU
  (<https://github.com/cvat-ai/cvat/pull/8824>)

- \[Server API\] Significantly improved preformance of honeypot changes in tasks
  (<https://github.com/cvat-ai/cvat/pull/8789>)
- \[Server API\] `PATCH tasks/id/validation_layout` responses now include correct
  `disabled_frames` and handle simultaneous updates of
  `disabled_frames` and honeypot frames correctly
  (<https://github.com/cvat-ai/cvat/pull/8789>)

- Fixed handling of tracks keyframes from deleted frames on export
  (<https://github.com/cvat-ai/cvat/pull/8834>)

- Exporting datasets could start significantly later than expected, both for 1
  and several users in the same project/task/job (<https://github.com/cvat-ai/cvat/pull/8721>)
- Scheduled RQ jobs could not be restarted due to incorrect RQ job status
  updating and handling (<https://github.com/cvat-ai/cvat/pull/8721>)

<a id='changelog-2.23.1'></a>
## \[2.23.1\] - 2024-12-09

### Changed

- \[CLI\] Log messages are now printed on stderr rather than stdout
  (<https://github.com/cvat-ai/cvat/pull/8784>)

### Fixed

- Optimized memory consumption and reduced the number of database queries
  when importing annotations to a task with a lot of jobs and images
  (<https://github.com/cvat-ai/cvat/pull/8676>)

- Incorrect display of validation frames on the task quality management page
  (<https://github.com/cvat-ai/cvat/pull/8731>)

- Player may navigate to removed frames when playing
  (<https://github.com/cvat-ai/cvat/pull/8747>)

- User may navigate forward with a keyboard when a modal opened
  (<https://github.com/cvat-ai/cvat/pull/8748>)

- fit:canvas event is not generated if to fit it from the controls sidebar
  (<https://github.com/cvat-ai/cvat/pull/8750>)

- Color of 'Create object URL' button for a not saved on the server object
  (<https://github.com/cvat-ai/cvat/pull/8752>)

- Failed request for a chunk inside a job after it was recently modified by updating `validation_layout`
  (<https://github.com/cvat-ai/cvat/pull/8772>)

- Memory consumption during preparation of image chunks
  (<https://github.com/cvat-ai/cvat/pull/8778>)

- Possible endless lock acquisition for chunk preparation job
  (<https://github.com/cvat-ai/cvat/pull/8769>)

- Fixed issue: Cannot read properties of undefined (reading 'getUpdated')
  (<https://github.com/cvat-ai/cvat/pull/8785>)

<a id='changelog-2.23.0'></a>
## \[2.23.0\] - 2024-11-29

### Added

- Support for direct .json file import in Datumaro format
  (<https://github.com/opencv/cvat/pull/7125>)

- \[SDK, CLI\] Added a `conf_threshold` parameter to
  `cvat_sdk.auto_annotation.annotate_task`, which is passed as-is to the AA
  function object via the context. The CLI equivalent is `auto-annotate
  --conf-threshold`. This makes it easier to write and use AA functions that
  support object filtering based on confidence levels
  (<https://github.com/cvat-ai/cvat/pull/8688>)

- \[SDK\] Built-in auto-annotation functions now support object filtering by
  confidence level
  (<https://github.com/cvat-ai/cvat/pull/8688>)

- New events (create|update|delete):(membership|webhook) and (create|delete):invitation
  (<https://github.com/cvat-ai/cvat/pull/8616>)

- \[SDK\] Added new auto-annotation helpers (`mask`, `polygon`, `encode_mask`)
  to support AA functions that return masks or polygons
  (<https://github.com/cvat-ai/cvat/pull/8724>)

- \[SDK\] Added a new built-in auto-annotation function,
  `torchvision_instance_segmentation`
  (<https://github.com/cvat-ai/cvat/pull/8724>)

- \[SDK, CLI\] Added a new auto-annotation parameter, `conv_mask_to_poly`
  (`--conv-mask-to-poly` in the CLI)
  (<https://github.com/cvat-ai/cvat/pull/8724>)

- A user may undo or redo changes, made by an annotations actions using general approach (e.g. Ctrl+Z, Ctrl+Y)
  (<https://github.com/cvat-ai/cvat/pull/8727>)

- Basically, annotations actions now support any kinds of objects (shapes, tracks, tags)
  (<https://github.com/cvat-ai/cvat/pull/8727>)

- A user may run annotations actions on a certain object (added corresponding object menu item)
  (<https://github.com/cvat-ai/cvat/pull/8727>)

- A shortcut to open annotations actions modal for a currently selected object
  (<https://github.com/cvat-ai/cvat/pull/8727>)

- A default role if IAM_TYPE='LDAP' and if the user is not a member of any group in 'DJANGO_AUTH_LDAP_GROUPS' (<https://github.com/cvat-ai/cvat/pull/8708>)

- The `POST /api/lambda/requests` endpoint now has a `conv_mask_to_poly`
  parameter with the same semantics as the old `convMaskToPoly` parameter
  (<https://github.com/cvat-ai/cvat/pull/8743>)

- \[SDK\] Model instances can now be pickled
  (<https://github.com/cvat-ai/cvat/pull/8746>)

### Changed

- Chunks are now prepared in a separate worker process
  (<https://github.com/cvat-ai/cvat/pull/8618>)

- \[Helm\] Traefik sticky sessions for the backend service are disabled
  (<https://github.com/cvat-ai/cvat/pull/8659>)

- Payload for events (create|update|delete):(shapes|tags|tracks) does not include frame and attributes anymore
  (<https://github.com/cvat-ai/cvat/pull/8616>)

### Deprecated

- The `convMaskToPoly` parameter of the `POST /api/lambda/requests` endpoint
  is deprecated; use `conv_mask_to_poly` instead
  (<https://github.com/cvat-ai/cvat/pull/8743>)

### Removed

- It it no longer possible to run lambda functions on compressed images;
  original images will always be used
  (<https://github.com/cvat-ai/cvat/pull/8683>)

### Fixed

- Export without images in Datumaro format should include image info
  (<https://github.com/opencv/cvat/pull/7125>)

- Inconsistent zOrder behavior on job open
  (<https://github.com/cvat-ai/cvat/pull/8669>)

- Ground truth annotations can be shown in standard mode
  (<https://github.com/cvat-ai/cvat/pull/8675>)

- Keybinds in UI allow drawing disabled shape types
  (<https://github.com/cvat-ai/cvat/pull/8685>)

- Style issues on the Quality page when browser zoom is applied
  (<https://github.com/cvat-ai/cvat/pull/8698>)
- Flickering of masks in review mode, even when no conflicts are highlighted
  (<https://github.com/cvat-ai/cvat/pull/8698>)

- Fixed security header duplication in HTTP responses from the backend
  (<https://github.com/cvat-ai/cvat/pull/8726>)

- The error occurs when trying to copy/paste a mask on a video after opening the job
  (<https://github.com/cvat-ai/cvat/pull/8728>)

- Attributes do not get copied when copy/paste a mask
  (<https://github.com/cvat-ai/cvat/pull/8728>)

<a id='changelog-2.22.0'></a>
## \[2.22.0\] - 2024-11-11

### Added

- Feature to hide a mask during editing  (<https://github.com/cvat-ai/cvat/pull/8554>)

- A quality setting to compare point groups without using bbox
  (<https://github.com/cvat-ai/cvat/pull/8634>)

- A quality check option to consider empty frames matching
  (<https://github.com/cvat-ai/cvat/pull/8652>)

### Changed

- Reduced memory usage of the utils container
  (<https://github.com/cvat-ai/cvat/pull/8672>)

### Removed

- Removed unused business group
  (<https://github.com/cvat-ai/cvat/pull/8607>)

### Fixed

- Propagation creates copies on non-existing frames in a ground truth job
  (<https://github.com/cvat-ai/cvat/pull/8550>)

- Exporting projects with tasks containing honeypots. Honeypots are no longer exported.
  (<https://github.com/cvat-ai/cvat/pull/8597>)

- Error after creating GT job on Create job page with frame selection method `random_per_job`
  (<https://github.com/cvat-ai/cvat/pull/8623>)

- Fixed issue 'Cannot read properties of undefined (reading 'push')'
  (<https://github.com/cvat-ai/cvat/pull/8648>)

- Re-newed import/export request failed immediately if the previous failed
  (<https://github.com/cvat-ai/cvat/pull/8649>)

- Fixed automatic zooming in attribute annotation mode for masks
  (<https://github.com/cvat-ai/cvat/pull/8657>)

- Export dataset in CVAT format misses frames in tasks with non-default frame step
  (<https://github.com/cvat-ai/cvat/pull/8662>)

- Incorrect progress representation on `Requests` page
  (<https://github.com/cvat-ai/cvat/pull/8668>)

<a id='changelog-2.21.3'></a>
## \[2.21.3\] - 2024-10-31

### Changed

- CLI no longer prints the stack trace in case of HTTP errors
  (<https://github.com/cvat-ai/cvat/pull/8601>)

### Removed

- Dropped support for Python 3.8 since its EOL was on 2024-10-07
  (<https://github.com/cvat-ai/cvat/pull/8360>)

### Fixed

- Requests page crush with `Cannot read property 'target' of undefined` error
  (<https://github.com/cvat-ai/cvat/pull/8575>)

- Tags in ground truth job were displayed as `tag (GT)`
  (<https://github.com/cvat-ai/cvat/pull/8586>)

- Tags in ground truth job couldn't be deleted via `x` button
  (<https://github.com/cvat-ai/cvat/pull/8586>)

- Exception 'Canvas is busy' when change frame during drag/resize a track
  (<https://github.com/cvat-ai/cvat/pull/8598>)

- A shape gets shifted if auto save triggered during dragging
  (<https://github.com/cvat-ai/cvat/pull/8598>)

<a id='changelog-2.21.2'></a>
## \[2.21.2\] - 2024-10-24

### Added

- Access to /analytics can now be granted
  (<https://github.com/cvat-ai/cvat/pull/8509>)

### Fixed

- Expired sessions are now cleared from the database daily
  (<https://github.com/cvat-ai/cvat/pull/8552>)

- Fixed export/import errors for tracks with duplicated shapes.
  Fixed a bug which caused shape duplication on track import.
  (<https://github.com/cvat-ai/cvat/pull/8553>)

- Fix Grafana container restart policy
  (<https://github.com/cvat-ai/cvat/pull/8577>)

- Fixed some interface tooltips having 'undefined' shortcuts
  (<https://github.com/cvat-ai/cvat/pull/8578>)

- Memory consumption during preparation of image chunks
  (<https://github.com/cvat-ai/cvat/pull/8581>)

- Fixed a bug where an export RQ job being retried may break scheduling
  of new jobs
  (<https://github.com/cvat-ai/cvat/pull/8584>)

- UI now allows the user to start automatic annotation again
  if the previous request fails
  (<https://github.com/cvat-ai/cvat/pull/8587>)

<a id='changelog-2.21.1'></a>
## \[2.21.1\] - 2024-10-18

### Added

- Keyboard shortcuts for **brush**, **eraser**, **polygon** and **polygon remove** tools on masks drawing toolbox
  (<https://github.com/cvat-ai/cvat/pull/8519>)

### Fixed

- Ground truth tracks are displayed not only on GT frames in review mode
  (<https://github.com/cvat-ai/cvat/pull/8531>)

- Incorrect navigation by keyframes when annotation job ends earlier than track in a ground truth job
  (<https://github.com/cvat-ai/cvat/pull/8533>)
- Tracks from a ground truth job displayed on wrong frames in review mode when frame step is not equal to 1
  (<https://github.com/cvat-ai/cvat/pull/8533>)

- Task creation with cloud storage data and GT_POOL validation mode
  (<https://github.com/cvat-ai/cvat/pull/8539>)

- Incorrect quality reports and immediate feedback with non default start frame or frame step
  (<https://github.com/cvat-ai/cvat/pull/8551>)

- av context closing issue when using AUTO thread_type
  (<https://github.com/cvat-ai/cvat/pull/8555>)

<a id='changelog-2.21.0'></a>
## \[2.21.0\] - 2024-10-10

### Added

- New task mode: Honeypots (GT pool)
  (<https://github.com/cvat-ai/cvat/pull/8348>)
- New task creation options for quality control: Honeypots (GT pool), GT job
  (<https://github.com/cvat-ai/cvat/pull/8348>)
- New GT job frame selection method: `random_per_job`,
  which guarantees each job will have GT overlap
  (<https://github.com/cvat-ai/cvat/pull/8348>)
- \[Server API\] POST `/jobs/`: new frame selection parameters,
  which accept percentages, instead of absolute values
  (<https://github.com/cvat-ai/cvat/pull/8348>)
- \[Server API\] GET `/api/tasks/{id}/` got a new `validation_mode` field,
  reflecting the current validation configuration (immutable)
  (<https://github.com/cvat-ai/cvat/pull/8348>)
- \[Server API\] POST `/api/tasks/{id}/data` got a new `validation_params` field,
  which allows to enable `GT` and `GT_POOL` validation for a task on its creation
  (<https://github.com/cvat-ai/cvat/pull/8348>)

- Added custom certificates documentation
  (<https://github.com/cvat-ai/cvat/pull/7508>)

- Support for YOLOv8 Classification format
  (<https://github.com/cvat-ai/cvat/pull/8475>)

- \[Server API\] An option to change real frames for honeypot frames in tasks with honeypots
  (<https://github.com/cvat-ai/cvat/pull/8471>)
- \[Server API\] New endpoints for validation configuration management in tasks and jobs
  `/api/tasks/{id}/validation_layout`, `/api/jobs/{id}/validation_layout`
  (<https://github.com/cvat-ai/cvat/pull/8471>)

- \[Helm\] Readiness and liveness probes
  (<https://github.com/cvat-ai/cvat/pull/8488>)

### Changed

- \[Server API\] POST `/jobs/` `.frames` field now expects relative frame numbers
  instead of absolute (source data) ones
  (<https://github.com/cvat-ai/cvat/pull/8348>)

- \[Server API\] Now chunks in tasks can be changed.
  There are new API elements to check chunk relevancy, if they are cached:
  `/api/tasks/{id}/data/meta` got a new field `chunks_updated_date`,
  `/api/tasks/{id}/data/?type=chunk` got 2 new headers: `X-Updated-Date`, `X-Checksum`
  (<https://github.com/cvat-ai/cvat/pull/8471>)

- Made the `PATCH` endpoints for projects, tasks, jobs and memberships check
  the input more strictly
  (<https://github.com/cvat-ai/cvat/pull/8493>):

  - unknown fields are rejected;
  - updating a field now requires the same level of permissions regardless of
    whether the new value is the same as the old value.

- \[Server API\] Quality report computation is now allowed to regular users
  (<https://github.com/cvat-ai/cvat/pull/8511>)

### Fixed

- Invalid chunks for GT jobs when `?number` is used in the request and task frame step > 1
  (<https://github.com/cvat-ai/cvat/pull/8510>)
- Invalid output of frames for specific GT frame requests with `api/jobs/{id}/data/?type=frame`
  (<https://github.com/cvat-ai/cvat/pull/8510>)

<a id='changelog-2.20.0'></a>
## \[2.20.0\] - 2024-10-01

### Added

- A server setting to enable or disable storage of permanent media chunks on the server filesystem
  (<https://github.com/cvat-ai/cvat/pull/8272>)
- \[Server API\] `GET /api/jobs/{id}/data/?type=chunk&index=x` parameter combination.
  The new `index` parameter allows to retrieve job chunks using 0-based index in each job,
  instead of the `number` parameter, which used task chunk ids.
  (<https://github.com/cvat-ai/cvat/pull/8272>)

### Changed

- Job assignees will not receive frames from adjacent jobs in chunks
  (<https://github.com/cvat-ai/cvat/pull/8272>)

### Deprecated

- \[Server API\] `GET /api/jobs/{id}/data/?type=chunk&number=x` parameter combination
  (<https://github.com/cvat-ai/cvat/pull/8272>)

### Removed

- Removed the non-functional `task_subsets` parameter from the project create
  and update endpoints
  (<https://github.com/cvat-ai/cvat/pull/8492>)

### Fixed

- Various memory leaks in video reading on the server
  (<https://github.com/cvat-ai/cvat/pull/8272>)

<a id='changelog-2.19.1'></a>
## \[2.19.1\] - 2024-09-26

### Security

- Fixed a security issue that occurred in PATCH requests to projects|tasks|jobs|memberships
  (<https://github.com/cvat-ai/cvat/security/advisories/GHSA-gxhm-hg65-5gh2>)

<a id='changelog-2.19.0'></a>
## \[2.19.0\] - 2024-09-20

### Added

- Quality management tab on `quality control` allows to enabling/disabling GT frames
  (<https://github.com/cvat-ai/cvat/pull/8329>)

### Changed

- Moved quality control from `analytics` page to `quality control` page
  (<https://github.com/cvat-ai/cvat/pull/8329>)

### Removed

- Quality report no longer available in CVAT community version
  (<https://github.com/cvat-ai/cvat/pull/8329>)

### Fixed

- Fixing a problem when project export does not export skeleton tracks
  (<https://github.com/cvat-ai/cvat/pull/8423>)

### Security

- Fixed an XSS vulnerability in request-related endpoints
  (<https://github.com/cvat-ai/cvat/security/advisories/GHSA-hp6c-f34j-qjj7>)

- Fixed an XSS vulnerability in the quality report data endpoint
  (<https://github.com/cvat-ai/cvat/security/advisories/GHSA-2c85-39cc-2px9>)

<a id='changelog-2.18.0'></a>
## \[2.18.0\] - 2024-09-10

### Added

- New quality settings `Target metric`, `Target metric threshold`, `Max validations per job`
  (<https://github.com/cvat-ai/cvat/pull/8347>)

- Ability to specify location when exporting datasets and backups using SDK
  (<https://github.com/cvat-ai/cvat/pull/8255>)

- Shortcuts in user interface now may be customized depends on a user requirements
  (<https://github.com/cvat-ai/cvat/pull/8186>)

- Added analytics events for function calls
  (<https://github.com/cvat-ai/cvat/pull/8395>)

### Changed

- `Mean annotaion quality` card on quality page now displays a value depending on `Target metric` setting
  (<https://github.com/cvat-ai/cvat/pull/8347>)

- When cancelling a request, a user is no longer required to have
  permissions to perform the original action
  (<https://github.com/cvat-ai/cvat/pull/8369>)

- Lambda function endpoints now return 500 instead of 404
  if a function's metadata is invalid
  (<https://github.com/cvat-ai/cvat/pull/8406>)

- An unknown lambda function type is now treated as invalid metadata
  and the function is no longer included in the list endpoint output
  (<https://github.com/cvat-ai/cvat/pull/8406>)

### Removed

- Legacy component to setup shortcuts to switch a label
  (<https://github.com/cvat-ai/cvat/pull/8416>)

### Fixed

- An issue that occurred when exporting the same dataset or backup twice in a row using SDK
  (<https://github.com/cvat-ai/cvat/pull/8255>)
- An issue that occurred when exporting a dataset or backup using SDK
  when the default project or task location refers to cloud storage
  (<https://github.com/cvat-ai/cvat/pull/8255>)

- Export crashed on skeleton track with missing shapes
  (<https://github.com/cvat-ai/cvat/pull/8377>)

- One lambda function with invalid metadata will no longer
  break function listing
  (<https://github.com/cvat-ai/cvat/pull/8406>)

### Security

- Fixed a missing authorization vulnerability in webhook delivery endpoints
  (<https://github.com/cvat-ai/cvat/security/advisories/GHSA-p3c9-m7jr-jxxj>)

<a id='changelog-2.17.0'></a>
## \[2.17.0\] - 2024-08-27

### Added

- Added support for YOLOv8 formats
  (<https://github.com/cvat-ai/cvat/pull/8240>)

- Last assignee update date in quality reports, new options in quality settings
  (<https://github.com/cvat-ai/cvat/pull/8321>)

### Changed

- User sessions now expire after two weeks of inactivity
  (<https://github.com/cvat-ai/cvat/pull/8289>)

- A user changing their password will now invalidate all of their sessions
  except for the current one
  (<https://github.com/cvat-ai/cvat/pull/8289>)

### Deprecated

- Client events `upload:annotations`, `lock:object`, `change:attribute`, `change:label`
  (<https://github.com/cvat-ai/cvat/pull/8304>)

### Removed

- Client event `restore:job` (<https://github.com/cvat-ai/cvat/pull/8304>)

- Removed the `/auth/login-with-token` page
  (<https://github.com/cvat-ai/cvat/pull/8336>)

### Fixed

- Go back button behavior on analytics page
  (<https://github.com/cvat-ai/cvat/pull/8277>)

- Logging out of one session will no longer log the user out of all their
  other sessions
  (<https://github.com/cvat-ai/cvat/pull/8289>)

- Prevent export process from restarting when downloading a result file,
  that resulted in downloading a file with new request ID
  (<https://github.com/cvat-ai/cvat/pull/8216>)
- Race condition occurred while handling parallel export requests
  (<https://github.com/cvat-ai/cvat/pull/8216>)
- Requests filtering using format and target filters
  (<https://github.com/cvat-ai/cvat/pull/8216>)

- Sometimes it is not possible to switch workspace because active control broken after
  trying to create a tag with a shortcut
  (<https://github.com/cvat-ai/cvat/pull/8334>)

<a id='changelog-2.16.3'></a>
## \[2.16.3\] - 2024-08-13

### Added

- Labels mapper on UI now supports attributes for skeleton points
  (<https://github.com/cvat-ai/cvat/pull/8251>)

- Segment Anything now supports bounding box input
  (<https://github.com/cvat-ai/cvat/pull/8270>)

### Changed

- Player navigation not blocked anymore if a frame is being loaded from the server
  (<https://github.com/cvat-ai/cvat/pull/8284>)

- Accelerated implementation of IntelligentScissors from OpenCV
  (<https://github.com/cvat-ai/cvat/pull/8293>)

### Fixed

- Issue tool was not reset after creating new issue
  (<https://github.com/cvat-ai/cvat/pull/8236>)

- Fixed issue with slices handling in `LazyList` which caused problems with exporting masks
  in `CVAT for images 1.1` format.
  (<https://github.com/cvat-ai/cvat/pull/8299>)

<a id='changelog-2.16.2'></a>
## \[2.16.2\] - 2024-08-06

### Changed

- Following the link in notification no longer reloads the page
  (<https://github.com/cvat-ai/cvat/pull/8197>)

### Fixed

- Copy/paste annotation guide with assets did not work, showing the message
  **Asset is already related to another guide**
  (<https://github.com/cvat-ai/cvat/pull/7989>)

- Undo can't be done when a shape is rotated
  (<https://github.com/cvat-ai/cvat/pull/8129>)

- Exporting a skeleton track in a format defined for shapes raises error
  `operands could not be broadcast together with shapes (X, ) (Y, )`
  (<https://github.com/cvat-ai/cvat/pull/8179>)

- Delete label modal window does not have cancellation button
  (<https://github.com/cvat-ai/cvat/pull/8196>)

- Export and export cache clean rq job retries' hangs
  (<https://github.com/cvat-ai/cvat/pull/8198>)

- The automatic annotation process failed for tasks from cloud data
  (<https://github.com/cvat-ai/cvat/pull/8199>)

- Request card was not disabed properly after downloading
  (<https://github.com/cvat-ai/cvat/pull/8197>)

- Annotations in a ground truth jobs marked as GT annotations after modifying
  (<https://github.com/cvat-ai/cvat/pull/8206>)

- API call to run automatic annotations fails on a model with attributes
  when mapping not provided in the request
  (<https://github.com/cvat-ai/cvat/pull/8250>)

- Fixed a label collision issue where labels with similar prefixes
  and numeric suffixes could conflict, causing error on export.
  (<https://github.com/cvat-ai/cvat/pull/8262>)

<a id='changelog-2.16.1'></a>
## \[2.16.1\] - 2024-07-18

### Added

- Datumaro format now supports skeletons
  (<https://github.com/cvat-ai/cvat/pull/8165>)

### Changed

- Quality analytics page will now report job assignees from quality reports
  instead of current job assignees
  (<https://github.com/cvat-ai/cvat/pull/8123>)

- When exporting projects in COCO format, images in different subsets are now stored in different subfolders
  (<https://github.com/cvat-ai/cvat/pull/8171>)

- On task export, put images to folders depending on subset
  (<https://github.com/cvat-ai/cvat/pull/8176>)

### Fixed

- User interface crashed if there are active creating task requests on a project page
  (<https://github.com/cvat-ai/cvat/pull/8187>)

- Permission error: organization owner cannot export dataset and backup
  (<https://github.com/cvat-ai/cvat/pull/8185>)

<a id='changelog-2.16.0'></a>
## \[2.16.0\] - 2024-07-15

### Added

- Set of features to track background activities: importing/exporting datasets, annotations or backups, creating tasks.
  Now you may find these processes on Requests page, it allows a user to understand current status of these activities
  and enhances user experience, not losing progress when the browser tab is closed
  (<https://github.com/cvat-ai/cvat/pull/7537>)

- User now may update a job state from the corresponding task page
  (<https://github.com/cvat-ai/cvat/pull/8102>)

- The server will now record and report last assignee update time
  (<https://github.com/cvat-ai/cvat/pull/8119>)

### Changed

- "Finish the job" button on annotation view now only sets state to 'completed'.
  The job stage keeps unchanged
  (<https://github.com/cvat-ai/cvat/pull/8102>)

- Log files for individual backend processes are now stored in ephemeral
  storage of each backend container rather than in the `cvat_logs` volume
  (<https://github.com/cvat-ai/cvat/pull/8121>)

- Do not reset opacity level each time frame switched if there are masks on the frame
  (<https://github.com/cvat-ai/cvat/pull/8149>)

### Removed

- Renew the job button in annotation menu was removed
  (<https://github.com/cvat-ai/cvat/pull/8102>)

### Fixed

- A possible crash in quality computation for tasks with skeletons and normal labels
  (<https://github.com/cvat-ai/cvat/pull/8100>)

- Quality report button and timestamp alignments on quality page
  (<https://github.com/cvat-ai/cvat/pull/8106>)

- Fixed display of working time in Grafana management dashboard
  (<https://github.com/cvat-ai/cvat/pull/8112>)

- Fixed unexpected deletion of log files of other processes that led to OSError:
  \[Errno 116\] Stale file handle error on NFS volumes
  (<https://github.com/cvat-ai/cvat/pull/8121>)

- Attribute values with ":" may be displayed incorrectly on canvas
  (<https://github.com/cvat-ai/cvat/pull/8137>)

- Fixed broken server Docker image build
  (<https://github.com/cvat-ai/cvat/pull/8160>)

- DOMException: Failed to execute 'atob' on 'Window': The string to be decoded is not correctly encoded
  (<https://github.com/cvat-ai/cvat/pull/8166>)

<a id='changelog-2.15.0'></a>
## \[2.15.0\] - 2024-07-02

### Added

- `Propagate shapes` action to create copies of visible shapes on multiple frames forward or backward
  (<https://github.com/cvat-ai/cvat/pull/8044>)

- \[Helm\] Ability to use an external ClickHouse instance
  (<https://github.com/cvat-ai/cvat/pull/8048>)

### Changed

- Improved performance for mask import and export
  (<https://github.com/cvat-ai/cvat/pull/8049>)

### Fixed

- Failing dataset export cleanup attempts for exports before #7864
  (<https://github.com/cvat-ai/cvat/pull/8039>)

- Exception 'this.el.node.getScreenCTM() is null' occuring in Firefox when
  a user resizes window during skeleton dragging/resizing
  (<https://github.com/cvat-ai/cvat/pull/8067>)

- Exception 'Edge's nodeFrom M or nodeTo N do not to refer to any node'
  occuring when a user resizes window during skeleton dragging/resizing
  (<https://github.com/cvat-ai/cvat/pull/8067>)

- Slightly broken layout when running attributed face detection model
  (<https://github.com/cvat-ai/cvat/pull/8072>)

- Exception 'this.el.node.getScreenCTM() is null' when cancel drawing shape for any tracker
  (<https://github.com/cvat-ai/cvat/pull/8080>)

- The switcher to block an active tool on annotation header is not highligted properly
  (<https://github.com/cvat-ai/cvat/pull/8081>)

- Points shape color wasn't changed on changing label
  (<https://github.com/cvat-ai/cvat/pull/8082>)

- Incorrect counting of tracked shapes when computing analytics report
  (<https://github.com/cvat-ai/cvat/pull/8088>)

- Ordering of `frame intersection` column on task quality page
  (<https://github.com/cvat-ai/cvat/pull/8089>)

- The property "outside" not propagated correctly on skeleton elements
  (<https://github.com/cvat-ai/cvat/pull/8105>)

<a id='changelog-2.14.4'></a>
## \[2.14.4\] - 2024-06-20

### Added

- Polyline editing may be finished using corresponding shortcut
  (<https://github.com/cvat-ai/cvat/pull/7922>)

### Changed

- Single shape annotation mode allows to modify/delete objects
  (<https://github.com/cvat-ai/cvat/pull/8017>)

### Fixed

- Invalid server cache cleanup for backups and events (after #7864)
  (<https://github.com/cvat-ai/cvat/pull/8040>)

- Filters by created date, updated date do not work on different pages (e.g. list of tasks or jobs)
  (<https://github.com/cvat-ai/cvat/pull/8055>)

<a id='changelog-2.14.3'></a>
## \[2.14.3\] - 2024-06-13

### Changed

- Increased server healthcheck timeout 5 -> 15 seconds
  (<https://github.com/cvat-ai/cvat/pull/7993>)

### Fixed

- Cannot read properties of null (reading 'draw') happens when use shortcut N in a task where first label has type "tag"
  (<https://github.com/cvat-ai/cvat/pull/7997>)

- When use route `/auth/login-with-token/<token>` without `next` query parameter
  the page reloads infinitely
  (<https://github.com/cvat-ai/cvat/pull/7999>)

- Fixed kvrocks port naming for istio
  (<https://github.com/cvat-ai/cvat/pull/8010>)

- Exception: State cannot be updated during editing, need to finish current editing first
  (<https://github.com/cvat-ai/cvat/pull/8019>)

### Security

- Mitigated a CSRF vulnerability in backup and export-related endpoints
  (<https://github.com/cvat-ai/cvat/security/advisories/GHSA-jpf9-646h-4px7>)

- Fixed an SSRF vulnerability with custom cloud storage endpoints
  (<https://github.com/cvat-ai/cvat/security/advisories/GHSA-q684-4jjh-83g6>)

<a id='changelog-2.14.2'></a>
## \[2.14.2\] - 2024-06-07

### Fixed

- Queued jobs are not considered in deferring logic
  (<https://github.com/cvat-ai/cvat/pull/7907>)

- Significant memory leak related to the frames, which did not memory after become unused
  (<https://github.com/cvat-ai/cvat/pull/7995>)

<a id='changelog-2.14.1'></a>
## \[2.14.1\] - 2024-06-05

### Added

- Improved message of DatasetNotFoundError
  (<https://github.com/cvat-ai/cvat/pull/7923>)

### Changed

- Upgraded React and Antd dependencies, it leads to stylistic changes in the user interface
  (<https://github.com/cvat-ai/cvat/pull/7466>)

- CVAT now stores users' working time in events of a dedicated type
  (<https://github.com/cvat-ai/cvat/pull/7958>)

### Fixed

- The 500 / "The result file does not exist in export cache" error
  on dataset export request
  (<https://github.com/cvat-ai/cvat/pull/7864>)

- Fix missing serviceName field in kvrocks (issue #7741)
  (<https://github.com/cvat-ai/cvat/pull/7924>)

- UI crash on hovering conflict related to hidden objects
  (<https://github.com/cvat-ai/cvat/pull/7917>)

- Login when the domain of a user email contains capital symbols and a user was created after being invited to an org
  (<https://github.com/cvat-ai/cvat/pull/7906>)

- Exception **"Cannot set properties of undefined (setting 'serverID')"** occurs when attempting
  to save a job after removing the first keyframe of a track (<https://github.com/cvat-ai/cvat/pull/7949>)

- Spent working time for a user may not be counted in analytics
  (<https://github.com/cvat-ai/cvat/pull/7942>)

- A classifier model can not be used on annotation view (unknown object shape error)
  (<https://github.com/cvat-ai/cvat/pull/7839>)

- Optimized memory usage by not keeping all downloaded images/part of images in memory while creating a manifest file
  (<https://github.com/cvat-ai/cvat/pull/7969>)
- Optimized the number of requests to CS providers by downloading only images from a specified range
  (`use_cache==False`) (<https://github.com/cvat-ai/cvat/pull/7969>)
- Task creation with random sorting and cloud data
  (<https://github.com/cvat-ai/cvat/pull/7969>)

<a id='changelog-2.14.0'></a>
## \[2.14.0\] - 2024-05-21

### Added

- Added security headers enforcing strict `Referrer-Policy` for cross origins and disabling MIME type sniffing via `X-Content-Type-Options`.
  (<https://github.com/opencv/cvat/pull/7752>)

- \[Helm\] Ability to specify ServiceAccount for backend pods
  (<https://github.com/cvat-ai/cvat/pull/7894>)

### Changed

- Working time rounding to a minimal value of 1 hour is not applied to the annotation speed metric any more
  (<https://github.com/cvat-ai/cvat/pull/7898>)

- Total annotation speed metric renamed to Average annotation speed
  (<https://github.com/cvat-ai/cvat/pull/7898>)

- Ground truth jobs are not considered when computing analytics report for a task/project
  (<https://github.com/cvat-ai/cvat/pull/7919>)

### Fixed

- Fixed calculation of annotation speed metrics for analytics reports
  (<https://github.com/opencv/cvat/pull/7144>)

- \[Helm\] Prevented spurious 200 OK responses from API endpoints
  before the backend is ready
  (<https://github.com/cvat-ai/cvat/pull/7859>)

- Analytic reports incorrect count of objects for a skeleton track/shape
  (<https://github.com/cvat-ai/cvat/pull/7883>)

- Analytic reports incorrect number of objects for a track (always less by 1)
  (<https://github.com/cvat-ai/cvat/pull/7883>)

- REST API allowed to create several attributes with the same name within one label
  (<https://github.com/cvat-ai/cvat/pull/7890>)

- Job's/task's status are not updated when job's state updated to completed and stage is already acceptance
  (<https://github.com/cvat-ai/cvat/pull/7901>)

- Exception: Cannot read properties of undefined (reading 'onBlockUpdated')
  (<https://github.com/cvat-ai/cvat/pull/7913>)

- One more found way to create an empty mask
  (<https://github.com/cvat-ai/cvat/pull/7915>)

- Slice function may not work in Google Chrome < 110
  (<https://github.com/cvat-ai/cvat/pull/7916>)

- Selecting a skeleton by cursor does not work correctly when there are some hidden points
  (<https://github.com/cvat-ai/cvat/pull/7921>)

<a id='changelog-2.13.0'></a>
## \[2.13.0\] - 2024-05-09

### Added

- Quality Report calculation will now also include annotation of type Tag.
  (<https://github.com/opencv/cvat/pull/7582>)

- Added feature to show tags of GT and manual job in separate row. Tags of GT job have '(GT)' in their name.
  (<https://github.com/cvat-ai/cvat/pull/7774>)

### Changed

- Analytics reports calculation may be initiated manually instead of automatic scheduling
  (<https://github.com/cvat-ai/cvat/pull/7805>)

- Update the Nuclio version and related packages/libraries
  (<https://github.com/cvat-ai/cvat/pull/7787>)

- Remove keyframe button is disabled when there is only one keyframe element
  (<https://github.com/cvat-ai/cvat/pull/7844>)

### Removed

- The `mask_rcnn` function has been removed because it was using python3.6.
  In new version of Nuclio python3.6 is no longer supported. Nuclio officially recommends using python3.9.
  Running `mask_rcnn` on python3.9 causes errors within the function and package conflicts. (<https://github.com/cvat-ai/cvat/pull/7787>)

### Fixed

- Analytics report calculation fails with timeout because of redundant number of requests to ClickHouse
  (<https://github.com/cvat-ai/cvat/pull/7804>)

- Incorrect duration of `change:frame` event
  (<https://github.com/cvat-ai/cvat/pull/7817>)

- Infinite loading cloud storage update page when a lot of cloud storages are available for a user
  (<https://github.com/cvat-ai/cvat/pull/7823>)

- Opening update CS page sends infinite requests when CS id does not exist
  (<https://github.com/cvat-ai/cvat/pull/7828>)

- Uploading files with TUS immediately failed when one of the requests failed
  (<https://github.com/cvat-ai/cvat/pull/7830>)

- Longer analytics report calculation because of inefficient requests to analytics db
  (<https://github.com/cvat-ai/cvat/pull/7833>)

- Cannot read properties of undefined (reading 'addClass')
  (<https://github.com/cvat-ai/cvat/pull/7834>)

- Fixed exception 'Could not read property length of undefined' when copy/paste a skeleton point
  (<https://github.com/cvat-ai/cvat/pull/7843>)

- Task creation from a video file without keyframes allowing for random iteration
  (<https://github.com/cvat-ai/cvat/pull/7838>)

- Cannot read property 'annotations' of null when uploading annotations into a job
  (<https://github.com/cvat-ai/cvat/pull/7857>)

- Vertical polyline of two points is difficult to select
  (<https://github.com/cvat-ai/cvat/pull/7860>)

- Tracked attribute values are lost when moving a task to a project
  (<https://github.com/cvat-ai/cvat/pull/7863>)

### Security

- Disable the nginx server signature by default to make it slightly harder for attackers to find known vulnerabilities.
  (<https://github.com/cvat-ai/cvat/pull/7814>)

<a id='changelog-2.12.1'></a>
## \[2.12.1\] - 2024-04-26

### Fixed

- Formats with the custom `track_id` attribute should import `outside` track shapes properly (e.g. `COCO`, `COCO Keypoints`, `Datumaro`, `PASCAL VOC`)
  (<https://github.com/opencv/cvat/pull/7669>)

- Inefficient resources fetching in admin panel leading to 504 Gateway Timeout
  (<https://github.com/cvat-ai/cvat/pull/7767>)

- Optimized memory usage when retrieving annotations by disabling internal Django QuerySet caching
  (<https://github.com/cvat-ai/cvat/pull/7748>)

- Annotations are not shown on the `0` frame sometimes
  (<https://github.com/cvat-ai/cvat/pull/7796>)

- Extra requests in PolicyEnforcer when at least one policy is rejected, others are not checked
  (<https://github.com/cvat-ai/cvat/pull/7803>)

- Project's `updated_date` was not updated after changing annotations in jobs
  (<https://github.com/cvat-ai/cvat/pull/7808>)

<a id='changelog-2.12.0'></a>
## \[2.12.0\] - 2024-04-15

### Added

- Number of objects on the frame is shown on the right sidebar
  (<https://github.com/opencv/cvat/pull/7654>)

- Shortcut to switch "pinned" property (P)
  (<https://github.com/opencv/cvat/pull/7709>)

- Support for `.rar`, `.tar`, `.gz`, `.bz2`, `.cpio`, `.7z` archives
  (<https://github.com/opencv/cvat/pull/7729>)

### Changed

- Updated links to the documentation website to point to the new domain,
  `docs.cvat.ai`
  (<https://github.com/cvat-ai/cvat/pull/7722>)

- Job and task `download_frames` now accepts custom extension for images
  (<https://github.com/cvat-ai/cvat/pull/7697>)

### Fixed

- Creating tasks with special characters in uploaded filename
  (<https://github.com/opencv/cvat/pull/7646>)

- `Find next frame with issues` ignored `hide resolved issues` setting
  (<https://github.com/opencv/cvat/pull/7653>)

- Objects menu is invisible for GT objects in GT job
  (<https://github.com/opencv/cvat/pull/7714>)

- Missing RegisterSerializerEx `email_verification_required` and `key` parameters now are included in the server schema
  (<https://github.com/cvat-ai/cvat/pull/7635>)

- Standardize the alignment of empty-list components
  (<https://github.com/opencv/cvat/pull/7659>)

- Labels in WiderFace dataset example
  (<https://github.com/opencv/cvat/pull/7716>)
- Export without images in Datumaro format -
  no empty "media" and "point_cloud" fields should be present
  (<https://github.com/opencv/cvat/pull/7716>)

- Fixed the inability to rename label attributes after creating them.
  (<https://github.com/cvat-ai/cvat/pull/7670>)

- When user starts editing a mask, it becomes smoother (not pixelated)
  (<https://github.com/cvat-ai/cvat/pull/7747>)

<a id='changelog-2.11.3'></a>
## \[2.11.3\] - 2024-04-02

### Added

- Tooltips for long names on cards (projects, tasks, cloud storages, and models)
  (<https://github.com/opencv/cvat/pull/7550>)

### Removed

- The `POST /api/tasks/{id}/data` endpoint no longer accepts several
  parameters that didn't have any useful function: `size`,
  `compressed_chunk_type`, `original_chunk_type`
  (<https://github.com/opencv/cvat/pull/7663>)

### Fixed

- Duplicated notifications for automatic annotation
  (<https://github.com/opencv/cvat/pull/7595>)

- Made quality report update job scheduling more efficient
  (<https://github.com/opencv/cvat/pull/7596>)

- Incorrect file name usage when importing annotations from a cloud storage
  (<https://github.com/opencv/cvat/pull/7599>)

- Using single shape annotation mode with multiple labels
  (<https://github.com/opencv/cvat/pull/7606>)

- Part of sidebar not visible in attribute annotation mode when there are a lot of attribute values
  (<https://github.com/opencv/cvat/pull/7610>)

- Changed interpolation behavior in `annotation.py`, now correctly keep the last frame
- Insert last frame if it is key to the track, fixes data corruption when tracks crossing more than 1 jobs
  (<https://github.com/opencv/cvat/pull/7615>)

- Label constructor validation of empty label names
  (<https://github.com/opencv/cvat/pull/7627>)

- Incorrect alignment of empty job list component
  (<https://github.com/opencv/cvat/pull/7621>)

- Remove underlying pixels feature is not applied immediately
  (<https://github.com/opencv/cvat/pull/7637>)

- Corrected the formula for per-class accuracy in quality reports;
  the old formula is now exposed as the `jaccard_index` key
  (<https://github.com/opencv/cvat/pull/7640>)

- Sending `/events` request from logged-out user  (<https://github.com/opencv/cvat/pull/7608>)

- Fixed accuracy being displayed incorrectly on the task analytics page
  (<https://github.com/opencv/cvat/pull/7652>)

- Fixed an invalid default overlap size being selected for video tasks
  with small segments
  (<https://github.com/opencv/cvat/pull/7681>)

- Fixed redundant jobs being created for tasks with non-zero overlap
  in certain cases
  (<https://github.com/opencv/cvat/pull/7681>)

- Accumulation of confusion matrix across all jobs in a task when creating a quality report
  (<https://github.com/opencv/cvat/pull/7604>)

- 90 deg-rotated video was added with "Prefer Zip Chunks" disabled
  was warped, fixed using the static cropImage function.
  (<https://github.com/opencv/cvat/pull/7583>)

<a id='changelog-2.11.2'></a>
## \[2.11.2\] - 2024-03-11

### Changed

- Sped up resource updates when there are no matching webhooks
  (<https://github.com/opencv/cvat/pull/7553>)

### Fixed

- Job and task `updated_date` are no longer bumped twice when updating
  annotations
  (<https://github.com/opencv/cvat/pull/7556>)

- Sending `PATCH /jobs/{id}/data/meta` on each job save even if nothing changed in meta data
  (<https://github.com/opencv/cvat/pull/7560>)
- Sending `GET /jobs/{id}/data/meta` twice on each job load
  (<https://github.com/opencv/cvat/pull/7560>)

- Made analytics report update job scheduling more efficient
  (<https://github.com/opencv/cvat/pull/7576>)

- Fixed being unable to connect to in-mem Redis
  when the password includes URL-unsafe characters
  (<https://github.com/opencv/cvat/pull/7577>)

- Segment anything decoder is loaded anytime when CVAT is opened, but might be not required
  (<https://github.com/opencv/cvat/pull/7564>)

<a id='changelog-2.11.1'></a>
## \[2.11.1\] - 2024-03-05

### Added

- Single shape annotation mode allowing to easily annotate scenarious where a user
  only needs to draw one object on one image (<https://github.com/opencv/cvat/pull/7486>)

### Fixed

- Fixed a problem with Korean/Chinese characters in attribute annotation mode
  (<https://github.com/opencv/cvat/pull/7380>)

- Fixed incorrect working time calculation in the case where an event
  occurred during another event
  (<https://github.com/opencv/cvat/pull/7511>)

- Fixed working time not being calculated for the first event in each batch
  sent from the UI
  (<https://github.com/opencv/cvat/pull/7511>)

- Submit button is enabled while creating a ground truth job
  (<https://github.com/opencv/cvat/pull/7540>)

<a id='changelog-2.11.0'></a>
## \[2.11.0\] - 2024-02-23

### Added

- Added `dataset:export` and `dataset:import` events that are logged when
  the user initiates an export or import of a project, task or job
  (<https://github.com/opencv/cvat/pull/7476>)

### Changed

- Now menus in the web interface are triggered by click, not by hover as before
  (<https://github.com/opencv/cvat/pull/7431>)

### Removed

- Removed support for the TFRecord dataset format
  (<https://github.com/opencv/cvat/pull/7416>)

### Fixed

- On quality page for a task, only the first page with jobs has quality report metrics
  (<https://github.com/opencv/cvat/pull/7441>)

- Side effects of data changes, such as the sending of webhooks,
  are no longer triggered until after the changes have been committed
  to the database
  (<https://github.com/opencv/cvat/pull/7460>,
  <https://github.com/opencv/cvat/pull/7477>)

<a id='changelog-2.10.3'></a>
## \[2.10.3\] - 2024-02-09

### Changed

- The "message" field of the payload of send:exception events
  no longer includes a trailing linebreak
  (<https://github.com/opencv/cvat/pull/7407>)

- Annotation guide is opened automatically if not seen yet when the job is "new annotation"
  (<https://github.com/opencv/cvat/pull/7410>)
- Annotation guide will be opened automatically if this is specified in a link `/tasks/<id>/jobs/<id>?openGuide`
  (<https://github.com/opencv/cvat/pull/7410>)

- Reduced number of server requests, made by clients
  (<https://github.com/opencv/cvat/pull/7446>)

- Server exception rest_framework.exceptions.NotAuthenticated is not logged by analytics anymore
  (<https://github.com/opencv/cvat/pull/7457>)

### Fixed

- Prevented zombie processes from accumulating in the Kvrocks container
  (<https://github.com/opencv/cvat/pull/7412>)

- Fix Redis exceptions crashing the `/api/server/health/` endpoint
  (<https://github.com/opencv/cvat/pull/7417>)

- Unhandled exception "Cannot read properties of null (reading 'plot')"
  (<https://github.com/opencv/cvat/pull/7422>)

- Unhandled exception "Cannot read properties of undefined (reading 'toLowerCase')"
  (<https://github.com/opencv/cvat/pull/7421>)

<a id='changelog-2.10.2'></a>
## \[2.10.2\] - 2024-01-26

### Changed

- Enhanced errors messaging for better perception by users
  (<https://github.com/opencv/cvat/pull/7331>)

### Fixed

- Empty masks might be created with `polygon-minus` tool (<https://github.com/opencv/cvat/pull/7295>)
- Empty masks might be created as a result of removing underlying pixels (<https://github.com/opencv/cvat/pull/7295>)

- Fixed excessive memory usage
  when exporting a project with multiple video tasks
  (<https://github.com/opencv/cvat/pull/7374>)

- OpenCV tracker MIL works one frame behind
  (<https://github.com/opencv/cvat/pull/7399>)

<a id='changelog-2.10.1'></a>
## \[2.10.1\] - 2024-01-18

### Changed

- KeyDB used as data cache replaced by Kvrocks
  (<https://github.com/opencv/cvat/pull/7339>)

### Fixed

- 504 Timeout error when exporting resources to cloud storage
  (<https://github.com/opencv/cvat/pull/7317>)
- Enqueuing deferred jobs when their dependencies have been started -> cancelled -> restarted -> finished
  (<https://github.com/opencv/cvat/pull/7317>)

- UI failed when open context menu for a skeleton element on a frame with a conflict
  (<https://github.com/opencv/cvat/pull/7362>)
- Issue can not be created for a skeleton element in review mode
  (<https://github.com/opencv/cvat/pull/7362>)

<a id='changelog-2.10.0'></a>
## \[2.10.0\] - 2024-01-10

### Changed

- When the `ORG_INVITATION_CONFIRM` setting is enabled, organization invitations for existing users are no
  longer accepted automatically. Instead, the invitee can now review the invitation and choose to accept or decline it.
  (<https://github.com/opencv/cvat/pull/7138>)

- \[Compose, Helm\] Updated Clickhouse to version 23.11.*
  (<https://github.com/opencv/cvat/pull/7268>)

- Job queues are now stored in a dedicated Redis instance
  (<https://github.com/opencv/cvat/pull/7245>)

### Removed

- PermissionDenied error thrown before OPA call in case if user is not a member of organization
  (<https://github.com/opencv/cvat/pull/7259>)

### Fixed

- Can not input Chinese correctly in text attributes on objects sidebar
  (<https://github.com/opencv/cvat/pull/6916>)

- Restored Compose file compatibility with Docker Compose 2.17.0 and earlier
  (<https://github.com/opencv/cvat/pull/7170>)

- Attaching GCS and AWS S3 buckets with dots in name
  (<https://github.com/opencv/cvat/pull/7227>)

- Annotation actions are applied to the objects from a ground truth job
  (<https://github.com/opencv/cvat/pull/7281>)
- Ground truth objects removed together with annotation objects when press "Remove annotations" in menu
  (<https://github.com/opencv/cvat/pull/7281>)
- Frame search by a filter is affected by ground truth annotations
  (<https://github.com/opencv/cvat/pull/7281>)

- Creating duplicating annotations when nginx throws 504 timeout status (workaround)
  (<https://github.com/opencv/cvat/pull/7286>)

- `TIFF` images are saved as `JPEG` images with `.tif` extension in original chunks
  (<https://github.com/opencv/cvat/pull/7100>)
- EXIF rotated TIFF images are handled incorrectly
  (<https://github.com/opencv/cvat/pull/7100>)

- RQ Scheduler launch, broken in PR 7245
  (<https://github.com/opencv/cvat/pull/7293>)

- UI crashes if user highligts conflict related to annotations hidden by a filter
  (<https://github.com/opencv/cvat/pull/7299>)
- Annotations conflicts are not highligted properly on the first frame of a job
  (<https://github.com/opencv/cvat/pull/7299>)

- Error message `Edge's nodeFrom ${dataNodeFrom} or nodeTo ${dataNodeTo} do not to refer to any node`
  when upload a file with some abscent skeleton nodes (<https://github.com/opencv/cvat/pull/7302>)
- Wrong context menu position in skeleton configurator (Firefox only)
  (<https://github.com/opencv/cvat/pull/7302>)
- Fixed console error `(Error: <rect> attribute width: A negative value is not valid`
  appearing when skeleton with all outside elements is created (<https://github.com/opencv/cvat/pull/7302>)

- Updating cloud storage attached to CVAT using Azure connection string
  (<https://github.com/opencv/cvat/pull/7336>)

<a id='changelog-2.9.2'></a>
## \[2.9.2\] - 2023-12-11

### Added

- Introduced CVAT actions. Actions allow performing different
  predefined scenarios on annotations automatically (e.g. shape converters)
  (<https://github.com/opencv/cvat/pull/7172>)

- The UI will now retry requests that were rejected due to rate limiting
  (<https://github.com/opencv/cvat/pull/7216>)

### Changed

- Update nvidia/cuda image version from 11.7.0 to 11.7.1 in transt serverless function.
  (<https://github.com/opencv/cvat/pull/7124>)

- \[Helm\] Allow pre-release versions in kubernetes requirement to include AWS EKS versions (<https://github.com/opencv/cvat/pull/7183>)

- GPU versions of serverless functions now use the `latest-gpu` Docker tag
  rather than `latest`
  (<https://github.com/opencv/cvat/pull/7215>)

- \[Compose, Helm\] Downgraded KeyDB to 6.3.2
  (<https://github.com/opencv/cvat/pull/7236>)

### Fixed

- The GPU version of the YOLOv7 serverless function not actually using the GPU
  (<https://github.com/opencv/cvat/pull/6940>)

- It is now possible to create Ground Truth jobs containing all frames in the task
  (<https://github.com/opencv/cvat/pull/7126>)
- Incorrect Ground Truth chunks saving
  (<https://github.com/opencv/cvat/pull/7126>)

- Reset source/target storage if related cloud storage has been deleted
  (<https://github.com/opencv/cvat/pull/6801>)

- Prevent possible cyclic dependencies when enqueuing a rq job when ONE_RUNNING_JOB_IN_QUEUE_PER_USER is used
  (<https://github.com/opencv/cvat/pull/7139>)
- Enqueue deferred jobs when their dependencies are moved to the failed job registry due to AbandonedJobError
  (<https://github.com/opencv/cvat/pull/7139>)

- Reduce the number of requests to the server for task details
  (<https://github.com/opencv/cvat/pull/7167>)

- Shape settings **opacity** and **selected opacity** reset on each frame change
  (<https://github.com/opencv/cvat/pull/7186>)

- Server error in list quality settings API, when called in an org
  (<https://github.com/opencv/cvat/pull/7190>)

- Incorrect handling of the hidden points in skeletons in quality comparisons
  (<https://github.com/opencv/cvat/pull/7191>)

- \[Helm\] Fixed installing Traefik Middleware even if Traefik is disabled in the values (<https://github.com/opencv/cvat/pull/7184>)

- Error code 500 when send `change:frame` event without `duration`.
  (<https://github.com/opencv/cvat/pull/7211>)

- Added workaround for corrupted cached chunks
  (<https://github.com/opencv/cvat/pull/7243>, <https://github.com/opencv/cvat/pull/7251>)

<a id='changelog-2.9.1'></a>
## \[2.9.1\] - 2023-11-23

This release has changes only in the Enterprise version.

<a id='changelog-2.9.0'></a>
## \[2.9.0\] - 2023-11-23

### Added

- CVAT now supports serverless Nuclio functions that return skeleton annotations.
  We've added a keypoint detector that supports skeletons for the following classes:
  body, head, foot, and hands. Deployment command: `./deploy_cpu.sh pytorch/mmpose/hrnet32/nuclio/`
  (<https://github.com/opencv/cvat/pull/7033>)

- Implemented a feature that allows slicing one polygon/mask shape into two parts
  (<https://github.com/opencv/cvat/pull/7084>)

- Implemented a feature that allows joining several masks into a single one
  (<https://github.com/opencv/cvat/pull/7084>)

- \[Helm\] Introduced values that apply to all backend deployments/jobs
  (<https://github.com/opencv/cvat/pull/7148>)

### Changed

- The "use cache" option on the server is now ignored when creating a
  task with cloud storage data (<https://github.com/opencv/cvat/pull/7087>)

- The Docker Compose file and Helm chart have been updated to enable Traefik
  access logs by default and change the log format to JSON
  (<https://github.com/opencv/cvat/pull/7109>)

- \[Helm\] The PersistentVolumeClaim for the volume used to hold application
  data is now retained after uninstall
  (<https://github.com/opencv/cvat/pull/7123>)

- \[Helm\] All backend-related deployments now
  use `cvat-app` as the value for the `app` label
  (<https://github.com/opencv/cvat/pull/7127>)

- \[Helm\] The minimum compatible Kubernetes version
  is now 1.19.0 (<https://github.com/opencv/cvat/pull/7132>)

- \[Helm\] The CVAT hostname can now be configured with `ingress.hostname` option
  (<https://github.com/opencv/cvat/pull/7132>)

- \[Helm\] The `ingress.tls` configuration has been reworked.
  (<https://github.com/opencv/cvat/pull/7132>)

- \[Helm\] The Traefik subchart updated to 25.0.0 (appVersion v2.10.5)
  (<https://github.com/opencv/cvat/pull/7132>)

- \[Docker Compose\] Traefik updated to v2.10.\*
  (<https://github.com/opencv/cvat/pull/7150>)

### Removed

- Support for V1 cloudstorages/id/content endpoint
  (<https://github.com/opencv/cvat/pull/6946>)

- \[Helm\] `ingress.hosts` has been removed, use `ingress.hostname` instead.
  (<https://github.com/opencv/cvat/pull/7132>)

### Fixed

- Fixed a data race condition during GT job creation
  (<https://github.com/opencv/cvat/pull/7096>)

- Resolved an issue where the job state could not be changed
  multiple times without reloading the annotation view
  (<https://github.com/opencv/cvat/pull/7158>)

- Corrected an issue where compressed chunks did not
  utilize the Exif rotation tag
  (<https://github.com/opencv/cvat/pull/7162>)

- Minor styling issues on empty models page
  (<https://github.com/opencv/cvat/pull/7164>)

- Fixed minor issue when brush marker is appended to a final mask
  (<https://github.com/opencv/cvat/pull/7168>)

<a id='changelog-2.8.2'></a>
## \[2.8.2\] - 2023-11-06

### Fixed

- OpenCV runtime initialization
  (<https://github.com/opencv/cvat/pull/7101>)

<a id='changelog-2.8.1'></a>
## \[2.8.1\] - 2023-11-03

### Added

- Support for default bucket prefix
  (<https://github.com/opencv/cvat/pull/6943>)
- Search for cloud storage and share files
  (<https://github.com/opencv/cvat/pull/6943>)

- Ability to limit one user to one task at a time
  (<https://github.com/opencv/cvat/pull/6975>)

- Support for using an external database in a Docker Compose-based deployment
  (<https://github.com/opencv/cvat/pull/7055>)

### Changed

- Migrated to rq 1.15.1
  (<https://github.com/opencv/cvat/pull/6975>)

- Compressed sequental `change:frame` events into one
  (<https://github.com/opencv/cvat/pull/7048>)

- Create a local session for AWS S3 client instead of using the default global one
  (<https://github.com/opencv/cvat/pull/7067>)

- Improved performance of chunk preparation when creating tasks
  (<https://github.com/opencv/cvat/pull/7081>)

### Fixed

- Race condition in a task data upload request, which may lead to problems with task creation in some specific cases,
  such as multiple identical data requests at the same time
  (<https://github.com/opencv/cvat/pull/7025>)

- Bug with viewing dependent RQ jobs for downloading resources from
  cloud storage when file path contains sub-directories.
  This is relevant for admins that can view detailed information about RQ queues.
  (<https://github.com/opencv/cvat/pull/6975>)

- OpenCV.js memory leak with TrackerMIL
  (<https://github.com/opencv/cvat/pull/7032>)

- Can't deploy detectron serverless function
  (<https://github.com/opencv/cvat/pull/7047>)

- A mask becomes visible even if hidden after changing opacity level
  (<https://github.com/opencv/cvat/pull/7060>)

- There is no switcher to personal workspace if an organization request failed
  (<https://github.com/opencv/cvat/pull/7063>)

<a id='changelog-2.8.0'></a>

## \[2.8.0\] - 2023-10-23

### Added

- A new feature allowing users to invite others to the organization via email.
  (<https://github.com/opencv/cvat/pull/6901>)

- \[SDK\] In the SDK, a parameter has been introduced to `TaskDataset`
  which enables the option to disable annotation loading
  (<https://github.com/opencv/cvat/pull/7019>)

- A test has been incorporated for retrieving bucket content in
  cases where the bucket includes manually created directories.
  (<https://github.com/opencv/cvat/pull/7018>)

### Changed

- The maximum length of the secret access key has been
  increased to 64 characters.
  (<https://github.com/opencv/cvat/pull/6701>)

- The client will no longer load all organizations upon start
  (<https://github.com/opencv/cvat/pull/7004>)

- The default value for Zookeeper from the
  Clickhouse subchart has been set to disabled.
  (<https://github.com/opencv/cvat/pull/7003>)

### Removed

- The endpoints `/api/projects`, `/api/tasks`, and `/api/jobs`
  will no longer return information regarding the count of labels.
  This information was complicating SQL queries,
  making them hard to optimize.
  Instead, use `/api/labels?task_id=tid` or `/api/labels?project_id=pid`.
  (<https://github.com/opencv/cvat/pull/6918>)

### Fixed

- Issues causing potential double-sized file writes during task
  data uploading have been addressed.
  (<https://github.com/opencv/cvat/pull/6952>)

- Issues encountered when retrieving CS content from GCS
  buckets containing manually created directories have been resolved.
  (<https://github.com/opencv/cvat/pull/7006>)

- \[SDK\] In the SDK, `cvat_sdk.auto_annotation.annotate_task`
  has been optimized to avoid unnecessary fetching of
  existing annotations.
  (<https://github.com/opencv/cvat/pull/7019>)

- The project/task/job update time is now correctly
  modified upon label updates.
  (<https://github.com/opencv/cvat/pull/6958>)

<a id='changelog-2.7.6'></a>

## \[2.7.6\] - 2023-10-13

### Changed

- Enabled nginx proxy buffering
  (<https://github.com/opencv/cvat/pull/6991>)

- Helm: set memory request for keydb
  (<https://github.com/opencv/cvat/pull/6945>)

- Supervisord (<https://github.com/opencv/cvat/pull/6945>):
  - added `autorestart=true` option for all workers
  - unified program names to use dashes as delimiter instead of mixed '\_' and '-'
  - minor improvements to supervisor configurations

### Removed

- Removed gitter link from about modal
  (<https://github.com/opencv/cvat/pull/7002>)

### Fixed

- Persist image filters across jobs
  (<https://github.com/opencv/cvat/pull/6953>)

- Splitting skeleton tracks on jobs
  (<https://github.com/opencv/cvat/pull/6968>)

- Uploading skeleton tracks in COCO Keypoints format
  (<https://github.com/opencv/cvat/pull/6969>)

- Fixed Siammask tracker error on grayscale images
  (<https://github.com/opencv/cvat/pull/6982>)

- Fixed memory leak on client side when event listener was not removed together with its context
  (<https://github.com/opencv/cvat/pull/6984>)

- Fixed crash related to issue tries to mount to not existing parent
  (<https://github.com/opencv/cvat/pull/6977>)

- Added 'notranslate' markers to avoid issues caused by extension translators
  (<https://github.com/opencv/cvat/pull/6993>)

- Getting CS content when S3 bucket contains manually created directories
  (<https://github.com/opencv/cvat/pull/6997>)

- Optimized huge memory consumption when working with masks in the interface
  (<https://github.com/opencv/cvat/pull/6996>)

### Security

- Security upgrade opencv-python-headless from 4.5.5.62 to 4.8.1.78
  (<https://github.com/opencv/cvat/pull/6931>)

- Added X-Frame-Options: deny
  (<https://github.com/opencv/cvat/pull/6992>)

<a id='changelog-2.7.5'></a>

## \[2.7.5\] - 2023-10-09

### Added

- Temporary workaround to fix corrupted zip file
  (<https://github.com/opencv/cvat/pull/6965>)

<a id='changelog-2.7.4'></a>

## \[2.7.4\] - 2023-10-06

### Added

- The latest comment displayed in issues sidebar (<https://github.com/opencv/cvat/pull/6937>)

### Fixed

- It was not possible to copy issue comment from issue dialog (<https://github.com/opencv/cvat/pull/6937>)

### Security

- Update Grafana from 9.3.6 to 10.1.2

## \[2.7.3\] - 2023-10-02

### Added

- New , form-based Issue templates for Github repository

### Removed

- Functionality for synchronizing a task with a Git repository
  (<https://github.com/opencv/cvat/pull/6904>)

### Fixed

- PCD files with nan values could not be opened on 3D workspace
  (<https://github.com/opencv/cvat/pull/6862>)
- Fixed direct navigation to neightbour chunk on 3D workspace
  (<https://github.com/opencv/cvat/pull/6862>)
- Intencity level from .bin lidar data ignored when converting .bin -> .pcd
  (<https://github.com/opencv/cvat/pull/6862>)
- Incorrectly determined video frame count when the video contains an MP4 edit list
  (<https://github.com/opencv/cvat/pull/6929>)
- Internal server error when retrieving data from CS and cache=True
  (<https://github.com/opencv/cvat/pull/6932>)

### Security

- Security upgrade Pillow from 9.3.0 to 10.0.1
  (<https://github.com/opencv/cvat/pull/6907>)
- Security update cryptography from 41.0.3 to 41.0.4
  (<https://github.com/opencv/cvat/pull/6914>)

## \[2.7.2\] - 2023-09-25

### Changed

- Do not reload annotation view when renew the job or update job state (<https://github.com/opencv/cvat/pull/6851>)
- Now images from cloud buckets are loaded in parallel when preparing a chunk (<https://github.com/opencv/cvat/pull/6881>)

### Fixed

- Downloading additional data from cloud storage if use_cache=true and job_file_mapping are specified
  (<https://github.com/opencv/cvat/pull/6879>)
- Leaving an organization (<https://github.com/opencv/cvat/pull/6422>)
- Order of images in annotation file when dumping project in CVAT format (<https://github.com/opencv/cvat/pull/6927>)
- Validation on Cloud Storage form / error message on create task form (<https://github.com/opencv/cvat/pull/6890>)

## \[2.7.1\] - 2023-09-15

### Fixed

- Include cloud storage manifest file to selected files if manifest was used as data source (<https://github.com/opencv/cvat/pull/6850>)
- Keep sequence of files when directories were specified in server_files (<https://github.com/opencv/cvat/pull/6850>)

## \[2.7.0\] - 2023-09-10

### Added

- Admin actions for easy activation/deactivation of users (<https://github.com/opencv/cvat/pull/6314>)

### Fixed

- Invalid input validation in for `cloud_storage_id` (<https://github.com/opencv/cvat/pull/6825>)
- Incorrect task progress report for 3rdparty users (<https://github.com/opencv/cvat/pull/6834>)

### Security

- Security upgrade gitpython from 3.1.33 to 3.1.35 (<https://github.com/opencv/cvat/pull/6843>)
- Security upgrade numpy from 1.22.0 to 1.22.4 (<https://github.com/opencv/cvat/pull/6843>)

## \[2.6.2\] - 2023-09-06

### Added

- Gamma correcton filter (<https://github.com/opencv/cvat/pull/6771>)
- Introduced the feature to hide or show objects in review mode (<https://github.com/opencv/cvat/pull/6808>)

### Changed

- \[Helm\] Database migrations are now executed as a separate job,
  rather than in the server pod, to mitigate the risk of data
  corruption when using multiple server replicas
  (<https://github.com/opencv/cvat/pull/6780>)
- Clicking multiple times on icons in the left
  sidebar now toggles the corresponding popovers open and closed
  (<https://github.com/opencv/cvat/pull/6817>)
- Transitioned to using KeyDB with FLASH for data
  chunk caching, replacing diskcache (<https://github.com/opencv/cvat/pull/6773>)

### Removed

- Removed outdated use of hostnames when accessing Git, OpenCV, or analytics via the UI (<https://github.com/opencv/cvat/pull/6799>)
- Removed the Feedback/Share component (<https://github.com/opencv/cvat/pull/6805>)

### Fixed

- Resolved the issue of the canvas zooming while scrolling
  through the comments list in an issue (<https://github.com/opencv/cvat/pull/6758>)
- Addressed the bug that allowed for multiple issue
  creations upon initial submission (<https://github.com/opencv/cvat/pull/6758>)
- Fixed the issue of running deep learning models on
  non-JPEG compressed TIFF images (<https://github.com/opencv/cvat/pull/6789>)
- Adjusted padding on the tasks, projects, and models pages (<https://github.com/opencv/cvat/pull/6778>)
- Corrected hotkey handlers to avoid overriding default behavior when modal windows are open
  (<https://github.com/opencv/cvat/pull/6800>)
- Resolved the need to move the mouse to activate
  brush or eraser effects; a single click is now sufficient (<https://github.com/opencv/cvat/pull/6800>)
- Fixed a memory leak issue in the logging system (<https://github.com/opencv/cvat/pull/6804>)
- Addressed a race condition that occurred during the initial creation of `secret_key.py`
  (<https://github.com/opencv/cvat/pull/6775>)
- Eliminated duplicate log entries generated by the CVAT server
  (<https://github.com/opencv/cvat/pull/6766>)

## \[2.6.1\] - 2023-08-25

### Added

- More information about task progress on tasks page (<https://github.com/opencv/cvat/pull/5723>)
- Prefetching next chunk when user navigates by frames manually (<https://github.com/opencv/cvat/pull/6695>)

### Changed

- Bumped nuclio version to 1.11.24 and removed `/tmp` mounting in the nuclio container to adhere the update.
- Response code for empty cloud storage preview 204 -> 404 (<https://github.com/opencv/cvat/pull/6727>)
- Organization now opened immediately after it is created (<https://github.com/opencv/cvat/pull/6705>)
- More responsive automatic annotation progress bar (<https://github.com/opencv/cvat/pull/6734>)
- Improved message when invite more users to an organization (<https://github.com/opencv/cvat/pull/6731>)

### Fixed

- Exporting project when its tasks has not data (<https://github.com/opencv/cvat/pull/6658>)
- Removing job assignee (<https://github.com/opencv/cvat/pull/6712>)
- UI fail when select a mask or a skeleton with center-aligned text (<https://github.com/opencv/cvat/pull/6753>)
- Fixed switching from organization to sandbox while getting a resource (<https://github.com/opencv/cvat/pull/6689>)
- You do not have permissions when user is cancelling automatic annotation (<https://github.com/opencv/cvat/pull/6734>)
- Automatic annotation progress bar is invisible if the app initialized on the task page
  (<https://github.com/opencv/cvat/pull/6734>)
- Extra status check requests for automatic annotation (<https://github.com/opencv/cvat/pull/6734>)
- \[SDK\]: `FileExistsError` exception raised on Windows when a dataset is loaded from cache
  (<https://github.com/opencv/cvat/pull/6722>)

### Security

- Remote Code Execution (RCE) [SNYK-PYTHON-GITPYTHON-5840584](https://snyk.io/vuln/SNYK-PYTHON-GITPYTHON-5840584)

## \[2.6.0\] - 2023-08-11

### Added

- \[SDK\] Introduced the `DeferredTqdmProgressReporter` class,
  which avoids the glitchy output seen with the `TqdmProgressReporter` under certain circumstances
  (<https://github.com/opencv/cvat/pull/6556>)
- \[SDK, CLI\] Added the `cvat_sdk.auto_annotation`
  module, providing functionality to automatically annotate tasks
  by executing a user-provided function on the local machine.
  A corresponding CLI command (`auto-annotate`) is also available.
  Some predefined functions using torchvision are also available.
  (<https://github.com/opencv/cvat/pull/6483>,
  <https://github.com/opencv/cvat/pull/6649>)
- Included an indication for cached frames in the interface
  (<https://github.com/opencv/cvat/pull/6586>)

### Changed

- Raised the default guide assets limitations to 30 assets,
  with a maximum size of 10MB each
  (<https://github.com/opencv/cvat/pull/6575>)
- \[SDK\] Custom `ProgressReporter` implementations should now override `start2` instead of `start`
  The old implementation is still supported.
  (<https://github.com/opencv/cvat/pull/6556>)
- Improved memory optimization and code in the decoding module (<https://github.com/opencv/cvat/pull/6585>)

### Removed

- Removed the YOLOv5 serverless function
  (<https://github.com/opencv/cvat/pull/6618>)

### Fixed

- Corrected an issue where the prebuilt FFmpeg bundled in PyAV
  was being used instead of the custom build.
- Fixed the filename for labels in the CamVid format (<https://github.com/opencv/cvat/pull/6600>)

## \[2.5.2\] - 2023-07-27

### Added

- We've added support for multi-line text attributes (<https://github.com/opencv/cvat/pull/6458>)
- You can now set a default attribute value for SELECT, RADIO types on UI
  (<https://github.com/opencv/cvat/pull/6474>)
- \[SDK\] `cvat_sdk.datasets`, is now available, providing a framework-agnostic alternative to `cvat_sdk.pytorch`
  (<https://github.com/opencv/cvat/pull/6428>)
- We've introduced analytics for Jobs, Tasks, and Project (<https://github.com/opencv/cvat/pull/6371>)

### Changed

- \[Helm\] In Helm, we've added a configurable default storage option to the chart (<https://github.com/opencv/cvat/pull/6137>)

### Removed

- \[Helm\] In Helm, we've eliminated the obligatory use of hardcoded traefik ingress (<https://github.com/opencv/cvat/pull/6137>)

### Fixed

- Fixed an issue with calculating the number of objects on the annotation view when frames are deleted
  (<https://github.com/opencv/cvat/pull/6493>)
- \[SDK\] In SDK, we've fixed the issue with creating attributes with blank default values
  (<https://github.com/opencv/cvat/pull/6454>)
- \[SDK\] We've corrected a problem in SDK where it was altering input data in models (<https://github.com/opencv/cvat/pull/6455>)
- Fixed exporting of hash for shapes and tags in a specific corner case (<https://github.com/opencv/cvat/pull/6517>)
- Resolved the issue where 3D jobs couldn't be opened in validation mode (<https://github.com/opencv/cvat/pull/6507>)
- Fixed SAM plugin (403 code for workers in organizations) (<https://github.com/opencv/cvat/pull/6514>)
- Fixed the issue where initial frame from query parameter was not opening specific frame in a job
  (<https://github.com/opencv/cvat/pull/6506>)
- Corrected the issue with the removal of the first keyframe (<https://github.com/opencv/cvat/pull/6494>)
- Fixed the display of project previews on small screens and updated stylelint & rules (<https://github.com/opencv/cvat/pull/6551>)
- Implemented server-side validation for attribute specifications
  (<https://github.com/opencv/cvat/pull/6447>)
- \[API\] Fixed API issue related to file downloading failures for filenames with special characters (<https://github.com/opencv/cvat/pull/6492>)
- \[Helm\] In Helm, we've resolved an issue with multiple caches
  in the same RWX volume, which was preventing db migration from starting (<https://github.com/opencv/cvat/pull/6137>)

## \[2.5.1\] - 2023-07-19

### Fixed

- Memory leak related to unclosed av container (<https://github.com/opencv/cvat/pull/6501>)

## \[2.5.0] - 2023-07-05

### Added

- Now CVAT supports project/task markdown description with additional assets
  (png, jpeg, gif, webp images and pdf files) (<https://github.com/opencv/cvat/pull/6191>)
- Ground Truth jobs and quality analytics for tasks (<https://github.com/opencv/cvat/pull/6039>)

### Fixed

- The problem with manifest file in tasks restored from backup (<https://github.com/opencv/cvat/issues/5971>)
- The problem with task mode in a task restored from backup (<https://github.com/opencv/cvat/issues/5668>)
- Visible 'To background' button in review mode (<https://github.com/opencv/cvat/pull/6363>)
- Added missed auto_add argument to Issue model (<https://github.com/opencv/cvat/pull/6364>)
- \[API\] Performance of several API endpoints (<https://github.com/opencv/cvat/pull/6340>)
- \[API\] Invalid schema for the owner field in several endpoints (<https://github.com/opencv/cvat/pull/6343>)
- Some internal errors occurring during lambda function invocations
  could be mistakenly reported as invalid requests
  (<https://github.com/opencv/cvat/pull/6394>)
- \[SDK\] Loading tasks that have been cached with the PyTorch adapter
  (<https://github.com/opencv/cvat/issues/6047>)
- The problem with importing annotations if dataset has extra dots in filenames
  (<https://github.com/opencv/cvat/pull/6350>)

### Security

- More comprehensive SSRF mitigations were implemented.
  Previously, on task creation it was prohibited to specify remote data URLs
  with hosts that resolved to IP addresses in the private ranges.
  Now, redirects to such URLs are also prohibited.
  In addition, this restriction is now also applied to webhook URLs.
  System administrators can allow or deny custom IP address ranges
  with the `SMOKESCREEN_OPTS` environment variable.
  (<https://github.com/opencv/cvat/pull/6362>).

## \[2.4.9] - 2023-06-22

### Fixed

- Error related to calling serverless functions on some image formats (<https://github.com/opencv/cvat/pull/6384>)

## \[2.4.8] - 2023-06-22

### Fixed

- Getting original chunks for items in specific cases (<https://github.com/opencv/cvat/pull/6355>)

## \[2.4.7] - 2023-06-16

### Added

- \[API\] API Now supports the creation and removal of Ground Truth jobs. (<https://github.com/opencv/cvat/pull/6204>)
- \[API\] We've introduced task quality estimation endpoints. (<https://github.com/opencv/cvat/pull/6204>)
- \[CLI\] An option to select the organization. (<https://github.com/opencv/cvat/pull/6317>)

### Fixed

- Issues with running serverless models for EXIF-rotated images. (<https://github.com/opencv/cvat/pull/6275/>)
- File uploading issues when using https configuration. (<https://github.com/opencv/cvat/pull/6308>)
- Dataset export error with `outside` property of tracks. (<https://github.com/opencv/cvat/issues/5971>)
- Broken logging in the TransT serverless function. (<https://github.com/opencv/cvat/pull/6290>)

## \[2.4.6] - 2023-06-09

### Added

- \[Server API\] An option to supply custom file ordering for task data uploads (<https://github.com/opencv/cvat/pull/5083>)
- New option `semi-auto` is available as annotations source (<https://github.com/opencv/cvat/pull/6263>)

### Changed

- Allowed to use dataset manifest for the `predefined` sorting method for task data (<https://github.com/opencv/cvat/pull/5083>)

### Changed

- Replaced Apache mod_wsgi with Uvicorn ASGI server for backend use(<https://github.com/opencv/cvat/pull/6195>)

### Fixed

- Incorrect location of temporary file during job annotation import.(<https://github.com/opencv/cvat/pull/5909>)
- Deletion of uploaded file along with annotations/backups when an RQ job
  has been initiated, but no subsequent status check requests have been made.(<https://github.com/opencv/cvat/pull/5909>)
- Deletion of uploaded files, including annotations and backups,
  after they have been uploaded to the server using the TUS protocol but before an RQ job has been initiated. (<https://github.com/opencv/cvat/pull/5909>)
- Simultaneous creation of tasks or projects with identical names from backups by multiple users.(<https://github.com/opencv/cvat/pull/5909>)
- \[API\] The `predefined` sorting method for task data uploads (<https://github.com/opencv/cvat/pull/5083>)
- Allowed slashes in export filenames. (<https://github.com/opencv/cvat/pull/6265>)

## \[2.4.5] - 2023-06-02

### Added

- Integrated support for sharepoint and cloud storage files, along with
  directories to be omitted during task creation (server) (<https://github.com/opencv/cvat/pull/6074>)
- Enabled task creation with directories from cloud storage or sharepoint (<https://github.com/opencv/cvat/pull/6074>)
- Enhanced task creation to support any data type supported by the server
  by default, from cloud storage without the necessity for the `use_cache` option (<https://github.com/opencv/cvat/pull/6074>)
- Added capability for task creation with data from cloud storage without the `use_cache` option (<https://github.com/opencv/cvat/pull/6074>)

### Changed

- User can now access resource links from any organization or sandbox, granted it's available to them (<https://github.com/opencv/cvat/pull/5892>)
- Cloud storage manifest files have been made optional (<https://github.com/opencv/cvat/pull/6074>)
- Updated Django to the 4.2.x version (<https://github.com/opencv/cvat/pull/6122>)
- Renamed certain Nuclio functions to adhere to a common naming convention. For instance,
  `onnx-yolov7` -> `onnx-wongkinyiu-yolov7`, `ultralytics-yolov5` -> `pth-ultralytics-yolov5`
  (<https://github.com/opencv/cvat/pull/6140>)

### Deprecated

- Deprecated the endpoint `/cloudstorages/{id}/content` (<https://github.com/opencv/cvat/pull/6074>)

### Fixed

- Fixed the issue of skeletons dumping on created tasks/projects (<https://github.com/opencv/cvat/pull/6157>)
- Resolved an issue related to saving annotations for skeleton tracks (<https://github.com/opencv/cvat/pull/6075>)

## \[2.4.4] - 2023-05-18

### Added

- Introduced a new configuration option for controlling the invocation of Nuclio functions.
  (<https://github.com/opencv/cvat/pull/6146>)

### Changed

- Relocated SAM masks decoder to frontend operation.
  (<https://github.com/opencv/cvat/pull/6019>)
- Switched `person-reidentification-retail-0300` and `faster_rcnn_inception_v2_coco` Nuclio functions with `person-reidentification-retail-0277` and `faster_rcnn_inception_resnet_v2_atrous_coco` respectively.
  (<https://github.com/opencv/cvat/pull/6129>)
- Upgraded OpenVINO-based Nuclio functions to utilize the OpenVINO 2022.3 runtime.
  (<https://github.com/opencv/cvat/pull/6129>)

### Fixed

- Resolved issues with tracking multiple objects (30 and more) using the TransT tracker.
  (<https://github.com/opencv/cvat/pull/6073>)
- Addressed azure.core.exceptions.ResourceExistsError: The specified blob already exists.
  (<https://github.com/opencv/cvat/pull/6082>)
- Corrected image scaling issues when transitioning between images of different resolutions.
  (<https://github.com/opencv/cvat/pull/6081>)
- Fixed inaccurate reporting of completed job counts.
  (<https://github.com/opencv/cvat/issues/6098>)
- Allowed OpenVINO-based Nuclio functions to be deployed to Kubernetes.
  (<https://github.com/opencv/cvat/pull/6129>)
- Improved skeleton size checks after drawing.
  (<https://github.com/opencv/cvat/pull/6156>)
- Fixed HRNet CPU serverless function.
  (<https://github.com/opencv/cvat/pull/6150>)
- Prevented sending of empty list of events.
  (<https://github.com/opencv/cvat/pull/6154>)

## \[2.4.3] - 2023-04-24

### Changed

- Docker images no longer include Ubuntu package sources or FFmpeg/OpenH264 sources
  (<https://github.com/opencv/cvat/pull/6040>)
- TUS chunk size changed from 100 MB to 2 MB
  (<https://github.com/opencv/cvat/pull/6058>)

## \[2.4.2] - 2023-04-14

### Added

- Support for Azure Blob Storage connection string authentication(<https://github.com/openvinotoolkit/cvat/pull/4649>)
- Segment Anything interactor for CPU/GPU (<https://github.com/opencv/cvat/pull/6008>)

### Changed

- The capability to transfer a task from one project to another project has been disabled (<https://github.com/opencv/cvat/pull/5901>)
- The bounding rectangle in the skeleton annotation is visible solely when the skeleton is active (<https://github.com/opencv/cvat/pull/5911>)
- Base backend image upgraded from ubuntu:20.04 to ubuntu:22.04 (<https://github.com/opencv/cvat/pull/6021>)

### Deprecated

- TDB

### Removed

- Cloud storage `unique_together` limitation (<https://github.com/opencv/cvat/pull/5855>)
- Support for redundant request media types in the API
  (<https://github.com/opencv/cvat/pull/5874>)
- Static URLs and direct SDK support for the tus chunk endpoints.
  Clients must use the `Location` header from the response to the `Upload-Length` request,
  as per the tus creation protocol
  (<https://github.com/opencv/cvat/pull/5961>)

### Fixed

- An invalid project/org handling in webhooks (<https://github.com/opencv/cvat/pull/5707>)
- Warning `key` is undefined on project page (<https://github.com/opencv/cvat/pull/5876>)
- An invalid mask detected when performing automatic annotation on a task (<https://github.com/opencv/cvat/pull/5883>)
- The 'Reset zoom' option now retains the user's preferences upon reloading CVAT (<https://github.com/opencv/cvat/pull/5908>)
- Cloud storage content listing when the manifest name contains special characters
  (<https://github.com/opencv/cvat/pull/5873>)
- Width and height in CVAT dataset format mask annotations (<https://github.com/opencv/cvat/pull/5905>)
- Empty list of export formats for a project without tasks (<https://github.com/opencv/cvat/pull/5899>)
- Downgraded NumPy used by HRNet because `np.int` is no longer available (<https://github.com/opencv/cvat/pull/5574>)
- Empty previews responsive to page resize (<https://github.com/opencv/cvat/pull/5925>)
- Nuclio function invocations when deployed via the Helm chart
  (<https://github.com/opencv/cvat/issues/5626>)
- Export of a job from a task with multiple jobs (<https://github.com/opencv/cvat/pull/5928>)
- Points missing when exporting tracked skeleton (<https://github.com/opencv/cvat/issues/5497>)
- Escaping in the `filter` parameter in generated URLs
  (<https://github.com/opencv/cvat/issues/5566>)
- Rotation property lost during saving a mutable attribute (<https://github.com/opencv/cvat/pull/5968>)
- Optimized /api/jobs request (<https://github.com/opencv/cvat/pull/5962>)
- Server micro version support check in SDK/CLI (<https://github.com/opencv/cvat/pull/5991>)
- \[SDK\] Compatibility with upcoming urllib 2.1.0
  (<https://github.com/opencv/cvat/pull/6002>)
- Fix TUS file uploading if multiple apache processes are used (<https://github.com/opencv/cvat/pull/6006>)
- The issue related to webhook events not being sent has been resolved (<https://github.com/opencv/cvat/pull/5916>)

### Security

- Updated Redis (in the Compose file) to 7.0.x, and redis-py to 4.5.4
  (<https://github.com/opencv/cvat/pull/6016>)

## \[2.4.1] - 2023-04-05

### Fixed

- Optimized annotation fetching up to 10 times (<https://github.com/opencv/cvat/pull/5974>)
- Incorrect calculation of working time in analytics (<https://github.com/opencv/cvat/pull/5973>)

## \[2.4.0] - 2023-03-16

### Added

- \[SDK\] An arg to wait for data processing in the task data uploading function
  (<https://github.com/opencv/cvat/pull/5502>)
- Filename pattern to simplify uploading cloud storage data for a task (<https://github.com/opencv/cvat/pull/5498>, <https://github.com/opencv/cvat/pull/5525>)
- \[SDK\] Configuration setting to change the dataset cache directory
  (<https://github.com/opencv/cvat/pull/5535>)
- \[SDK\] Class to represent a project as a PyTorch dataset
  (<https://github.com/opencv/cvat/pull/5523>)
- Grid view and multiple context images supported (<https://github.com/opencv/cvat/pull/5542>)
- Interpolation is now supported for 3D cuboids.
- Tracks can be exported/imported to/from Datumaro and Sly Pointcloud formats (<https://github.com/opencv/cvat/pull/5629>)
- Support for custom file to job splits in tasks (server API & SDK only)
  (<https://github.com/opencv/cvat/pull/5536>)
- \[SDK\] A PyTorch adapter setting to disable cache updates
  (<https://github.com/opencv/cvat/pull/5549>)
- YOLO v7 serverless feature added using ONNX backend (<https://github.com/opencv/cvat/pull/5552>)
- Cypress test for social account authentication (<https://github.com/opencv/cvat/pull/5444>)
- Dummy github and google authentication servers (<https://github.com/opencv/cvat/pull/5444>)
- \[Server API\] Simple filters for object collection endpoints
  (<https://github.com/opencv/cvat/pull/5575>)
- Analytics based on Clickhouse, Vector and Grafana instead of the ELK stack (<https://github.com/opencv/cvat/pull/5646>)
- \[SDK\] High-level API for working with organizations
  (<https://github.com/opencv/cvat/pull/5718>)
- Use correct service name in LDAP authentication documentation (<https://github.com/opencv/cvat/pull/5848>)

### Changed

- The Docker Compose files now use the Compose Specification version
  of the format. This version is supported by Docker Compose 1.27.0+
  (<https://github.com/opencv/cvat/pull/5524>).
- \[SDK\] The `resource_type` args now have the default value of `local` in task creation functions.
  The corresponding arguments are keyword-only now.
  (<https://github.com/opencv/cvat/pull/5502>)
- \[Server API\] Added missing pagination or pagination parameters in
  `/jobs/{id}/commits`, `/organizations`
  (<https://github.com/opencv/cvat/pull/5557>)
- Windows Installation Instructions adjusted to work around <https://github.com/nuclio/nuclio/issues/1821>
- The contour detection function for semantic segmentation (<https://github.com/opencv/cvat/pull/4665>)
- Delete newline character when generating a webhook signature (<https://github.com/opencv/cvat/pull/5622>)
- DL models UI (<https://github.com/opencv/cvat/pull/5635>)
- \[Server API\], \[SDK\] Arbitrary-sized collections in endpoints:
  `/api/projects/{id}.tasks`, `/api/tasks/{id}.segments`, `/api/jobs/{id}.issues`,
  `/api/issues/{id}.comments`, `/api/projects | tasks | jobs/{id}.labels`
  (<https://github.com/opencv/cvat/pull/5662>)
- Hide analytics link from non-admin users (<https://github.com/opencv/cvat/pull/5789>)
- Hide notifications on login/logout/register (<https://github.com/opencv/cvat/pull/5788>)
- CVAT and CVAT SDK now use a custom `User-Agent` header in HTTP requests
  (<https://github.com/opencv/cvat/issues/5598>)

### Deprecated

- TBD

### Removed

- \[Server API\] Endpoints with collections are removed in favor of their full variants
  `/project/{id}/tasks`, `/tasks/{id}/jobs`, `/jobs/{id}/issues`, `/issues/{id}/comments`.
  Corresponding fields are added or changed to provide a link to the child collection
  in `/projects/{id}`, `/tasks/{id}`, `/jobs/{id}`, `/issues/{id}`
  (<https://github.com/opencv/cvat/pull/5575>)
- Limit on the maximum number of manifest files that can be added for cloud storage (<https://github.com/opencv/cvat/pull/5660>)

### Fixed

- Helm: Empty password for Redis (<https://github.com/opencv/cvat/pull/5520>)
- Resolved HRNet serverless function runtime error on images with an alpha channel (<https://github.com/opencv/cvat/pull/5570>)
- Addressed ignored preview & chunk cache settings (<https://github.com/opencv/cvat/pull/5569>)
- Fixed exporting annotations to Azure container (<https://github.com/opencv/cvat/pull/5596>)
- Corrected the type of the credentials parameter of `make_client` in the Python SDK
- Reduced noisy information in ortho views for 3D canvas (<https://github.com/opencv/cvat/pull/5608>)
- Cleared disk space after project removal (<https://github.com/opencv/cvat/pull/5632>, <https://github.com/opencv/cvat/pull/5752>)
- Locked submit button when file is not selected during dataset import (<https://github.com/opencv/cvat/pull/5757>)
- \[Server API\]Various errors in the generated schema (<https://github.com/opencv/cvat/pull/5575>)
- Resolved browser freezing when requesting a job with NaN id (<https://github.com/opencv/cvat/pull/5763>)
- Fixed SiamMask and TransT serverless functions (<https://github.com/opencv/cvat/pull/5658>)
- Addressed creation of a project or task with the same labels (<https://github.com/opencv/cvat/pull/5700>)
- \[Server API\] Fixed ability to rename label to an existing name (<https://github.com/opencv/cvat/pull/5662>)
- Resolved issue of resetting attributes when moving a task to a project (<https://github.com/opencv/cvat/pull/5764>)
- Fixed error in dataset export when parsing skeleton sublabels containing spaces (<https://github.com/opencv/cvat/pull/5794>)
- Added missing `CVAT_BASE_URL` in docker-compose.yml (<https://github.com/opencv/cvat/pull/5792>)
- Create cloud storage button size and models pagination (<https://github.com/opencv/cvat/pull/5858>)

### Security

- Fixed vulnerability with social authentication (<https://github.com/opencv/cvat/pull/5521>)

## \[2.3.0] - 2022-12-22

### Added

- SDK section in documentation (<https://github.com/opencv/cvat/pull/4928>)
- Option to enable or disable host certificate checking in CLI (<https://github.com/opencv/cvat/pull/4928>)
- REST API tests with skeletons (<https://github.com/opencv/cvat/pull/4987>)
- Host schema auto-detection in SDK (<https://github.com/opencv/cvat/pull/4910>)
- Server compatibility checks in SDK (<https://github.com/opencv/cvat/pull/4935>)
- Objects sorting option in the sidebar, by z-order. Additional visualization when sorting is applied
  (<https://github.com/opencv/cvat/pull/5145>)
- Added YOLOv5 serverless function with NVIDIA GPU support (<https://github.com/opencv/cvat/pull/4960>)
- Mask tools now supported (brush, eraser, polygon-plus,
  polygon-minus, returning masks from online detectors & interactors)
  (<https://github.com/opencv/cvat/pull/4543>)
- Added Webhooks (<https://github.com/opencv/cvat/pull/4863>)
- Authentication with social accounts: Google & GitHub (<https://github.com/opencv/cvat/pull/5147>, <https://github.com/opencv/cvat/pull/5181>, <https://github.com/opencv/cvat/pull/5295>)
- REST API tests for exporting job datasets & annotations and validating their structure (<https://github.com/opencv/cvat/pull/5160>)
- Backward propagation on UI (<https://github.com/opencv/cvat/pull/5355>)
- Keyboard shortcut to delete a frame (Alt + Del) (<https://github.com/opencv/cvat/pull/5369>)
- PyTorch dataset adapter layer in the SDK
  (<https://github.com/opencv/cvat/pull/5417>)
- Method for debugging the server deployed with Docker (<https://github.com/opencv/cvat/issues/5327>)

### Changed

- `api/docs`, `api/swagger`, `api/schema`, `server/about` endpoints now allow unauthorized access (<https://github.com/opencv/cvat/pull/4928>, <https://github.com/opencv/cvat/pull/4935>)
- 3D canvas now can be dragged in IDLE mode (<https://github.com/opencv/cvat/pull/5385>)
- Datumaro version is upgraded to 0.3 (dev) (<https://github.com/opencv/cvat/pull/4984>)
- Allowed trailing slashes in the SDK host address (<https://github.com/opencv/cvat/pull/5057>)
- Adjusted initial camera position, enabled 'Reset zoom' option for 3D canvas (<https://github.com/opencv/cvat/pull/5395>)
- Enabled authentication via email (<https://github.com/opencv/cvat/pull/5037>)
- Unified error handling with the cloud storage (<https://github.com/opencv/cvat/pull/5389>)
- In the SDK, functions taking paths as strings now also accept path-like objects
  (<https://github.com/opencv/cvat/pull/5435>)

### Removed

- The `--https` option of CLI (<https://github.com/opencv/cvat/pull/4910>)

### Fixed

- Significantly optimized access to DB for api/jobs, api/tasks, and api/projects.
- Removed a possibly duplicated encodeURI() calls in `server-proxy.ts` to prevent doubly encoding
  non-ascii paths while adding files from "Connected file share" (issue #4428)
- Removed unnecessary volumes defined in docker-compose.serverless.yml
  (<https://github.com/openvinotoolkit/cvat/pull/4659>)
- Added support for Image files that use the PIL.Image.mode 'I;16'
- Project import/export with skeletons (<https://github.com/opencv/cvat/pull/4867>,
  <https://github.com/opencv/cvat/pull/5004>)
- Shape color is not changed on canvas after changing a label (<https://github.com/opencv/cvat/pull/5045>)
- Unstable e2e restore tests (<https://github.com/opencv/cvat/pull/5010>)
- IOG and f-BRS serverless function (<https://github.com/opencv/cvat/pull/5039>)
- Invisible label item in label constructor when label color background is white,
  or close to it (<https://github.com/opencv/cvat/pull/5041>)
- Fixed cvat-core ESlint problems (<https://github.com/opencv/cvat/pull/5027>)
- Fixed task creation with non-local files via the SDK/CLI
  (<https://github.com/opencv/cvat/issues/4962>)
- HRNET serverless function (<https://github.com/opencv/cvat/pull/4944>)
- Invalid export of segmentation masks when the `background` label gets nonzero id (<https://github.com/opencv/cvat/pull/5056>)
- A trailing slash in hostname doesn't allow SDK to send some requests
  (<https://github.com/opencv/cvat/pull/5057>)
- Double modal export/backup a task/project (<https://github.com/opencv/cvat/pull/5075>)
- Fixed bug of computing Job's unsolved/resolved issues numbers (<https://github.com/opencv/cvat/pull/5101>)
- Dataset export for job (<https://github.com/opencv/cvat/pull/5052>)
- Angle is not propagated when use `propagate` feature (<https://github.com/opencv/cvat/pull/5139>)
- Could not fetch task in a corner case (<https://github.com/opencv/cvat/pull/5163>)
- Restoring CVAT in case of React-renderning fail (<https://github.com/opencv/cvat/pull/5134>)
- Deleted frames become restored if a user deletes frames from another job of the same task
  (<https://github.com/opencv/cvat/pull/5138>)
- Wrong issue position when create a quick issue on a rotated shape (<https://github.com/opencv/cvat/pull/5162>)
- Extra rerenders of different pages with each click (<https://github.com/opencv/cvat/pull/5178>)
- Skeleton points exported out of order in the COCO Keypoints format
  (<https://github.com/opencv/cvat/issues/5048>)
- PASCAL VOC 1.1 can't import dataset (<https://github.com/opencv/cvat/pull/4647>)
- Changing an object causes current z layer to be set to the maximum (<https://github.com/opencv/cvat/pull/5145>)
- Job assignee can not resolve an issue (<https://github.com/opencv/cvat/pull/5167>)
- Create manifest with cvat/server docker container command (<https://github.com/opencv/cvat/pull/5172>)
- Cannot assign a resource to a user who has an organization (<https://github.com/opencv/cvat/pull/5218>)
- Logs and annotations are not saved when logout from a job page (<https://github.com/opencv/cvat/pull/5266>)
- Added "type" field for all the labels, allows to reduce number of controls on annotation view (<https://github.com/opencv/cvat/pull/5273>)
- Occluded not applied on canvas instantly for a skeleton elements (<https://github.com/opencv/cvat/pull/5259>)
- Oriented bounding boxes broken with COCO format ss(<https://github.com/opencv/cvat/pull/5219>)
- Can't dump annotations with objects type is track from several jobs (<https://github.com/opencv/cvat/pull/5250>)
- Fixed upload resumption in production environments
  (<https://github.com/opencv/cvat/issues/4839>)
- Fixed job exporting (<https://github.com/opencv/cvat/pull/5282>)
- Visibility and ignored information fail to be loaded (MOT dataset format) (<https://github.com/opencv/cvat/pull/5270>)
- Added force logout on CVAT app start if token is missing (<https://github.com/opencv/cvat/pull/5331>)
- Drawing issues on 3D canvas (<https://github.com/opencv/cvat/pull/5410>)
- Missed token with using social account authentication (<https://github.com/opencv/cvat/pull/5344>)
- Redundant writing of skeleton annotations (CVAT for images) (<https://github.com/opencv/cvat/pull/5387>)
- The same object on 3D scene or `null` selected each click (PERFORMANCE) (<https://github.com/opencv/cvat/pull/5411>)
- An exception when run export for an empty task (<https://github.com/opencv/cvat/pull/5396>)
- Fixed FBRS serverless function runtime error on images with alpha channel (<https://github.com/opencv/cvat/pull/5384>)
- Attaching manifest with custom name (<https://github.com/opencv/cvat/pull/5377>)
- Uploading non-zip annotation files (<https://github.com/opencv/cvat/pull/5386>)
- Loss of rotation in CVAT format (<https://github.com/opencv/cvat/pull/5407>)
- A permission problem with interactive model launches for workers in orgs (<https://github.com/opencv/cvat/issues/4996>)
- Fix chart not being upgradable (<https://github.com/opencv/cvat/pull/5371>)
- Broken helm chart - if using custom release name (<https://github.com/opencv/cvat/pull/5403>)
- Missing source tag in project annotations (<https://github.com/opencv/cvat/pull/5408>)
- Creating a task with a Git repository via the SDK
  (<https://github.com/opencv/cvat/issues/4365>)
- Queries via the low-level API using the `multipart/form-data` Content-Type with string fields
  (<https://github.com/opencv/cvat/pull/5479>)
- Skeletons cannot be added to a task or project (<https://github.com/opencv/cvat/pull/5813>)

### Security

- `Project.import_dataset` not waiting for completion correctly
  (<https://github.com/opencv/cvat/pull/5459>)

## \[2.2.0] - 2022-09-12

### Added

- Added ability to delete frames from a job based on (<https://github.com/openvinotoolkit/cvat/pull/4194>)
- Support of attributes returned by serverless functions based on (<https://github.com/openvinotoolkit/cvat/pull/4506>)
- Project/task backups uploading via chunk uploads
- Fixed UX bug when jobs pagination is reset after changing a job
- Progressbars in CLI for file uploading and downloading
- `utils/cli` changed to `cvat-cli` package
- Support custom file name for backup
- Possibility to display tags on frame
- Support source and target storages (server part)
- Tests for import/export annotation, dataset, backup from/to cloud storage
- Added Python SDK package (`cvat-sdk`) (<https://github.com/opencv/cvat/pull/4813>)
- Previews for jobs
- Documentation for LDAP authentication (<https://github.com/cvat-ai/cvat/pull/39>)
- OpenCV.js caching and autoload (<https://github.com/cvat-ai/cvat/pull/30>)
- Publishing dev version of CVAT docker images (<https://github.com/cvat-ai/cvat/pull/53>)
- Support of Human Pose Estimation, Facial Landmarks (and similar) use-cases, new shape type:
- Skeleton (<https://github.com/cvat-ai/cvat/pull/1>), (<https://github.com/opencv/cvat/pull/4829>)
- Added helm chart support for serverless functions and analytics (<https://github.com/cvat-ai/cvat/pull/110>)
- Added confirmation when remove a track (<https://github.com/opencv/cvat/pull/4846>)
- [COCO Keypoints](https://cocodataset.org/#keypoints-2020) format support (<https://github.com/opencv/cvat/pull/4821>,
  <https://github.com/opencv/cvat/pull/4908>)
- Support for Oracle OCI Buckets (<https://github.com/opencv/cvat/pull/4876>)
- `cvat-sdk` and `cvat-cli` packages on PyPI (<https://github.com/opencv/cvat/pull/4903>)
- UI part for source and target storages (<https://github.com/opencv/cvat/pull/4842>)
- Backup import/export modals (<https://github.com/opencv/cvat/pull/4842>)
- Annotations import modal (<https://github.com/opencv/cvat/pull/4842>)

### Changed

- Bumped nuclio version to 1.8.14
- Simplified running REST API tests. Extended CI-nightly workflow
- REST API tests are partially moved to Python SDK (`users`, `projects`, `tasks`, `issues`)
- cvat-ui: Improve UI/UX on label, create task and create project forms (<https://github.com/cvat-ai/cvat/pull/7>)
- Removed link to OpenVINO documentation (<https://github.com/cvat-ai/cvat/pull/35>)
- Clarified meaning of chunking for videos

### Fixed

- Task creation progressbar bug
- Removed Python dependency `open3d` which brought different issues to the building process
- Analytics not accessible when https is enabled
- Dataset import in an organization
- Updated minimist npm package to v1.2.6
- Request Status Code 500 "StopIteration" when exporting dataset
- Generated OpenAPI schema for several endpoints
- Annotation window might have top offset if try to move a locked object
- Image search in cloud storage (<https://github.com/cvat-ai/cvat/pull/8>)
- Reset password functionality (<https://github.com/cvat-ai/cvat/pull/52>)
- Creating task with cloud storage data (<https://github.com/cvat-ai/cvat/pull/116>)
- Show empty tasks (<https://github.com/cvat-ai/cvat/pull/100>)
- Fixed project filtration (<https://github.com/opencv/cvat/pull/4878>)
- Maximum callstack exceed when create task with 100000+ files from cloud storage (<https://github.com/opencv/cvat/pull/4836>)
- Fixed invocation of serverless functions (<https://github.com/opencv/cvat/pull/4907>)
- Removing label attributes (<https://github.com/opencv/cvat/pull/4927>)
- Notification with a required manifest file (<https://github.com/opencv/cvat/pull/4921>)

## \[2.1.0] - 2022-04-08

### Added

- Task annotations importing via chunk uploads (<https://github.com/openvinotoolkit/cvat/pull/4327>)
- Advanced filtration and sorting for a list of tasks/projects/cloudstorages (<https://github.com/openvinotoolkit/cvat/pull/4403>)
- Project dataset importing via chunk uploads (<https://github.com/openvinotoolkit/cvat/pull/4485>)
- Support paginated list for job commits (<https://github.com/openvinotoolkit/cvat/pull/4482>)

### Changed

- Added missing geos dependency into Dockerfile (<https://github.com/openvinotoolkit/cvat/pull/4451>)
- Improved helm chart readme (<https://github.com/openvinotoolkit/cvat/pull/4366>)
- Added helm chart support for CVAT 2.X and made ingress compatible with Kubernetes >=1.22 (<https://github.com/openvinotoolkit/cvat/pull/4448>)

### Fixed

- Permission error occurred when accessing the JobCommits (<https://github.com/openvinotoolkit/cvat/pull/4435>)
- job assignee can remove or update any issue created by the task owner (<https://github.com/openvinotoolkit/cvat/pull/4436>)
- Bug: Incorrect point deletion with keyboard shortcut (<https://github.com/openvinotoolkit/cvat/pull/4420>)
- some AI Tools were not sending responses properly (<https://github.com/openvinotoolkit/cvat/issues/4432>)
- Unable to upload annotations (<https://github.com/openvinotoolkit/cvat/pull/4513>)
- Fix build dependencies for Siammask (<https://github.com/openvinotoolkit/cvat/pull/4486>)
- Bug: Exif orientation information handled incorrectly (<https://github.com/openvinotoolkit/cvat/pull/4529>)
- Fixed build of retinanet function image (<https://github.com/cvat-ai/cvat/pull/54>)
- Dataset import for Datumaro, KITTI and VGGFace2 formats (<https://github.com/opencv/cvat/pull/4544>)
- Bug: Import dataset of Imagenet format fail (<https://github.com/opencv/cvat/issues/4850>)

## \[2.0.0] - 2022-03-04

### Added

- Handle attributes coming from nuclio detectors (<https://github.com/openvinotoolkit/cvat/pull/3917>)
- Add additional environment variables for Nuclio configuration (<https://github.com/openvinotoolkit/cvat/pull/3894>)
- Add KITTI segmentation and detection format (<https://github.com/openvinotoolkit/cvat/pull/3757>)
- Add LFW format (<https://github.com/openvinotoolkit/cvat/pull/3770>)
- Add Cityscapes format (<https://github.com/openvinotoolkit/cvat/pull/3758>)
- Add Open Images V6 format (<https://github.com/openvinotoolkit/cvat/pull/3679>)
- Rotated bounding boxes (<https://github.com/openvinotoolkit/cvat/pull/3832>)
- Player option: Smooth image when zoom-in, enabled by default (<https://github.com/openvinotoolkit/cvat/pull/3933>)
- Google Cloud Storage support in UI (<https://github.com/openvinotoolkit/cvat/pull/3919>)
- Add project tasks pagination (<https://github.com/openvinotoolkit/cvat/pull/3910>)
- Add remove issue button (<https://github.com/openvinotoolkit/cvat/pull/3952>)
- Data sorting option (<https://github.com/openvinotoolkit/cvat/pull/3937>)
- Options to change font size & position of text labels on the canvas (<https://github.com/openvinotoolkit/cvat/pull/3972>)
- Add "tag" return type for automatic annotation in Nuclio (<https://github.com/openvinotoolkit/cvat/pull/3896>)
- Helm chart: Make user-data-permission-fix optional (<https://github.com/openvinotoolkit/cvat/pull/3994>)
- Advanced identity access management system, using open policy agent (<https://github.com/openvinotoolkit/cvat/pull/3788>)
- Organizations to create "shared space" for different groups of users (<https://github.com/openvinotoolkit/cvat/pull/3788>)
- Dataset importing to a project (<https://github.com/openvinotoolkit/cvat/pull/3790>)
- User is able to customize information that text labels show (<https://github.com/openvinotoolkit/cvat/pull/4029>)
- Support for uploading manifest with any name (<https://github.com/openvinotoolkit/cvat/pull/4041>)
- Added information about OpenVINO toolkit to login page (<https://github.com/openvinotoolkit/cvat/pull/4077>)
- Support for working with ellipses (<https://github.com/openvinotoolkit/cvat/pull/4062>)
- Add several flags to task creation CLI (<https://github.com/openvinotoolkit/cvat/pull/4119>)
- Add YOLOv5 serverless function for automatic annotation (<https://github.com/openvinotoolkit/cvat/pull/4178>)
- Add possibility to change git repository and git export format from already created task (<https://github.com/openvinotoolkit/cvat/pull/3886>)
- Basic page with jobs list, basic filtration to this list (<https://github.com/openvinotoolkit/cvat/pull/4258>)
- Added OpenCV.js TrackerMIL as tracking tool (<https://github.com/openvinotoolkit/cvat/pull/4200>)
- Ability to continue working from the latest frame where an annotator was before (<https://github.com/openvinotoolkit/cvat/pull/4297>)
- `GET /api/jobs/<id>/commits` was implemented (<https://github.com/openvinotoolkit/cvat/pull/4368>)
- Advanced filtration and sorting for a list of jobs (<https://github.com/openvinotoolkit/cvat/pull/4319>)

### Changed

- Users don't have access to a task object anymore if they are assigned only on some jobs of the task (<https://github.com/openvinotoolkit/cvat/pull/3788>)
- Different resources (tasks, projects) are not visible anymore for all CVAT instance users by default (<https://github.com/openvinotoolkit/cvat/pull/3788>)
- API versioning scheme: using accept header versioning instead of namespace versioning (<https://github.com/openvinotoolkit/cvat/pull/4239>)
- Replaced 'django_sendfile' with 'django_sendfile2' (<https://github.com/openvinotoolkit/cvat/pull/4267>)
- Use drf-spectacular instead of drf-yasg for swagger documentation (<https://github.com/openvinotoolkit/cvat/pull/4210>)
- Update development-environment manual to work under MacOS, supported Mac with Apple Silicon (<https://github.com/openvinotoolkit/cvat/pull/4414>)

### Deprecated

- Job field "status" is not used in UI anymore, but it has not been removed from the database yet (<https://github.com/openvinotoolkit/cvat/pull/3788>)

### Removed

- Review rating, reviewer field from the job instance (use assignee field together with stage field instead) (<https://github.com/openvinotoolkit/cvat/pull/3788>)
- Training django app (<https://github.com/openvinotoolkit/cvat/pull/4330>)
- v1 api version support (<https://github.com/openvinotoolkit/cvat/pull/4332>)

### Fixed

- Fixed Interaction handler keyboard handlers (<https://github.com/openvinotoolkit/cvat/pull/3881>)
- Points of invisible shapes are visible in autobordering (<https://github.com/openvinotoolkit/cvat/pull/3931>)
- Order of the label attributes in the object item details(<https://github.com/openvinotoolkit/cvat/pull/3945>)
- Order of labels in tasks and projects (<https://github.com/openvinotoolkit/cvat/pull/3987>)
- Fixed task creating with large files via webpage (<https://github.com/openvinotoolkit/cvat/pull/3692>)
- Added information to export CVAT_HOST when performing local installation for accessing over network (<https://github.com/openvinotoolkit/cvat/pull/4014>)
- Fixed possible color collisions in the generated colormap (<https://github.com/openvinotoolkit/cvat/pull/4007>)
- Original pdf file is deleted when using share (<https://github.com/openvinotoolkit/cvat/pull/3967>)
- Order in an annotation file(<https://github.com/openvinotoolkit/cvat/pull/4087>)
- Fixed task data upload progressbar (<https://github.com/openvinotoolkit/cvat/pull/4134>)
- Email in org invitations is case sensitive (<https://github.com/openvinotoolkit/cvat/pull/4153>)
- Caching for tasks and jobs can lead to an exception if its assignee user is removed (<https://github.com/openvinotoolkit/cvat/pull/4165>)
- Added intelligent function when paste labels to another task (<https://github.com/openvinotoolkit/cvat/pull/4161>)
- Uncaught TypeError: this.el.node.getScreenCTM() is null in Firefox (<https://github.com/openvinotoolkit/cvat/pull/4175>)
- Bug: canvas is busy when start playing, start resizing a shape and do not release the mouse cursor (<https://github.com/openvinotoolkit/cvat/pull/4151>)
- Bug: could not receive frame N. TypeError: Cannot read properties of undefined (reding "filename") (<https://github.com/openvinotoolkit/cvat/pull/4187>)
- Cannot choose a dataset format for a linked repository if a task type is annotation (<https://github.com/openvinotoolkit/cvat/pull/4203>)
- Fixed tus upload error over https (<https://github.com/openvinotoolkit/cvat/pull/4154>)
- Issues disappear when rescale a browser (<https://github.com/openvinotoolkit/cvat/pull/4189>)
- Auth token key is not returned when registering without email verification (<https://github.com/openvinotoolkit/cvat/pull/4092>)
- Error in create project from backup for standard 3D annotation (<https://github.com/openvinotoolkit/cvat/pull/4160>)
- Annotations search does not work correctly in some corner cases (when use complex properties with width, height) (<https://github.com/openvinotoolkit/cvat/pull/4198>)
- Kibana requests are not proxied due to django-revproxy incompatibility with Django >3.2.x (<https://github.com/openvinotoolkit/cvat/issues/4085>)
- Content type for getting frame with tasks/{id}/data/ endpoint (<https://github.com/openvinotoolkit/cvat/pull/4333>)
- Bug: Permission error occurred when accessing the comments of a specific issue (<https://github.com/openvinotoolkit/cvat/issues/4416>)

### Security

- Updated ELK to 6.8.23 which uses log4j 2.17.1 (<https://github.com/openvinotoolkit/cvat/pull/4206>)
- Added validation for URLs which used as remote data source (<https://github.com/openvinotoolkit/cvat/pull/4387>)

## \[1.7.0] - 2021-11-15

### Added

- cvat-ui: support cloud storages (<https://github.com/openvinotoolkit/cvat/pull/3372>)
- interactor: add HRNet interactive segmentation serverless function (<https://github.com/openvinotoolkit/cvat/pull/3740>)
- Added GPU implementation for SiamMask, reworked tracking approach (<https://github.com/openvinotoolkit/cvat/pull/3571>)
- Progress bar for manifest creating (<https://github.com/openvinotoolkit/cvat/pull/3712>)
- IAM: Open Policy Agent integration (<https://github.com/openvinotoolkit/cvat/pull/3788>)
- Add a tutorial on attaching cloud storage AWS-S3 (<https://github.com/openvinotoolkit/cvat/pull/3745>)
  and Azure Blob Container (<https://github.com/openvinotoolkit/cvat/pull/3778>)
- The feature to remove annotations in a specified range of frames (<https://github.com/openvinotoolkit/cvat/pull/3617>)
- Project backup/restore (<https://github.com/openvinotoolkit/cvat/pull/3852>)

### Changed

- UI tracking has been reworked (<https://github.com/openvinotoolkit/cvat/pull/3571>)
- Updated Django till 3.2.7 (automatic AppConfig discovery)
- Manifest generation: Reduce creating time (<https://github.com/openvinotoolkit/cvat/pull/3712>)
- Migration from NPM 6 to NPM 7 (<https://github.com/openvinotoolkit/cvat/pull/3773>)
- Update Datumaro dependency to 0.2.0 (<https://github.com/openvinotoolkit/cvat/pull/3813>)

### Fixed

- Fixed JSON transform issues in network requests (<https://github.com/openvinotoolkit/cvat/pull/3706>)
- Display a more user-friendly exception message (<https://github.com/openvinotoolkit/cvat/pull/3721>)
- Exception `DataCloneError: The object could not be cloned` (<https://github.com/openvinotoolkit/cvat/pull/3733>)
- Fixed extension comparison in task frames CLI (<https://github.com/openvinotoolkit/cvat/pull/3674>)
- Incorrect work when copy job list with "Copy" button (<https://github.com/openvinotoolkit/cvat/pull/3749>)
- Iterating over manifest (<https://github.com/openvinotoolkit/cvat/pull/3792>)
- Manifest removing (<https://github.com/openvinotoolkit/cvat/pull/3791>)
- Fixed project updated date (<https://github.com/openvinotoolkit/cvat/pull/3814>)
- Fixed dextr deployment (<https://github.com/openvinotoolkit/cvat/pull/3820>)
- Migration of `dataset_repo` application (<https://github.com/openvinotoolkit/cvat/pull/3827>)
- Helm settings for external psql database were unused by backend (<https://github.com/openvinotoolkit/cvat/pull/3779>)
- Updated WSL setup for development (<https://github.com/openvinotoolkit/cvat/pull/3828>)
- Helm chart config (<https://github.com/openvinotoolkit/cvat/pull/3784>)

### Security

- Fix security issues on the documentation website unsafe use of target blank
  and potential clickjacking on legacy browsers (<https://github.com/openvinotoolkit/cvat/pull/3789>)

## \[1.6.0] - 2021-09-17

### Added

- Added ability to import data from share with cli without copying the data (<https://github.com/openvinotoolkit/cvat/issues/2862>)
- Notification if the browser does not support necessary API
- Added ability to export project as a dataset (<https://github.com/openvinotoolkit/cvat/pull/3365>)
  and project with 3D tasks (<https://github.com/openvinotoolkit/cvat/pull/3502>)
- Additional inline tips in interactors with demo gifs (<https://github.com/openvinotoolkit/cvat/pull/3473>)
- Added intelligent scissors blocking feature (<https://github.com/openvinotoolkit/cvat/pull/3510>)
- Support cloud storage status (<https://github.com/openvinotoolkit/cvat/pull/3386>)
- Support cloud storage preview (<https://github.com/openvinotoolkit/cvat/pull/3386>)
- cvat-core: support cloud storages (<https://github.com/openvinotoolkit/cvat/pull/3313>)

### Changed

- Non-blocking UI when using interactors (<https://github.com/openvinotoolkit/cvat/pull/3473>)
- "Selected opacity" slider now defines opacity level for shapes being drawnSelected opacity (<https://github.com/openvinotoolkit/cvat/pull/3473>)
- Cloud storage creating and updating (<https://github.com/openvinotoolkit/cvat/pull/3386>)
- Way of working with cloud storage content (<https://github.com/openvinotoolkit/cvat/pull/3386>)

### Removed

- Support TEMP_KEY_SECRET_KEY_TOKEN_SET for AWS S3 cloud storage (<https://github.com/openvinotoolkit/cvat/pull/3386>)

### Fixed

- Fixed multiple tasks moving (<https://github.com/openvinotoolkit/cvat/pull/3517>)
- Fixed task creating CLI parameter (<https://github.com/openvinotoolkit/cvat/pull/3519>)
- Fixed import for MOTS format (<https://github.com/openvinotoolkit/cvat/pull/3612>)

## \[1.5.0] - 2021-08-02

### Added

- Support of context images for 2D image tasks (<https://github.com/openvinotoolkit/cvat/pull/3122>)
- Support of cloud storage without copying data into CVAT: server part (<https://github.com/openvinotoolkit/cvat/pull/2620>)
- Filter `is_active` for user list (<https://github.com/openvinotoolkit/cvat/pull/3235>)
- Ability to export/import tasks (<https://github.com/openvinotoolkit/cvat/pull/3056>)
- Add a tutorial for semi-automatic/automatic annotation (<https://github.com/openvinotoolkit/cvat/pull/3124>)
- Explicit "Done" button when drawing any polyshapes (<https://github.com/openvinotoolkit/cvat/pull/3417>)
- Histogram equalization with OpenCV javascript (<https://github.com/openvinotoolkit/cvat/pull/3447>)
- Client-side polyshapes approximation when using semi-automatic interactors & scissors (<https://github.com/openvinotoolkit/cvat/pull/3450>)
- Support of Google Cloud Storage for cloud storage (<https://github.com/openvinotoolkit/cvat/pull/3561>)

### Changed

- Updated manifest format, added meta with related images (<https://github.com/openvinotoolkit/cvat/pull/3122>)
- Update of COCO format documentation (<https://github.com/openvinotoolkit/cvat/pull/3197>)
- Updated Webpack Dev Server config to add proxy (<https://github.com/openvinotoolkit/cvat/pull/3368>)
- Update to Django 3.1.12 (<https://github.com/openvinotoolkit/cvat/pull/3378>)
- Updated visibility for removable points in AI tools (<https://github.com/openvinotoolkit/cvat/pull/3417>)
- Updated UI handling for IOG serverless function (<https://github.com/openvinotoolkit/cvat/pull/3417>)
- Changed Nginx proxy to Traefik in `docker-compose.yml` (<https://github.com/openvinotoolkit/cvat/pull/3409>)
- Simplify the process of deploying CVAT with HTTPS (<https://github.com/openvinotoolkit/cvat/pull/3409>)

### Fixed

- Project page requests took a long time and did many DB queries (<https://github.com/openvinotoolkit/cvat/pull/3223>)
- Fixed Python 3.6 support (<https://github.com/openvinotoolkit/cvat/pull/3258>)
- Incorrect attribute import in tracks (<https://github.com/openvinotoolkit/cvat/pull/3229>)
- Issue "is not a constructor" when create object, save, undo, save, redo save (<https://github.com/openvinotoolkit/cvat/pull/3292>)
- Fix CLI create an infinite loop if git repository responds with failure (<https://github.com/openvinotoolkit/cvat/pull/3267>)
- Bug with sidebar & fullscreen (<https://github.com/openvinotoolkit/cvat/pull/3289>)
- 504 Gateway Time-out on `data/meta` requests (<https://github.com/openvinotoolkit/cvat/pull/3269>)
- TypeError: Cannot read property 'clientX' of undefined when draw cuboids with hotkeys (<https://github.com/openvinotoolkit/cvat/pull/3308>)
- Duplication of the cuboids when redraw them (<https://github.com/openvinotoolkit/cvat/pull/3308>)
- Some code issues in Deep Extreme Cut handler code (<https://github.com/openvinotoolkit/cvat/pull/3325>)
- UI fails when inactive user is assigned to a task/job (<https://github.com/openvinotoolkit/cvat/pull/3343>)
- Calculate precise progress of decoding a video file (<https://github.com/openvinotoolkit/cvat/pull/3381>)
- Falsely successful `cvat_ui` image build in case of OOM error that leads to the default nginx welcome page
  (<https://github.com/openvinotoolkit/cvat/pull/3379>)
- Fixed issue when save filtered object in AAM (<https://github.com/openvinotoolkit/cvat/pull/3401>)
- Context image disappears after undo/redo (<https://github.com/openvinotoolkit/cvat/pull/3416>)
- Using combined data sources (directory and image) when create a task (<https://github.com/openvinotoolkit/cvat/pull/3424>)
- Creating task with labels in project (<https://github.com/openvinotoolkit/cvat/pull/3454>)
- Move task and autoannotation modals were invisible from project page (<https://github.com/openvinotoolkit/cvat/pull/3475>)

## \[1.4.0] - 2021-05-18

### Added

- Documentation on mask annotation (<https://github.com/openvinotoolkit/cvat/pull/3044>)
- Hotkeys to switch a label of existing object or to change default label (for objects created with N) (<https://github.com/openvinotoolkit/cvat/pull/3070>)
- A script to convert some kinds of DICOM files to regular images (<https://github.com/openvinotoolkit/cvat/pull/3095>)
- Helm chart prototype (<https://github.com/openvinotoolkit/cvat/pull/3102>)
- Initial implementation of moving tasks between projects (<https://github.com/openvinotoolkit/cvat/pull/3164>)

### Changed

- Place of migration logger initialization (<https://github.com/openvinotoolkit/cvat/pull/3170>)

### Removed

- Kubernetes templates from (<https://github.com/openvinotoolkit/cvat/pull/1962>) due to helm charts (<https://github.com/openvinotoolkit/cvat/pull/3171>)

### Fixed

- Export of instance masks with holes (<https://github.com/openvinotoolkit/cvat/pull/3044>)
- Changing a label on canvas does not work when 'Show object details' enabled (<https://github.com/openvinotoolkit/cvat/pull/3084>)
- Make sure frame unzip web worker correctly terminates after unzipping all images in a requested chunk (<https://github.com/openvinotoolkit/cvat/pull/3096>)
- Reset password link was unavailable before login (<https://github.com/openvinotoolkit/cvat/pull/3140>)
- Manifest: migration (<https://github.com/openvinotoolkit/cvat/pull/3146>)
- Fixed cropping polygon in some corner cases (<https://github.com/openvinotoolkit/cvat/pull/3184>)

## \[1.3.0] - 3/31/2021

### Added

- CLI: Add support for saving annotations in a git repository when creating a task.
- CVAT-3D: support lidar data on the server side (<https://github.com/openvinotoolkit/cvat/pull/2534>)
- GPU support for Mask-RCNN and improvement in its deployment time (<https://github.com/openvinotoolkit/cvat/pull/2714>)
- CVAT-3D: Load all frames corresponding to the job instance
  (<https://github.com/openvinotoolkit/cvat/pull/2645>)
- Intelligent scissors with OpenCV javascript (<https://github.com/openvinotoolkit/cvat/pull/2689>)
- CVAT-3D: Visualize 3D point cloud spaces in 3D View, Top View Side View and Front View (<https://github.com/openvinotoolkit/cvat/pull/2768>)
- [Inside Outside Guidance](https://github.com/shiyinzhang/Inside-Outside-Guidance) serverless
  function for interactive segmentation
- Pre-built [cvat_server](https://hub.docker.com/r/openvino/cvat_server) and
  [cvat_ui](https://hub.docker.com/r/openvino/cvat_ui) images were published on DockerHub (<https://github.com/openvinotoolkit/cvat/pull/2766>)
- Project task subsets (<https://github.com/openvinotoolkit/cvat/pull/2774>)
- Kubernetes templates and guide for their deployment (<https://github.com/openvinotoolkit/cvat/pull/1962>)
- [WiderFace](http://shuoyang1213.me/WIDERFACE/) format support (<https://github.com/openvinotoolkit/cvat/pull/2864>)
- [VGGFace2](https://github.com/ox-vgg/vgg_face2) format support (<https://github.com/openvinotoolkit/cvat/pull/2865>)
- [Backup/Restore guide](cvat/apps/documentation/backup_guide.md) (<https://github.com/openvinotoolkit/cvat/pull/2964>)
- Label deletion from tasks and projects (<https://github.com/openvinotoolkit/cvat/pull/2881>)
- CVAT-3D: Implemented initial cuboid placement in 3D View and select cuboid in Top, Side and Front views
  (<https://github.com/openvinotoolkit/cvat/pull/2891>)
- [Market-1501](https://www.aitribune.com/dataset/2018051063) format support (<https://github.com/openvinotoolkit/cvat/pull/2869>)
- Ability of upload manifest for dataset with images (<https://github.com/openvinotoolkit/cvat/pull/2763>)
- Annotations filters UI using react-awesome-query-builder (<https://github.com/openvinotoolkit/cvat/issues/1418>)
- Storing settings in local storage to keep them between browser sessions (<https://github.com/openvinotoolkit/cvat/pull/3017>)
- [ICDAR](https://rrc.cvc.uab.es/?ch=2) format support (<https://github.com/openvinotoolkit/cvat/pull/2866>)
- Added switcher to maintain polygon crop behavior (<https://github.com/openvinotoolkit/cvat/pull/3021>
- Filters and sorting options for job list, added tooltip for tasks filters (<https://github.com/openvinotoolkit/cvat/pull/3030>)

### Changed

- CLI - task list now returns a list of current tasks. (<https://github.com/openvinotoolkit/cvat/pull/2863>)
- Updated HTTPS install README section (cleanup and described more robust deploy)
- Logstash is improved for using with configurable elasticsearch outputs (<https://github.com/openvinotoolkit/cvat/pull/2531>)
- Bumped nuclio version to 1.5.16 (<https://github.com/openvinotoolkit/cvat/pull/2578>)
- All methods for interactive segmentation accept negative points as well
- Persistent queue added to logstash (<https://github.com/openvinotoolkit/cvat/pull/2744>)
- Improved maintenance of popups visibility (<https://github.com/openvinotoolkit/cvat/pull/2809>)
- Image visualizations settings on canvas for faster access (<https://github.com/openvinotoolkit/cvat/pull/2872>)
- Better scale management of left panel when screen is too small (<https://github.com/openvinotoolkit/cvat/pull/2880>)
- Improved error messages for annotation import (<https://github.com/openvinotoolkit/cvat/pull/2935>)
- Using manifest support instead video meta information and dummy chunks (<https://github.com/openvinotoolkit/cvat/pull/2763>)

### Fixed

- More robust execution of nuclio GPU functions by limiting the GPU memory consumption per worker (<https://github.com/openvinotoolkit/cvat/pull/2714>)
- Kibana startup initialization (<https://github.com/openvinotoolkit/cvat/pull/2659>)
- The cursor jumps to the end of the line when renaming a task (<https://github.com/openvinotoolkit/cvat/pull/2669>)
- SSLCertVerificationError when remote source is used (<https://github.com/openvinotoolkit/cvat/pull/2683>)
- Fixed filters select overflow (<https://github.com/openvinotoolkit/cvat/pull/2614>)
- Fixed tasks in project auto annotation (<https://github.com/openvinotoolkit/cvat/pull/2725>)
- Cuboids are missed in annotations statistics (<https://github.com/openvinotoolkit/cvat/pull/2704>)
- The list of files attached to the task is not displayed (<https://github.com/openvinotoolkit/cvat/pull/2706>)
- A couple of css-related issues (top bar disappear, wrong arrow position on collapse elements) (<https://github.com/openvinotoolkit/cvat/pull/2736>)
- Issue with point region doesn't work in Firefox (<https://github.com/openvinotoolkit/cvat/pull/2727>)
- Fixed cuboid perspective change (<https://github.com/openvinotoolkit/cvat/pull/2733>)
- Annotation page popups (ai tools, drawing) reset state after detecting, tracking, drawing (<https://github.com/openvinotoolkit/cvat/pull/2780>)
- Polygon editing using trailing point (<https://github.com/openvinotoolkit/cvat/pull/2808>)
- Updated the path to python for DL models inside automatic annotation documentation (<https://github.com/openvinotoolkit/cvat/pull/2847>)
- Fixed of receiving function variable (<https://github.com/openvinotoolkit/cvat/pull/2860>)
- Shortcuts with CAPSLOCK enabled and with non-US languages activated (<https://github.com/openvinotoolkit/cvat/pull/2872>)
- Prevented creating several issues for the same object (<https://github.com/openvinotoolkit/cvat/pull/2868>)
- Fixed label editor name field validator (<https://github.com/openvinotoolkit/cvat/pull/2879>)
- An error about track shapes outside of the task frames during export (<https://github.com/openvinotoolkit/cvat/pull/2890>)
- Fixed project search field updating (<https://github.com/openvinotoolkit/cvat/pull/2901>)
- Fixed export error when invalid polygons are present in overlapping frames (<https://github.com/openvinotoolkit/cvat/pull/2852>)
- Fixed image quality option for tasks created from images (<https://github.com/openvinotoolkit/cvat/pull/2963>)
- Incorrect text on the warning when specifying an incorrect link to the issue tracker (<https://github.com/openvinotoolkit/cvat/pull/2971>)
- Updating label attributes when label contains number attributes (<https://github.com/openvinotoolkit/cvat/pull/2969>)
- Crop a polygon if its points are outside the bounds of the image (<https://github.com/openvinotoolkit/cvat/pull/3025>)

## \[1.2.0] - 2021-01-08

### Fixed

- Memory consumption for the task creation process (<https://github.com/openvinotoolkit/cvat/pull/2582>)
- Frame preloading (<https://github.com/openvinotoolkit/cvat/pull/2608>)
- Project cannot be removed from the project page (<https://github.com/openvinotoolkit/cvat/pull/2626>)

## \[1.2.0-beta] - 2020-12-15

### Added

- GPU support and improved documentation for auto annotation (<https://github.com/openvinotoolkit/cvat/pull/2546>)
- Manual review pipeline: issues/comments/workspace (<https://github.com/openvinotoolkit/cvat/pull/2357>)
- Basic projects implementation (<https://github.com/openvinotoolkit/cvat/pull/2255>)
- Documentation on how to mount cloud starage(AWS S3 bucket, Azure container, Google Drive) as FUSE (<https://github.com/openvinotoolkit/cvat/pull/2377>)
- Ability to work with share files without copying inside (<https://github.com/openvinotoolkit/cvat/pull/2377>)
- Tooltips in label selectors (<https://github.com/openvinotoolkit/cvat/pull/2509>)
- Page redirect after login using `next` query parameter (<https://github.com/openvinotoolkit/cvat/pull/2527>)
- [ImageNet](http://www.image-net.org) format support (<https://github.com/openvinotoolkit/cvat/pull/2376>)
- [CamVid](http://mi.eng.cam.ac.uk/research/projects/VideoRec/CamVid/) format support (<https://github.com/openvinotoolkit/cvat/pull/2559>)

### Changed

- PATCH requests from cvat-core submit only changed fields (<https://github.com/openvinotoolkit/cvat/pull/2445>)
- deploy.sh in serverless folder is separated into deploy_cpu.sh and deploy_gpu.sh (<https://github.com/openvinotoolkit/cvat/pull/2546>)
- Bumped nuclio version to 1.5.8
- Migrated to Antd 4.9 (<https://github.com/openvinotoolkit/cvat/pull/2536>)

### Fixed

- Fixed FastRCNN inference bug for images with 4 channels i.e. png (<https://github.com/openvinotoolkit/cvat/pull/2546>)
- Django templates for email and user guide (<https://github.com/openvinotoolkit/cvat/pull/2412>)
- Saving relative paths in dummy chunks instead of absolute (<https://github.com/openvinotoolkit/cvat/pull/2424>)
- Objects with a specific label cannot be displayed if at least one tag with the label exist (<https://github.com/openvinotoolkit/cvat/pull/2435>)
- Wrong attribute can be removed in labels editor (<https://github.com/openvinotoolkit/cvat/pull/2436>)
- UI fails with the error "Cannot read property 'label' of undefined" (<https://github.com/openvinotoolkit/cvat/pull/2442>)
- Exception: "Value must be a user instance" (<https://github.com/openvinotoolkit/cvat/pull/2441>)
- Reset zoom option doesn't work in tag annotation mode (<https://github.com/openvinotoolkit/cvat/pull/2443>)
- Canvas is busy error (<https://github.com/openvinotoolkit/cvat/pull/2437>)
- Projects view layout fix (<https://github.com/openvinotoolkit/cvat/pull/2503>)
- Fixed the tasks view (infinite loading) when it is impossible to get a preview of the task (<https://github.com/openvinotoolkit/cvat/pull/2504>)
- Empty frames navigation (<https://github.com/openvinotoolkit/cvat/pull/2505>)
- TypeError: Cannot read property 'toString' of undefined (<https://github.com/openvinotoolkit/cvat/pull/2517>)
- Extra shapes are drawn after Esc, or G pressed while drawing a region in grouping (<https://github.com/openvinotoolkit/cvat/pull/2507>)
- Reset state (reviews, issues) after logout or changing a job (<https://github.com/openvinotoolkit/cvat/pull/2525>)
- TypeError: Cannot read property 'id' of undefined when updating a task (<https://github.com/openvinotoolkit/cvat/pull/2544>)

## \[1.2.0-alpha] - 2020-11-09

### Added

- Ability to login into CVAT-UI with token from api/v1/auth/login (<https://github.com/openvinotoolkit/cvat/pull/2234>)
- Added layout grids toggling ('ctrl + alt + Enter')
- Added password reset functionality (<https://github.com/opencv/cvat/pull/2058>)
- Ability to work with data on the fly (<https://github.com/opencv/cvat/pull/2007>)
- Annotation in process outline color wheel (<https://github.com/opencv/cvat/pull/2084>)
- On the fly annotation using DL detectors (<https://github.com/opencv/cvat/pull/2102>)
- Displaying automatic annotation progress on a task view (<https://github.com/opencv/cvat/pull/2148>)
- Automatic tracking of bounding boxes using serverless functions (<https://github.com/opencv/cvat/pull/2136>)
- \[Datumaro] CLI command for dataset equality comparison (<https://github.com/opencv/cvat/pull/1989>)
- \[Datumaro] Merging of datasets with different labels (<https://github.com/opencv/cvat/pull/2098>)
- Add FBRS interactive segmentation serverless function (<https://github.com/openvinotoolkit/cvat/pull/2094>)
- Ability to change default behaviour of previous/next buttons of a player.
  It supports regular navigation, searching a frame according to annotations
  filters and searching the nearest frame without any annotations (<https://github.com/openvinotoolkit/cvat/pull/2221>)
- MacOS users notes in CONTRIBUTING.md
- Ability to prepare meta information manually (<https://github.com/openvinotoolkit/cvat/pull/2217>)
- Ability to upload prepared meta information along with a video when creating a task (<https://github.com/openvinotoolkit/cvat/pull/2217>)
- Optional chaining plugin for cvat-canvas and cvat-ui (<https://github.com/openvinotoolkit/cvat/pull/2249>)
- MOTS png mask format support (<https://github.com/openvinotoolkit/cvat/pull/2198>)
- Ability to correct upload video with a rotation record in the metadata (<https://github.com/openvinotoolkit/cvat/pull/2218>)
- User search field for assignee fields (<https://github.com/openvinotoolkit/cvat/pull/2370>)
- Support of mxf videos (<https://github.com/openvinotoolkit/cvat/pull/2514>)

### Changed

- UI models (like DEXTR) were redesigned to be more interactive (<https://github.com/opencv/cvat/pull/2054>)
- Used Ubuntu:20.04 as a base image for CVAT Dockerfile (<https://github.com/opencv/cvat/pull/2101>)
- Right colors of label tags in label mapping when a user runs automatic detection (<https://github.com/openvinotoolkit/cvat/pull/2162>)
- Nuclio became an optional component of CVAT (<https://github.com/openvinotoolkit/cvat/pull/2192>)
- A key to remove a point from a polyshape (Ctrl => Alt) (<https://github.com/openvinotoolkit/cvat/pull/2204>)
- Updated `docker-compose` file version from `2.3` to `3.3`(<https://github.com/openvinotoolkit/cvat/pull/2235>)
- Added auto inference of url schema from host in CLI, if provided (<https://github.com/openvinotoolkit/cvat/pull/2240>)
- Track frames in skips between annotation is presented in MOT and MOTS formats are marked `outside` (<https://github.com/openvinotoolkit/cvat/pull/2198>)
- UI packages installation with `npm ci` instead of `npm install` (<https://github.com/openvinotoolkit/cvat/pull/2350>)

### Removed

- Removed Z-Order flag from task creation process

### Fixed

- Fixed multiple errors which arises when polygon is of length 5 or less (<https://github.com/opencv/cvat/pull/2100>)
- Fixed task creation from PDF (<https://github.com/opencv/cvat/pull/2141>)
- Fixed CVAT format import for frame stepped tasks (<https://github.com/openvinotoolkit/cvat/pull/2151>)
- Fixed the reading problem with large PDFs (<https://github.com/openvinotoolkit/cvat/pull/2154>)
- Fixed unnecessary pyhash dependency (<https://github.com/openvinotoolkit/cvat/pull/2170>)
- Fixed Data is not getting cleared, even after deleting the Task from Django Admin App(<https://github.com/openvinotoolkit/cvat/issues/1925>)
- Fixed blinking message: "Some tasks have not been showed because they do not have any data" (<https://github.com/openvinotoolkit/cvat/pull/2200>)
- Fixed case when a task with 0 jobs is shown as "Completed" in UI (<https://github.com/openvinotoolkit/cvat/pull/2200>)
- Fixed use case when UI throws exception: Cannot read property 'objectType' of undefined #2053 (<https://github.com/openvinotoolkit/cvat/pull/2203>)
- Fixed use case when logs could be saved twice or more times #2202 (<https://github.com/openvinotoolkit/cvat/pull/2203>)
- Fixed issues from #2112 (<https://github.com/openvinotoolkit/cvat/pull/2217>)
- Git application name (renamed to dataset_repo) (<https://github.com/openvinotoolkit/cvat/pull/2243>)
- A problem in exporting of tracks, where tracks could be truncated (<https://github.com/openvinotoolkit/cvat/issues/2129>)
- Fixed CVAT startup process if the user has `umask 077` in .bashrc file (<https://github.com/openvinotoolkit/cvat/pull/2293>)
- Exception: Cannot read property "each" of undefined after drawing a single point (<https://github.com/openvinotoolkit/cvat/pull/2307>)
- Cannot read property 'label' of undefined (Fixed?) (<https://github.com/openvinotoolkit/cvat/pull/2311>)
- Excluded track frames marked `outside` in `CVAT for Images` export (<https://github.com/openvinotoolkit/cvat/pull/2345>)
- 'List of tasks' Kibana visualization (<https://github.com/openvinotoolkit/cvat/pull/2361>)
- An error on exporting not `jpg` or `png` images in TF Detection API format (<https://github.com/openvinotoolkit/datumaro/issues/35>)

## \[1.1.0] - 2020-08-31

### Added

- Siammask tracker as DL serverless function (<https://github.com/opencv/cvat/pull/1988>)
- \[Datumaro] Added model info and source info commands (<https://github.com/opencv/cvat/pull/1973>)
- \[Datumaro] Dataset statistics (<https://github.com/opencv/cvat/pull/1668>)
- Ability to change label color in tasks and predefined labels (<https://github.com/opencv/cvat/pull/2014>)
- \[Datumaro] Multi-dataset merge (<https://github.com/opencv/cvat/pull/1695>)
- Ability to configure email verification for new users (<https://github.com/opencv/cvat/pull/1929>)
- Link to django admin page from UI (<https://github.com/opencv/cvat/pull/2068>)
- Notification message when users use wrong browser (<https://github.com/opencv/cvat/pull/2070>)

### Changed

- Shape coordinates are rounded to 2 digits in dumped annotations (<https://github.com/opencv/cvat/pull/1970>)
- COCO format does not produce polygon points for bbox annotations (<https://github.com/opencv/cvat/pull/1953>)

### Fixed

- Issue loading openvino models for semi-automatic and automatic annotation (<https://github.com/opencv/cvat/pull/1996>)
- Basic functions of CVAT works without activated nuclio dashboard
- Fixed a case in which exported masks could have wrong color order (<https://github.com/opencv/cvat/issues/2032>)
- Fixed error with creating task with labels with the same name (<https://github.com/opencv/cvat/pull/2031>)
- Django RQ dashboard view (<https://github.com/opencv/cvat/pull/2069>)
- Object's details menu settings (<https://github.com/opencv/cvat/pull/2084>)

## \[1.1.0-beta] - 2020-08-03

### Added

- DL models as serverless functions (<https://github.com/opencv/cvat/pull/1767>)
- Source type support for tags, shapes and tracks (<https://github.com/opencv/cvat/pull/1192>)
- Source type support for CVAT Dumper/Loader (<https://github.com/opencv/cvat/pull/1192>)
- Intelligent polygon editing (<https://github.com/opencv/cvat/pull/1921>)
- Support creating multiple jobs for each task through python cli (<https://github.com/opencv/cvat/pull/1950>)
- python cli over https (<https://github.com/opencv/cvat/pull/1942>)
- Error message when plugins weren't able to initialize instead of infinite loading (<https://github.com/opencv/cvat/pull/1966>)
- Ability to change user password (<https://github.com/opencv/cvat/pull/1954>)

### Changed

- Smaller object details (<https://github.com/opencv/cvat/pull/1877>)
- `COCO` format does not convert bboxes to polygons on export (<https://github.com/opencv/cvat/pull/1953>)
- It is impossible to submit a DL model in OpenVINO format using UI.
  Now you can deploy new models on the server using serverless functions
  (<https://github.com/opencv/cvat/pull/1767>)
- Files and folders under share path are now alphabetically sorted

### Removed

- Removed OpenVINO and CUDA components because they are not necessary anymore (<https://github.com/opencv/cvat/pull/1767>)
- Removed the old UI code (<https://github.com/opencv/cvat/pull/1964>)

### Fixed

- Some objects aren't shown on canvas sometimes. For example after propagation on of objects is invisible (<https://github.com/opencv/cvat/pull/1834>)
- CVAT doesn't offer to restore state after an error (<https://github.com/opencv/cvat/pull/1874>)
- Cannot read property 'shapeType' of undefined because of zOrder related issues (<https://github.com/opencv/cvat/pull/1874>)
- Cannot read property 'pinned' of undefined because of zOrder related issues (<https://github.com/opencv/cvat/pull/1874>)
- Do not iterate over hidden objects in aam (which are invisible because of zOrder) (<https://github.com/opencv/cvat/pull/1874>)
- Cursor position is reset after changing a text field (<https://github.com/opencv/cvat/pull/1874>)
- Hidden points and cuboids can be selected to be grouped (<https://github.com/opencv/cvat/pull/1874>)
- `outside` annotations should not be in exported images (<https://github.com/opencv/cvat/issues/1620>)
- `CVAT for video format` import error with interpolation (<https://github.com/opencv/cvat/issues/1893>)
- `Image compression` definition mismatch (<https://github.com/opencv/cvat/issues/1900>)
- Points are duplicated during polygon interpolation sometimes (<https://github.com/opencv/cvat/pull/1892>)
- When redraw a shape with activated autobordering, previous points are visible (<https://github.com/opencv/cvat/pull/1892>)
- No mapping between side object element and context menu in some attributes (<https://github.com/opencv/cvat/pull/1923>)
- Interpolated shapes exported as `keyframe = True` (<https://github.com/opencv/cvat/pull/1937>)
- Stylelint filetype scans (<https://github.com/opencv/cvat/pull/1952>)
- Fixed toolip closing issue (<https://github.com/opencv/cvat/pull/1955>)
- Clearing frame cache when close a task (<https://github.com/opencv/cvat/pull/1966>)
- Increase rate of throttling policy for unauthenticated users (<https://github.com/opencv/cvat/pull/1969>)

## \[1.1.0-alpha] - 2020-06-30

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
- Supported import and export or single boxes in MOT format (<https://github.com/opencv/cvat/pull/1764>)
- \[Datumaro] Added `stats` command, which shows some dataset statistics
  like image mean and std (<https://github.com/opencv/cvat/pull/1734>)
- Add option to upload annotations upon task creation on CLI
- Polygon and polylines interpolation (<https://github.com/opencv/cvat/pull/1571>)
- Ability to redraw shape from scratch (Shift + N) for an activated shape (<https://github.com/opencv/cvat/pull/1571>)
- Highlights for the first point of a polygon/polyline and direction (<https://github.com/opencv/cvat/pull/1571>)
- Ability to change orientation for poylgons/polylines in context menu (<https://github.com/opencv/cvat/pull/1571>)
- Ability to set the first point for polygons in points context menu (<https://github.com/opencv/cvat/pull/1571>)
- Added new tag annotation workspace (<https://github.com/opencv/cvat/pull/1570>)
- Appearance block in attribute annotation mode (<https://github.com/opencv/cvat/pull/1820>)
- Keyframe navigations and some switchers in attribute annotation mode (<https://github.com/opencv/cvat/pull/1820>)
- \[Datumaro] Added `convert` command to convert datasets directly (<https://github.com/opencv/cvat/pull/1837>)
- \[Datumaro] Added an option to specify image extension when exporting datasets (<https://github.com/opencv/cvat/pull/1799>)
- \[Datumaro] Added image copying when exporting datasets, if possible (<https://github.com/opencv/cvat/pull/1799>)

### Changed

- Removed information about e-mail from the basic user information (<https://github.com/opencv/cvat/pull/1627>)
- Update https install manual. Makes it easier and more robust.
  Includes automatic renewing of lets encrypt certificates.
- Settings page move to the modal. (<https://github.com/opencv/cvat/pull/1705>)
- Implemented import and export of annotations with relative image paths (<https://github.com/opencv/cvat/pull/1463>)
- Using only single click to start editing or remove a point (<https://github.com/opencv/cvat/pull/1571>)
- Added support for attributes in VOC XML format (<https://github.com/opencv/cvat/pull/1792>)
- Added annotation attributes in COCO format (<https://github.com/opencv/cvat/pull/1782>)
- Colorized object items in the side panel (<https://github.com/opencv/cvat/pull/1753>)
- \[Datumaro] Annotation-less files are not generated anymore in COCO format, unless tasks explicitly requested (<https://github.com/opencv/cvat/pull/1799>)

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

## \[1.0.0] - 2020-05-29

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
- REST API: updated `GET /task/<id>/annotations`: parameters are `format`, `filename`
  (now optional), `action` (optional) (<https://github.com/opencv/cvat/pull/1352>)
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
- Exporting frame stepped task
  (<https://github.com/opencv/cvat/issues/1294>, <https://github.com/opencv/cvat/issues/1334>)
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
- Deep extreme cut request is sent when draw any shape with Make AI polygon option enabled (<https://github.com/opencv/cvat/pull/1573>)
- Fixed an error when exporting a task with cuboids to any format except CVAT (<https://github.com/opencv/cvat/pull/1577>)
- Synchronization with remote git repo (<https://github.com/opencv/cvat/pull/1582>)
- A problem with mask to polygons conversion when polygons are too small (<https://github.com/opencv/cvat/pull/1581>)
- Unable to upload video with uneven size (<https://github.com/opencv/cvat/pull/1594>)
- Fixed an issue with `z_order` having no effect on segmentations (<https://github.com/opencv/cvat/pull/1589>)

### Security

- Permission group whitelist check for analytics view (<https://github.com/opencv/cvat/pull/1608>)

## \[1.0.0-beta.2] - 2020-04-30

### Added

- Re-Identification algorithm to merging bounding boxes automatically to the new UI (<https://github.com/opencv/cvat/pull/1406>)
- Methods `import` and `export` to import/export raw annotations for Job and Task in `cvat-core` (<https://github.com/opencv/cvat/pull/1406>)
- Versioning of client packages (`cvat-core`, `cvat-canvas`, `cvat-ui`). Initial versions are set to 1.0.0 (<https://github.com/opencv/cvat/pull/1448>)
- Cuboids feature was migrated from old UI to new one. (<https://github.com/opencv/cvat/pull/1451>)

### Removed

- Annotation conversion utils, currently supported natively via Datumaro framework
  (<https://github.com/opencv/cvat/pull/1477>)

### Fixed

- Auto annotation, TF annotation and Auto segmentation apps (<https://github.com/opencv/cvat/pull/1409>)
- Import works with truncated images now: "OSError:broken data stream" on corrupt images
  (<https://github.com/opencv/cvat/pull/1430>)
- Hide functionality (H) doesn't work (<https://github.com/opencv/cvat/pull/1445>)
- The highlighted attribute doesn't correspond to the chosen attribute in AAM (<https://github.com/opencv/cvat/pull/1445>)
- Inconvinient image shaking while drawing a polygon (hold Alt key during drawing/editing/grouping to drag an image) (<https://github.com/opencv/cvat/pull/1445>)
- Filter property "shape" doesn't work and extra operator in description (<https://github.com/opencv/cvat/pull/1445>)
- Block of text information doesn't disappear after deactivating for locked shapes (<https://github.com/opencv/cvat/pull/1445>)
- Annotation uploading fails in annotation view (<https://github.com/opencv/cvat/pull/1445>)
- UI freezes after canceling pasting with escape (<https://github.com/opencv/cvat/pull/1445>)
- Duplicating keypoints in COCO export (<https://github.com/opencv/cvat/pull/1435>)
- CVAT new UI: add arrows on a mouse cursor (<https://github.com/opencv/cvat/pull/1391>)
- Delete point bug (in new UI) (<https://github.com/opencv/cvat/pull/1440>)
- Fix apache startup after PC restart (<https://github.com/opencv/cvat/pull/1467>)
- Open task button doesn't work (<https://github.com/opencv/cvat/pull/1474>)

## \[1.0.0-beta.1] - 2020-04-15

### Added

- Special behaviour for attribute value `__undefined__` (invisibility, no shortcuts to be set in AAM)
- Dialog window with some helpful information about using filters
- Ability to display a bitmap in the new UI
- Button to reset colors settings (brightness, saturation, contrast) in the new UI
- Option to display shape text always
- Dedicated message with clarifications when share is unmounted (<https://github.com/opencv/cvat/pull/1373>)
- Ability to create one tracked point (<https://github.com/opencv/cvat/pull/1383>)
- Ability to draw/edit polygons and polylines with automatic bordering feature
  (<https://github.com/opencv/cvat/pull/1394>)
- Tutorial: instructions for CVAT over HTTPS
- Deep extreme cut (semi-automatic segmentation) to the new UI (<https://github.com/opencv/cvat/pull/1398>)

### Changed

- Increase preview size of a task till 256, 256 on the server
- Public ssh-keys are displayed in a dedicated window instead of console when create a task with a repository
- React UI is the primary UI

### Fixed

- Cleaned up memory in Auto Annotation to enable long running tasks on videos
- New shape is added when press `esc` when drawing instead of cancellation
- Dextr segmentation doesn't work.
- `FileNotFoundError` during dump after moving format files
- CVAT doesn't append outside shapes when merge polyshapes in old UI
- Layout sometimes shows double scroll bars on create task, dashboard and settings pages
- UI fails after trying to change frame during resizing, dragging, editing
- Hidden points (or outsided) are visible after changing a frame
- Merge is allowed for points, but clicks on points conflict with frame dragging logic
- Removed objects are visible for search
- Add missed task_id and job_id fields into exception logs for the new UI (<https://github.com/opencv/cvat/pull/1372>)
- UI fails when annotations saving occurs during drag/resize/edit (<https://github.com/opencv/cvat/pull/1383>)
- Multiple savings when hold Ctrl+S (a lot of the same copies of events were sent with the same working time)
  (<https://github.com/opencv/cvat/pull/1383>)
- UI doesn't have any reaction when git repos synchronization failed (<https://github.com/opencv/cvat/pull/1383>)
- Bug when annotations cannot be saved after (delete - save - undo - save) (<https://github.com/opencv/cvat/pull/1383>)
- VOC format exports Upper case labels correctly in lower case (<https://github.com/opencv/cvat/pull/1379>)
- Fixed polygon exporting bug in COCO dataset (<https://github.com/opencv/cvat/issues/1387>)
- Task creation from remote files (<https://github.com/opencv/cvat/pull/1392>)
- Job cannot be opened in some cases when the previous job was failed during opening
  (<https://github.com/opencv/cvat/issues/1403>)
- Deactivated shape is still highlighted on the canvas (<https://github.com/opencv/cvat/issues/1403>)
- AttributeError: 'tuple' object has no attribute 'read' in ReID algorithm (<https://github.com/opencv/cvat/issues/1403>)
- Wrong semi-automatic segmentation near edges of an image (<https://github.com/opencv/cvat/issues/1403>)
- Git repos paths (<https://github.com/opencv/cvat/pull/1400>)
- Uploading annotations for tasks with multiple jobs (<https://github.com/opencv/cvat/pull/1396>)

## \[1.0.0-alpha] - 2020-03-31

### Added

- Data streaming using chunks (<https://github.com/opencv/cvat/pull/1007>)
- New UI: showing file names in UI (<https://github.com/opencv/cvat/pull/1311>)
- New UI: delete a point from context menu (<https://github.com/opencv/cvat/pull/1292>)

### Fixed

- Git app cannot clone a repository (<https://github.com/opencv/cvat/pull/1330>)
- New UI: preview position in task details (<https://github.com/opencv/cvat/pull/1312>)
- AWS deployment (<https://github.com/opencv/cvat/pull/1316>)

## \[0.6.1] - 2020-03-21

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

## \[0.6.0] - 2020-03-15

### Added

- Server only support for projects. Extend REST API v1 (/api/v1/projects\*)
- Ability to get basic information about users without admin permissions ([#750](https://github.com/opencv/cvat/issues/750))
- Changed REST API: removed PUT and added DELETE methods for /api/v1/users/ID
- Mask-RCNN Auto Annotation Script in OpenVINO format
- Yolo Auto Annotation Script
- Auto segmentation using Mask_RCNN component (Keras+Tensorflow Mask R-CNN Segmentation)
- REST API to export an annotation task (images + annotations)
  [Datumaro](https://github.com/opencv/cvat/tree/develop/datumaro) -
  a framework to build, analyze, debug and visualize datasets
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

## \[0.5.2] - 2019-12-15

### Fixed

- Frozen version of scikit-image==0.15 in requirements.txt because next releases don't support Python 3.5

## \[0.5.1] - 2019-10-17

### Added

- Integration with Zenodo.org (DOI)

## \[0.5.0] - 2019-09-12

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
- Preview for the new CVAT UI (dashboard only) is available: <http://localhost:9080/>
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

## \[0.4.2] - 2019-06-03

### Fixed

- Fixed interaction with the server share in the auto annotation plugin

## \[0.4.1] - 2019-05-14

### Fixed

- JavaScript syntax incompatibility with Google Chrome versions less than 72

## \[0.4.0] - 2019-05-04

### Added

- OpenVINO auto annotation: it is possible to upload a custom model and annotate images automatically.
- Ability to rotate images/video in the client part (Ctrl+R, Shift+Ctrl+R shortcuts) (#305)
- The ReID application for automatic bounding box merging has been added (#299)
- Keyboard shortcuts to switch next/previous default shape type (box, polygon etc) (Alt + <, Alt + >) (#316)
- Converter for VOC now supports interpolation tracks
- REST API (/api/v1/\*, /api/docs)
- Semi-automatic semantic segmentation with the [Deep Extreme Cut](http://www.vision.ee.ethz.ch/~cvlsegmentation/dextr/) work

### Changed

- Propagation setup has been moved from settings to bottom player panel
- Additional events like "Debug Info" or "Fit Image" have been added for analitics
- Optional using LFS for git annotation storages (#314)

### Deprecated

- "Flip images" flag in the create task dialog will be removed.
  Rotation functionality in client part have been added instead.

### Fixed

- Django 2.1.5 (security fix, [CVE-2019-3498](https://nvd.nist.gov/vuln/detail/CVE-2019-3498))
- Several scenarious which cause code 400 after undo/redo/save have been fixed (#315)

## \[0.3.0] - 2018-12-29

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
- Changeable job and task statuses (annotation, validation, completed).
  A job status can be changed manually, a task status is computed automatically based on job statuses (#153)
- Backlink to a task from its job annotation view (#156)
- Buttons lock/hide for labels. They work for all objects with the same label on a current frame (#116)

### Changed

- Polyshape editing method has been improved. You can redraw part of shape instead of points cloning.
- Unified shortcut (Esc) for close any mode instead of different shortcuts (Alt+N, Alt+G, Alt+M etc.).
- Dump file contains information about data source (e.g. video name, archive name, ...)
- Update requests library due to [CVE-2018-18074](https://nvd.nist.gov/vuln/detail/CVE-2018-18074)
- Per task/job permissions to create/access/change/delete tasks and annotations
- Documentation was improved
- Timeout for creating tasks was increased (from 1h to 4h) (#136)
- Drawing has become more convenience. Now it is possible to draw outside an image.
  Shapes will be automatically truncated after drawing process (#202)

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

## \[0.2.0] - 2018-09-28

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

## \[0.1.2] - 2018-08-07

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

## \[0.1.1] - 2018-07-6

### Added

- Links on a screenshot, documentation, screencasts into README.md
- CONTRIBUTORS.md

### Fixed

- GitHub documentation

## \[0.1.0] - 2018-06-29

### Added

- Initial version
