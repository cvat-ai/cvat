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
                                <input id="${window.cvat.auto_annotation.uploadLocalSourceId}" type="radio" name="modelSourceType" value="local" checked>
                                <label for="${window.cvat.auto_annotation.uploadLocalSourceId}" class="regular h3"> Local </label>
                                <br>
                                <input id="${window.cvat.auto_annotation.uploadShareSourceId}" type="radio" name="modelSourceType" value="shared">
                                <label for="${window.cvat.auto_annotation.uploadShareSourceId}" class="regular h3"> Share </label>
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
                        <input id="${window.cvat.auto_annotation.localFileSelectorId}" type="file" accept=".bin,.xml,.json,.py" style="display: none" multiple>
                    </div>
                </div>
                <div>
                    <div style="float: right; width: 50%; height: 50px;">
                        <button class="regular h3" id="${window.cvat.auto_annotation.submitUploadButtonId}"> Submit </button>
                        <button class="regular h3" id="${window.cvat.auto_annotation.cancelUploadButtonId}"> Cancel </button>
                    </div>
                        <div style="float: left; overflow-y: auto; height: 75px;  overflow: auto; width: 100%; word-break: break-word;">
                            <label class="regular h3 selectable" style="float: left;" id="${window.cvat.auto_annotation.uploadMessageId}"> </label>
                        </div>
                </div>
            </div>
        </div>`;

        this._el = $(html);

        this._table = this._el.find(`#${window.cvat.auto_annotation.managerUploadedModelsId}`);
        this._globallyBlock = this._el.find(`#${window.cvat.auto_annotation.uploadGloballyBlockId}`);
        this._uploadTitle = this._el.find(`#${window.cvat.auto_annotation.uploadTitleId}`);
        this._uploadNameInput = this._el.find(`#${window.cvat.auto_annotation.uploadNameInputId}`);
        this._uploadMessage = this._el.find(`#${window.cvat.auto_annotation.uploadMessageId}`);
        this._selectedFilesLabel = this._el.find(`#${window.cvat.auto_annotation.selectedFilesId}`);
        this._modelNameInput = this._el.find(`#${window.cvat.auto_annotation.uploadNameInputId}`);
        this._localSource = this._el.find(`#${window.cvat.auto_annotation.uploadLocalSourceId}`);
        this._shareSource = this._el.find(`#${window.cvat.auto_annotation.uploadShareSourceId}`);
        this._cancelButton = this._el.find(`#${window.cvat.auto_annotation.cancelUploadButtonId}`);
        this._submitButton = this._el.find(`#${window.cvat.auto_annotation.submitUploadButtonId}`);
        this._globallyBox = this._el.find(`#${window.cvat.auto_annotation.uploadGloballyId}`);
        this._selectButton = this._el.find(`#${window.cvat.auto_annotation.selectFilesButtonId}`);
        this._localSelector = this._el.find(`#${window.cvat.auto_annotation.localFileSelectorId}`);
        this._shareSelector = $("#dashboardShareBrowseModal");
        this._shareBrowseTree = $("#dashboardShareBrowser");
        this._submitShare = $("#dashboardSubmitBrowseServer");

        this._id = null;
        this._source = this._localSource.prop("checked") ? "local": "shared";
        this._files = [];

        function filesLabel(source, files, label) {
            let _files = source === "local" ? [...files].map((el) => el.name) : files;
            if (_files.length) {
                return _files.join(", ").substr(0, 30) + "..";
            }
            else {
                return "No Files";
            }
        }

        function validateFiles(isUpdate, files, source) {
            let extensions = ["xml", "bin", "py", "json"];
            let _files = {};

            for (let extension of extensions) {
                for (let file of files) {
                    let fileExt = source === "local" ? file.name.split(".").pop() : file.split(".").pop();
                    if (fileExt === extension) {
                        if (fileExt in _files) {
                            throw Error(`More than one file with the extension .${fileExt} have been found`);
                        }
                        else {
                            _files[fileExt] = file;
                        }
                    }
                }
            }

            if (!isUpdate) {
                for (let extension of extensions) {
                    if (!(extension in _files)) {
                        throw Error(`Please specify a .${extension} file`);
                    }
                }
            }

            return _files;
        }

        this._localSource.on("click", () => {
            if (this._source === "local") {
                return;
            }
            else {
                this._source = "local";
                this._files = [];
                this._selectedFilesLabel.text(filesLabel(this._source, this._files));
            }
        });

        this._shareSource.on("click", () => {
            if (this._source === "shared") {
                return;
            }
            else {
                this._source = "shared";
                this._files = [];
                this._selectedFilesLabel.text(filesLabel(this._source, this._files));
            }
        });

        this._selectButton.on("click", () => {
            if (this._source === "local") {
                this._localSelector.click();
            }
            else {
                this._shareSelector.appendTo("body");
                this._shareBrowseTree.jstree("refresh");
                this._shareSelector.removeClass("hidden");
                this._shareBrowseTree.jstree({
                    core: {
                        data: {
                            url: "get_share_nodes",
                            data: (node) => { return {"id" : node.id}; }
                        }
                    },
                    plugins: ["checkbox", "sort"],
                });
            }
        });

        this._submitShare.on("click", () => {
            if (!this._el.hasClass("hidden")) {
                this._shareSelector.addClass("hidden");
                this._files = this._shareBrowseTree.jstree(true).get_selected();
                this._selectedFilesLabel.text(filesLabel(this._source, this._files));
            }
        });

        this._localSelector.on("change", (e) => {
            this._files = e.target.files;
            this._selectedFilesLabel.text(filesLabel(this._source, this._files));
        });

        this._cancelButton.on("click", () => this._el.addClass("hidden"));
        this._submitButton.on("click", () => {
            let validatedFiles = {};
            try {
                validatedFiles = validateFiles(this._id != null, this._files, this._source);
            }
            catch (err) {
                this._uploadMessage.css('color', 'red');
                this._uploadMessage.text(err);
                return;
            }

            let name = $.trim(this._modelNameInput.prop("value"));
            if (!name.length) {
                this._uploadMessage.css('color', 'red');
                this._uploadMessage.text("Please specify a model name");
                return;
            }

            let modelData = new FormData();
            modelData.append("name", name);
            modelData.append("storage", this._source);
            modelData.append("shared", this._globallyBox.prop('checked'));

            for (let ext in ["xml", "bin", "json", "py"]) {
                if (ext in validatedFiles) {
                    modelData.append(ext, validateFiles[ext]);
                }
            }

            window.cvat.auto_annotation.server.update(modelData, () => {
                window.location.reload();
            }, (message) => {
                this._uploadMessage.css('color', 'red');
                this._uploadMessage.text(message);
            }, (progress) => {
                this._uploadMessage.css('color', 'dodgerblue');
                this._uploadMessage.text(progress);
            }, this._id);
        });
    }

    reset() {
        if (window.cvat.auto_annotation.data.admin) {
            this._globallyBlock.removeClass("hidden");
        }
        else {
            this._globallyBlock.addClass("hidden");
        }

        this._uploadTitle.text("Create Model");
        this._uploadNameInput.prop("value", "");
        this._uploadMessage.css("color", "");
        this._uploadMessage.text("");
        this._selectedFilesLabel.text("No Files");
        this._localSource.prop("checked", true);
        this._globallyBox.prop("checked", false);
        this._table.empty();

        this._id = null;
        this._source = this._localSource.prop("checked") ? "local": "share";
        this._files = [];


        for (let model of window.cvat.auto_annotation.data.models) {
            let rowHtml = `<tr>
                <td> ${model.name} </td>
                <td> ${model.uploadDate} </td>
            </tr>`;

            let row = $(rowHtml);

            if (model.primary) {
                row.append("<td> <label class='h1 regular'> Primary Model </label> </td>");
            }
            else {
                let updateButtonHtml = `<button class="regular h3" style="width: 7em;"> Update </button>`;
                let deleteButtonHtml = `<button class="regular h3" style="width: 7em; margin-top: 5%;"> Delete </button>`;

                row.append(
                    $("<td> </td>").append(
                        $(updateButtonHtml).on("click", () => {
                            this.reset();

                            this._uploadTitle.text("Update Model");
                            this._uploadNameInput.prop("value",`${model.name}`);
                            this._id = model.id;
                        }),
                        $(deleteButtonHtml).on("click", () => {
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
        this._el.removeClass("hidden");
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
                        <table class="modelsTable" id="${window.cvat.auto_annotation.runnerUploadedModelsId}"> </table>
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
                        <table class="regular" style="text-align: center; word-break: break-all;">
                            <thead>
                                <tr style="width: 100%;"> 
                                    <th style="width: 20%;"> Annotate </th>
                                    <th style="width: 40%;"> Task Label </th>
                                    <th style="width: 40%;"> Model Label </th>
                                </tr>
                            </thead>
                            <tbody id="${window.cvat.auto_annotation.annotationLabelsId}">

                            </tbody>
                        </table>
                    </div>
                    <div style="float:right;">
                        <button class="regular h3" style="width: 6em;" id="${window.cvat.auto_annotation.submitAnnotationId}"> Start </button>
                        <button class="regular h3" style="width: 6em;" id="${window.cvat.auto_annotation.cancelAnnotationId}"> Cancel </button>
                    </div>
                </div>
            </div>
        </div>`;

        this._el = $(html);
        this._modelsTable = this._el.find(`#${window.cvat.auto_annotation.runnerUploadedModelsId}`);
        this._labelsTable = this._el.find(`#${window.cvat.auto_annotation.annotationLabelsId}`);
    }

    reset(data) {
        this._modelsTable.empty();

        let active = null;
        for (let model of window.cvat.auto_annotation.data.models) {
            function labelsSelect(labels) {
                let select = $("<select class='regular h3'> </select>");
                select.append($(`<option> </option>`));
                for (let label of labels) {
                    select.append($(`<option value="${label}"> ${label} </option>`));
                }

                return select;
            }

            let self = this;
            this._modelsTable.append(
                $(`<tr> <td> <label class="regular h3"> ${model.name} (${model.uploadDate}) </label> </td> </tr>`).on("click", function() {
                    if (active) {
                        active.style.color = "";
                    }
                    active = this;
                    active.style.color = "darkblue";
                    self._labelsTable.empty();

                    let labels = Object.values(data.spec.labels);
                    let intersection = labels.filter((el) => model.labels.indexOf(el) != -1);
                    for (let label of intersection) {
                        let select = labelsSelect(model.labels);
                        select.prop("value", label);
                        $(`<tr> </tr>`).append(
                            $(`<td style="width: 20%;"> <input type="checkbox"/> </td>`),
                            $(`<td style="width: 40%;"> <label class="regular h3"> ${label} </label> </td>`),
                            $(`<td style="width: 40%;">  </td>`).append(select)
                        ).appendTo(self._labelsTable);
                    }

                    for (let label of labels) {
                        if (intersection.indexOf(label) === -1) {
                            let select = labelsSelect(model.labels);
                            select.prop("value", null);
                            $(`<tr> </tr>`).append(
                                $(`<td style="width: 20%;"> <input type="checkbox"/> </td>`),
                                $(`<td style="width: 40%;"> <label class="regular h3"> ${label} </label> </td>`),
                                $(`<td style="width: 40%;"> </td>`).append(select)
                            ).appendTo(self._labelsTable);
                        }
                    }
                })
            );
        }

        return this;
    }

    show() {
        this._el.removeClass("hidden");
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
    uploadMessageId: "annotatorUploadStatusMessage",

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

    $("body").append(window.cvat.auto_annotation.manager.element, window.cvat.auto_annotation.runner.element);
    $(`<button id="${window.cvat.auto_annotation.managerButtonId}" class="regular h1" style=""> Model Manager</button>`)
        .on("click", () => {
            let overlay = showOverlay("The manager are being setup.."); 
            window.cvat.auto_annotation.manager.reset().show();
            overlay.remove();
        }).appendTo("#dashboardManageButtons");

    newElements.each(function(idx) {
        let elem = $(newElements[idx]);
        let tid = +elem.attr("id").split("_")[1];

        $("<button> Run Auto Annotation </button>").addClass("regular dashboardButtonUI").on("click", () => {
            let overlay = showOverlay("Task date are being recieved from the server..");
            $.ajax({
                url: `/get/task/${tid}`,
                dataType: "json",
                success: (data) => {
                    overlay.setMessage("The model runner are being setup..")
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
