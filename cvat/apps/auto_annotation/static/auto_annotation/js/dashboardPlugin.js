/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
*/

"use strict";

window.cvat = window.cvat || {};
window.cvat.dashboard = window.cvat.dashboard || {};
window.cvat.dashboard.uiCallbacks = window.cvat.dashboard.uiCallbacks || [];

class AutoAnnotationServer {
    constructor() { }

    start(modelId, data, success, error, progress) {
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
    }

    update(data, success, error, progress, modelId) {
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
    }

    delete(modelId, success, error) {
        $.ajax({
            url: "auto-annotation/delete/" + modelId,
            type: "DELETE",
            success: success,
            error: (data) => {
                if (error) {
                    let message = `Deleting request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                    error(message);
                }
            }
        });
    }

    check(workerId, success, progress, error) {
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
    }

    meta(success, error) {
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
}


class AutoAnnotationModelManagerView {
    constructor() {
        let html = `<div class="modal hidden" id="${window.cvat.auto_annotation.managerWindowId}">
            <div class="modal-content" id="${window.cvat.auto_annotation.managerContentId}">
                <div style="float: left; width: 55%; height: 100%;">
                    <center>
                        <label class="regular h1"> Uploaded Models </label>
                    </center>
                    <div style="overflow: auto; height: 90%; margin-top: 2%;">
                        <table class="regular modelsTable">
                            <thead>
                                <tr>
                                    <th> Name </th>
                                    <th> Upload Date </th>
                                    <th> Actions </th>
                                </tr>
                            </thead>
                            <tbody id="${window.cvat.auto_annotation.managerUploadedModelsId}"> </tbody>
                        </table>
                    </div>
                </div>
                <div class="regular" id="${window.cvat.auto_annotation.uploadContentId}">
                    <center>
                        <label class="regular h1" id="${window.cvat.auto_annotation.uploadTitleId}"> Create Model </label>
                    </center>
                    <table>
                        <tr>
                            <td style="width: 25%"> <label class="regular h3"> Name: </label> </td>
                            <td> <input type="text" id="${window.cvat.auto_annotation.uploadNameInputId}" class="regular h3" style="width: 100%"> </td>
                        </tr>
                        <tr>
                            <td> <label class="regular h3"> Source: </label> </td>
                            <td>
                                <input id="${window.cvat.auto_annotation.uploadLocalSourceId}" type="radio" name="sourceType" value="local" checked> <label for="${window.cvat.auto_annotation.uploadLocalSourceId}" class="regular h3"> Local </label>
                                <br> <input id="${window.cvat.auto_annotation.uploadShareSourceId}" type="radio" name="sourceType" value="share"> <label for="${window.cvat.auto_annotation.uploadShareSourceId}" class="regular h3"> Share </label>
                            </td>
                        </tr>
                        <tr id="${window.cvat.auto_annotation.uploadGloballyBlockId}">
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
                        <div style="float: left; overflow-y: auto; height: 50px;  overflow: auto; width: 100%; word-break: break-word;">
                            <label class="regular h3 selectable" style="float: left;" id="${window.cvat.auto_annotation.uploadMessage}"> Some upload message </label>
                        </div>
                </div>
            </div>
        </div>`;

        this._el = $(html);
        this._id = null;
        this._table = this._el.find(`#${window.cvat.auto_annotation.managerUploadedModelsId}`);
        this._globallyBlock = this._el.find(`#${window.cvat.auto_annotation.uploadGloballyBlockId}`);
        this._uploadTitle = this._el.find(`#${window.cvat.auto_annotation.uploadTitleId}`);
        this._uploadNameInput = this._el.find(`#${window.cvat.auto_annotation.uploadNameInputId}`);
    }

    reset() {
        if (window.cvat.auto_annotation.data.admin) {
            this._globallyBlock.removeClass('hidden');
        }
        else {
            this._globallyBlock.addClass('hidden');
        }

        this._id = null;
        this._uploadTitle.text('Create Model');
        this._uploadNameInput.prop('value', '');
        this._table.empty();

        for (let model of window.cvat.auto_annotation.data.models) {
            let rowHtml = `<tr>
                <td> ${model.name} </td>
                <td> ${model.uploadDate} </td>
            </tr>`;

            let row = $(rowHtml);

            if (model.primary) {
                row.append('<td> <label class="h1 regular"> Primary Model </label> </td>');
            }
            else {
                let updateButtonHtml = `<button class="regular h3" style="width: 7em;"> Update </button>`;
                let deleteButtonHtml = `<button class="regular h3" style="width: 7em; margin-top: 5%;"> Delete </button>`;

                row.append(
                    $('<td> </td>').append(
                        $(updateButtonHtml).on('click', () => {
                            this._uploadTitle.text('Update Model');
                            this._uploadNameInput.prop('value',`${model.name}`);
                            this._id = model.id;
                        }),
                        $(deleteButtonHtml).on('click', () => {
                            confirm(`Do you actually want to delete the "${model.name}" model. Are you sure?`, () => {
                                window.cvat.auto_annotation.server.delete(model.id, () => {
                                    window.cvat.auto_annotation.data.models = window.cvat.auto_annotation.data.models.filter((item) => item != model);
                                    this.reset();
                                }, (message) => {
                                    showMessage(message);
                                });
                            });
                        })
                    )
                );
            }

            this._table.append(row);
        }

        return this;
    }

    show() {
        this._el.removeClass('hidden');
        return this;
    }

    get element() {
        return this._el;
    }
}   

class AutoAnnotationModelRunnerView {
    constructor() {
        let html = `<div class="modal hidden" id="${window.cvat.auto_annotation.runnerWindowId}">
            <div class="modal-content" id="${window.cvat.auto_annotation.runnerContentId}">
                <div style="width: 55%; height: 100%; float: left;">
                    <center style="height: 10%;">
                        <label class="regular h1"> Uploaded Models </label>
                    </center>
                    <div style="height: 70%; overflow: auto; margin-top: 2%;">
                        <table class="regular modelsTable" id="${window.cvat.auto_annotation.runnerUploadedModelsId}">
                            <tr>
                                <td> Tensorflow Default Model (24.03.1997 23:59) </td>
                            </tr>
                        </table>
                    </div>
                    <div>
                        <input type="checkbox" id="${window.cvat.auto_annotation.removeCurrentAnnotationId}"/>
                        <label class="regular h3" for="${window.cvat.auto_annotation.removeCurrentAnnotationId}"> Remove current annotation </label>
                    </div>
                </div>
                <div style="width: 40%; height: 100%; float: left; margin-left: 3%;">
                    <center style="height: 10%;">
                        <label class="regular h1"> Annotation Labels </label>
                    </center>
                    <div style="height: 70%; overflow: auto; margin-top: 2%;">
                        <table class="regular" id="${window.cvat.auto_annotation.annotationLabelsId}">
                            <tr> <td> <input type="checkbox"/> <label class="regular h3"> car </label> </td> </tr>
                            <tr> <td> <input type="checkbox"/> <label class="regular h3"> person </label> </td> </tr>
                            <tr> <td> <input type="checkbox"/> <label class="regular h3"> vehicle </label> </td> </tr>
                            <tr> <td> <input type="checkbox"/> <label class="regular h3"> bus </label> </td> </tr>
                        </table>
                    </div>
                    <div style="float:right;">
                        <button class="regular h3" id="${window.cvat.auto_annotation.submitAnnotationId}"> Start </button>
                        <button class="regular h3" id="${window.cvat.auto_annotation.cancelAnnotationId}"> Cancel </button>
                    </div>
                </div>
            </div>
        </div>`;

        this._el = $(html);
    }

    reset(data) {

        return this;
    }

    show() {
        this._el.removeClass('hidden');
        return this;
    }
    
    get element() {
        return this._el;
    }
}

window.cvat.auto_annotation = {
    managerWindowId: "annotatorManagerWindow",
    managerContentId: "annotatorManagerContent",
    managerUploadedModelsId: "annotatorManagerUploadedModels",
    uploadContentId: "annotatorManagerUploadModel",
    uploadTitleId: "annotatorManagerUploadTitle",
    uploadNameInputId: "annotatorManagerUploadNameInput",
    uploadLocalSourceId: "annotatorManagerUploadLocalSource",
    uploadShareSourceId: "annotatorManagerUploadShareSource",
    uploadGloballyId: "annotatorManagerUploadGlobally",
    uploadGloballyBlockId: "annotatorManagerUploadGloballyblock",
    selectFilesButtonId: "annotatorManagerUploadSelector",
    selectedFilesId: "annotatorManagerUploadSelectedFiles",
    localFileSelectorId: "annotatorManagerUploadLocalSelector",
    shareFileSelectorId: "annotatorManagerUploadShareSelector",
    submitUploadButtonId: "annotatorManagerSubmitUploadButton",
    cancelUploadButtonId: "annotatorManagerCancelUploadButton",
    uploadMessage: "annotatorUploadStatusMessage",

    runnerWindowId: "annotatorRunnerWindow",
    runnerContentId: "annotatorRunnerContent",
    runnerUploadedModelsId: "annotatorRunnerUploadedModels",
    removeCurrentAnnotationId: "annotatorRunnerRemoveCurrentAnnotationBox",
    annotationLabelsId: "annotatorRunnerAnnotationLabels",
    submitAnnotationId: "annotatorRunnerSubmitAnnotationButton",
    cancelAnnotationId: "annotatorRunnerCancelAnnotationButton",

    managerButtonId: "annotatorManagerButton",
}

window.cvat.dashboard.uiCallbacks.push((newElements) => {
    window.cvat.auto_annotation.server = new AutoAnnotationServer();
    window.cvat.auto_annotation.manager = new AutoAnnotationModelManagerView();
    window.cvat.auto_annotation.runner = new AutoAnnotationModelRunnerView();
    window.cvat.auto_annotation.data = {
        admin: true,
        models: [{
            id: 0,
            name: "TF Faster RCNN",
            primary: true,
            uploadDate: "01.01.2018 12:25:00",
            labels: ["car", "person", "traffic-light", "vehicle", "pedestrian", "train", "banana", "apple", "coat", "bear", "fish", "ship", "sun", "sky"]
        }, {
            id: 1,
            name: "Crossroad Detector",
            primary: false,
            uploadDate: "10.10.2018 03:20:24",
            labels: ["vehicle", "pedestrian", "bike", "bicycle"]
        }, {
            id: 2,
            name: "Person Detector",
            primary: false,
            uploadDate: "24.12.2018 19:40:23",
            labels: ["person"]
        }, {
            id: 4,
            name: "Custom Model",
            primary: false,
            uploadDate: "03.01.2019 07:50:44",
            labels: ["train", "banana", "apple", "coat", "bear", "fish", "ship", "sun", "sky"]
        }]
    }

    $('body').append(window.cvat.auto_annotation.manager.element, window.cvat.auto_annotation.runner.element);
    $(`<button id="${window.cvat.auto_annotation.managerButtonId}" class="regular h1" style=""> Model Manager</button>`)
        .on('click', () => {
            let overlay = showOverlay("The manager are being setup.."); 
            window.cvat.auto_annotation.manager.reset().show();
            overlay.remove();
        }).appendTo('#dashboardManageButtons');

    newElements.each(function(idx) {
        let elem = $(newElements[idx]);
        let tid = +elem.attr("id").split("_")[1];

        $("<button> Run Auto Annotation </button>").addClass("regular dashboardButtonUI").on("click", () => {
            let overlay = showOverlay("Task date are being recieved from the server..");
            $.ajax({
                url: `/get/task/${tid}`,
                dataType: "json",
                success: (data) => {
                    overlay.setMessage('The model runner are being setup..')
                    window.cvat.auto_annotation.runner.reset(data).show();
                    overlay.remove();
                },
                error: (data) => {
                    setMessage(`Can't get task data. Code: ${data.status}. Message: ${data.responseText || data.statusText}`);
                },
                complete: () => {
                    overlay.remove();
                }
            });           
        }).appendTo(elem.find("div.dashboardButtonsUI")[0]);
    });
});
