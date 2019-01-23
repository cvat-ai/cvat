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

    start(modelId, taskId, data, success, error, progress, check) {
        $.ajax({
            url: "/auto_annotation/start/" + modelId + "/" + taskId,
            type: "POST",
            data: JSON.stringify(data),
            contentType: "application/json",
            success: (data) => {
                check(data.id, success, error, progress);
            },
            error: (data) => {
                let message = `Starting request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                error(message);
            }
        });
    }

    update(data, success, error, progress, check, modelId) {
        let url = "";
        if (modelId === null) {
            url = "/auto_annotation/create";
        }
        else {
            url = "/auto_annotation/update/" + modelId;
        }

        $.ajax({
            url,
            type: "POST",
            data,
            contentType: false,
            processData: false,
            success: (data) => {
                check(data.id, success, error, progress);
            },
            error: (data) => {
                let message = `Creating request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                error(message);
            }
        });
    }

    delete(modelId, success, error) {
        $.ajax({
            url: "/auto_annotation/delete/" + modelId,
            type: "DELETE",
            success,
            error: (data) => {
                let message = `Deleting request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                error(message);
            }
        });
    }

    check(workerId, success, error, progress) {
        function updateProgress(data, progress) {
            if (data.progress && progress) {
                progress(data.progress);
            }
        }

        let checkCallback = function() {
            $.ajax({
                url: "/auto_annotation/check/" + workerId,
                type: "GET",
                success: (data) => {
                    updateProgress(data, progress);

                    switch(data.status) {
                        case "failed":
                            error(`Checking request has returned the "${data.status}" status. Message: ${data.error}`);
                            break;

                        case "unknown":
                            error(`Checking request has returned the "${data.status}" status.`);
                            break;

                        case "finished":
                            success();
                            break;

                        default:
                            setTimeout(checkCallback, 1000);
                    }
                },
                error: (data) => {
                    let message = `Checking request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                    error(message);
                }
            });
        };

        setTimeout(checkCallback, 1000);
    }

    meta(tids, success, error) {
        $.ajax({
            url: "/auto_annotation/meta/get",
            type: "POST",
            data: JSON.stringify(tids),
            contentType: "application/json",
            success,
            error: (data) => {
                let message = `Getting meta request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                error(message);
            }
        });
    }

    cancel(tid, success, error) {
        $.ajax({
            url: "/auto_annotation/cancel/" + tid,
            type: "GET",
            success,
            error: (data) => {
                let message = `Getting meta request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                error(message);
            }
        });
    }
}


