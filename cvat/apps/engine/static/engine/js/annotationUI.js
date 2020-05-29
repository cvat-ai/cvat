/*
 * Copyright (C) 2018-2019 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported callAnnotationUI blurAllElements drawBoxSize copyToClipboard */

/* global
    AAMController:false
    AAMModel:false
    AAMView:false
    AnnotationParser:false
    Config:false
    userConfirm:false
    CoordinateTranslator:false
    dumpAnnotationRequest:false
    HistoryController:false
    HistoryModel:false
    HistoryView:false
    Logger:false
    Mousetrap:false
    PlayerController:false
    PlayerModel:false
    PlayerView:false
    PolyshapeEditorController:false
    PolyshapeEditorModel:false
    PolyshapeEditorView:false
    PolyShapeView:false
    ShapeBufferController:false
    ShapeBufferModel:false
    ShapeBufferView:false
    ShapeCollectionController:false
    ShapeCollectionModel:false
    ShapeCollectionView:false
    ShapeCreatorController:false
    ShapeCreatorModel:false
    ShapeCreatorView:false
    ShapeGrouperController:false
    ShapeGrouperModel:false
    ShapeGrouperView:false
    ShapeMergerController:false
    ShapeMergerModel:false
    ShapeMergerView:false
    showMessage:false
    buildAnnotationSaver:false
    LabelsInfo:false
    uploadJobAnnotationRequest:false
    isDefaultFormat:false
*/

async function initLogger(jobID) {
    if (!Logger.initializeLogger(jobID)) {
        const message = 'Logger has been already initialized';
        console.error(message);
        showMessage(message);
        return;
    }

    Logger.setTimeThreshold(Logger.EventType.zoomImage);
}


function blurAllElements() {
    document.activeElement.blur();
}

function uploadAnnotation(jobId, shapeCollectionModel, historyModel, annotationSaverModel,
    uploadAnnotationButton, format) {
    $('#annotationFileSelector').attr('accept',
        format.ext.split(',').map(x => '.' + x.trimStart()).join(', '));
    $('#annotationFileSelector').one('change', async (changedFileEvent) => {
        const file = changedFileEvent.target.files['0'];
        changedFileEvent.target.value = '';
        if (!file) return;
        uploadAnnotationButton.prop('disabled', true);
        const annotationData = new FormData();
        annotationData.append('annotation_file', file);
        try {
            await uploadJobAnnotationRequest(jobId, annotationData, format.name);
            historyModel.empty();
            shapeCollectionModel.empty();
            const data = await $.get(`/api/v1/jobs/${jobId}/annotations`);
            shapeCollectionModel.import(data);
            shapeCollectionModel.update();
            annotationSaverModel.update();
        } catch (error) {
            showMessage(error.message);
        } finally {
            uploadAnnotationButton.prop('disabled', false);
        }
    }).click();
}


function setupFrameFilters() {
    const brightnessRange = $('#playerBrightnessRange');
    const contrastRange = $('#playerContrastRange');
    const saturationRange = $('#playerSaturationRange');
    const canvasBackground = $('#canvasBackground');
    const reset = $('#resetPlayerFilterButton');
    let brightness = 100;
    let contrast = 100;
    let saturation = 100;

    const { shortkeys } = window.cvat.config;

    function updateFilterParameters() {
        canvasBackground.css('filter', `contrast(${contrast}%) brightness(${brightness}%) saturate(${saturation}%)`);
    }

    brightnessRange.attr('title', `
        ${shortkeys.change_player_brightness.view_value} - ${shortkeys.change_player_brightness.description}`);
    contrastRange.attr('title', `
        ${shortkeys.change_player_contrast.view_value} - ${shortkeys.change_player_contrast.description}`);
    saturationRange.attr('title', `
        ${shortkeys.change_player_saturation.view_value} - ${shortkeys.change_player_saturation.description}`);

    const changeBrightnessHandler = Logger.shortkeyLogDecorator((e) => {
        if (e.shiftKey) {
            brightnessRange.prop('value', brightness + 10).trigger('input');
        } else {
            brightnessRange.prop('value', brightness - 10).trigger('input');
        }
    });

    const changeContrastHandler = Logger.shortkeyLogDecorator((e) => {
        if (e.shiftKey) {
            contrastRange.prop('value', contrast + 10).trigger('input');
        } else {
            contrastRange.prop('value', contrast - 10).trigger('input');
        }
    });

    const changeSaturationHandler = Logger.shortkeyLogDecorator((e) => {
        if (e.shiftKey) {
            saturationRange.prop('value', saturation + 10).trigger('input');
        } else {
            saturationRange.prop('value', saturation - 10).trigger('input');
        }
    });

    Mousetrap.bind(shortkeys.change_player_brightness.value, changeBrightnessHandler, 'keydown');
    Mousetrap.bind(shortkeys.change_player_contrast.value, changeContrastHandler, 'keydown');
    Mousetrap.bind(shortkeys.change_player_saturation.value, changeSaturationHandler, 'keydown');

    reset.on('click', () => {
        brightness = 100;
        contrast = 100;
        saturation = 100;
        brightnessRange.prop('value', brightness);
        contrastRange.prop('value', contrast);
        saturationRange.prop('value', saturation);
        updateFilterParameters();
    });

    brightnessRange.on('input', (e) => {
        const value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
        e.target.value = value;
        brightness = value;
        updateFilterParameters();
    });

    contrastRange.on('input', (e) => {
        const value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
        e.target.value = value;
        contrast = value;
        updateFilterParameters();
    });

    saturationRange.on('input', (e) => {
        const value = Math.clamp(+e.target.value, +e.target.min, +e.target.max);
        e.target.value = value;
        saturation = value;
        updateFilterParameters();
    });
}


