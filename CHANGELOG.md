# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## \[2.0.0] - Unreleased
### Added
- Add additional environment variables for Nuclio configuration (<https://github.com/openvinotoolkit/cvat/pull/3894>)
- Add KITTI segmentation and detection format (<https://github.com/openvinotoolkit/cvat/pull/3757>)
- Add LFW format (<https://github.com/openvinotoolkit/cvat/pull/3770>)
- Add Cityscapes format (<https://github.com/openvinotoolkit/cvat/pull/3758>)
- Add Open Images V6 format (<https://github.com/openvinotoolkit/cvat/pull/3679>)
- Rotated bounding boxes (<https://github.com/openvinotoolkit/cvat/pull/3832>)
- Player option: Smooth image when zoom-in, enabled by default (<https://github.com/openvinotoolkit/cvat/pull/3933>)
- Google Cloud Storage support in UI (<https://github.com/openvinotoolkit/cvat/pull/3919>)
- Add project tasks paginations (<https://github.com/openvinotoolkit/cvat/pull/3910>)
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
- Basic page with jobs list, basic filtration to this list (<https://github.com/openvinotoolkit/cvat/pull/4258>)
- Added OpenCV.js TrackerMIL as tracking tool (<https://github.com/openvinotoolkit/cvat/pull/4200>)
- Ability to continue working from the latest frame where an annotator was before (<https://github.com/openvinotoolkit/cvat/pull/4297>)


### Changed
- Users don't have access to a task object anymore if they are assigneed only on some jobs of the task (<https://github.com/openvinotoolkit/cvat/pull/3788>)
- Different resources (tasks, projects) are not visible anymore for all CVAT instance users by default (<https://github.com/openvinotoolkit/cvat/pull/3788>)
- API versioning scheme: using accept header versioning instead of namespace versioning (<https://github.com/openvinotoolkit/cvat/pull/4239>)
- Replaced 'django_sendfile' with 'django_sendfile2' (<https://github.com/openvinotoolkit/cvat/pull/4267>)
- Use drf-spectacular instead of drf-yasg for swagger documentation (<https://github.com/openvinotoolkit/cvat/pull/4210>)

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

### Security
- Updated ELK to 6.8.23 which uses log4j 2.17.1 (<https://github.com/openvinotoolkit/cvat/pull/4206>)

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
- Notification if the browser does not support nesassary API
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

## Template

```
## \[Unreleased]
### Added
- TDB

### Changed
- TDB

### Deprecated
- TDB

### Removed
- TDB

### Fixed
- TDB

### Security
- TDB
```
