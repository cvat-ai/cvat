/*
* Copyright (C) 2019 Intel Corporation
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
        * Object visibility states
        * @enum {string}
        * @name ObjectShape
        * @memberof module:API.cvat.enums
        * @property {string} ALL 'all'
        * @property {string} SHAPE 'shape'
        * @property {string} NONE 'none'
        * @readonly
    */
    const VisibleState = Object.freeze({
        ALL: 'all',
        SHAPE: 'shape',
        NONE: 'none',
    });

    /**
        * Event types
        * @enum {number}
        * @name LogType
        * @memberof module:API.cvat.enums
        * @property {number} pasteObject 0
        * @property {number} changeAttribute 1
        * @property {number} dragObject 2
        * @property {number} deleteObject 3
        * @property {number} pressShortcut 4
        * @property {number} resizeObject 5
        * @property {number} sendLogs 6
        * @property {number} saveJob 7
        * @property {number} jumpFrame 8
        * @property {number} drawObject 9
        * @property {number} changeLabel 10
        * @property {number} sendTaskInfo 11
        * @property {number} loadJob 12
        * @property {number} moveImage 13
        * @property {number} zoomImage 14
        * @property {number} lockObject 15
        * @property {number} mergeObjects 16
        * @property {number} copyObject 17
        * @property {number} propagateObject 18
        * @property {number} undoAction 19
        * @property {number} redoAction 20
        * @property {number} sendUserActivity 21
        * @property {number} sendException 22
        * @property {number} changeFrame 23
        * @property {number} debugInfo 24
        * @property {number} fitImage 25
        * @property {number} rotateImage 26
        * @readonly
    */
    const LogType = {
        pasteObject: 0,
        changeAttribute: 1,
        dragObject: 2,
        deleteObject: 3,
        pressShortcut: 4,
        resizeObject: 5,
        sendLogs: 6,
        saveJob: 7,
        jumpFrame: 8,
        drawObject: 9,
        changeLabel: 10,
        sendTaskInfo: 11,
        loadJob: 12,
        moveImage: 13,
        zoomImage: 14,
        lockObject: 15,
        mergeObjects: 16,
        copyObject: 17,
        propagateObject: 18,
        undoAction: 19,
        redoAction: 20,
        sendUserActivity: 21,
        sendException: 22,
        changeFrame: 23,
        debugInfo: 24,
        fitImage: 25,
        rotateImage: 26,
    };

    module.exports = {
        ShareFileType,
        TaskStatus,
        TaskMode,
        AttributeType,
        ObjectType,
        ObjectShape,
        VisibleState,
        LogType,
    };
})();