function setupShortkeys(shortkeys, models) {
    const annotationMenu = $('#annotationMenu');
    const settingsWindow = $('#settingsWindow');
    const helpWindow = $('#helpWindow');

    Mousetrap.prototype.stopCallback = () => false;

    const openHelpHandler = Logger.shortkeyLogDecorator(() => {
        const helpInvisible = helpWindow.hasClass('hidden');
        if (helpInvisible) {
            annotationMenu.addClass('hidden');
            settingsWindow.addClass('hidden');
            helpWindow.removeClass('hidden');
        } else {
            helpWindow.addClass('hidden');
        }
        return false;
    });

    const openSettingsHandler = Logger.shortkeyLogDecorator(() => {
        const settingsInvisible = settingsWindow.hasClass('hidden');
        if (settingsInvisible) {
            annotationMenu.addClass('hidden');
            helpWindow.addClass('hidden');
            settingsWindow.removeClass('hidden');
        } else {
            $('#settingsWindow').addClass('hidden');
        }
        return false;
    });

    const cancelModeHandler = Logger.shortkeyLogDecorator(() => {
        switch (window.cvat.mode) {
        case 'aam':
            models.aam.switchAAMMode();
            break;
        case 'creation':
            models.shapeCreator.switchCreateMode(true);
            break;
        case 'merge':
            models.shapeMerger.cancel();
            break;
        case 'groupping':
            models.shapeGrouper.cancel();
            break;
        case 'paste':
            models.shapeBuffer.switchPaste();
            break;
        case 'poly_editing':
            models.shapeEditor.finish();
            break;
        default:
            break;
        }
        return false;
    });

    Mousetrap.bind(shortkeys.open_help.value, openHelpHandler, 'keydown');
    Mousetrap.bind(shortkeys.open_settings.value, openSettingsHandler, 'keydown');
    Mousetrap.bind(shortkeys.cancel_mode.value, cancelModeHandler, 'keydown');
}


function setupHelpWindow(shortkeys) {
    const closeHelpButton = $('#closeHelpButton');
    const helpTable = $('#shortkeyHelpTable');

    closeHelpButton.on('click', () => {
        $('#helpWindow').addClass('hidden');
    });

    for (const key in shortkeys) {
        if (Object.prototype.hasOwnProperty.call(shortkeys, key)) {
            helpTable.append($(`<tr> <td> ${shortkeys[key].view_value} </td> <td> ${shortkeys[key].description} </td> </tr>`));
        }
    }
}


function setupSettingsWindow() {
    const closeSettingsButton = $('#closeSettignsButton');

    closeSettingsButton.on('click', () => {
        $('#settingsWindow').addClass('hidden');
    });
}


