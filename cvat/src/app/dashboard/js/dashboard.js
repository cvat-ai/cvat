/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* global
    AnnotationParser:false
    userConfirm:false
    createExportContainer:false
    dumpAnnotationRequest: false
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
                    `Message: ${errorData.responseText || errorData.statusText}`;
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
                        `Message: ${errorData.responseText || errorData.statusText}`;
                    showMessage(message);
                });
            } catch (exception) {
                showMessage(exception);
            }
        });
    }

    _upload() {
        async function saveChunk(parsed) {
            const CHUNK_SIZE = 30000;

            class Chunk {
                constructor() {
                    this.shapes = [];
                    this.tracks = [];
                    this.tags   = [];
                    this.capasity = CHUNK_SIZE;
                    this.version = 0;
                }

                length() {
                    return this.tags.length +
                           this.shapes.length +
                           this.tracks.reduce((sum, track) => sum + track.shapes.length, 0);
                }

                isFull() {
                    return this.length() >= this.capasity;
                }

                isEmpty() {
                    return this.length() === 0;
                }

                clear() {
                    this.shapes = [];
                    this.tracks = [];
                    this.tags   = [];
                }
                export() {
                    return {
                        shapes: this.shapes,
                        tracks: this.tracks,
                        tags: this.tags,
                        version: this.version,
                    };
                }
                async save(taskID) {
                    try {
                        const response = await $.ajax({
                            url: `/api/v1/tasks/${taskID}/annotations?action=create`,
                            type: 'PATCH',
                            data: JSON.stringify(chunk.export()),
                            contentType: 'application/json',
                        });
                        this.version = response.version;
                        this.clear();
                    } catch (error) {
                        throw error;
                    }
                }
            }

            const splitAndSave = async (chunk, prop, splitStep) => {
                for(let start = 0; start < parsed[prop].length; start += splitStep) {
                    Array.prototype.push.apply(chunk[prop], parsed[prop].slice(start, start + splitStep));
                    if (chunk.isFull()) {
                        await chunk.save(this._id);
                    }
                }
                // save tail
                if (!chunk.isEmpty()) {
                    await chunk.save(this._id);
                }
            };

            let chunk = new Chunk();
            // FIXME tags aren't supported by parser
            // await split(chunk, "tags", CHUNK_SIZE);
            await splitAndSave(chunk, "shapes", CHUNK_SIZE);
            await splitAndSave(chunk, "tracks", 1);
        }

        async function save(parsed) {
            await $.ajax({
                url: `/api/v1/tasks/${this._id}/annotations`,
                type: 'DELETE',
            });

            await saveChunk.call(this, parsed);
        }

        async function onload(overlay, text) {
            try {
                overlay.setMessage('Required data are being downloaded from the server..');
                const imageCache = await $.get(`/api/v1/tasks/${this._id}/frames/meta`);
                const labelsCopy = JSON.parse(JSON.stringify(this._labels));
                const parser = new AnnotationParser({
                    start: 0,
                    stop: this._size,
                    flipped: this._flipped,
                    image_meta_data: imageCache,
                }, new LabelsInfo(labelsCopy));

                overlay.setMessage('The annotation file is being parsed..');
                const parsed = parser.parse(text);

                overlay.setMessage('The annotation is being saved..');
                await save.call(this, parsed);

                const message = 'Annotation have been successfully uploaded';
                showMessage(message);
            } catch(errorData) {
                let message = null;
                if (typeof(errorData) === 'string') {
                    message = `Can not upload annotations. ${errorData}`;
                } else {
                    message = `Can not upload annotations. Code: ${errorData.status}. ` +
                        `Message: ${errorData.responseText || errorData.statusText}`;
                }
                showMessage(message);
            } finally {
                overlay.remove();
            }
        }

        $('<input type="file" accept="text/xml">').on('change', (e) => {
            const file = e.target.files[0];
            $(e.target).remove();
            if (file) {
                const overlay = showOverlay('File is being parsed..');
                const fileReader = new FileReader();
                fileReader.onload = (e) => {
                    onload.call(this, overlay, e.target.result);
                }
                fileReader.readAsText(file);
            }
        }).click();
    }

    async _dump(button) {
        button.disabled = true;
        try {
            await dumpAnnotationRequest(this._id, this._name);
        } catch (error) {
            showMessage(error.message);
        } finally {
            button.disabled = false;
        }
    }

    init(details) {
        for (let prop in details) {
            this[`_${prop}`] = details[prop];
        }
    }

    render(baseURL) {
        const self = this;
        this._UI = $(`<div tid=${this._id} class="dashboardItem"> </div>`).append(
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
        let overlay = null;
        dashboardPagination.pagination({
            dataSource: `/api/v1/tasks${window.location.search}`,
            locator: 'results',
            alias: {
                pageNumber: 'page',
            },
            totalNumberLocator: function(response) {
                return response.count;
            },
            ajax: {
                beforeSend() {
                    overlay = showOverlay('Loading..');
                },
            },
            callback: function(pageList) {
                if (overlay) {
                    overlay.remove();
                    overlay = null;
                }
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
                                `Message: ${errorData.responseText || errorData.statusText}`;
                            showMessage(message);
                        })
                    });
                    dashboardList.append(taskView.render(baseURL));
                }

                window.dispatchEvent(new CustomEvent('dashboardReady', {
                    detail: JSON.parse(JSON.stringify(pageList))
                }));

                const pages = $('.paginationjs-pages');
                pages.css('margin-left', (window.screen.width - pages.width()) / 2);
            }
        });
    }

    _setupTaskSearch() {
        const searchInput = $('#dashboardSearchInput');
        const searchSubmit = $('#dashboardSearchSubmit');

        searchInput.on('keypress', (e) => {
            if (e.keyCode != 13) {
                return;
            }

            const params = {};
            const search = e.target.value.replace(/\s+/g, ' ').replace(/\s*:+\s*/g, ':').trim();
            for (let field of ['name', 'mode', 'owner', 'assignee', 'status', 'id']) {
                for (let param of search.split(' and ')) {
                    if (param.includes(':')) {
                        param = param.split(':');
                        if (param[0] === field && param[1]) {
                            params[field] = param[1];
                        }
                    }
                }
            }

            if (!Object.keys(params).length && search.length) {
                params['search'] = search;
            }

            if (Object.keys(params).length) {
                const searchParams = new URLSearchParams();
                for (let key in params) {
                    searchParams.set(key, params[key]);
                }
                window.location.search = searchParams.toString();
            } else {
                window.location.search = '';
            }
        });

        searchSubmit.on('click', function() {
            let e = $.Event('keypress');
            e.keyCode = 13;
            searchInput.trigger(e);
        });

        const searchParams = new URLSearchParams(window.location.search.substring(1));
        if (searchParams.get('all')) {
            searchInput.prop('value', searchParams.get('all'));
        } else {
            let search = '';
            for (let field of ['name', 'mode', 'owner', 'assignee', 'status']) {
                const fieldVal = searchParams.get(field);
                if (fieldVal) {
                    search += `${field}: ${fieldVal} and `;
                }
            }
            searchInput.prop('value', search.slice(0, -5));
        }
    }

    _setupCreateDialog() {
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
            return math !== null;
        }

        function validateLabels(labels) {
            try {
                LabelsInfo.deserialize(labels)
                return true;
            } catch (error) {
                return false;
            }
        }

        function validateBugTracker(bugTracker) {
            return !bugTracker || !!bugTracker.match(/^http[s]?/);
        }

        function validateSegmentSize(segmentSize) {
            return (segmentSize >= 100 && segmentSize <= 50000);
        }

        function validateOverlapSize(overlapSize, segmentSize) {
            return (overlapSize >= 0 && overlapSize <= segmentSize - 1);
        }

        function validateStopFrame(stopFrame, startFrame) {
            return !customStopFrame.prop('checked') || stopFrame >= startFrame;
        }

        function requestCreatingStatus(tid, onUpdateStatus, onSuccess, onError) {
            function checkCallback() {
                $.get(`/api/v1/tasks/${tid}/status`).done((data) => {
                    if (['Queued', 'Started'].includes(data.state)) {
                        if (data.message !== '') {
                            onUpdateStatus(data.message);
                        }
                        setTimeout(checkCallback, 1000);
                    } else {
                        if (data.state === 'Finished') {
                            onSuccess();
                        }
                        else if (data.state === 'Failed') {
                            const message = `Can not create task. ${data.message}`;
                            onError(message);
                        } else {
                            const message = `Unknown state has been received: ${data.state}`;
                            onError(message);
                        }

                    }
                }).fail((errorData) => {
                    const message = `Can not check task status. Code: ${errorData.status}. ` +
                        `Message: ${errorData.responseText || errorData.statusText}`;
                    onError(message);
                });
            }

            setTimeout(checkCallback, 1000);
        }

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
        const zOrderBox = $('#dashboardZOrder');
        const segmentSizeInput = $('#dashboardSegmentSize');
        const customSegmentSize = $('#dashboardCustomSegment');
        const overlapSizeInput = $('#dashboardOverlap');
        const customOverlapSize = $('#dashboardCustomOverlap');
        const imageQualityInput = $('#dashboardImageQuality');
        const customCompressQuality = $('#dashboardCustomQuality');
        const startFrameInput = $('#dashboardStartFrame');
        const customStartFrame = $('#dashboardCustomStart');
        const stopFrameInput = $('#dashboardStopFrame');
        const customStopFrame = $('#dashboardCustomStop');
        const frameFilterInput = $('#dashboardFrameFilter');
        const customFrameFilter = $('#dashboardCustomFilter');

        const taskMessage = $('#dashboardCreateTaskMessage');
        const submitCreate = $('#dashboardSubmitTask');
        const cancelCreate = $('#dashboardCancelTask');

        let name = nameInput.prop('value');
        let labels = labelsInput.prop('value');
        let bugTrackerLink = bugTrackerInput.prop('value').trim();
        let source = 'local';
        let zOrder = false;
        let segmentSize = 5000;
        let overlapSize = 0;
        let compressQuality = 50;
        let startFrame = 0;
        let stopFrame = 0;
        let frameFilter = '';
        let files = [];

        dashboardCreateTaskButton.on('click', () => {
            $('#dashboardCreateModal').removeClass('hidden');
        });

        nameInput.on('change', (e) => name = e.target.value);
        bugTrackerInput.on('change', (e) => bugTrackerLink = e.target.value.trim());
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
                        data: async function (obj, callback) {
                            let url = '/api/v1/server/share';

                            if (obj.id != '#') {
                                url += `?directory=${obj.id.substr(2)}`;
                            }

                            const response = await $.get(url);
                            const files = Array.from(response, (element) => {
                                return {
                                    id: `${obj.id}/${element.name}`,
                                    children: element.type === 'DIR',
                                    text: element.name,
                                    icon: element.type === 'DIR' ? 'jstree-folder' : 'jstree-file',
                                }
                            });

                            callback.call(this, files);
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
                files = Array.from(shareBrowseTree.jstree(true).get_selected(), (el) => el.substr(2));
                cancelBrowseServer.click();
                updateSelectedFiles();
            }
        });

        zOrderBox.on('click', (e) => {
            zOrder = e.target.checked;
        });

        customSegmentSize.on('change', (e) => segmentSizeInput.prop('disabled', !e.target.checked));
        customOverlapSize.on('change', (e) => overlapSizeInput.prop('disabled', !e.target.checked));
        customCompressQuality.on('change', (e) => imageQualityInput.prop('disabled', !e.target.checked));
        customStartFrame.on('change', (e) => startFrameInput.prop('disabled', !e.target.checked));
        customStopFrame.on('change', (e) => stopFrameInput.prop('disabled', !e.target.checked));
        customFrameFilter.on('change', (e) => frameFilterInput.prop('disabled', !e.target.checked));

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

        startFrameInput.on('change', function() {
            let value = Math.max(
                +startFrameInput.prop('value'),
                +startFrameInput.prop('min')
            );

            startFrameInput.prop('value', value);
            startFrame = value;
        });
        stopFrameInput.on('change', function() {
            let value = Math.max(
                +stopFrameInput.prop('value'),
                +stopFrameInput.prop('min')
            );

            stopFrameInput.prop('value', value);
            stopFrame = value;
        });
        frameFilterInput.on('change', function() {
            frameFilter = frameFilterInput.prop('value');
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

            if (!validateBugTracker(bugTrackerLink)) {
                taskMessage.css('color', 'red');
                taskMessage.text('Bad bag tracker link');
                return;
            }

            if (!validateOverlapSize(overlapSize, segmentSize)) {
                taskMessage.css('color', 'red');
                taskMessage.text('Overlap size must be positive and not more then segment size');
                return;
            }

            if (!validateStopFrame(stopFrame, startFrame)) {
                taskMessage.css('color', 'red');
                taskMessage.text('Stop frame must be greater than or equal to start frame');
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

            const description = {
                name: name,
                labels: LabelsInfo.deserialize(labels),
                image_quality: compressQuality
            }

            if (bugTrackerLink) {
                description.bug_tracker = bugTrackerLink;
            }
            if (zOrder) {
                description.z_order = zOrder;
            }
            if (customSegmentSize.prop('checked')) {
                description.segment_size = segmentSize;
            }
            if (customOverlapSize.prop('checked')) {
                description.overlap = overlapSize;
            }
            if (customStartFrame.prop('checked')) {
                description.start_frame = startFrame;
            }
            if (customStopFrame.prop('checked')) {
                description.stop_frame = stopFrame;
            }
            if (customFrameFilter.prop('checked')) {
                description.frame_filter = frameFilter;
            }

            function cleanupTask(tid) {
                $.ajax({
                    url: `/api/v1/tasks/${tid}`,
                    type: 'DELETE'
                });
            }

            submitCreate.prop('disabled', true);
            $.ajax({
                url: '/api/v1/tasks',
                type: 'POST',
                data: JSON.stringify(description),
                contentType: 'application/json'
            }).done((taskData) => {
                taskMessage.css('color', 'green');
                taskMessage.text('Task has been created. Uploading the data..');

                const batchOfFiles = new FormData();
                for (let j = 0; j < files.length; j++) {
                    if (source === "local") {
                        batchOfFiles.append(`client_files[${j}]`, files[j]);
                    } else {
                        batchOfFiles.append(`server_files[${j}]`, files[j]);
                    }
                }

                $.ajax({
                    url: `/api/v1/tasks/${taskData.id}/data`,
                    type: 'POST',
                    data: batchOfFiles,
                    contentType: false,
                    processData: false
                }).done(() => {
                    taskMessage.text('The data has been sent. Task is being created..');

                    requestCreatingStatus(taskData.id, (status) => {
                        taskMessage.css('color', 'blue');
                        taskMessage.text(status);
                    }, () => {
                        const decorators = DashboardView.decorators('createTask');
                        let idx = 0;

                        function next() {
                            const decorator = decorators[idx++];
                            if (decorator) {
                                decorator(taskData, next, () => {
                                    submitCreate.prop('disabled', false);
                                    cleanupTask(tid);
                                });
                            } else {
                                window.location.reload();
                            }
                        }

                        next();
                    }, (errorMessage) => {
                        submitCreate.prop('disabled', false);
                        taskMessage.css('color', 'red');
                        taskMessage.text(errorMessage);
                        cleanupTask(taskData.id);
                    });
                }).fail((errorData) => {
                    const message = `Can not put the data for the task. Code: ${errorData.status}. ` +
                        `Message: ${errorData.responseText || errorData.statusText}`;
                    taskMessage.css('color', 'red');
                    taskMessage.text(message);
                    submitCreate.prop('disabled', false);
                    cleanupTask(taskData.id);
                });
            }).fail((errorData) => {
                const message = `Task has not been created. Code: ${errorData.status}. ` +
                    `Message: ${errorData.responseText || errorData.statusText}`;
                taskMessage.css('color', 'red');
                taskMessage.text(message);
                submitCreate.prop('disabled', false);
                cleanupTask(taskData.id);
            });
        });

        cancelCreate.on('click', () => createModal.addClass('hidden'));
    }
}

DashboardView.decorators = (action) => {
    DashboardView._decorators = DashboardView._decorators || {};
    return DashboardView._decorators[action] || [];
}

DashboardView.registerDecorator = (action, decorator) => {
    DashboardView._decorators = DashboardView._decorators || {};
    DashboardView._decorators[action] = DashboardView._decorators[action] || [];
    DashboardView._decorators[action].push(decorator);
}


// DASHBOARD ENTRYPOINT
window.addEventListener('DOMContentLoaded', () => {
    $.when(
        // TODO: Use REST API in order to get meta
        $.get('/dashboard/meta'),
        $.get(`/api/v1/tasks${window.location.search}`),
    ).then((metaData, taskData) => {
        try {
            new DashboardView(metaData[0], taskData[0]);
        }
        catch(exception) {
            $('#content').empty();
            const message = `Can not build CVAT dashboard. Exception: ${exception}.`;
            showMessage(message);
        }
    }).fail((errorData) => {
        $('#content').empty();
        const message = `Can not build CVAT dashboard. Code: ${errorData.status}. ` +
            `Message: ${errorData.responseText || errorData.statusText}`;
        showMessage(message);
    }).always(() => {
        $('#loadingOverlay').remove();
    });
});
