/* exported callAnnotationUI translateSVGPos */
"use strict";

function callAnnotationUI(jobID) {
    initLogger(jobID);

    let loadJobEvent = Logger.addContinuedEvent(Logger.EventType.loadJob);

    serverRequest("/get/job/" + jobID, function(job) {
        serverRequest("get/annotation/job/" + jobID, function(data) {
            buildAnnotationUI(job, data, loadJobEvent);
            $('#loadingOverlay').remove();
        });
    });
}

function initLogger(jobID) {
    if (!Logger.initializeLogger('CVAT', jobID))
    {
        console.error('Could not initialize Logger');
        let message = 'Please immediately report the problem to support team';
        showMessage(message);
    }
    Logger.setTimeThreshold(Logger.EventType.zoomImage);
    Logger.setTimeThreshold(Logger.EventType.dragObject);
    Logger.setTimeThreshold(Logger.EventType.resizeObject);

    serverRequest('/get/username', function(response) {
        Logger.setUsername(response.username);
    });
}

function buildAnnotationUI(job, trackData, loadJobEvent) {
    let labelsInfo = new LabelsInfo(job);
    let annotationParser = new AnnotationParser(labelsInfo, job);

    setupLabelSelector(labelsInfo);
    $('#trackTypeSelect').prop('value', job.mode);

    let trackFilterModel = new TrackFilterModel(labelsInfo);
    let trackFilterController = new TrackFilterController(trackFilterModel);
    new TrackFilterView(trackFilterModel, trackFilterController);

    let collectionModel = new CollectionModel(labelsInfo, job, trackFilterModel);
    collectionModel.importTracks(trackData);

    $('#playerProgress').css('width', $('#player')["0"].clientWidth - 420);

    let playerGeometry = {
        width: $('#playerFrame').width(),
        height: $('#playerFrame').height(),
        left: $('#playerFrame').offset().left,
        top: $('#playerFrame').offset().top
    };
    let playerModel = new PlayerModel(job, playerGeometry);
    let playerController = new PlayerController(playerModel, () => collectionModel.activeTrack,
        (direction) => collectionModel.findFilterFrame(direction),
        playerGeometry, job);

    new PlayerView(playerModel, playerController, job);

    let collectionController = new CollectionController(collectionModel);
    let collectionView = new CollectionView(collectionController, collectionModel, playerModel, labelsInfo);

    let mergerModel = new MergerModel(collectionModel);
    let mergerController = new MergerController(mergerModel);
    let mergerView = new MergerView(mergerModel, mergerController);

    let drawerModel = new DrawerModel(collectionModel);
    let drawerController = new DrawerController(drawerModel);
    let drawerView = new DrawerView(drawerController);

    let shapeBufferModel = new ShapeBufferModel(collectionModel);
    let shapeBufferController = new ShapeBufferController(shapeBufferModel);
    let shapeBufferView = new ShapeBufferView(shapeBufferController);

    let aamModel = new AAMModel(labelsInfo,
        (id) => collectionModel.setactivetrack(id),
        () => collectionModel.resetactivetrack(),
        (xtl, xbr, ytl, ybr) => playerModel.focus(xtl,xbr,ytl,ybr));

    let aamController = new AAMController(aamModel);
    new AAMView(aamModel, aamController);

    mergerModel.subscribe(drawerModel);
    mergerModel.subscribe(shapeBufferModel);

    drawerModel.subscribe(drawerView);
    drawerModel.subscribe(mergerView);
    drawerModel.subscribe(collectionController);
    drawerModel.subscribe(collectionView);
    drawerModel.subscribe(mergerModel);
    drawerModel.subscribe(shapeBufferModel);

    playerModel.subscribe(drawerView);
    playerModel.subscribe(shapeBufferModel);
    playerModel.subscribe(shapeBufferView);
    playerModel.shift(0);

    shapeBufferModel.subscribe(drawerModel);
    shapeBufferModel.subscribe(mergerModel);
    shapeBufferModel.subscribe(shapeBufferView);
    shapeBufferModel.subscribe(collectionController);

    aamModel.subscribe(mergerModel);
    aamModel.subscribe(drawerModel);
    aamModel.subscribe(shapeBufferModel);
    aamModel.subscribe(collectionController);

    collectionModel.subscribe(aamModel);

    setupFrameFilters();
    setupAnnotationShortkeys();
    setupMenu(job, collectionModel, collectionController, annotationParser);

    let shortkeys = userConfig.shortkeys;
    setupHelpShortkeys(shortkeys);

    window.onbeforeunload = function(e) {
        if (collectionController.hasUnsavedChanges()) {
            let message = "You have unsaved changes. Leave this page?";
            e.returnValue = message;
            return message;
        }
        return;
    };

    let statistics = collectionModel.collectStatistic();
    loadJobEvent.addValues({
        'track count': statistics.totalObjectCount.tracks,
        'frame count': job.stop - job.start + 1,
        'object count': statistics.totalObjectCount.manuallyShapes + statistics.totalObjectCount.interpolatedShapes,
    });
    loadJobEvent.close();

    setupAPI(collectionModel , job);


    $('#createTrackButton').attr('title',
        `${shortkeys["switch_draw_mode"].view_value} - ${shortkeys["switch_draw_mode"].description}`);
    $('#mergeTracksButton').attr('title',
        `${shortkeys["switch_merge_mode"].view_value} - ${shortkeys["switch_merge_mode"].description}` + "\n" +
        `${shortkeys["cancel_merge_mode"].view_value} - ${shortkeys["cancel_merge_mode"].description}`);
    $('#saveButton').attr('title', `${shortkeys["save_work"].view_value}`);
    $('#helpButton').attr('title', `${shortkeys["open_help"].view_value}`);
    $('#settingsButton').attr('title', `${shortkeys["open_settings"].view_value}`);

    $('#labelSelect').attr('title',
        `${shortkeys["change_default_label"].view_value} - ${shortkeys["change_default_label"].description}`);
    $('#hideBoxesBox').attr('title', `${shortkeys["hide_shapes"].view_value}`);
    $('#hideLabelsBox').attr('title', `${shortkeys["hide_labels"].view_value}`);
    $('#hideFilteredBox').attr('title', `${shortkeys["hide_filtered_tracks"].view_value}`);
}


