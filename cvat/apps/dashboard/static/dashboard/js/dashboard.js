/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* global
    AnnotationParser:false
    userConfirm:false
    ConstIdGenerator:false
    createExportContainer:false
    dumpAnnotation:false
    LabelsInfo:false
    showMessage:false
    showOverlay:false
*/

'use strict';

class TaskView {
    constructor(details, ondelete, onupdate) {
        this.init(details);

        this._ondelete = ondelete;
        this._onupdate = onupdate;
        this._UI = null;
    }

    _disable() {
        this._UI.find('*').attr('disabled', true).css('opacity', 0.5);
        this._UI.find('.dashboardJobList').empty();
    }

    _remove() {
        $.ajax ({
            url: `/api/v1/tasks/${this._id}`,
            type: 'DELETE',
            success: () => {
                this._ondelete(this._id);
                this._disable();
            },
            error: (errorData) => {
                const message = `Can not build CVAT dashboard. Code: ${errorData.status}. ` +
                    `Message: ${errorData.statusText || errorData.responseText}`;
                showMessage(message);
            }
        });
    }

    _update() {
        $('#dashboardUpdateModal').remove();
        const dashboardUpdateModal = $($('#dashboardUpdateTemplate').html()).appendTo('body');
        $('#dashboardOldLabels').prop('value', LabelsInfo.serialize(this._labels));

        $('#dashboardCancelUpdate').on('click', () => {
            dashboardUpdateModal.remove();
        });

        $('#dashboardSubmitUpdate').on('click', () => {
            try {
                const body = {
                    labels: LabelsInfo.deserialize($('#dashboardNewLabels').prop('value'))
                };
                $.ajax({
                    url: `/api/v1/tasks/${this._id}`,
                    type: 'PATCH',
                    contentType: 'application/json',
                    data: JSON.stringify(body)
                }).done(() => {
                    this._onupdate();
                    dashboardUpdateModal.remove();
                    showMessage('Task has been successfully updated');
                }).fail((errorData) => {
                    const message = `Can not build CVAT dashboard. Code: ${errorData.status}. ` +
                        `Message: ${errorData.statusText || errorData.responseText}`;
                    showMessage(message);
                });
            } catch (exception) {
                showMessage(exception);
            }
        });
    }

    _upload() {
        // TODO Today
    }

    _dump() {
        // TODO Today
    }

    init(details) {
        for (let prop in details) {
            this[`_${prop}`] = details[prop];
        }
    }

    render(baseURL) {
        const self = this;
        this._UI = $('<div class="dashboardItem"> </div>').append(
            $(`<center class="dashboardTitleWrapper">
                <label class="semiBold h1 selectable"> ${this._name} </label>
            </center>`)
        ).append(
            $(`<center class="dashboardTitleWrapper">
                <label class="regular selectable"> ${this._status} </label>
            </center>`)
        ).append(
            $('<div class="dashboardTaskIntro"> </div>').css({
                'background-image': `url("/api/v1/tasks/${this._id}/frames/0")`
            })
        );


        const buttonsContainer = $(`<div class="dashboardButtonsUI"> </div>`).appendTo(this._UI);
        $('<button class="regular dashboardButtonUI"> Dump Annotation </button>').on('click', () => {
            self._dumpAnnotation();
        }).appendTo(buttonsContainer);

        $('<button class="regular dashboardButtonUI"> Upload Annotation </button>').on('click', () => {
            userConfirm("The current annotation will be lost. Are you sure?", () => self._uploadAnnotation());
        }).appendTo(buttonsContainer);

        $('<button class="regular dashboardButtonUI"> Update Task </button>').on('click', () => {
            self._update();
        }).appendTo(buttonsContainer);

        $('<button class="regular dashboardButtonUI"> Delete Task </button>').on('click', () => {
            userConfirm("The task will be removed. Are you sure?", () => self._remove());
        }).appendTo(buttonsContainer);

        if (this._bug_tracker) {
            $('<button class="regular dashboardButtonUI"> Open Bug Tracker </button>').on('click', () => {
                window.open(this._bug_tracker);
            }).appendTo(buttonsContainer);
        }


        const jobsContainer = $(`<table class="dashboardJobList regular">`);
        for (let segment of this._segments) {
            for (let job of segment.jobs) {
                const link = `${baseURL}?id=${job.id}`;
                jobsContainer.append($(`<tr> <td> <a href="${link}"> ${link} </a> </td> </tr>`));
            }
        }

        this._UI.append($(`
            <div class="dashboardJobsUI">
                <center class="dashboardTitleWrapper">
                    <label class="regular h1"> Jobs </label>
                </center>
            </div>
        `).append(jobsContainer));

        if (this._removed) {
            this._disable();
        }

        return this._UI;
    }
}


