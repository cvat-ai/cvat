/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported
    ExportType
    confirm
    createExportContainer
    dumpAnnotationRequest
    getExportTargetContainer
    showMessage
    showOverlay
*/

"use strict";

Math.clamp = function(x, min, max) {
    return Math.min(Math.max(x, min), max);
};


function confirm(message, onagree, ondisagree) {
    let template = $('#confirmTemplate');
    let confirmWindow = $(template.html()).css('display', 'block');

    let annotationConfirmMessage = confirmWindow.find('.templateMessage');
    let agreeConfirm = confirmWindow.find('.templateAgreeButton');
    let disagreeConfirm = confirmWindow.find('.templateDisagreeButton');

    annotationConfirmMessage.text(message);
    $('body').append(confirmWindow);

    agreeConfirm.on('click', function() {
        hideConfirm();
        if (onagree) onagree();
    });

    disagreeConfirm.on('click', function() {
        hideConfirm();
        if (ondisagree) ondisagree();
    });

    disagreeConfirm.focus();

    confirmWindow.on('keydown', (e) => {
        e.stopPropagation();
    });

    function hideConfirm() {
        agreeConfirm.off('click');
        disagreeConfirm.off('click');
        confirmWindow.remove();
    }
}


function showMessage(message) {
    let template = $('#messageTemplate');
    let messageWindow = $(template.html()).css('display', 'block');

    let messageText = messageWindow.find('.templateMessage');
    let okButton = messageWindow.find('.templateOKButton');

    messageText.text(message);
    $('body').append(messageWindow);

    messageWindow.on('keydown', (e) => {
        e.stopPropagation();
    });

    okButton.on('click', function() {
        okButton.off('click');
        messageWindow.remove();
    });

    okButton.focus();
    return messageWindow;
}


function showOverlay(message) {
    let template = $('#overlayTemplate');
    let overlayWindow = $(template.html()).css('display', 'block');
    let overlayText = overlayWindow.find('.templateMessage');
    overlayWindow[0].setMessage = function(message) {
        overlayText.text(message);
    };

    overlayWindow[0].remove = function() {
        overlayWindow.remove();
    };

    $('body').append(overlayWindow);
    overlayWindow[0].setMessage(message);
    return overlayWindow[0];
}


function dumpAnnotationRequest(dumpButton, taskID) {
    dumpButton = $(dumpButton);
    dumpButton.attr('disabled', true);

    $.ajax({
        url: '/dump/annotation/task/' + taskID,
        success: onDumpRequestSuccess,
        error: onDumpRequestError,
    });

    function onDumpRequestSuccess() {
        let requestInterval = 3000;
        let requestSended = false;

        let checkInterval = setInterval(function() {
            if (requestSended) return;
            requestSended = true;
            $.ajax({
                url: '/check/annotation/task/' + taskID,
                success: onDumpCheckSuccess,
                error: onDumpCheckError,
                complete: () => requestSended = false,
            });
        }, requestInterval);

        function onDumpCheckSuccess(data) {
            if (data.state === 'created') {
                clearInterval(checkInterval);
                getDumpedFile();
            }
            else if (data.state != 'started' ) {
                clearInterval(checkInterval);
                let message = 'Dump process completed with an error. ' + data.stderr;
                dumpButton.attr('disabled', false);
                showMessage(message);
                throw Error(message);
            }

            function getDumpedFile() {
                $.ajax({
                    url: '/download/annotation/task/' + taskID,
                    error: onGetDumpError,
                    success: () => window.location = '/download/annotation/task/' + taskID,
                    complete: () => dumpButton.attr('disabled', false)
                });

                function onGetDumpError(response) {
                    let message = 'Get the dump request error: ' + response.responseText;
                    showMessage(message);
                    throw Error(message);
                }
            }
        }

        function onDumpCheckError(response) {
            clearInterval(checkInterval);
            let message = 'Check the dump request error: ' + response.responseText;
            dumpButton.attr('disabled', false);
            showMessage(message);
            throw Error(message);
        }
    }

    function onDumpRequestError(response) {
        let message = "Dump request error: " + response.responseText;
        dumpButton.attr('disabled', false);
        showMessage(message);
        throw Error(message);
    }
}

const ExportType = Object.freeze({
    'create': 0,
    'update': 1,
    'delete': 2,
});

function createExportContainer() {
    const container = {};
    Object.keys(ExportType).forEach( action => {
        container[action] = {
            "boxes": [],
            "box_paths": [],
            "points": [],
            "points_paths": [],
            "polygons": [],
            "polygon_paths": [],
            "polylines": [],
            "polyline_paths": [],
        };
    });

    return container;
}

function getExportTargetContainer(export_type, shape_type, container) {
    let shape_container_target = undefined;
    let export_action_container = undefined;

    switch (export_type) {
    case ExportType.create:
        export_action_container = container.create;
        break;
    case ExportType.update:
        export_action_container = container.update;
        break;
    case ExportType.delete:
        export_action_container = container.delete;
        break;
    default:
        throw Error('Unexpected export type');
    }

    switch (shape_type) {
    case 'annotation_box':
        shape_container_target = export_action_container.boxes;
        break;
    case 'interpolation_box':
        shape_container_target = export_action_container.box_paths;
        break;
    case 'annotation_points':
        shape_container_target = export_action_container.points;
        break;
    case 'interpolation_points':
        shape_container_target = export_action_container.points_paths;
        break;
    case 'annotation_polygon':
        shape_container_target = export_action_container.polygons;
        break;
    case 'interpolation_polygon':
        shape_container_target = export_action_container.polygon_paths;
        break;
    case 'annotation_polyline':
        shape_container_target = export_action_container.polylines;
        break;
    case 'interpolation_polyline':
        shape_container_target = export_action_container.polyline_paths;
        break;
    default:
        throw Error('Undefined shape type');
    }

    return shape_container_target;
}

/* These HTTP methods do not require CSRF protection */
function csrfSafeMethod(method) {
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}


$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
            xhr.setRequestHeader("X-CSRFToken", Cookies.get('csrftoken'));
        }
    }
});


$(document).ready(function(){
    $('body').css({
        width: window.screen.width + 'px',
        height: window.screen.height * 0.95 + 'px'
    });
});