function setupMenu(job, task, shapeCollectionModel,
    annotationParser, aamModel, playerModel, historyModel,
    annotationFormats, annotationSaverModel) {
    const annotationMenu = $('#annotationMenu');
    const menuButton = $('#menuButton');
    const downloadDropdownMenu = $('#downloadDropdownMenu');

    function hide() {
        annotationMenu.addClass('hidden');
        downloadDropdownMenu.addClass('hidden');
    }

    function setupVisibility() {
        let timer = null;
        menuButton.on('click', () => {
            const [byLabelsStat, totalStat] = shapeCollectionModel.collectStatistic();
            const table = $('#annotationStatisticTable');
            table.find('.temporaryStatisticRow').remove();

            for (const labelId in byLabelsStat) {
                if (Object.prototype.hasOwnProperty.call(byLabelsStat, labelId)) {
                    $(`<tr>
                    <td class="semiBold"> ${window.cvat.labelsInfo.labels()[labelId].normalize()} </td>
                    <td> ${byLabelsStat[labelId].boxes.annotation} </td>
                    <td> ${byLabelsStat[labelId].boxes.interpolation} </td>
                    <td> ${byLabelsStat[labelId].polygons.annotation} </td>
                    <td> ${byLabelsStat[labelId].polygons.interpolation} </td>
                    <td> ${byLabelsStat[labelId].polylines.annotation} </td>
                    <td> ${byLabelsStat[labelId].polylines.interpolation} </td>
                    <td> ${byLabelsStat[labelId].points.annotation} </td>
                    <td> ${byLabelsStat[labelId].points.interpolation} </td>
                    <td> ${byLabelsStat[labelId].cuboids.annotation} </td>
                    <td> ${byLabelsStat[labelId].cuboids.interpolation} </td>
                    <td> ${byLabelsStat[labelId].manually} </td>
                    <td> ${byLabelsStat[labelId].interpolated} </td>
                    <td class="semiBold"> ${byLabelsStat[labelId].total} </td>
                </tr>`).addClass('temporaryStatisticRow').appendTo(table);
                }
            }

            $(`<tr class="semiBold">
                <td> Total: </td>
                <td> ${totalStat.boxes.annotation} </td>
                <td> ${totalStat.boxes.interpolation} </td>
                <td> ${totalStat.polygons.annotation} </td>
                <td> ${totalStat.polygons.interpolation} </td>
                <td> ${totalStat.polylines.annotation} </td>
                <td> ${totalStat.polylines.interpolation} </td>
                <td> ${totalStat.points.annotation} </td>
                <td> ${totalStat.points.interpolation} </td>
                <td> ${totalStat.cuboids.annotation} </td>
                <td> ${totalStat.cuboids.interpolation} </td>
                <td> ${totalStat.manually} </td>
                <td> ${totalStat.interpolated} </td>
                <td> ${totalStat.total} </td>
            </tr>`).addClass('temporaryStatisticRow').appendTo(table);
        });

        menuButton.on('click', () => {
            annotationMenu.removeClass('hidden');
            annotationMenu.css('top', `${menuButton.offset().top - annotationMenu.height() - menuButton.height()}px`);
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }

            timer = setTimeout(hide, 1000);
        });

        annotationMenu.on('mouseout', () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }

            timer = setTimeout(hide, 500);
        });

        annotationMenu.on('mouseover', () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        });
    }

    setupVisibility();

    $('#statTaskName').text(task.name);
    $('#statFrames').text(`[${window.cvat.player.frames.start}-${window.cvat.player.frames.stop}]`);
    $('#statOverlap').text(task.overlap);
    $('#statZOrder').text(task.z_order);
    $('#statTaskStatus').prop('value', job.status).on('change', async (e) => {
        try {
            const jobCopy = JSON.parse(JSON.stringify(job));
            jobCopy.status = e.target.value;

            await $.ajax({
                url: `/api/v1/jobs/${window.cvat.job.id}`,
                type: 'PATCH',
                data: JSON.stringify(jobCopy),
                contentType: 'application/json',
            });
        } catch (errorData) {
            const message = `Can not update a job status. Code: ${errorData.status}. `
                + `Message: ${errorData.responseText || errorData.statusText}`;
            showMessage(message);
        }
    });

    const { shortkeys } = window.cvat.config;
    $('#helpButton').on('click', () => {
        hide();
        $('#helpWindow').removeClass('hidden');
    });

    $('#helpButton').attr('title', `
        ${shortkeys.open_help.view_value} - ${shortkeys.open_help.description}`);

    $('#settingsButton').on('click', () => {
        hide();
        $('#settingsWindow').removeClass('hidden');
    });

    $('#openTaskButton').on('click', () => {
        const win = window.open(
            `${window.UI_URL}/tasks/${window.cvat.job.task_id}`, '_blank'
        );
        win.focus();
    });

    $('#settingsButton').attr('title', `
        ${shortkeys.open_settings.view_value} - ${shortkeys.open_settings.description}`);

    const downloadButton = $('#downloadAnnotationButton');
    const uploadButton = $('#uploadAnnotationButton');

    const loaders = {};

    for (const dumper of annotationFormats.exporters) {
        const item = $(`<option>${dumper.name}</li>`);

        if (!isDefaultFormat(dumper.name, window.cvat.job.mode)) {
            item.addClass('regular');
        }

        item.appendTo(downloadButton);
    }

    for (const loader of annotationFormats.importers) {
        loaders[loader.name] = loader;
        $(`<option class="regular">${loader.name}</li>`).appendTo(uploadButton);
    }

    downloadButton.on('change', async (e) => {
        const dumper = e.target.value;
        downloadButton.prop('value', 'Dump Annotation');
        try {
            downloadButton.prop('disabled', true);
            await dumpAnnotationRequest(task.id, dumper);
        } catch (error) {
            showMessage(error.message);
        } finally {
            downloadButton.prop('disabled', false);
        }
    });

    uploadButton.on('change', (e) => {
        const loader = loaders[e.target.value];
        uploadButton.prop('value', 'Upload Annotation');
        userConfirm('Current annotation will be removed from the client. Continue?',
            async () => {
                try {
                    await uploadAnnotation(
                        job.id,
                        shapeCollectionModel,
                        historyModel,
                        annotationSaverModel,
                        $('#uploadAnnotationButton'),
                        loader,
                    );
                } catch (error) {
                    showMessage(error.message);
                }
            });
    });

    $('#removeAnnotationButton').on('click', () => {
        if (!window.cvat.mode) {
            hide();
            userConfirm('Do you want to remove all annotations? The action cannot be undone!',
                () => {
                    historyModel.empty();
                    shapeCollectionModel.empty();
                });
        }
    });

    // JS function cancelFullScreen don't work after pressing
    // and it is famous problem.
    $('#fullScreenButton').on('click', () => {
        $('#playerFrame').toggleFullScreen();
    });

    $('#playerFrame').on('fullscreenchange webkitfullscreenchange mozfullscreenchange', () => {
        playerModel.updateGeometry({
            width: $('#playerFrame').width(),
            height: $('#playerFrame').height(),
        });
        playerModel.fit();
    });

    $('#switchAAMButton').on('click', () => {
        hide();
        aamModel.switchAAMMode();
    });

    $('#switchAAMButton').attr('title', `
        ${shortkeys.switch_aam_mode.view_value} - ${shortkeys.switch_aam_mode.description}`);
}