function setupFrameFilters() {
    let brightnessRange = $('#playerBrightnessRange');
    let contrastRange = $('#playerContrastRange');
    let saturationRange = $('#playerSaturationRange');
    let frameContent = $('#frameContent');
    let reset = $('#resetPlayerFilterButton');
    let brightness = 100;
    let contrast = 100;
    let saturation = 100;

    let shortkeys = userConfig.shortkeys;
    Mousetrap.bind(shortkeys["change_player_brightness"].value.split(','), (e) => {
        if (e.shiftKey) brightnessRange.prop('value', brightness + 10).trigger('input');
        else brightnessRange.prop('value', brightness - 10).trigger('input');
    }, 'keydown');

    Mousetrap.bind(shortkeys["change_player_contrast"].value.split(','), (e) => {
        if (e.shiftKey) contrastRange.prop('value', contrast + 10).trigger('input');
        else contrastRange.prop('value', contrast - 10).trigger('input');
    }, 'keydown');

    Mousetrap.bind(shortkeys["change_player_saturation"].value.split(','), (e) => {
        if (e.shiftKey) saturationRange.prop('value', saturation + 10).trigger('input');
        else saturationRange.prop('value', saturation - 10).trigger('input');
    }, 'keydown');

    reset.on('click', function() {
        brightness = 100;
        contrast = 100;
        saturation = 100;
        brightnessRange.prop('value', brightness);
        contrastRange.prop('value', contrast);
        saturationRange.prop('value', saturation);
        updateFilterParameters();
    });

    brightnessRange.on('input', function(e) {
        let value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
        brightness = e.target.value = value;
        updateFilterParameters();
    });

    contrastRange.on('input', function(e) {
        let value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
        contrast = e.target.value = value;
        updateFilterParameters();
    });

    saturationRange.on('input', function(e) {
        let value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
        saturation = e.target.value = value;
        updateFilterParameters();
    });

    function updateFilterParameters() {
        frameContent.css('filter', `contrast(${contrast}%) brightness(${brightness}%) saturate(${saturation}%)`);
    }
}