class DashboardView {
    constructor(metaData, taskData) {
        this._dashboardList = taskData.results;
        this._maxUploadSize = metaData.max_upload_size;
        this._maxUploadCount = metaData.max_upload_count;
        this._baseURL = metaData.base_url;
        this._sharePath = metaData.share_path;

        this._setupList();
        this._setupTaskSearch();
        this._setupCreateDialog();
    }

    _setupList() {
        const dashboardList = $('#dashboardList');
        const dashboardPagination = $('#dashboardPagination');

        const baseURL = this._baseURL;
        dashboardPagination.pagination({
            dataSource: this._dashboardList,
            callback: function(pageList) {
                dashboardList.empty();
                for (let details of pageList) {
                    const taskView = new TaskView(details, () => {
                        // on delete task callback
                        details.removed = true
                    }, (body) => {
                        // on update task callback
                        $.get(`/api/v1/tasks/${details.id}`).done((taskData) => {
                            Object.assign(details, taskData);
                            taskView.init(details);
                        }).fail((errorData) => {
                            const message = `Can not get task from server. Showed info may be obsolete. Code: ${errorData.status}. ` +
                                `Message: ${errorData.statusText || errorData.responseText}`;
                            showMessage(message);
                        })
                    });
                    dashboardList.append(taskView.render(baseURL));
                }

                const pages = $('.paginationjs-pages');
                pages.css('margin-left', (window.screen.width - pages.width()) / 2);
            }
        });
    }

    _setupTaskSearch() {

    }

    _setupCreateDialog() {

    }
}


// DASHBOARD ENTRYPOINT
window.addEventListener('DOMContentLoaded', () => {
    $.when(
        // TODO: Use REST API in order to get meta
        $.get('/dashboard/meta'),
        $.get('/api/v1/tasks'),
    ).then((metaData, taskData) => {
        try {
            new DashboardView(metaData[0], taskData[0]);
            $(window).on('click', function(event) {
                if (event.target.classList.contains('modal')) {
                    event.target.classList.add('hidden');
                }
            });
        }
        catch(exception) {
            $('#content').empty();
            const message = `Can not build CVAT dashboard. Exception: ${exception}.`;
            showMessage(message);
        }
    }).fail((errorData) => {
        $('#content').empty();
        const message = `Can not build CVAT dashboard. Code: ${errorData.status}. ` +
            `Message: ${errorData.statusText || errorData.responseText}`;
        showMessage(message);
    }).always(() => {
        $('#loadingOverlay').remove();
    });
});


// TODO:
// UPLOAD
// DUMP
// SEARCH
// CREATE TASK & SHARE










































































































/* Server requests */
function createTaskRequest(oData, onSuccessRequest, onSuccessCreate, onError, onComplete, onUpdateStatus) {
    $.ajax({
        url: '/api/v1/tasks/',
        type: "POST",
        data: oData,
        contentType: false,
        processData: false,
        success: function(data) {
            onSuccessRequest();
            requestCreatingStatus(data);
        },
        error: function(data) {
            onComplete();
            onError(data.responseText);
        }
    });

    function requestCreatingStatus(task) {
        let tid = task.id;
        let request_frequency_ms = 1000;
        let done = false;

        let requestInterval = setInterval(function() {
            $.ajax({
                url: `/api/v1/tasks/${tid}/status`,
                success: receiveStatus,
                error: function(data) {
                    clearInterval(requestInterval);
                    onComplete();
                    onError(data.responseText);
                }
            });
        }, request_frequency_ms);

        function receiveStatus(data) {
            if (done) return;
            if (data.state === "Finished") {
                done = true;
                clearInterval(requestInterval);
                onComplete();
                onSuccessCreate(tid);
            }
            else if (data.state === "Failed") {
                done = true;
                clearInterval(requestInterval);
                onComplete();
                onError(data.message);
            }
            else if (data["state"] === "Started" && data.message != "") {
                onUpdateStatus(data.message);
            }
        }
    }
}