class AutoAnnotationModelManagerView {
    constructor() {
        let html = `<div class="modal hidden" id="${window.cvat.autoAnnotation.managerWindowId}">
            <div class="modal-content" id="${window.cvat.autoAnnotation.managerContentId}">
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
                            <tbody id="${window.cvat.autoAnnotation.managerUploadedModelsId}"> </tbody>
                        </table>
                    </div>
                </div>
                <div class="regular" id="${window.cvat.autoAnnotation.uploadContentId}">
                    <center>
                        <label class="regular h1" id="${window.cvat.autoAnnotation.uploadTitleId}"> Create Model </label>
                    </center>
                    <table>
                        <tr>
                            <td style="width: 25%"> <label class="regular h3"> Name: </label> </td>
                            <td> <input type="text" id="${window.cvat.autoAnnotation.uploadNameInputId}" class="regular h3" style="width: 100%"> </td>
                        </tr>
                        <tr>
                            <td> <label class="regular h3"> Source: </label> </td>
                            <td>
                                <input id="${window.cvat.autoAnnotation.uploadLocalSourceId}" type="radio" name="modelSourceType" value="local" checked>
                                <label for="${window.cvat.autoAnnotation.uploadLocalSourceId}" class="regular h3"> Local </label>
                                <br>
                                <input id="${window.cvat.autoAnnotation.uploadShareSourceId}" type="radio" name="modelSourceType" value="shared">
                                <label for="${window.cvat.autoAnnotation.uploadShareSourceId}" class="regular h3"> Share </label>
                            </td>
                        </tr>
                        <tr id="${window.cvat.autoAnnotation.uploadGloballyBlockId}">
                            <td> <label class="regular h3"> Upload Globally </label> </td>
                            <td> <input type="checkbox" id="${window.cvat.autoAnnotation.uploadGloballyId}"> </td>
                        </tr>
                    </table>
                <div style="text-align: left;">
                    <div>
                        <button id="${window.cvat.autoAnnotation.selectFilesButtonId}" class="regular h3"> Select Files </button>
                        <label id="${window.cvat.autoAnnotation.selectedFilesId}" class="regular h3" style="margin-left: 10px"> No Files </label>
                        <input id="${window.cvat.autoAnnotation.localFileSelectorId}" type="file" accept=".bin,.xml,.json,.py" style="display: none" multiple>
                    </div>
                </div>
                <div>
                    <div style="float: right; width: 50%; height: 50px;">
                        <button class="regular h3" id="${window.cvat.autoAnnotation.submitUploadButtonId}"> Submit </button>
                        <button class="regular h3" id="${window.cvat.autoAnnotation.cancelUploadButtonId}"> Cancel </button>
                    </div>
                    <div style="float: left; overflow-y: auto; height: 75px;  overflow: auto; width: 100%; word-break: break-word;">
                        <label class="regular h3 selectable" style="float: left;" id="${window.cvat.autoAnnotation.uploadMessageId}"> </label>
                    </div>
                </div>
            </div>
        </div>`;

        this._el = $(html);

        this._table = this._el.find(`#${window.cvat.autoAnnotation.managerUploadedModelsId}`);
        this._globallyBlock = this._el.find(`#${window.cvat.autoAnnotation.uploadGloballyBlockId}`);
        this._uploadTitle = this._el.find(`#${window.cvat.autoAnnotation.uploadTitleId}`);
        this._uploadNameInput = this._el.find(`#${window.cvat.autoAnnotation.uploadNameInputId}`);
        this._uploadMessage = this._el.find(`#${window.cvat.autoAnnotation.uploadMessageId}`);
        this._selectedFilesLabel = this._el.find(`#${window.cvat.autoAnnotation.selectedFilesId}`);
        this._modelNameInput = this._el.find(`#${window.cvat.autoAnnotation.uploadNameInputId}`);
        this._localSource = this._el.find(`#${window.cvat.autoAnnotation.uploadLocalSourceId}`);
        this._shareSource = this._el.find(`#${window.cvat.autoAnnotation.uploadShareSourceId}`);
        this._cancelButton = this._el.find(`#${window.cvat.autoAnnotation.cancelUploadButtonId}`);
        this._submitButton = this._el.find(`#${window.cvat.autoAnnotation.submitUploadButtonId}`);
        this._globallyBox = this._el.find(`#${window.cvat.autoAnnotation.uploadGloballyId}`);
        this._selectButton = this._el.find(`#${window.cvat.autoAnnotation.selectFilesButtonId}`);
        this._localSelector = this._el.find(`#${window.cvat.autoAnnotation.localFileSelectorId}`);
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

        function extractFiles(extensions, files, source) {
            let _files = {};
            function getExt(source, file) {
                return source === "local" ? file.name.split(".").pop() : file.split(".").pop();
            }

            function addFile(file, extention, files) {
                if (extention in files) {
                    throw Error(`More than one file with the extension .${extention} have been found`);
                }

                files[extention] = file;
            }

            for (let file of files) {
                let fileExt = getExt(source, file);
                if (extensions.includes(fileExt)) {
                    addFile(file, fileExt, _files);
                }
            }

            return _files;
        }

        function validateFiles(isUpdate, files, source) {
            let extensions = ["xml", "bin", "py", "json"];
            let _files = extractFiles(extensions, files, source);

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
            try {
                this._submitButton.prop("disabled", true);

                let name = $.trim(this._modelNameInput.prop("value"));
                if (!name.length) {
                    this._uploadMessage.css("color", "red");
                    this._uploadMessage.text("Please specify a model name");
                    return;
                }

                let validatedFiles = {};
                try {
                    validatedFiles = validateFiles(this._id != null, this._files, this._source);
                }
                catch (err) {
                    this._uploadMessage.css("color", "red");
                    this._uploadMessage.text(err);
                    return;
                }

                let modelData = new FormData();
                modelData.append("name", name);
                modelData.append("storage", this._source);
                modelData.append("shared", this._globallyBox.prop("checked"));

                for (let ext of ["xml", "bin", "json", "py"].filter( (ext) => ext in validatedFiles)) {
                    modelData.append(ext, validatedFiles[ext]);
                }

                this._uploadMessage.text("");
                let overlay = showOverlay("Send request to the server..");
                window.cvat.autoAnnotation.server.update(modelData, () => {
                    window.location.reload();
                }, (message) => {
                    overlay.remove();
                    showMessage(message);
                }, (progress) => {
                    overlay.setMessage(progress);
                }, window.cvat.autoAnnotation.server.check, this._id);
            }
            finally {
                this._submitButton.prop("disabled", false);
            }
        });
    }

    reset() {
        const setBlocked = () => {
            if (window.cvat.autoAnnotation.data.admin) {
                this._globallyBlock.removeClass("hidden");
            }
            else {
                this._globallyBlock.addClass("hidden");
            }
        };

        setBlocked();
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

        const updateButtonClickHandler = (event) => {
            this.reset();

            this._uploadTitle.text("Update Model");
            this._uploadNameInput.prop("value",`${event.data.model.name}`);
            this._id = event.data.model.id;
        };

        const deleteButtonClickHandler = (event) => {
            confirm(`Do you actually want to delete the "${event.data.model.name}" model. Are you sure?`, () => {
                window.cvat.autoAnnotation.server.delete(event.data.model.id, () => {
                    window.cvat.autoAnnotation.data.models = window.cvat.autoAnnotation.data.models.filter((item) => item !== event.data.model);
                    this.reset();
                }, (message) => {
                    showMessage(message);
                });
            });
        };

        const getModelModifyButtons = (model) => {
            if (model.primary) {
                return "<td> <label class='h1 regular'> Primary Model </label> </td>";
            }
            else {
                let updateButtonHtml = "<button class=\"regular h3\" style=\"width: 7em;\"> Update </button>";
                let deleteButtonHtml = "<button class=\"regular h3\" style=\"width: 7em; margin-top: 5%;\"> Delete </button>";

                return $("<td> </td>").append(
                            $(updateButtonHtml).on("click", {model}, updateButtonClickHandler),
                            $(deleteButtonHtml).on("click", {model}, deleteButtonClickHandler)
                        );
            }
        };

        for (let model of window.cvat.autoAnnotation.data.models) {
            let rowHtml = `<tr>
                <td> ${model.name} </td>
                <td> ${model.uploadDate} </td>
            </tr>`;

            this._table.append(
                $(rowHtml).append(getModelModifyButtons(model))
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


class AutoAnnotationModelRunnerView {
    constructor() {
        let html = `<div class="modal hidden" id="${window.cvat.autoAnnotation.runnerWindowId}">
            <div class="modal-content" id="${window.cvat.autoAnnotation.runnerContentId}">
                <div style="width: 55%; height: 100%; float: left;">
                    <center style="height: 10%;">
                        <label class="regular h1"> Uploaded Models </label>
                    </center>
                    <div style="height: 70%; overflow: auto; margin-top: 2%;">
                        <table class="modelsTable" id="${window.cvat.autoAnnotation.runnerUploadedModelsId}"> </table>
                    </div>
                    <div>
                        <input type="checkbox" id="${window.cvat.autoAnnotation.removeCurrentAnnotationId}"/>
                        <label class="regular h3" for="${window.cvat.autoAnnotation.removeCurrentAnnotationId}"> Remove current annotation </label>
                    </div>
                </div>
                <div style="width: 40%; height: 100%; float: left; margin-left: 3%;">
                    <center style="height: 10%;">
                        <label class="regular h1"> Annotation Labels </label>
                    </center>
                    <div style="height: 70%; overflow: auto; margin-top: 2%;">
                        <table class="regular" style="text-align: center; word-break: break-all; width: 100%;">
                            <thead>
                                <tr style="width: 100%;">
                                    <th style="width: 45%;"> Task Label </th>
                                    <th style="width: 45%;"> DL Model Label </th>
                                    <th style="width: 10%;"> </th>
                                </tr>
                            </thead>
                            <tbody id="${window.cvat.autoAnnotation.annotationLabelsId}">

                            </tbody>
                        </table>
                    </div>
                    <div style="float:right;">
                        <button class="regular h3" style="width: 6em;" id="${window.cvat.autoAnnotation.submitAnnotationId}"> Start </button>
                        <button class="regular h3" style="width: 6em;" id="${window.cvat.autoAnnotation.cancelAnnotationId}"> Cancel </button>
                    </div>
                </div>
            </div>
        </div>`;

        this._el = $(html);
        this._id = null;
        this._tid = null;
        this._initButton = null;
        this._modelsTable = this._el.find(`#${window.cvat.autoAnnotation.runnerUploadedModelsId}`);
        this._labelsTable = this._el.find(`#${window.cvat.autoAnnotation.annotationLabelsId}`);
        this._active = null;

        this._el.find(`#${window.cvat.autoAnnotation.cancelAnnotationId}`).on("click", () => {
            this._el.addClass("hidden");
        });

        this._el.find(`#${window.cvat.autoAnnotation.submitAnnotationId}`).on("click", () => {
            let initButton = this._initButton;
            try {
                if (this._id === null) {
                    throw Error("Please specify a model for an annotation process");
                }

                let mapping = {};
                $(".annotatorMappingRow").each(function() {
                    let dlModelLabel = $(this).find(".annotatorDlLabelSelector")[0].value;
                    let taskLabel = $(this).find(".annotatorTaskLabelSelector")[0].value;
                    if (dlModelLabel in mapping) {
                        throw Error(`The label "${dlModelLabel}" has been specified twice or more`);
                    }
                    mapping[dlModelLabel] = taskLabel;
                });

                if (!Object.keys(mapping).length) {
                    throw Error("Labels for an annotation process haven't been found");
                }

                let overlay = showOverlay("Request has been sent");
                window.cvat.autoAnnotation.server.start(this._id, this._tid, {
                    reset: $(`#${window.cvat.autoAnnotation.removeCurrentAnnotationId}`).prop("checked"),
                    labels: mapping
                }, () => {
                    overlay.remove();
                    initButton[0].setupRun();
                    window.cvat.autoAnnotation.runner.hide();
                }, (message) => {
                    overlay.remove();
                    initButton[0].setupRun();
                    showMessage(message);
                }, () => {
                    window.location.reload();
                }, window.cvat.autoAnnotation.server.check);
            }
            catch (error) {
                showMessage(error);
            }
        });
    }

    reset(data, initButton) {
        function labelsSelect(labels, elClass) {
            let select = $(`<select class="regular h3 ${elClass}" style="width:100%;"> </select>`);
            for (let label of labels) {
                select.append($(`<option value="${label}"> ${label} </option>`));
            }

            select.prop("value", null);

            return select;
        }

        function makeCreator(dlSelect, taskSelect, callback) {
            let dlIsFilled = false;
            let taskIsFilled = false;
            let creator = $("<tr style=\"margin-bottom: 5px;\"> </tr>").append(
                $("<td style=\"width: 45%;\"> </td>").append(taskSelect),
                $("<td style=\"width: 45%;\"> </td>").append(dlSelect)
            );

            let _callback = () => {
                $("<td style=\"width: 10%; position: relative;\"> </td>").append(
                    $("<a class=\"close\"></a>").css("top", "0px").on("click", (e) => {
                        $(e.target.parentNode.parentNode).remove();
                    })
                ).appendTo(creator);

                creator.addClass("annotatorMappingRow");
                callback();
            };

            dlSelect.on("change", (e) => {
                if (e.target.value && taskIsFilled) {
                    dlSelect.off("change");
                    taskSelect.off("change");
                    _callback();
                }
                dlIsFilled = Boolean(e.target.value);
            });

            taskSelect.on("change", (e) => {
                if (e.target.value && dlIsFilled) {
                    dlSelect.off("change");
                    taskSelect.off("change");
                    _callback();
                }

                taskIsFilled = Boolean(e.target.value);
            });

            return creator;
        }

        this._id = null;
        this._initButton = initButton;
        this._tid = data.taskid;
        this._modelsTable.empty();
        this._labelsTable.empty();
        this._active = null;

        let modelItemClickHandler = function(event) {
            if (event.data.self._active) {
                event.data.self._active.style.color = "";
            }

            event.data.self._id = event.data.model.id;
            event.data.self._active = this;
            event.data.self._active.style.color = "darkblue";

            event.data.self._labelsTable.empty();
            let labels = Object.values(event.data.data.spec.labels);
            let intersection = labels.filter((el) => event.data.model.labels.indexOf(el) !== -1);
            for (let label of intersection) {
                let dlSelect = labelsSelect(event.data.model.labels, "annotatorDlLabelSelector");
                dlSelect.prop("value", label);
                let taskSelect = labelsSelect(labels, "annotatorTaskLabelSelector");
                taskSelect.prop("value", label);
                $("<tr class=\"annotatorMappingRow\" style=\"margin-bottom: 5px;\"> </tr>").append(
                    $("<td style=\"width: 45%;\"> </td>").append(taskSelect),
                    $("<td style=\"width: 45%;\"> </td>").append(dlSelect),
                    $("<td style=\"width: 10%; position: relative;\"> </td>").append(
                        $("<a class=\"close\"></a>").css("top", "0px").on("click", (e) => {
                            $(e.target.parentNode.parentNode).remove();
                        })
                    )
                ).appendTo(event.data.self._labelsTable);
            }

            let dlSelect = labelsSelect(event.data.model.labels, "annotatorDlLabelSelector");
            let taskSelect = labelsSelect(labels, "annotatorTaskLabelSelector");

            let callback = () => {
                let dlSelect = labelsSelect(event.data.model.labels, "annotatorDlLabelSelector");
                let taskSelect = labelsSelect(labels, "annotatorTaskLabelSelector");
                makeCreator(dlSelect, taskSelect, callback).appendTo(event.data.self._labelsTable);
            };

            makeCreator(dlSelect, taskSelect, callback).appendTo(event.data.self._labelsTable);
        };

        for (let model of window.cvat.autoAnnotation.data.models) {
            let self = this;
            this._modelsTable.append(
                $(`<tr> <td> <label class="regular h3"> ${model.name} (${model.uploadDate}) </label> </td> </tr>`).on(
                    "click", {model, data, self}, modelItemClickHandler)
            );
        }

        return this;
    }

    show() {
        this._el.removeClass("hidden");
        return this;
    }

    hide() {
        this._el.addClass("hidden");
        return this;
    }

    get element() {
        return this._el;
    }
}

window.cvat.autoAnnotation = {
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
};

window.cvat.dashboard.uiCallbacks.push((newElements) => {
    window.cvat.autoAnnotation.server = new AutoAnnotationServer();
    window.cvat.autoAnnotation.manager = new AutoAnnotationModelManagerView();
    window.cvat.autoAnnotation.runner = new AutoAnnotationModelRunnerView();

    let tids = [];
    for (let el of newElements) {
        tids.push(el.id.split("_")[1]);
    }

    window.cvat.autoAnnotation.server.meta(tids, (data) => {
        window.cvat.autoAnnotation.data = data;
        $("body").append(window.cvat.autoAnnotation.manager.element, window.cvat.autoAnnotation.runner.element);
        $(`<button id="${window.cvat.autoAnnotation.managerButtonId}" class="regular h1" style=""> Model Manager</button>`)
            .on("click", () => {
                let overlay = showOverlay("The manager are being setup..");
                window.cvat.autoAnnotation.manager.reset().show();
                overlay.remove();
            }).appendTo("#dashboardManageButtons");

        newElements.each(function(idx) {
            let elem = $(newElements[idx]);
            let tid = +elem.attr("id").split("_")[1];

            let button = $("<button> Run Auto Annotation </button>").addClass("regular dashboardButtonUI");
            button[0].setupRun = function() {
                self = $(this);
                self.text("Run Auto Annotation").off("click").on("click", () => {
                    let overlay = showOverlay("Task date are being recieved from the server..");
                    $.ajax({
                        url: `/get/task/${tid}`,
                        dataType: "json",
                        success: (data) => {
                            overlay.setMessage("The model runner are being setup..");
                            window.cvat.autoAnnotation.runner.reset(data, self).show();
                            overlay.remove();
                        },
                        error: (data) => {
                            showMessage(`Can't get task data. Code: ${data.status}. Message: ${data.responseText || data.statusText}`);
                        },
                        complete: () => {
                            overlay.remove();
                        }
                    });
                });
            };

            button[0].setupCancel = function() {
                self = $(this);
                self.off("click").text("Cancel Auto Annotation").on("click", () => {
                    confirm("Process will be canceled. Are you sure?", () => {
                        window.cvat.autoAnnotation.server.cancel(tid, () => {
                            this.setupRun();
                        }, (message) => {
                            showMessage(message);
                        });
                    });
                });

                window.cvat.autoAnnotation.server.check(window.cvat.autoAnnotation.data.run[tid].rq_id, () => {
                    this.setupRun();
                }, (error) => {
                    button[0].setupRun();
                    button.text("Annotation has failed");
                    button.title(error);
                }, (progress) => {
                    button.text(`Cancel Auto Annotation (${progress.toString().slice(0,4)})%`);
                });
            };

            let data = window.cvat.autoAnnotation.data.run[tid];
            if (data && ["queued", "started"].includes(data.status)) {
                button[0].setupCancel();
            }
            else {
                button[0].setupRun();
            }

            button.appendTo(elem.find("div.dashboardButtonsUI")[0]);
        });
    }, (error) => {
        showMessage(`Cannot get models meta information: ${error}`);
    });
});
