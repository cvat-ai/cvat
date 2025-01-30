// Copyright (C) 2019-2022 Intel Corporation
// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier = MIT

export enum ShareFileType {
    DIR = 'DIR',
    REG = 'REG',
}

export enum ChunkType {
    IMAGESET = 'imageset',
    VIDEO = 'video',
}

export enum TaskStatus {
    ANNOTATION = 'annotation',
    VALIDATION = 'validation',
    COMPLETED = 'completed',
}

export type ProjectStatus = TaskStatus;

export enum JobStage {
    ANNOTATION = 'annotation',
    VALIDATION = 'validation',
    ACCEPTANCE = 'acceptance',
}

export enum JobState {
    NEW = 'new',
    IN_PROGRESS = 'in progress',
    COMPLETED = 'completed',
    REJECTED = 'rejected',
}

export enum JobType {
    ANNOTATION = 'annotation',
    GROUND_TRUTH = 'ground_truth',
    CONSENSUS_REPLICA = 'consensus_replica',
}

export enum DimensionType {
    DIMENSION_2D = '2d',
    DIMENSION_3D = '3d',
}

export enum RQStatus {
    QUEUED = 'queued',
    STARTED = 'started',
    FINISHED = 'finished',
    FAILED = 'failed',
    UNKNOWN = 'unknown',
}

export enum TaskMode {
    ANNOTATION = 'annotation',
    INTERPOLATION = 'interpolation',
}

export enum AttributeType {
    CHECKBOX = 'checkbox',
    RADIO = 'radio',
    SELECT = 'select',
    NUMBER = 'number',
    TEXT = 'text',
}

export enum ObjectType {
    TAG = 'tag',
    SHAPE = 'shape',
    TRACK = 'track',
}

export enum ShapeType {
    RECTANGLE = 'rectangle',
    POLYGON = 'polygon',
    POLYLINE = 'polyline',
    POINTS = 'points',
    ELLIPSE = 'ellipse',
    CUBOID = 'cuboid',
    SKELETON = 'skeleton',
    MASK = 'mask',
}

export enum Source {
    MANUAL = 'manual',
    SEMI_AUTO = 'semi-auto',
    AUTO = 'auto',
    FILE = 'file',
    GT = 'Ground truth',
}

export enum EventScope {
    loadTool = 'load:cvat',

    loadJob = 'load:job',
    loadWorkspace = 'load:workspace',
    saveJob = 'save:job',
    exception = 'send:exception',

    drawObject = 'draw:object',
    pasteObject = 'paste:object',
    copyObject = 'copy:object',
    propagateObject = 'propagate:object',
    dragObject = 'drag:object',
    resizeObject = 'resize:object',
    deleteObject = 'delete:object',
    mergeObjects = 'merge:objects',
    splitObjects = 'split:objects',
    groupObjects = 'group:objects',
    sliceObject = 'slice:object',
    joinObjects = 'join:objects',

    changeFrame = 'change:frame',
    zoomImage = 'zoom:image',
    fitImage = 'fit:image',
    rotateImage = 'rotate:image',

    undoAction = 'action:undo',
    redoAction = 'action:redo',

    debugInfo = 'debug:info',

    annotationsAction = 'run:annotations_action',
    clickElement = 'click:element',
}

export enum HistoryActions {
    CHANGED_LABEL = 'Changed label',
    CHANGED_ATTRIBUTES = 'Changed attributes',
    CHANGED_POINTS = 'Changed points',
    CHANGED_ROTATION = 'Object rotated',
    CHANGED_OUTSIDE = 'Changed outside',
    CHANGED_OCCLUDED = 'Changed occluded',
    CHANGED_ZORDER = 'Changed z-order',
    CHANGED_KEYFRAME = 'Changed keyframe',
    CHANGED_LOCK = 'Changed lock',
    CHANGED_PINNED = 'Changed pinned',
    CHANGED_COLOR = 'Changed color',
    CHANGED_HIDDEN = 'Changed hidden',
    CHANGED_SOURCE = 'Changed source',
    MERGED_OBJECTS = 'Merged objects',
    JOINED_OBJECTS = 'Joined objects',
    SLICED_OBJECT = 'Sliced object',
    SPLITTED_TRACK = 'Splitted track',
    GROUPED_OBJECTS = 'Grouped objects',
    CREATED_OBJECTS = 'Created objects',
    REMOVED_OBJECT = 'Removed object',
    REMOVED_FRAME = 'Removed frame',
    RESTORED_FRAME = 'Restored frame',
    COMMIT_ANNOTATIONS = 'Commit annotations',
}

export enum ModelKind {
    DETECTOR = 'detector',
    INTERACTOR = 'interactor',
    TRACKER = 'tracker',
    REID = 'reid',
}

export enum ModelProviders {
    CVAT = 'cvat',
}

export enum ModelReturnType {
    RECTANGLE = 'rectangle',
    TAG = 'tag',
    POLYGON = 'polygon',
    MASK = 'mask',
}

export const colors = [
    '#33ddff',
    '#fa3253',
    '#34d1b7',
    '#ff007c',
    '#ff6037',
    '#ddff33',
    '#24b353',
    '#b83df5',
    '#66ff66',
    '#32b7fa',
    '#ffcc33',
    '#83e070',
    '#fafa37',
    '#5986b3',
    '#8c78f0',
    '#ff6a4d',
    '#f078f0',
    '#2a7dd1',
    '#b25050',
    '#cc3366',
    '#cc9933',
    '#aaf0d1',
    '#ff00cc',
    '#3df53d',
    '#fa32b7',
    '#fa7dbb',
    '#ff355e',
    '#f59331',
    '#3d3df5',
    '#733380',
];

export enum CloudStorageProviderType {
    AWS_S3_BUCKET = 'AWS_S3_BUCKET',
    AZURE_CONTAINER = 'AZURE_CONTAINER',
    GOOGLE_CLOUD_STORAGE = 'GOOGLE_CLOUD_STORAGE',
}

export enum CloudStorageCredentialsType {
    KEY_SECRET_KEY_PAIR = 'KEY_SECRET_KEY_PAIR',
    ACCOUNT_NAME_TOKEN_PAIR = 'ACCOUNT_NAME_TOKEN_PAIR',
    ANONYMOUS_ACCESS = 'ANONYMOUS_ACCESS',
    KEY_FILE_PATH = 'KEY_FILE_PATH',
}

export enum CloudStorageStatus {
    AVAILABLE = 'AVAILABLE',
    NOT_FOUND = 'NOT_FOUND',
    FORBIDDEN = 'FORBIDDEN',
}

export enum MembershipRole {
    WORKER = 'worker',
    SUPERVISOR = 'supervisor',
    MAINTAINER = 'maintainer',
    OWNER = 'owner',
}

export enum SortingMethod {
    LEXICOGRAPHICAL = 'lexicographical',
    NATURAL = 'natural',
    PREDEFINED = 'predefined',
    RANDOM = 'random',
}

export enum StorageLocation {
    LOCAL = 'local',
    CLOUD_STORAGE = 'cloud_storage',
}

export enum WebhookSourceType {
    ORGANIZATION = 'organization',
    PROJECT = 'project',
}

export enum WebhookContentType {
    JSON = 'application/json',
}

export enum LabelType {
    ANY = 'any',
    RECTANGLE = 'rectangle',
    POLYGON = 'polygon',
    POLYLINE = 'polyline',
    POINTS = 'points',
    ELLIPSE = 'ellipse',
    CUBOID = 'cuboid',
    SKELETON = 'skeleton',
    MASK = 'mask',
    TAG = 'tag',
}
