// Copyright (C) 2019-2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

(() => {
    /**
     * Share files types
     * @enum {string}
     * @name ShareFileType
     * @memberof module:API.cvat.enums
     * @property {string} DIR 'DIR'
     * @property {string} REG 'REG'
     * @readonly
     */
    const ShareFileType = Object.freeze({
        DIR: 'DIR',
        REG: 'REG',
    });

    /**
     * Task statuses
     * @enum {string}
     * @name TaskStatus
     * @memberof module:API.cvat.enums
     * @property {string} ANNOTATION 'annotation'
     * @property {string} VALIDATION 'validation'
     * @property {string} COMPLETED 'completed'
     * @readonly
     */
    const TaskStatus = Object.freeze({
        ANNOTATION: 'annotation',
        VALIDATION: 'validation',
        COMPLETED: 'completed',
    });

    /**
     * List of RQ statuses
     * @enum {string}
     * @name RQStatus
     * @memberof module:API.cvat.enums
     * @property {string} QUEUED 'queued'
     * @property {string} STARTED 'started'
     * @property {string} FINISHED 'finished'
     * @property {string} FAILED 'failed'
     * @property {string} UNKNOWN 'unknown'
     * @readonly
     */
    const RQStatus = Object.freeze({
        QUEUED: 'queued',
        STARTED: 'started',
        FINISHED: 'finished',
        FAILED: 'failed',
        UNKNOWN: 'unknown',
    });

    /**
     * Task modes
     * @enum {string}
     * @name TaskMode
     * @memberof module:API.cvat.enums
     * @property {string} ANNOTATION 'annotation'
     * @property {string} INTERPOLATION 'interpolation'
     * @readonly
     */
    const TaskMode = Object.freeze({
        ANNOTATION: 'annotation',
        INTERPOLATION: 'interpolation',
    });

    /**
     * Attribute types
     * @enum {string}
     * @name AttributeType
     * @memberof module:API.cvat.enums
     * @property {string} CHECKBOX 'checkbox'
     * @property {string} SELECT 'select'
     * @property {string} RADIO 'radio'
     * @property {string} NUMBER 'number'
     * @property {string} TEXT 'text'
     * @readonly
     */
    const AttributeType = Object.freeze({
        CHECKBOX: 'checkbox',
        RADIO: 'radio',
        SELECT: 'select',
        NUMBER: 'number',
        TEXT: 'text',
    });

    /**
     * Object types
     * @enum {string}
     * @name ObjectType
     * @memberof module:API.cvat.enums
     * @property {string} TAG 'tag'
     * @property {string} SHAPE 'shape'
     * @property {string} TRACK 'track'
     * @readonly
     */
    const ObjectType = Object.freeze({
        TAG: 'tag',
        SHAPE: 'shape',
        TRACK: 'track',
    });

    /**
     * Object shapes
     * @enum {string}
     * @name ObjectShape
     * @memberof module:API.cvat.enums
     * @property {string} RECTANGLE 'rectangle'
     * @property {string} POLYGON 'polygon'
     * @property {string} POLYLINE 'polyline'
     * @property {string} POINTS 'points'
     * @property {string} CUBOID 'cuboid'
     * @readonly
     */
    const ObjectShape = Object.freeze({
        RECTANGLE: 'rectangle',
        POLYGON: 'polygon',
        POLYLINE: 'polyline',
        POINTS: 'points',
        CUBOID: 'cuboid',
    });

    /**
     * Annotation type
     * @enum {string}
     * @name Source
     * @memberof module:API.cvat.enums
     * @property {string} MANUAL 'manual'
     * @property {string} AUTO 'auto'
     * @readonly
     */
    const Source = Object.freeze({
        MANUAL: 'manual',
        AUTO: 'auto',
    });

    /**
        * Logger event types
        * @enum {string}
        * @name LogType
        * @memberof module:API.cvat.enums
        * @property {string} loadJob Load job
        * @property {string} saveJob Save job
        * @property {string} restoreJob Restore job
        * @property {string} uploadAnnotations Upload annotations
        * @property {string} sendUserActivity Send user activity
        * @property {string} sendException Send exception
        * @property {string} sendTaskInfo Send task info

        * @property {string} drawObject Draw object
        * @property {string} pasteObject Paste object
        * @property {string} copyObject Copy object
        * @property {string} propagateObject Propagate object
        * @property {string} dragObject Drag object
        * @property {string} resizeObject Resize object
        * @property {string} deleteObject Delete object
        * @property {string} lockObject Lock object
        * @property {string} mergeObjects Merge objects
        * @property {string} changeAttribute Change attribute
        * @property {string} changeLabel Change label

        * @property {string} changeFrame Change frame
        * @property {string} moveImage Move image
        * @property {string} zoomImage Zoom image
        * @property {string} fitImage Fit image
        * @property {string} rotateImage Rotate image

        * @property {string} undoAction Undo action
        * @property {string} redoAction Redo action

        * @property {string} pressShortcut Press shortcut
        * @property {string} debugInfo Debug info
        * @readonly
    */
    const LogType = Object.freeze({
        loadJob: 'Load job',
        saveJob: 'Save job',
        restoreJob: 'Restore job',
        uploadAnnotations: 'Upload annotations',
        sendUserActivity: 'Send user activity',
        sendException: 'Send exception',
        sendTaskInfo: 'Send task info',

        drawObject: 'Draw object',
        pasteObject: 'Paste object',
        copyObject: 'Copy object',
        propagateObject: 'Propagate object',
        dragObject: 'Drag object',
        resizeObject: 'Resize object',
        deleteObject: 'Delete object',
        lockObject: 'Lock object',
        mergeObjects: 'Merge objects',
        changeAttribute: 'Change attribute',
        changeLabel: 'Change label',

        changeFrame: 'Change frame',
        moveImage: 'Move image',
        zoomImage: 'Zoom image',
        fitImage: 'Fit image',
        rotateImage: 'Rotate image',

        undoAction: 'Undo action',
        redoAction: 'Redo action',

        pressShortcut: 'Press shortcut',
        debugInfo: 'Debug info',
    });

    /**
     * Types of actions with annotations
     * @enum {string}
     * @name HistoryActions
     * @memberof module:API.cvat.enums
     * @property {string} CHANGED_LABEL Changed label
     * @property {string} CHANGED_ATTRIBUTES Changed attributes
     * @property {string} CHANGED_POINTS Changed points
     * @property {string} CHANGED_OUTSIDE Changed outside
     * @property {string} CHANGED_OCCLUDED Changed occluded
     * @property {string} CHANGED_ZORDER Changed z-order
     * @property {string} CHANGED_LOCK Changed lock
     * @property {string} CHANGED_COLOR Changed color
     * @property {string} CHANGED_HIDDEN Changed hidden
     * @property {string} CHANGED_SOURCE Changed source
     * @property {string} MERGED_OBJECTS Merged objects
     * @property {string} SPLITTED_TRACK Splitted track
     * @property {string} GROUPED_OBJECTS Grouped objects
     * @property {string} CREATED_OBJECTS Created objects
     * @property {string} REMOVED_OBJECT Removed object
     * @readonly
     */
    const HistoryActions = Object.freeze({
        CHANGED_LABEL: 'Changed label',
        CHANGED_ATTRIBUTES: 'Changed attributes',
        CHANGED_POINTS: 'Changed points',
        CHANGED_OUTSIDE: 'Changed outside',
        CHANGED_OCCLUDED: 'Changed occluded',
        CHANGED_ZORDER: 'Changed z-order',
        CHANGED_KEYFRAME: 'Changed keyframe',
        CHANGED_LOCK: 'Changed lock',
        CHANGED_PINNED: 'Changed pinned',
        CHANGED_COLOR: 'Changed color',
        CHANGED_HIDDEN: 'Changed hidden',
        CHANGED_SOURCE: 'Changed source',
        MERGED_OBJECTS: 'Merged objects',
        SPLITTED_TRACK: 'Splitted track',
        GROUPED_OBJECTS: 'Grouped objects',
        CREATED_OBJECTS: 'Created objects',
        REMOVED_OBJECT: 'Removed object',
    });

    /**
     * Enum string values.
     * @name ModelType
     * @memberof module:API.cvat.enums
     * @enum {string}
     */
    const ModelType = {
        DETECTOR: 'detector',
        INTERACTOR: 'interactor',
        TRACKER: 'tracker',
    };

    /**
     * Array of hex colors
     * @name colors
     * @memberof module:API.cvat.enums
     * @type {string[]}
     * @readonly
     */
    const colors = [
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

    module.exports = {
        ShareFileType,
        TaskStatus,
        TaskMode,
        AttributeType,
        ObjectType,
        ObjectShape,
        LogType,
        ModelType,
        HistoryActions,
        RQStatus,
        colors,
        Source,
    };
})();
