/*
* Copyright (C) 2019-2020 Intel Corporation
* SPDX-License-Identifier: MIT
*/

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
        * @readonly
    */
    const ObjectShape = Object.freeze({
        RECTANGLE: 'rectangle',
        POLYGON: 'polygon',
        POLYLINE: 'polyline',
        POINTS: 'points',
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
        MERGED_OBJECTS: 'Merged objects',
        SPLITTED_TRACK: 'Splitted track',
        GROUPED_OBJECTS: 'Grouped objects',
        CREATED_OBJECTS: 'Created objects',
        REMOVED_OBJECT: 'Removed object',
    });

    /**
        * Array of hex colors
        * @name colors
        * @memberof module:API.cvat.enums
        * @type {string[]}
        * @readonly
    */
    const colors = [
        '#FF355E', '#E936A7', '#FD5B78', '#FF007C', '#FF00CC', '#66FF66',
        '#50BFE6', '#CCFF00', '#FFFF66', '#FF9966', '#FF6037', '#FFCC33',
        '#AAF0D1', '#FF3855', '#FFF700', '#A7F432', '#FF5470', '#FAFA37',
        '#FF7A00', '#FF9933', '#AFE313', '#00CC99', '#FF5050', '#733380',
    ];

    module.exports = {
        ShareFileType,
        TaskStatus,
        TaskMode,
        AttributeType,
        ObjectType,
        ObjectShape,
        LogType,
        HistoryActions,
        colors,
    };
})();
