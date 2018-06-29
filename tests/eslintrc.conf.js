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
        'translateSVGPos': true,
        // from base.js
        'showMessage': true,
        'showOverlay': true,
        'confirm': true,
        'dumpAnnotationRequest': true,
        // from collectionController.js, collectionModel.js, collectionView.js
        'CollectionController': true,
        'CollectionModel': true,
        'CollectionView': true,
        // from drawer.js
        'DrawerController': true,
        'DrawerModel': true,
        'DrawerView': true,
        // from interact.js
        'interact': true,
        // from labelsInfo.js
        'LabelsInfo': true,
        // from listener.js
        'Listener': true,
        // from logger.js
        'Logger': true,
        // from merger.js
        'MergerController': true,
        'MergerModel': true,
        'MergerView': true,
        // from trackModel.js
        'MIN_BOX_SIZE': true,
        // from mousetrap.js
        'Mousetrap': true,
        // from objecthash.js
        'objectHash': true,
        // from platform.js
        'platform': true,
        // from playerController.js, playerModel.js, playerView.js
        'PlayerController': true,
        'PlayerModel': true,
        'PlayerView': true,
        // from server.js
        'serverRequest': true,
        'encodeFilePathToURI': true,
        'saveJobOnServer': true,
        // from shapeBuffer.js
        'ShapeBufferController': true,
        'ShapeBufferModel': true,
        'ShapeBufferView': true,
        // from trackController.js, trackModel.js, trackView.js
        'TrackController': true,
        'TrackModel':true,
        'TrackView': true,
        'MIN_BOX_SIZE': true,
        // from trackFilter.js
        'TrackFilterModel': true,
        'TrackFilterController': true,
        'TrackFilterView': true,
        // from userConfig.js
        'userConfig': true,
        // from cookies.js
        'Cookies': true,
        // from api.js
        'setupAPI': true,
        // from dashboard django template
        'maxUploadCount': true,
        'maxUploadSize': true,
    },
};