function buildAnnotationUI(
    jobData, taskData, imageMetaData,
    annotationData, annotationFormats, loadJobEvent,
) {
    // Setup some API
    window.cvat = {
        labelsInfo: new LabelsInfo(taskData.labels),
        translate: new CoordinateTranslator(),
        frozen: true,
        player: {
            geometry: {
                scale: 1,
            },
            frames: {
                current: jobData.start_frame,
                start: jobData.start_frame,
                stop: jobData.stop_frame,
            },
        },
        mode: null,
        job: {
            z_order: taskData.z_order,
            id: jobData.id,
            task_id: taskData.id,
            mode: taskData.mode,
            images: imageMetaData,
            chunk_size: taskData.data_chunk_size,
        },
        search: {
            value: window.location.search,

            set(name, value) {
                const searchParams = new URLSearchParams(this.value);

                if (typeof value === 'undefined' || value === null) {
                    if (searchParams.has(name)) {
                        searchParams.delete(name);
                    }
                } else {
                    searchParams.set(name, value);
                }
                this.value = `${searchParams.toString()}`;
            },

            get(name) {
                try {
                    const decodedURI = decodeURIComponent(this.value);
                    const urlSearchParams = new URLSearchParams(decodedURI);
                    if (urlSearchParams.has(name)) {
                        return urlSearchParams.get(name);
                    }
                    return null;
                } catch (error) {
                    showMessage('Bad URL has been received');
                    this.value = window.location.href;
                    return null;
                }
            },

            toString() {
                return `${window.location.origin}/?${this.value}`;
            },
        },
    };

    // Remove external search parameters from url
    window.history.replaceState(null, null, `${window.location.origin}/?id=${jobData.id}`);

    window.cvat.config = new Config();

    // Setup components
    const annotationParser = new AnnotationParser({
        start: window.cvat.player.frames.start,
        stop: window.cvat.player.frames.stop,
        flipped: taskData.flipped,
        image_meta_data: imageMetaData,
    }, window.cvat.labelsInfo);

    const shapeCollectionModel = new ShapeCollectionModel().import(annotationData);
    const shapeCollectionController = new ShapeCollectionController(shapeCollectionModel);
    const shapeCollectionView = new ShapeCollectionView(shapeCollectionModel,
        shapeCollectionController);

    const annotationSaverModel = buildAnnotationSaver(annotationData, shapeCollectionModel);

    window.cvat.data = {
        get: () => shapeCollectionModel.export()[0],
        set: (data) => {
            shapeCollectionModel.import(data);
            shapeCollectionModel.update();
        },
        clear: () => shapeCollectionModel.empty(),
    };

    const shapeBufferModel = new ShapeBufferModel(shapeCollectionModel);
    const shapeBufferController = new ShapeBufferController(shapeBufferModel);
    const shapeBufferView = new ShapeBufferView(shapeBufferModel, shapeBufferController);

    $('#shapeModeSelector').prop('value', taskData.mode);
    const shapeCreatorModel = new ShapeCreatorModel(shapeCollectionModel);
    const shapeCreatorController = new ShapeCreatorController(shapeCreatorModel);
    const shapeCreatorView = new ShapeCreatorView(shapeCreatorModel, shapeCreatorController);

    const polyshapeEditorModel = new PolyshapeEditorModel(shapeCollectionModel);
    const polyshapeEditorController = new PolyshapeEditorController(polyshapeEditorModel);
    const polyshapeEditorView = new PolyshapeEditorView(polyshapeEditorModel,
        polyshapeEditorController);

    // Add static member for class. It will be used by all polyshapes.
    PolyShapeView.editor = polyshapeEditorModel;

    const shapeMergerModel = new ShapeMergerModel(shapeCollectionModel);
    const shapeMergerController = new ShapeMergerController(shapeMergerModel);
    new ShapeMergerView(shapeMergerModel, shapeMergerController);

    const shapeGrouperModel = new ShapeGrouperModel(shapeCollectionModel);
    const shapeGrouperController = new ShapeGrouperController(shapeGrouperModel);
    const shapeGrouperView = new ShapeGrouperView(shapeGrouperModel, shapeGrouperController);

    const playerGeometry = {
        width: $('#playerFrame').width(),
        height: $('#playerFrame').height(),
    };

    const playerModel = new PlayerModel(taskData, playerGeometry);
    const playerController = new PlayerController(playerModel,
        () => shapeCollectionModel.activeShape,
        direction => shapeCollectionModel.find(direction),
        Object.assign({}, playerGeometry, {
            left: $('#playerFrame').offset().left,
            top: $('#playerFrame').offset().top,
        }));
    new PlayerView(playerModel, playerController);


    const aamModel = new AAMModel(shapeCollectionModel, (xtl, xbr, ytl, ybr) => {
        playerModel.focus(xtl, xbr, ytl, ybr);
    }, () => {
        playerModel.fit();
    });
    const aamController = new AAMController(aamModel);
    new AAMView(aamModel, aamController);

    shapeCreatorModel.subscribe(shapeCollectionModel);
    shapeGrouperModel.subscribe(shapeCollectionView);
    shapeCollectionModel.subscribe(shapeGrouperModel);

    $('#playerProgress').css('width', $('#player')['0'].clientWidth - 420);

    const historyModel = new HistoryModel(playerModel);
    const historyController = new HistoryController(historyModel);
    new HistoryView(historyController, historyModel);

    playerModel.subscribe(shapeCollectionModel);
    playerModel.subscribe(shapeCollectionView);
    playerModel.subscribe(shapeCreatorView);
    playerModel.subscribe(shapeBufferView);
    playerModel.subscribe(shapeGrouperView);
    playerModel.subscribe(polyshapeEditorView);
    playerModel.shift(window.cvat.search.get('frame') || 0, true);

    const { shortkeys } = window.cvat.config;
    setupHelpWindow(shortkeys);
    setupSettingsWindow();
    setupMenu(jobData, taskData, shapeCollectionModel,
        annotationParser, aamModel, playerModel, historyModel,
        annotationFormats, annotationSaverModel);
    setupFrameFilters();
    setupShortkeys(shortkeys, {
        aam: aamModel,
        shapeCreator: shapeCreatorModel,
        shapeMerger: shapeMergerModel,
        shapeGrouper: shapeGrouperModel,
        shapeBuffer: shapeBufferModel,
        shapeEditor: polyshapeEditorModel,
    });

    $(window).on('click', (event) => {
        Logger.updateUserActivityTimer();
        if (event.target.classList.contains('modal') && !event.target.classList.contains('force-modal')) {
            event.target.classList.add('hidden');
        }
    });

    const totalStat = shapeCollectionModel.collectStatistic()[1];
    loadJobEvent.addValues({
        'track count': totalStat.boxes.annotation + totalStat.boxes.interpolation
            + totalStat.polygons.annotation + totalStat.polygons.interpolation
            + totalStat.polylines.annotation + totalStat.polylines.interpolation
            + totalStat.points.annotation + totalStat.points.interpolation
            + totalStat.cuboids.annotation + totalStat.cuboids.interpolation,
        'frame count': window.cvat.player.frames.stop - window.cvat.player.frames.start + 1,
        'object count': totalStat.total,
        'box count': totalStat.boxes.annotation + totalStat.boxes.interpolation,
        'polygon count': totalStat.polygons.annotation + totalStat.polygons.interpolation,
        'polyline count': totalStat.polylines.annotation + totalStat.polylines.interpolation,
        'points count': totalStat.points.annotation + totalStat.points.interpolation,
        'cuboid count': totalStat.cuboids.annotation + totalStat.cuboids.interpolation,
    });
    loadJobEvent.close();

    $('#player').on('click', (e) => {
        if (e.target.tagName.toLowerCase() !== 'input') {
            blurAllElements();
        }
    });
}