function setupHelpShortkeys(shortkeys) {
    let helpTable = $('#shortkeyHelpTable');
    helpTable.empty();

    for (let key in shortkeys) {
        helpTable.append($(`<tr> <td> ${shortkeys[key].view_value} </td> <td> ${shortkeys[key].description} </td> </tr>`));
    }
}


function setupLabelSelector(labelsInfo) {
    let labels = labelsInfo.labels();
    let labelSelector = $('#labelSelect');
    for (let labelId in labels) {
        let option = $(`<option value=${labelId}> ${labels[labelId].normalize()} </option>`);
        option.appendTo(labelSelector);
    }
}


function setupMenu(job, collectionModel, collectionController, annotationParser) {
    let annotationMenu = $('#taskAnnotationMenu');
    let menuButton = $('#menuButton');
    let helpButton = $('#helpButton');
    let helpWindow = $('#helpWindow');
    let closeHelpButton = $('#closeHelpButton');
    let closeSettingsButton = $('#closeSettignsButton');
    let downloadAnnotationButton = $('#downloadAnnotation');
    let uploadAnnotationButton = $('#uploadAnnotation');
    let annotationFileSelector = $('#annotationFileSelector');
    let removeAnnotationButton = $('#removeAnnotationButton');
    let saveButton = $('#saveButton');
    let settingsButton = $('#settingsButton');
    let settingsWindow = $('#settingsWindow');
    let autoSaveBox = $('#autoSaveBox');
    let autoSaveTime = $('#autoSaveTime');

    let hideMenu = function() {
        annotationMenu.addClass('hidden');
    };

    let visibleTimer;

    let statistic = collectionModel.collectStatistic();
    fillStat(statistic, job);
    let top = menuButton.offset().top - annotationMenu.height() - menuButton.height();
    annotationMenu.css('top', top + 'px');


    menuButton.on('click', function() {
        let statistic = collectionModel.collectStatistic();
        fillStat(statistic, job);
        annotationMenu.removeClass('hidden');
        clearTimeout(visibleTimer);
        visibleTimer = setTimeout(hideMenu, 1000);
    });

    annotationMenu.on('mouseout', function() {
        visibleTimer = setTimeout(hideMenu, 500);
    });

    annotationMenu.on('mouseover', function() {
        clearTimeout(visibleTimer);
    });

    helpButton.on('click', function() {
        hideMenu();
        helpWindow.css('display', 'block');
    });

    closeHelpButton.on('click', function() {
        helpWindow.css('display', 'none');
    });

    closeSettingsButton.on('click', function() {
        settingsWindow.css('display', 'none');
    });

    downloadAnnotationButton.on('click', () => dumpAnnotationRequest(downloadAnnotationButton, job.taskid, job.slug));

    uploadAnnotationButton.on('click', function() {
        hideMenu();
        let message = 'Current annotation will be removed from the client. Continue?';
        let onagree = function() {
            annotationFileSelector.click();
        };

        confirm(message, onagree, null);
    });

    annotationFileSelector.on('change', function(e) {
        let file = e.target.files['0'];
        e.target.value = "";
        if (!file || file.type != 'text/xml') return;
        uploadAnnotationButton.text('Preparing..');
        uploadAnnotationButton.prop('disabled', true);

        let fileReader = new FileReader();
        fileReader.onload = function(e) {
            let data = [];
            try {
                data = annotationParser.parse(e.target.result);
            }
            catch (err) {
                showMessage(err.message);
                return;
            }
            finally {
                uploadAnnotationButton.text('Upload Annotation');
                uploadAnnotationButton.prop('disabled', false);
            }

            collectionModel.removeTracks();
            collectionModel.importTracks(data);
            collectionModel.update();
        };
        fileReader.readAsText(file);
    });


    saveButton.on('click', function() {
        Logger.addEvent(Logger.EventType.saveJob);
        let statistics = collectionModel.collectStatistic();

        Logger.addEvent(Logger.EventType.sendTaskInfo,
            {'track count': statistics.totalObjectCount.tracks,
                'frame count': job.stop - job.start + 1,
                'object count': statistics.totalObjectCount.manuallyShapes + statistics.totalObjectCount.interpolatedShapes,
            });

        saveButton.prop('disabled', true);
        saveButton.text('Saving..');
        const exportData = collectionModel.exportTracks();
        const annotationLogs = Logger.getLogs();

        const data = {
            'annotation': exportData,
            'logs': JSON.stringify(annotationLogs.export()),
        };

        let onsuccess = function() {
            collectionController.updateHash();
            saveButton.text('Success!');

            setTimeout(function() {
                saveButton.prop('disabled', false);
                saveButton.text('Save Work');
            }, 3000);
        };

        let onerror = function(response) {
            saveButton.text('Save Work');
            saveButton.prop('disabled', false);

            if (response.status === 0) {
                annotationLogs.save();
                return;   // ignore such errors
            }
            let error = `Status: ${response.status}.`;
            let message = 'Impossible to save job. Errors was occured. ' + error;
            showMessage(message);
            throw new Error(message);
        };

        saveJobOnServer(job.jobid, data, onsuccess, onerror);
    });

    let saveInterval = null;

    autoSaveBox.on('change', function(e) {
        let checked = e.target.checked;
        clearSaveInterval();

        if (checked) {
            let time = +autoSaveTime.prop('value');
            saveInterval = setInterval(function() {
                if (!saveButton.prop('disabled')) {
                    saveButton.click();
                }
            }, time * 60 * 1000);
        }

        function clearSaveInterval() {
            if (saveInterval != null) {
                clearInterval(saveInterval);
                saveInterval = null;
            }
        }
    });

    autoSaveTime.on('change', function(e) {
        let value = +e.target.value;
        let min = +e.target.min;
        let max = +e.target.max;
        if (value < min) value = min;
        if (value > max) value = max;
        e.target.value = value;
        autoSaveBox.trigger('change');
    });


    removeAnnotationButton.on('click', function() {
        hideMenu();
        let message = 'Do you want to remove all annotations? The action cannot be undone!';
        let onagree = function() {
            collectionModel.removeTracks();
        };

        confirm(message, onagree, null);
    });

    settingsButton.on('click', function() {
        settingsWindow.css('display', 'block');
        hideMenu();
    });

    $(window).on('click', function(event) {
        Logger.updateUserActivityTimer();
        if (event.target == helpWindow['0']) {
            helpWindow.css('display', 'none');
        }
        else if (event.target == settingsWindow['0']) {
            settingsWindow.css('display', 'none');
        }
    });
}

