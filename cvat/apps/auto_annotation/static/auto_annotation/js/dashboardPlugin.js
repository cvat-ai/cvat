/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
*/

"use strict";

window.cvat = window.cvat || {};
window.cvat.dashboard = window.cvat.dashboard || {};
window.cvat.dashboard.uiCallbacks = window.cvat.dashboard.uiCallbacks || [];

window.cvat.auto_annotation = {
    requests: {
        update: function(data, success, error, progress, modelId) {
            let url = "";
            if (typeof(modelId) === "undefined") {
                url = "/auto-annotation/create";
            }
            else {
                url = "/auto-annotation/update/" + modelId;
            }

            $.ajax({
                url: url,
                type: "POST",
                data: data,
                contentType: false,
                processData: false,
                success: (data) => {
                    window.cvat.auto_annotation.requests.check(data.id, success, error, progress);
                },
                error: (data) => {
                    if (error) {
                        let message = `Creating request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                        error(message);
                    }
                }
            });
        },

        start: function(modelId, data, success, error, progress) {
            $.ajax({
                url: "/auto/annotation/start/" + modelId,
                type: "POST",
                data: data,
                contentType: "application/json",
                success: (data) => {
                    window.cvat.auto_annotation.requests.check(data.id, success, error, progress);
                },
                error: (data) => {
                    if (error) {
                        let message = `Starting request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                        error(message);
                    }
                }
            });
        },

        delete: function(modelId, success, error) {
            $.ajax({
                url: "auto-annotation/delete/" + modelId,
                type: "DELETE",
                success: success,
                error: () => {
                    if (error) {
                        let message = `Deleting request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                        error(message);
                    }
                }
            });
        },

        check: function(workerId, success, progress, error) {
            $.ajax({
                url: "auto-annotation/check/" + workerId,
                type: "GET",
                success: (data) => {
                    let checkCallback = function() {
                        if (["finished", "failed", "unknown"].indexOf(data.status) != -1) {
                            if (data.status === "failed" && error) {
                                let message = `Checking request has returned the "${data.status}" status. Message: ${data.error}`;
                                error(message);
                            }
                            else if (data.status === "unknown" && error) {
                                let message = `Checking request has returned the "${data.status}" status.`;
                                error(message);
                            }
                            else if (data.status === "finished") {
                                success();
                            }
                        }
                        else {
                            setTimeout(checkCallback, 1000);
                        }

                        if (data.progress && progress) {
                            progress(data.progress);
                        }
                    }

                    setTimeout(checkCallback, 1000);
                },
                error: (data) => {
                    if (error) {
                        let message = `Checking request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                        error(message);
                    }
                }
            });
        },

        meta: function(success, error) {
            $.ajax({
                url: "/auto-annotation/meta/get",
                type: "GET",
                success: success,
                error: (data) => {
                    if (error) {
                        let message = `Getting meta request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                        error(message);
                    }
                }
            });
        }
    },

    managerWindowId: "annotatorManagerWindow",
    managerContentId: "annotatorManagerContent",
    existingModelsId: "annotatorManagerExistingModels",
    uploadContentId: "annotatorManagerUploadModel",
    uploadNameInputId: "annotatorManagerUploadNameInput",
    uploadLocalSourceId: "annotatorManagerUploadLocalSource",
    uploadShareSourceId: "annotatorManagerUploadShareSource",
    uploadGloballyId: "annotatorManagerUploadGlobally",
    selectFilesButtonId: "annotatorManagerUploadSelector",
    selectedFilesId: "annotatorManagerUploadSelectedFiles",
    localFileSelectorId: "annotatorManagerUploadLocalSelector",
    shareFileSelectorId: "annotatorManagerUploadShareSelector",
    submitUploadButtonId: "annotatorManagerSubmitUploadButton",
    cancelUploadButtonId: "annotatorManagerCancelUploadButton",
    uploadMessage: "annotatorUploadStatusMessage",

    init: function(newElements) {
        // Model manager window
        $(`<div class="modal hidden" id="${window.cvat.auto_annotation.managerWindowId}">
            <div class="modal-content" id="${window.cvat.auto_annotation.managerContentId}">
                <div style="float: left; width: 55%; height: 100%; overflow: auto; display: block;">
                    <center>
                        <label class="regular h1"> Models </label>
                    </center>
                    <table class="regular" id="${window.cvat.auto_annotation.existingModelsId}">
                        <tr>
                            <th> Name </th>
                            <th> Upload Date </th>
                            <th> Actions </th>
                        </tr>
                        <tr>
                            <td> Tensorflow Default Model </td>
                            <td> 24.03.1997 20:59 </td>
                            <td>
                                <button class="regular h3" style="width: 7em;"> Delete </button>
                                <button class="regular h3" style="width: 7em; margin-top: 5%;"> Update </button>
                            </td>
                        </tr>
                    </table>
                </div>
                <div class="regular" id="${window.cvat.auto_annotation.uploadContentId}">
                    <center>
                        <label class="regular h1"> Upload Model </label>
                    </center>
                    <table>
                        <tr>
                            <td style="width: 25%"> <label class="regular h3"> Name: </label> </td>
                            <td> <input type="text" id="${window.cvat.auto_annotation.uploadNameInputId}" class="regular h3" style="width: 100%"> </td>
                        </tr>
                        <tr>
                            <td> <label class="regular h3"> Source: </label> </td>
                            <td>
                                <input id="${window.cvat.auto_annotation.uploadLocalSourceId}" type="radio" name="sourceType" value="local" checked="true/"> <label for="${window.cvat.auto_annotation.uploadLocalSourceId}" class="regular h3"> Local </label>
                                <br> <input id="${window.cvat.auto_annotation.uploadShareSourceId}" type="radio" name="sourceType" value="share"> <label for="${window.cvat.auto_annotation.uploadShareSourceId}" class="regular h3"> Share </label>
                            </td>
                        </tr>
                        <tr>
                            <td> <label class="regular h3"> Upload Globally </label> </td>
                            <td> <input type="checkbox" id="${window.cvat.auto_annotation.uploadGloballyId}"> </td>
                        </tr>
                    </table>
                <div style="text-align: left;">
                    <div>
                        <button id="${window.cvat.auto_annotation.selectFilesButtonId}" class="regular h3"> Select Files </button>
                        <label id="${window.cvat.auto_annotation.selectedFilesId}" class="regular h3" style="margin-left: 10px"> No Files </label>
                        <input id="${window.cvat.auto_annotation.localFileSelectorId}" type="file" style="display: none" multiple>
                    </div>
                </div>
                <div>
                    <div style="float: right; width: 50%; height: 50px;">
                        <button class="regular h3" id="${window.cvat.auto_annotation.submitUploadButtonId}"> Submit </button>
                        <button class="regular h3" id="${window.cvat.auto_annotation.cancelUploadButtonId}"> Cancel </button>
                    </div>
                        <div style="float: left; height: 50px;  overflow: auto; width: 100%; height: auto; word-break: break-word;">
                            <label class="regular h3 selectable" style="float: left;" id="${window.cvat.auto_annotation.uploadMessage}"> Some upload message </label>
                        </div>
                </div>
            </div>
        </div>`).appendTo('body');

      $('#annotatorManagerWindow').removeClass('hidden');


/*
        window.cvat.auto_annotation.requests.meta((data) => {
            // Add "Model Manager" button
            // Onclick event for it
                // Set overlay
                // Setup model manager
                // Remove overlay
                // Open dialog window

            newElements.each(function(idx) {
                let elem = $(newElements[idx]);
                let tid = +elem.attr("id").split("_")[1];

                $("<button> Run Auto Annotation </button>").addClass("regular dashboardButtonUI").on("click", () => {
                    // Set overlay
                    // Getting task info
                    // Setup dialog window
                    // Remove overlay
                    // Open dialog window
                }).appendTo(elem.find("div.dashboardButtonsUI")[0]);
            });
        }, showMessage); */
    }
}

window.cvat.dashboard.uiCallbacks.push(window.cvat.auto_annotation.init);