function callAnnotationUI(jid) {
    function onError(errorData) {
        $('body').empty();
        const message = `Can not build CVAT annotation UI. Code: ${errorData.status}. `
            + `Message: ${errorData.responseText || errorData.statusText}`;
        showMessage(message);
    }

    initLogger(jid);

    const loadJobEvent = Logger.addContinuedEvent(Logger.EventType.loadJob);
    $.get(`/api/v1/jobs/${jid}`).done((jobData) => {
        $.when(
            $.get(`/api/v1/tasks/${jobData.task_id}`),
            $.get(`/api/v1/tasks/${jobData.task_id}/data/meta`),
            $.get(`/api/v1/jobs/${jid}/annotations`),
            $.get('/api/v1/server/annotation/formats'),
        ).then((taskData, imageMetaData, annotationData, annotationFormats) => {
            $('#loadingOverlay').remove();
            setTimeout(async () => {
                window.cvat.config.backendAPI = `${window.location.origin}/api/v1`;
                [window.cvatTask] = (await window.cvat.tasks.get({ id: taskData[0].id }));
                buildAnnotationUI(jobData, taskData[0],
                    imageMetaData[0], annotationData[0], annotationFormats[0], loadJobEvent);
            });
        }).fail(onError);
    }).fail(onError);
}


function copyToClipboard(text) {
    const tempInput = $('<input>');
    $('body').append(tempInput);
    tempInput.prop('value', text).select();
    document.execCommand('copy');
    tempInput.remove();
}


function drawBoxSize(boxScene, textScene, box) {
    const clientBox = window.cvat.translate.box.canvasToClient(boxScene.node, box);
    const text = `${box.width.toFixed(1)}x${box.height.toFixed(1)}`;
    const obj = this && this.textUI && this.rm ? this : {
        textUI: textScene.text('').font({
            weight: 'bolder',
        }).fill('white'),

        rm() {
            if (this.textUI) {
                this.textUI.remove();
            }
        },
    };

    const textPoint = window.cvat.translate.point.clientToCanvas(textScene.node,
        clientBox.x, clientBox.y);

    obj.textUI.clear().plain(text);
    obj.textUI.addClass('shapeText');
    obj.textUI.move(textPoint.x, textPoint.y);

    return obj;
}
