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
    dumpAnnotationRequest: false
    dumpAnnotation:false
    LabelsInfo:false
    showMessage:false
    showOverlay:false
*/

'use strict';

function createTaskRequest(oData, onSuccessRequest, onSuccessCreate, onError, onComplete, onUpdateStatus) {
    $.ajax({
        url: 'api/v1/tasks',
        type: 'POST',
        data: oData,
        contentType: false,
        processData: false
    }).done((data) => {
        onSuccessRequest();
        requestCreatingStatus(data.id);
    }).fail((errorData) => {
        const message = `Can not create task. Code: ${errorData.status}. ` +
            `Message: ${errorData.statusText || errorData.responseText}`;
        onError(message);
    });

    function requestCreatingStatus(tid) {
        function checkCallback() {
            $.get(`/api/v1/tasks/${tid}/status`).done((data) => {
                if (['queued', 'Started'].includes(data.state)) {
                    if (data.message != '') {
                        onUpdateStatus(data.message);
                    }
                    setTimeout(checkCallback, 1000);
                } else {
                    if (data.state === 'Finished') {
                        onComplete();
                        onSuccessCreate(tid);
                    }
                    else if (data.state === 'Failed') {
                        onComplete();
                        const message = `Can not create task. ${data.message}`;
                        onError(message);
                    }
                }
            }).fail((errorData) => {
                const message = `Can not check task status. Code: ${errorData.status}. ` +
                    `Message: ${errorData.statusText || errorData.responseText}`;
                onError(message);
            });
        }

        setTimeout(checkCallback, 1000);
    }
}

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

    _upload(tid) {
        function parse(overlay, e) {
            const xmlText = e.target.result;
            $.get(`api/v1/tasks/${tid}`).done(() => {
                const labelsCopy = JSON.parse(JSON.stringify(this._labels));

                // TODO: Update labels info for new data format
                // TODO: this context are saved?
                const parser = new AnnotationParser({
                    start: 0,
                    stop: this._size,
                    flipped: this._flipped,
                }, new LabelsInfo(labelsCopy), new ConstIdGenerator(-1));

                function asyncParse() {
                    let parsed = null;
                    try {
                        parsed = parser.parse(xmlText);
                    }
                    catch(error) {
                        overlay.remove();
                        showMessage('Parsing errors occured. '  + error);
                        return;
                    }

                    function asyncSave() {
                        $.ajax({
                            url: '/delete/annotation/task/' + window.cvat.dashboard.taskID,
                            type: 'DELETE',
                            success: function() {
                                asyncSaveChunk(0);
                            },
                            error: function(response) {
                                const message = `Could not remove current annotation. Code: ${errorData.status}. ` +
                                    `Message: ${errorData.statusText || errorData.responseText}`;
                                showMessage(message);
                            },
                        });
                    };

                    function asyncSaveChunk(start) {
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
                            const exportData = createExportContainer();
                            exportData.create = chunk;

                            $.ajax({
                                url: `/save/annotation/task/${tid}`,
                                type: 'POST',
                                data: JSON.stringify(exportData),
                                contentType: 'application/json',
                            }).done(() => {
                                asyncSaveChunk(end);
                            }).fail((errorData) => {
                                const message = `Annotation uploading errors occurred. Code: ${errorData.status}. ` +
                                    `Message: ${errorData.statusText || errorData.responseText}`;
                                showMessage(message);
                            });
                        } else {
                            const message = 'Annotation have been successfully uploaded';
                            showMessage(message);
                            overlay.remove();
                        }
                    }

                    overlay.setMessage('The annotation is being saved..');
                    setTimeout(asyncSave);
                }

                overlay.setMessage('The annotation file is being parsed..');
                setTimeout(asyncParse);
            }).fail((errorData) => {
                const message = `Can not get required data from the server. Code: ${errorData.status}. ` +
                    `Message: ${errorData.statusText || errorData.responseText}`;
                showMessage(message);
            });

            overlay.setMessage('Required data are being downloaded from the server..');
        }

        self = this;
        $('<input type="file" accept="text/xml">').on('change', function() {
            const file = this.files[0];
            $(this).remove();
            if (file) {
                const fileReader = new FileReader();
                fileReader.onload = parse.bind(self, overlay);
                fileReader.readAsText(file);
            }
        }).click();
    }

    _dump(button) {
        dumpAnnotationRequest(button, this._id, this._name);
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
        $('<button class="regular dashboardButtonUI"> Dump Annotation </button>').on('click', (e) => {
            self._dump(e.target);
        }).appendTo(buttonsContainer);

        $('<button class="regular dashboardButtonUI"> Upload Annotation </button>').on('click', () => {
            userConfirm("The current annotation will be lost. Are you sure?", () => self._upload());
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
                    const detailsCopy = JSON.parse(JSON.stringify(details));
                    const taskView = new TaskView(detailsCopy, () => {
                        // on delete task callback
                        details.removed = true
                    }, () => {
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
        function getUrlParameter(name) {
            let regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
            let results = regex.exec(window.location.search);
            return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
        }

        let searchInput = $('#dashboardSearchInput');
        let searchSubmit = $('#dashboardSearchSubmit');

        let line = getUrlParameter('name') || '';
        searchInput.val(line);

        searchSubmit.on('click', function() {
            let e = $.Event('keypress');
            e.keyCode = 13;
            searchInput.trigger(e);
        });

        searchInput.on('keypress', function(e) {
            if (e.keyCode != 13) return;
            let filter = e.target.value;
            if (!filter) window.location.search = '';
            else window.location.search = `name=${filter}`;
        });
    }

    _setupCreateDialog() {
        const dashboardCreateTaskButton = $('#dashboardCreateTaskButton');
        const createModal = $('#dashboardCreateModal');
        const nameInput = $('#dashboardNameInput');
        const labelsInput = $('#dashboardLabelsInput');
        const bugTrackerInput = $('#dashboardBugTrackerInput');
        const localSourceRadio = $('#dashboardLocalSource');
        const shareSourceRadio = $('#dashboardShareSource');
        const selectFiles = $('#dashboardSelectFiles');
        const filesLabel = $('#dashboardFilesLabel');
        const localFileSelector = $('#dashboardLocalFileSelector');
        const shareFileSelector = $('#dashboardShareBrowseModal');
        const shareBrowseTree = $('#dashboardShareBrowser');
        const cancelBrowseServer = $('#dashboardCancelBrowseServer');
        const submitBrowseServer = $('#dashboardSubmitBrowseServer');
        const flipImagesBox = $('#dashboardFlipImages');
        const zOrderBox = $('#dashboardZOrder');
        const segmentSizeInput = $('#dashboardSegmentSize');
        const customSegmentSize = $('#dashboardCustomSegment');
        const overlapSizeInput = $('#dashboardOverlap');
        const customOverlapSize = $('#dashboardCustomOverlap');
        const imageQualityInput = $('#dashboardImageQuality');
        const customCompressQuality = $('#dashboardCustomQuality');

        const taskMessage = $('#dashboardCreateTaskMessage');
        const submitCreate = $('#dashboardSubmitTask');
        const cancelCreate = $('#dashboardCancelTask');

        let name = nameInput.prop('value');
        let labels = labelsInput.prop('value');
        let bugTrackerLink = bugTrackerInput.prop('value');
        let source = 'local';
        let flipImages = false;
        let zOrder = false;
        let segmentSize = 5000;
        let overlapSize = 0;
        let compressQuality = 50;
        let files = [];

        dashboardCreateTaskButton.on('click', () => {
            $('#dashboardCreateModal').removeClass('hidden');
        });

        nameInput.on('change', (e) => name = e.target.value);
        bugTrackerInput.on('change', (e) => bugTrackerLink = e.target.value);
        labelsInput.on('change', (e) => labels = e.target.value);

        localSourceRadio.on('click', () => {
            if (source === 'local') {
                return;
            }
            source = 'local';
            files = [];
            updateSelectedFiles();
        });

        shareSourceRadio.on('click', () => {
            if (source === 'share') {
                return;
            }
            source = 'share';
            files = [];
            updateSelectedFiles();
        });

        selectFiles.on('click', () => {
            if (source === 'local') {
                localFileSelector.click();
            }
            else {
                shareBrowseTree.jstree('refresh');
                shareFileSelector.removeClass('hidden');
                shareBrowseTree.jstree({
                    core: {
                        data: {
                            url: 'get_share_nodes',
                            data: (node) => { return {'id' : node.id}; }
                        }
                    },
                    plugins: ['checkbox', 'sort'],
                });
            }
        });

        localFileSelector.on('change', function(e) {
            files = e.target.files;
            updateSelectedFiles();
        });

        cancelBrowseServer.on('click', () => shareFileSelector.addClass('hidden'));
        submitBrowseServer.on('click', () => {
            if (!createModal.hasClass('hidden')) {
                files = shareBrowseTree.jstree(true).get_selected();
                cancelBrowseServer.click();
                updateSelectedFiles();
            }
        });

        flipImagesBox.on('click', (e) => {
            flipImages = e.target.checked;
        });

        zOrderBox.on('click', (e) => {
            zOrder = e.target.checked;
        });

        customSegmentSize.on('change', (e) => segmentSizeInput.prop("disabled", !e.target.checked));
        customOverlapSize.on('change', (e) => overlapSizeInput.prop("disabled", !e.target.checked));
        customCompressQuality.on('change', (e) => imageQualityInput.prop("disabled", !e.target.checked));

        segmentSizeInput.on('change', () => {
            const value = Math.clamp(
                +segmentSizeInput.prop('value'),
                +segmentSizeInput.prop('min'),
                +segmentSizeInput.prop('max')
            );

            segmentSizeInput.prop('value', value);
            segmentSize = value;
        });

        overlapSizeInput.on('change', () => {
            const value = Math.clamp(
                +overlapSizeInput.prop('value'),
                +overlapSizeInput.prop('min'),
                +overlapSizeInput.prop('max')
            );

            overlapSizeInput.prop('value', value);
            overlapSize = value;
        });

        imageQualityInput.on('change', () => {
            const value = Math.clamp(
                +imageQualityInput.prop('value'),
                +imageQualityInput.prop('min'),
                +imageQualityInput.prop('max')
            );

            imageQualityInput.prop('value', value);
            compressQuality = value;
        });

        submitCreate.on('click', () => {
            if (!validateName(name)) {
                taskMessage.css('color', 'red');
                taskMessage.text('Bad task name');
                return;
            }

            if (!validateLabels(labels)) {
                taskMessage.css('color', 'red');
                taskMessage.text('Bad labels specification');
                return;
            }

            if (!validateSegmentSize(segmentSize)) {
                taskMessage.css('color', 'red');
                taskMessage.text('Segment size out of range');
                return;
            }

            if (!validateOverlapSize(overlapSize, segmentSize)) {
                taskMessage.css('color', 'red');
                taskMessage.text('Overlap size must be positive and not more then segment size');
                return;
            }

            if (files.length <= 0) {
                taskMessage.css('color', 'red');
                taskMessage.text('No files specified for the task');
                return;
            }
            else if (files.length > window.maxUploadCount && source === 'local') {
                taskMessage.css('color', 'red');
                taskMessage.text('Too many files were specified. Please use share to upload');
                return;
            }
            else if (source === 'local') {
                let commonSize = 0;
                for (let file of files) {
                    commonSize += file.size;
                }
                if (commonSize > window.maxUploadSize) {
                    taskMessage.css('color', 'red');
                    taskMessage.text('Too big files size. Please use share to upload');
                    return;
                }
            }

            let taskData = new FormData();
            taskData.append('name', name);
            taskData.append('bug_tracker', bugTrackerLink);
            taskData.append('flipped', flipImages);
            taskData.append('z_order', zOrder);

            const deserialized = LabelsInfo.deserialize(labels);
            for (let i = 0; i < labelObjs.length; i++) {
                taskData.append(`labels[${i}]`, deserialized[i]);
            }

            if (customSegmentSize.prop('checked')) {
                taskData.append('segment_size', segmentSize);
            }
            if (customOverlapSize.prop('checked')) {
                taskData.append('overlap', overlapSize);
            }
            if (customCompressQuality.prop('checked')) {
                taskData.append('image_quality', compressQuality);
            }

            for (let j = 0; j < files.length; j++) {
                if (source === 'local') {
                    taskData.append(`client_files[${j}]`, files[j]);
                } else {
                    taskData.append(`server_files[${j}]`, files[j]);
                }
            }

            submitCreate.prop('disabled', true);
            createTaskRequest(taskData,
                () => {
                    // Success create request
                    taskMessage.css('color', 'green');
                    taskMessage.text('Successful request! Creating..');
                },
                () => window.location.reload(), // Success create
                (errorMessage) => {
                    // On error
                    taskMessage.css('color', 'red');
                    taskMessage.text(errorMessage);
                },
                () => submitCreate.prop('disabled', false), // On complete
                (status) => {
                    // On update status
                    taskMessage.css('color', 'blue');
                    taskMessage.text(status);
                });
        });

        function updateSelectedFiles() {
            switch (files.length) {
            case 0:
                filesLabel.text('No Files');
                break;
            case 1:
                filesLabel.text(typeof(files[0]) === 'string' ? files[0] : files[0].name);
                break;
            default:
                filesLabel.text(files.length + ' files');
            }
        }


        function validateName(name) {
            const math = name.match('[a-zA-Z0-9_]+');
            return math != null;
        }

        function validateLabels(labels) {
            try {
                LabelsInfo.deserialize(labels)
                return true;
            } catch {
                return false;
            }
        }

        function validateSegmentSize(segmentSize) {
            return (segmentSize >= 100 && segmentSize <= 50000);
        }

        function validateOverlapSize(overlapSize, segmentSize) {
            return (overlapSize >= 0 && overlapSize <= segmentSize - 1);
        }

        cancelCreate.on('click', () => createModal.addClass('hidden'));
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