function uploadAnnotationRequest(tid) {

    let input = $("<input>").attr({
        type: "file",
        accept: "text/xml"
    }).on("change", loadXML).click();

    function loadXML(e) {
        input.remove();
        let overlay = showOverlay("File is being uploaded..");
        let file = e.target.files[0];
        let fileReader = new FileReader();
        fileReader.onload = (e) => parseFile(e, overlay);
        fileReader.readAsText(file);
    }

    function parseFile(e, overlay) {
        let xmlText = e.target.result;
        overlay.setMessage("Request task data from server..");
        $.when(
            $.get("/api/v1/tasks/" + window.cvat.dashboard.taskID),
            $.get("/api/v1/tasks/" + window.cvat.dashboard.taskID + "/frames/meta"),
        ).then(
            function(taskInfo, imageMetaCache) {
                let spec = {"labels": {}, "attributes": {}};
                for (let label of taskInfo[0].labels) {
                    spec.labels[label.id] = label.name;
                    spec.attributes[label.id] = {};
                    for (let attr of label.attributes) {
                        spec.attributes[label.id][attr.id] = attr.text;
                    }
                }
                let annotationParser = new AnnotationParser(
                    {
                        start: 0,
                        stop: taskInfo[0].size,
                        image_meta_data: imageMetaCache[0],
                        flipped: taskInfo[0].flipped
                    },
                    new LabelsInfo(spec),
                    new ConstIdGenerator(-1)
                );

                let asyncParse = function() {
                    let parsed = null;
                    try {
                        parsed = annotationParser.parse(xmlText);
                    }
                    catch(error) {
                        overlay.remove();
                        showMessage("Parsing errors was occurred. " + error);
                        return;
                    }

                    let asyncSave = function() {
                        $.ajax({
                            url: "/delete/annotation/task/" + window.cvat.dashboard.taskID,
                            type: "DELETE",
                            success: function() {
                                asyncSaveChunk(0);
                            },
                            error: function(response) {
                                let message = "Previous annotations cannot be deleted: " +
                                    response.responseText;
                                showMessage(message);
                                overlay.remove();
                            },
                        });
                    };

                    let asyncSaveChunk = function(start) {
                        const CHUNK_SIZE = 100000;
                        let end = start + CHUNK_SIZE;
                        let chunk = {};
                        let next = false;
                        for (let prop in parsed) {
                            if (parsed.hasOwnProperty(prop)) {
                                chunk[prop] = parsed[prop].slice(start, end);
                                next |= chunk[prop].length > 0;
                            }
                        }

                        if (next) {
                            let exportData = createExportContainer();
                            exportData.create = chunk;

                            $.ajax({
                                url: "/save/annotation/task/" + window.cvat.dashboard.taskID,
                                type: "POST",
                                data: JSON.stringify(exportData),
                                contentType: "application/json",
                                success: function() {
                                    asyncSaveChunk(end);
                                },
                                error: function(response) {
                                    let message = "Annotations uploading errors were occurred: " +
                                        response.responseText;
                                    showMessage(message);
                                    overlay.remove();
                                },
                            });
                        } else {
                            let message = "Annotations were uploaded successfully";
                            showMessage(message);
                            overlay.remove();
                        }
                    };

                    overlay.setMessage("Annotation is being saved..");
                    setTimeout(asyncSave);
                };

                overlay.setMessage("File is being parsed..");
                setTimeout(asyncParse);
            },
            function(response) {
                overlay.remove();
                let message = "Bad task request: " + response.responseText;
                showMessage(message);
                throw Error(message);
            }
        );
    }
}


