/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* global
    userConfirm:false
    showMessage:false
*/
window.cvatUI = window.cvatUI || {};

window.cvatUI.tfAnnotation = {
    runnerTFAnnotationWindowId: 'annotatorRunnerTFAnnotationWindow',
    runnerTFAnnotationContentId: 'annotatorRunnerTFAnnotationContent',
    runnerTFAnnotationUploadedModelsId: 'annotatorRunnerTFAnnotationUploadedModels',
    removeCurrentTFAnnotationId: 'annotatorRunnerRemoveCurrentTFAnnotationBox',
    annotationTFAnnotationLabelsId: 'annotatorRunnerTFAnnotationLabels',
    submitTFAnnotationId: 'annotatorRunnerSubmitAnnotationButton',
    cancelTFAnnotationId: 'annotatorRunnerCancelAnnotationButton',
};

const TFAnnotationServer = {
    meta_annotation_models(tids, success, error) {
        $.ajax({
            url: global_host + '/auto_annotation/meta/get',
            type: 'POST',
            data: JSON.stringify(tids),
            contentType: 'application/json',
            success,
            error: (data) => {
                const message = `Getting meta request has been failed. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                error(message);
            },
        });
    },

    cancelProcess(tid, button) {
        $.get(global_host + `/tensorflow/annotation/cancel/task/${tid}`).done(() => {
            button.prop('disabled', true);
        }).fail((errorData) => {
            const message = `Can not cancel tf annotation. Code: ${errorData.status}. `
                + `Message: ${errorData.responseText || errorData.statusText}`;
            showMessage(message);
        });
    },

    checkProcess(tid, button) {
        function checkCallback() {
            $.get(global_host + `/tensorflow/annotation/check/task/${tid}`).done((statusData) => {
                if (['started', 'queued'].includes(statusData.status)) {
                    const progress = Math.round(statusData.progress) || '0';
                    button.text(`Cancel TF Annotation (${progress}%)`);
                    setTimeout(checkCallback, 5000);
                } else {
                    button.text('Run TF Annotation');
                    button.removeClass('tfAnnotationProcess');
                    button.prop('disabled', false);

                    if (statusData.status === 'failed') {
                        const message = `Tensorflow annotation failed. Error: ${statusData.stderr}`;
                        showMessage(message);
                    } else if (statusData.status !== 'finished') {
                        const message = `Tensorflow annotation check request returned status "${statusData.status}"`;
                        showMessage(message);
                    }
                }
            }).fail((errorData) => {
                const message = `Can not sent tensorflow annotation check request. Code: ${errorData.status}. `
                    + `Message: ${errorData.responseText || errorData.statusText}`;
                showMessage(message);
            });
        }

        setTimeout(checkCallback, 5000);
    },
    runProcess(tid, mid, button, modalElem, labels_mapping) {
        $.post(global_host + `/tensorflow/annotation/create/task/${tid}/${mid}`, JSON.stringify(labels_mapping)).done(() => {
            showMessage('Process has started');
            button.text('Cancel TF Annotation (0%)');
            button.addClass('tfAnnotationProcess');
            $(modalElem).addClass('hidden');
            TFAnnotationServer.checkProcess(tid, button);
        }).fail((errorData) => {
            const message = `Can not run tf annotation. Code: ${errorData.status}. `
                + `Message: ${errorData.responseText || errorData.statusText}`;
            showMessage(message);
        });
    }
};

class TFAnnotationModelRunnerView {
    constructor() {
        const html = `<div class="modal hidden" id="${window.cvatUI.tfAnnotation.runnerTFAnnotationWindowId}">
            <div class="modal-content" id="${window.cvatUI.tfAnnotation.runnerTFAnnotationContentId}">
                <div style="width: 55%; height: 100%; float: left;">
                    <center style="height: 10%;">
                        <label class="regular h1"> Uploaded TF Models </label>
                    </center>
                    <div style="height: 70%; overflow: auto; margin-top: 2%;">
                        <table class="modelsTable" id="${window.cvatUI.tfAnnotation.runnerTFAnnotationUploadedModelsId}"> </table>
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
                                    <th style="width: 45%;"> TF Model Classes </th>
                                    <th style="width: 10%;"> </th>
                                </tr>
                            </thead>
                            <tbody id="${window.cvatUI.tfAnnotation.annotationTFAnnotationLabelsId}">

                            </tbody>
                        </table>
                    </div>
                    <div style="float:right;">
                        <button class="regular h3" style="width: 6em;" id="${window.cvatUI.tfAnnotation.submitTFAnnotationId}"> Start </button>
                        <button class="regular h3" style="width: 6em;" id="${window.cvatUI.tfAnnotation.cancelTFAnnotationId}"> Cancel </button>
                    </div>
                </div>
            </div>
        </div>`;

        this.el = $(html);
        this.id = null;
        this.tid = null;
        this.initButton = null;
        this.modelsTable = this.el.find(`#${window.cvatUI.tfAnnotation.runnerTFAnnotationUploadedModelsId}`);
        this.labelsTable = this.el.find(`#${window.cvatUI.tfAnnotation.annotationTFAnnotationLabelsId}`);
        this.active = null;

        this.el.find(`#${window.cvatUI.tfAnnotation.cancelTFAnnotationId}`).on('click', () => {
            this.el.addClass('hidden');
        });

        const submitButton = this.el.find(`#${window.cvatUI.tfAnnotation.submitTFAnnotationId}`);
        submitButton.on('click', () => {
            try {
                if (this.id === null) {
                    throw Error('Please specify a model for tf annotation process');
                }
                const mapping = {};
                $('.annotatorMappingRow').each((_, element) => {
                    const dlModelLabel = $(element).find('.annotatorDlLabelSelector')[0].value;
                    const taskLabel = $(element).find('.annotatorTaskLabelSelector')[0].value;
                    if (dlModelLabel in mapping) {
                        throw Error(`The label "${dlModelLabel}" has been specified twice or more`);
                    }
                    mapping[dlModelLabel] = taskLabel;
                });

                if (!Object.keys(mapping).length) {
                    throw Error('Labels for an annotation process haven\'t been found');
                }
                userConfirm('The current annotation will be lost. Are you sure?', () => {
                    window.cvatUI.tfAnnotation.server.runProcess(this.tid, this.id, this.initButton, this.el, mapping);
                });
            } catch (error) {
                showMessage(error);
            }
        });
    }

    reset(data, initButton) {
        function labelsSelect(labels, elClass) {
            const select = $(`<select class="regular h3 ${elClass}" style="width:100%;"> </select>`);
            labels.forEach(label => select.append($(`<option value="${label}"> ${label} </option>`)));
            select.prop('value', null);

            return select;
        }

        function makeCreator(dlSelect, taskSelect, callback) {
            let dlIsFilled = false;
            let taskIsFilled = false;
            const creator = $('<tr style="margin-bottom: 5px;"> </tr>').append(
                $('<td style="width: 45%;"> </td>').append(taskSelect),
                $('<td style="width: 45%;"> </td>').append(dlSelect),
            );

            const onSelectHandler = () => {
                $('<td style="width: 10%; position: relative;"> </td>').append(
                    $('<a class="close"></a>').css('top', '0px').on('click', (e) => {
                        $(e.target.parentNode.parentNode).remove();
                    }),
                ).appendTo(creator);

                creator.addClass('annotatorMappingRow');
                callback();
            };

            dlSelect.on('change', (e) => {
                if (e.target.value && taskIsFilled) {
                    dlSelect.off('change');
                    taskSelect.off('change');
                    onSelectHandler();
                }
                dlIsFilled = Boolean(e.target.value);
            });

            taskSelect.on('change', (e) => {
                if (e.target.value && dlIsFilled) {
                    dlSelect.off('change');
                    taskSelect.off('change');
                    onSelectHandler();
                }

                taskIsFilled = Boolean(e.target.value);
            });

            return creator;
        }

        this.id = null;
        this.initButton = initButton;
        this.tid = data.id;
        this.modelsTable.empty();
        this.labelsTable.empty();
        this.active = null;

        const modelItemClickHandler = (event) => {
            if (this.active) {
                this.active.style.color = '';
            }

            this.id = event.data.model.id;
            this.active = event.target;
            this.active.style.color = 'darkblue';

            this.labelsTable.empty();
            const labels = event.data.data.labels.map(x => x.name);
            const intersection = labels.filter(el => event.data.model.tfClasses.indexOf(el) !== -1);
            intersection.forEach((label) => {
                const dlSelect = labelsSelect(event.data.model.tfClasses, 'annotatorDlLabelSelector');
                dlSelect.prop('value', label);
                const taskSelect = labelsSelect(labels, 'annotatorTaskLabelSelector');
                taskSelect.prop('value', label);
                $('<tr class="annotatorMappingRow" style="margin-bottom: 5px;"> </tr>').append(
                    $('<td style="width: 45%;"> </td>').append(taskSelect),
                    $('<td style="width: 45%;"> </td>').append(dlSelect),
                    $('<td style="width: 10%; position: relative;"> </td>').append(
                        $('<a class="close"></a>').css('top', '0px').on('click', (e) => {
                            $(e.target.parentNode.parentNode).remove();
                        }),
                    ),
                ).appendTo(this.labelsTable);
            });

            const dlSelect = labelsSelect(event.data.model.tfClasses, 'annotatorDlLabelSelector');
            const taskSelect = labelsSelect(labels, 'annotatorTaskLabelSelector');

            const callback = () => {
                makeCreator(
                    labelsSelect(event.data.model.tfClasses, 'annotatorDlLabelSelector'),
                    labelsSelect(labels, 'annotatorTaskLabelSelector'),
                    callback,
                ).appendTo(this.labelsTable);
            };

            makeCreator(dlSelect, taskSelect, callback).appendTo(this.labelsTable);
        };

        window.cvatUI.tfAnnotation.data.tfAnnotationModels.forEach((model) => {
            this.modelsTable.append(
                $(`<tr> <td> <label class="regular h3"> ${model.name} (${model.uploadDate}) - (${model.modelType}) </label> </td> </tr>`).on(
                    'click', { model, data }, modelItemClickHandler,
                ),
            );
        });

        return this;
    }

    show() {
        this.el.removeClass('hidden');
        return this;
    }

    hide() {
        this.el.addClass('hidden');
        return this;
    }

    get element() {
        return this.el;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.cvatUI.tfAnnotation.server = TFAnnotationServer;
    window.cvatUI.tfAnnotation.runnerTF = new TFAnnotationModelRunnerView();
    $('body').append(window.cvatUI.tfAnnotation.runnerTF.element);
});

window.addEventListener('dashboardReady', (event) => {
    function setupDashboardItem(item, metaData) {
        const tid = +item.attr('tid');
        const button = $('<button> Run TF Annotation </button>');

        button.on('click',() => {
            if (button.hasClass('tfAnnotationProcess')) {
                userConfirm('Process will be canceled. Are you sure?', () => {
                    window.cvatUI.tfAnnotation.server.cancelProcess(tid,button);
                });
                window.cvatUI.tfAnnotation.server.checkProcess(tid,button);
            } else {
                const taskInfo = event.detail.filter(task => task.id === tid)[0];
                window.cvatUI.tfAnnotation.runnerTF.reset(taskInfo, button).show();
            }
        });

        button.addClass('dashboardTFAnnotationButton regular dashboardButtonUI');
        button.appendTo(item.find('div.dashboardButtonsUI'));

        if ((tid in metaData) && (metaData[tid].active)) {
            button.text('Cancel TF Annotation');
            button.addClass('tfAnnotationProcess');
            window.cvatUI.tfAnnotation.server.checkProcess(tid,button);
        }
    }

    const elements = $('.dashboardItem');
    const tids = Array.from(elements, el => +el.getAttribute('tid'));
    window.cvatUI.tfAnnotation.server.meta_annotation_models(tids, (data) => {
        window.cvatUI.tfAnnotation.data = data;
    });
    $.ajax({
        type: 'POST',
        url: global_host + '/tensorflow/annotation/meta/get',
        data: JSON.stringify(tids),
        contentType: 'application/json; charset=utf-8',
    }).done((metaData) => {
        elements.each(function setupDashboardItemWrapper() {
            setupDashboardItem($(this), metaData);
        });
    }).fail((errorData) => {
        const message = `Can not get tf annotation meta info. Code: ${errorData.status}. `
            + `Message: ${errorData.responseText || errorData.statusText}`;
        showMessage(message);
    });
});