/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

function CheckTFAnnotationRequest(taskId, tfAnnotationButton) {
    let frequence = 5000;
    let errorCount = 0;
    let interval = setInterval(function() {
        $.ajax ({
            url: '/tf_annotation/check/task/' + taskId,
            success: function(jsonData) {
                let status = jsonData["status"];
                if (status == "started" || status == "queued") {
                    let progress = Math.round(jsonData["progress"]) || "0";
                    tfAnnotationButton.text(`Cancel TF Annotation (${progress}%)`);
                }
                else {
                    tfAnnotationButton.text("Run TF Annotation");
                    tfAnnotationButton.removeClass("tfAnnotationProcess");
                    tfAnnotationButton.prop("disabled", false);
                    clearInterval(interval);
                }
            },
            error: function() {
                errorCount ++;
                if (errorCount > 5) {
                    clearInterval(interval);
                    tfAnnotationButton.prop("disabled", false);
                    tfAnnotationButton.text("Status Check Error");
                    throw Error(`TF annotation check request error for task ${window.cvat.dashboard.taskID}:${window.cvat.dashboard.taskName}`);
                }
            }
        });
    }, frequence);
}

function RunTFAnnotationRequest() {
    let tfAnnotationButton = this;
    let taskID = window.cvat.dashboard.taskID;
    $.ajax ({
        url: '/tf_annotation/create/task/' + taskID,
        success: function() {
            showMessage('Process started.');
            tfAnnotationButton.text(`Cancel TF Annotation (0%)`);
            tfAnnotationButton.addClass("tfAnnotationProcess");
            CheckTFAnnotationRequest(taskID, tfAnnotationButton);
        },
        error: function(response) {
            let message = 'Abort. Reason: ' + response.responseText;
            showMessage(message);
        }
    });
}

function CancelTFAnnotationRequest() {
    let tfAnnotationButton = this;
    $.ajax ({
        url: '/tf_annotation/cancel/task/' + window.cvat.dashboard.taskID,
        success: function() {
            tfAnnotationButton.prop("disabled", true);
        },
        error: function(data) {
            let message = `TF annotation cancel error: ${data.responseText}`;
            showMessage(message);
        }
    });
}

function onTFAnnotationClick() {
    let button = this;
    let uiElem = button.closest('div.dashboardTaskUI');
    let taskId = +uiElem.attr('id').split('_')[1];
    let taskName = $.trim($( uiElem.find('label.dashboardTaskNameLabel')[0] ).text());

    window.cvat.dashboard.taskID = taskId;
    window.cvat.dashboard.taskName = taskName;

    if (button.hasClass("tfAnnotationProcess")) {
        confirm('The process will be canceled. Continue?', CancelTFAnnotationRequest.bind(button));
    }
    else {
        confirm('The current annotation will be lost. Are you sure?', RunTFAnnotationRequest.bind(button));
    }
}

window.cvat = window.cvat || {};
window.cvat.dashboard = window.cvat.dashboard || {};
window.cvat.dashboard.uiCallbacks = window.cvat.dashboard.uiCallbacks || [];

window.cvat.dashboard.uiCallbacks.push(function(newElements) {
    newElements.each(function(idx) {
        let elem = $(newElements[idx]);
        let taskId = +elem.attr('id').split('_')[1];
        let status = $.trim($(elem.find('label.dashboardStatusLabel')[0]).text());
        let buttonsUI = elem.find('div.dashboardButtonsUI')[0];
        let tfAnnotationButton = $('<button> Run TF Annotation </button>');
        tfAnnotationButton.on('click', onTFAnnotationClick.bind(tfAnnotationButton));
        tfAnnotationButton.addClass('dashboardTFAnnotationButton semiBold dashboardButtonUI');
        tfAnnotationButton.appendTo(buttonsUI);

        if (status == "TF Annotation") {
            tfAnnotationButton.text("Cancel TF Annotation");
            tfAnnotationButton.addClass("tfAnnotationProcess");
            CheckTFAnnotationRequest(taskId, tfAnnotationButton);
        }
    });
});