function setupTaskCreator() {
    let dashboardCreateTaskButton = $("#dashboardCreateTaskButton");
    let createModal = $("#dashboardCreateModal");
    let nameInput = $("#dashboardNameInput");
    let labelsInput = $("#dashboardLabelsInput");
    let bugTrackerInput = $("#dashboardBugTrackerInput");
    let localSourceRadio = $("#dashboardLocalSource");
    let shareSourceRadio = $("#dashboardShareSource");
    let selectFiles = $("#dashboardSelectFiles");
    let filesLabel = $("#dashboardFilesLabel");
    let localFileSelector = $("#dashboardLocalFileSelector");
    let shareFileSelector = $("#dashboardShareBrowseModal");
    let shareBrowseTree = $("#dashboardShareBrowser");
    let cancelBrowseServer = $("#dashboardCancelBrowseServer");
    let submitBrowseServer = $("#dashboardSubmitBrowseServer");
    let flipImagesBox = $("#dashboardFlipImages");
    let zOrderBox = $("#dashboardZOrder");
    let segmentSizeInput = $("#dashboardSegmentSize");
    let customSegmentSize = $("#dashboardCustomSegment");
    let overlapSizeInput = $("#dashboardOverlap");
    let customOverlapSize = $("#dashboardCustomOverlap");
    let imageQualityInput = $("#dashboardImageQuality");
    let customCompressQuality = $("#dashboardCustomQuality");

    let taskMessage = $("#dashboardCreateTaskMessage");
    let submitCreate = $("#dashboardSubmitTask");
    let cancelCreate = $("#dashboardCancelTask");

    let name = nameInput.prop("value");
    let labels = labelsInput.prop("value");
    let bugTrackerLink = bugTrackerInput.prop("value");
    let source = "local";
    let flipImages = false;
    let zOrder = false;
    let segmentSize = 5000;
    let overlapSize = 0;
    let compressQuality = 50;
    let files = [];

    dashboardCreateTaskButton.on("click", function() {
        $("#dashboardCreateModal").removeClass("hidden");
    });

    nameInput.on("change", (e) => {name = e.target.value;});
    bugTrackerInput.on("change", (e) => {bugTrackerLink = e.target.value;});
    labelsInput.on("change", (e) => {labels = e.target.value;});

    localSourceRadio.on("click", function() {
        if (source === "local") {
            return;
        }
        source = "local";
        files = [];
        updateSelectedFiles();
    });

    shareSourceRadio.on("click", function() {
        if (source === "share") {
            return;
        }
        source = "share";
        files = [];
        updateSelectedFiles();
    });

    selectFiles.on("click", function() {
        if (source === "local") {
            localFileSelector.click();
        }
        else {
            shareBrowseTree.jstree("refresh");
            shareFileSelector.removeClass("hidden");
            shareBrowseTree.jstree({
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

    localFileSelector.on("change", function(e) {
        files = e.target.files;
        updateSelectedFiles();
    });


    cancelBrowseServer.on("click", () => shareFileSelector.addClass("hidden"));
    submitBrowseServer.on("click", function() {
        if (!createModal.hasClass("hidden")) {
            files = shareBrowseTree.jstree(true).get_selected();
            cancelBrowseServer.click();
            updateSelectedFiles();
        }
    });

    flipImagesBox.on("click", (e) => {
        flipImages = e.target.checked;
    });

    zOrderBox.on("click", (e) => {
        zOrder = e.target.checked;
    });
    customSegmentSize.on("change", (e) => segmentSizeInput.prop("disabled", !e.target.checked));
    customOverlapSize.on("change", (e) => overlapSizeInput.prop("disabled", !e.target.checked));
    customCompressQuality.on("change", (e) => imageQualityInput.prop("disabled", !e.target.checked));

    segmentSizeInput.on("change", function() {
        let value = Math.clamp(
            +segmentSizeInput.prop("value"),
            +segmentSizeInput.prop("min"),
            +segmentSizeInput.prop("max")
        );

        segmentSizeInput.prop("value", value);
        segmentSize = value;
    });

    overlapSizeInput.on("change", function() {
        let value = Math.clamp(
            +overlapSizeInput.prop("value"),
            +overlapSizeInput.prop("min"),
            +overlapSizeInput.prop("max")
        );

        overlapSizeInput.prop("value", value);
        overlapSize = value;
    });

    imageQualityInput.on("change", function() {
        let value = Math.clamp(
            +imageQualityInput.prop("value"),
            +imageQualityInput.prop("min"),
            +imageQualityInput.prop("max")
        );

        imageQualityInput.prop("value", value);
        compressQuality = value;
    });

    submitCreate.on("click", function() {
        if (!validateName(name)) {
            taskMessage.css("color", "red");
            taskMessage.text("Invalid task name");
            return;
        }

        if (!validateLabels(labels)) {
            taskMessage.css("color", "red");
            taskMessage.text("Invalid task labels");
            return;
        }

        if (!validateSegmentSize(segmentSize)) {
            taskMessage.css("color", "red");
            taskMessage.text("Segment size out of range");
            return;
        }

        if (!validateOverlapSize(overlapSize, segmentSize)) {
            taskMessage.css("color", "red");
            taskMessage.text("Overlap size must be positive and not more then segment size");
            return;
        }

        if (files.length <= 0) {
            taskMessage.css("color", "red");
            taskMessage.text("Need specify files for task");
            return;
        }
        else if (files.length > window.maxUploadCount && source === "local") {
            taskMessage.css("color", "red");
            taskMessage.text("Too many files. Please use share functionality");
            return;
        }
        else if (source === "local") {
            let commonSize = 0;
            for (let file of files) {
                commonSize += file.size;
            }
            if (commonSize > window.maxUploadSize) {
                taskMessage.css("color", "red");
                taskMessage.text("Too big size. Please use share functionality");
                return;
            }
        }

        let taskData = new FormData();
        taskData.append("name", name);
        taskData.append("bug_tracker", bugTrackerLink);
        // FIXME: a trivial parser for labels
        labels = labels.split(/\s+/);
        let labelObjs = [];
        for (let labelIdx = 0; labelIdx < labels.length; labelIdx++) {
            let label = labels[labelIdx]
            let attributes = [];
            while (labelIdx + 1 < labels.length) {
                if (labels[labelIdx + 1].startsWith("~") ||
                    labels[labelIdx + 1].startsWith("@")) {
                    attributes.push({"text" : labels[++labelIdx]});
                } else {
                    break;
                }
            }

            labelObjs.push(JSON.stringify(
                {"name": label, "attributes": attributes }));
        }
        for (let i = 0; i < labelObjs.length; i++) {
            taskData.append(`labels[${i}]`, labelObjs[i]);
        }

        taskData.append("flipped", flipImages);
        taskData.append("z_order", zOrder);

        if (customSegmentSize.prop("checked")) {
            taskData.append("segment_size", segmentSize);
        }
        if (customOverlapSize.prop("checked")) {
            taskData.append("overlap", overlapSize);
        }
        if (customCompressQuality.prop("checked")) {
            taskData.append("image_quality", compressQuality);
        }

        for (let j = 0; j < files.length; j++) {
            if (source === "local") {
                taskData.append(`client_files[${j}]`, files[j]);
            } else {
                taskData.append(`server_files[${j}]`, files[j]);
            }
        }

        submitCreate.prop("disabled", true);
        createTaskRequest(taskData,
            () => {
                taskMessage.css("color", "green");
                taskMessage.text("Successful request! Creating..");
            },
            () => window.location.reload(),
            (response) => {
                taskMessage.css("color", "red");
                taskMessage.text(response);
            },
            () => submitCreate.prop("disabled", false),
            (status) => {
                taskMessage.css("color", "blue");
                taskMessage.text(status);
            });
    });

    function updateSelectedFiles() {
        switch (files.length) {
        case 0:
            filesLabel.text("No Files");
            break;
        case 1:
            filesLabel.text(typeof(files[0]) === "string" ? files[0] : files[0].name);
            break;
        default:
            filesLabel.text(files.length + " files");
        }
    }


    function validateName(name) {
        let math = name.match("[a-zA-Z0-9()_ ]+");
        return math != null;
    }

    function validateLabels(labels) {
        let tmp = labels.replace(/\s/g,"");
        return tmp.length > 0;
        // to do good validator
    }

    function validateSegmentSize(segmentSize) {
        return (segmentSize >= 100 && segmentSize <= 50000);
    }

    function validateOverlapSize(overlapSize, segmentSize) {
        return (overlapSize >= 0 && overlapSize <= segmentSize - 1);
    }

    cancelCreate.on("click", () => createModal.addClass("hidden"));
}


function setupTaskUpdater() {
    let updateModal = $("#dashboardUpdateModal");
    let oldLabels = $("#dashboardOldLabels");
    let newLabels = $("#dashboardNewLabels");
    let submitUpdate = $("#dashboardSubmitUpdate");
    let cancelUpdate = $("#dashboardCancelUpdate");

    updateModal[0].loadCurrentLabels = function() {
        $.ajax({
            url: "/api/v1/tasks/" + window.cvat.dashboard.taskID,
            success: function(taskInfo) {
                let spec = {"labels": {}, "attributes": {}};
                for (let label of taskInfo.labels) {
                    spec.labels[label.id] = label.name;
                    spec.attributes[label.id] = {};
                    for (let attr of label.attributes) {
                        spec.attributes[label.id][attr.id] = attr.text;
                    }
                }
                let labels = new LabelsInfo(spec);
                oldLabels.attr("value", labels.normalize());
            },
            error: function(response) {
                oldLabels.attr("value", "Bad request");
                let message = "Bad task request: " + response.responseText;
                throw Error(message);
            }
        });
    };

    cancelUpdate.on("click", function() {
        $("#dashboardNewLabels").prop("value", "");
        updateModal.addClass("hidden");
    });

    submitUpdate.on("click", () => updateTaskRequest(newLabels.prop("value")));
}


function setupSearch() {
    function getUrlParameter(name) {
        let regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
        let results = regex.exec(window.location.search);
        return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    let searchInput = $("#dashboardSearchInput");
    let searchSubmit = $("#dashboardSearchSubmit");

    let line = getUrlParameter("search") || "";
    searchInput.val(line);

    searchSubmit.on("click", function() {
        let e = $.Event("keypress");
        e.keyCode = 13;
        searchInput.trigger(e);
    });

    searchInput.on("keypress", function(e) {
        if (e.keyCode != 13) return;
        let filter = e.target.value;
        if (!filter) window.location.search = "";
        else window.location.search = `search=${filter}`;
    });
}