function setupAnnotationShortkeys() {
    Mousetrap.prototype.stopCallback = function() {
        return false;
    };

    let hideBoxesHandler = Logger.shortkeyLogDecorator(function() {
        $('#hideBoxesBox').click();
    });

    let hideLabelsHandler = Logger.shortkeyLogDecorator(function() {
        $('#hideLabelsBox').click();
    });

    let openHelpHandler = Logger.shortkeyLogDecorator(function() {
        let helpVisibility = $('#helpWindow').css('display');
        if (helpVisibility == 'none') {
            $('#taskAnnotationMenu').addClass('hidden');
            $('#helpWindow').css('display','block');
        }
        else {
            $('#helpWindow').css('display','none');
        }
        return false;
    });

    let openSettingsHandler = Logger.shortkeyLogDecorator(function() {
        let settignsVisibility = $('#settingsWindow').css('display');
        if (settignsVisibility == 'none') {
            $('#taskAnnotationMenu').addClass('hidden');
            $('#settingsWindow').css('display','block');
        }
        else {
            $('#settingsWindow').css('display','none');
        }
        return false;
    });

    let saveHandler = Logger.shortkeyLogDecorator(function() {
        let saveButtonLocked = $('#saveButton').prop('disabled');
        if (!saveButtonLocked) {
            $('#saveButton').click();
        }
        return false;
    });

    let changeDefLabelHandler = Logger.shortkeyLogDecorator(function(e) {
        if ($('#labelSelect').prop('disabled')) return;
        $('#labelSelect option').eq(e.keyCode - '1'.charCodeAt(0)).prop('selected', true);
        e.preventDefault();
    });

    let shortkeys = userConfig.shortkeys;

    Mousetrap.bind(shortkeys["hide_shapes"].value, hideBoxesHandler, 'keydown');
    Mousetrap.bind(shortkeys["hide_labels"].value, hideLabelsHandler, 'keydown');
    Mousetrap.bind(shortkeys["open_help"].value, openHelpHandler, 'keydown');
    Mousetrap.bind(shortkeys["open_settings"].value, openSettingsHandler, 'keydown');
    Mousetrap.bind(shortkeys["save_work"].value, saveHandler, 'keydown');
    Mousetrap.bind(shortkeys["change_default_label"].value.split(','), changeDefLabelHandler, 'keydown');
}


