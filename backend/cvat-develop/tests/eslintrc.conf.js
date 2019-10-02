/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

module.exports = {
    'env': {
        'browser': true,
        'es6': true,
        'jquery': true,
        'qunit': true,
    },
    "extends": "eslint:recommended",
    'rules': {
        'indent': [
            'warn',
            4
        ],
        'linebreak-style': [
            'error',
            'unix'
        ],
        'semi': [
            'warn'
        ],
        'no-extra-semi': [
            'warn'
        ],
        'no-console': [
            'warn'
        ],
    },
    'globals': {
        // from attributeAnnotationMode.js
        'AAMController': true,
        'AAMModel': true,
        'AAMView': true,
        'AAMUndefinedKeyword': true,
        // from annotationParser.js
        'AnnotationParser': true,
        // from annotationUI.js
        'callAnnotationUI': true,
        'blurAllElements': true,
        'drawBoxSize': true,
        'copyToClipboard': true,
        // from base.js
        'showMessage': true,
        'showOverlay': true,
        'confirm': true,
        'dumpAnnotationRequest': true,
        'createExportContainer': true,
        'ExportType': true,
        'getExportTargetContainer': true,
        // from idGenerator.js
        'IncrementIdGenerator': true,
        'ConstIdGenerator': true,
        // from shapeCollection.js
        'ShapeCollectionModel': true,
        'ShapeCollectionController': true,
        'ShapeCollectionView': true,
        // from shapeCreator.js
        'ShapeCreatorModel': true,
        'ShapeCreatorController': true,
        'ShapeCreatorView': true,
        // from shapeGrouper.js
        'ShapeGrouperModel': true,
        'ShapeGrouperController': true,
        'ShapeGrouperView': true,
        // from labelsInfo.js
        'LabelsInfo': true,
        // from listener.js
        'Listener': true,
        // from logger.js
        'Logger': true,
        // from shapeMerger.js
        'ShapeMergerModel': true,
        'ShapeMergerController': true,
        'ShapeMergerView': true,
        // from shapes.js
        'PolyShapeModel': true,
        'PolyShapeView': true,
        'buildShapeModel': true,
        'buildShapeController': true,
        'buildShapeView': true,
        'STROKE_WIDTH': true,
        'POINT_RADIUS': true,
        'AREA_TRESHOLD': true,
        'SELECT_POINT_STROKE_WIDTH': true,
        // from mousetrap.js
        'Mousetrap': true,
        // from platform.js
        'platform': true,
        // from player.js
        'PlayerController': true,
        'PlayerModel': true,
        'PlayerView': true,
        // from server.js
        'serverRequest': true,
        'saveJobRequest': true,
        // from shapeBuffer.js
        'ShapeBufferController': true,
        'ShapeBufferModel': true,
        'ShapeBufferView': true,
        // from trackFilter.js
        'FilterModel': true,
        'FilterController': true,
        'FilterView': true,
        // from shapeSplitter.js
        'ShapeSplitter': true,
        // from userConfig.js
        'Config': true,
        // from cookies.js
        'Cookies': true,
        // from dashboard django template
        'maxUploadCount': true,
        'maxUploadSize': true,
        // from SVG.js
        'SVG': true,
        // from history.js
        'HistoryModel': true,
        'HistoryController': true,
        'HistoryView': true,
        // from polyshapeEditor.js
        'PolyshapeEditorModel': true,
        'PolyshapeEditorController': true,
        'PolyshapeEditorView': true,
        // from coordinateTranslator
        'CoordinateTranslator': true,
    },
};