function fillStat(labelStatistic, job) {
    let statTaskName = $('#statTaskName');
    let statTaskStatus = $('#statTaskStatus');
    let statStartFrame = $('#statStartFrame');
    let statStopFrame = $('#statStopFrame');
    let statByLabels = $('#statByLabels');

    statTaskName.text(job.slug);
    statTaskStatus.text(job.status);
    statStartFrame.text(job.start);
    statStopFrame.text(job.stop);

    let table = $('<table id="statTable"></table').addClass('regular h3');
    let header = `
    <tr>
      <td>Label</td><td>Tracks</td><td>Manually</td><td>Interpolated</td><td>Total</td>
    </tr>
    `;
    table.append($(header).addClass('semiBold'));

    let totalTracks = 0;
    let totalManually = 0;
    let totalInterpolated = 0;
    let totalAnnotated = 0;

    for (let label in labelStatistic) {
        let tracks = labelStatistic[label].tracks;
        let manually = labelStatistic[label].manuallyShapes;
        let interpolated = labelStatistic[label].interpolatedShapes;
        let total = manually + interpolated;

        totalTracks += tracks;
        totalManually += manually;
        totalInterpolated += interpolated;
        totalAnnotated += total;

        let row = `
        <tr>
          <td class='bold'>${label.normalize()}</td><td>${tracks}</td><td>${manually}</td>
          <td>${interpolated}</td><td>${total}</td>
        </tr>
        `;
        table.append($(row));
    }

    let totalRow = `
    <tr>
      <td class='bold'>Total</td><td>${totalTracks}</td><td>${totalManually}</td>
      <td>${totalInterpolated}</td><td>${totalAnnotated}</td>
    </tr>
    `;
    table.append($(totalRow));

    statByLabels.empty();
    table.appendTo(statByLabels);
}


function translateSVGPos(svgCanvas, clientX, clientY, playerScale) {
    let pt = svgCanvas.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    pt = pt.matrixTransform(svgCanvas.getScreenCTM().inverse());

    let pos = {
        x: pt.x,
        y: pt.y
    };

    if (platform.name.toLowerCase() == 'firefox') {
        pos.x /= playerScale;
        pos.y /= playerScale;
    }

    return pos;
}
