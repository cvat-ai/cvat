/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

 "use strict";

 window.cvat = window.cvat || {};
window.cvat.dashboard = window.cvat.dashboard || {};
window.cvat.dashboard.uiCallbacks = window.cvat.dashboard.uiCallbacks || [];
window.cvat.dashboard.uiCallbacks.push(function(newElements) {
    let tids = [];
    for (let el of newElements) {
        tids.push(el.id.split('_')[1]);
    }

    $.ajax({
        type: 'POST',
        url: '/custom_annotation/meta/get',
        data: JSON.stringify(tids),
        contentType: "application/json; charset=utf-8",
        success: (data) => {
            newElements.each(function(idx) {
                let elem = $(newElements[idx]);
                let tid = +elem.attr('id').split('_')[1];

                const customAnnoButton = $('<button> Run custom annotation </button>').addClass('semiBold dashboardButtonUI dashboardCustomAnno');
                customAnnoButton.appendTo(elem.find('div.dashboardButtonsUI')[0]);

                if ((tid in data) && (data[tid].active)) {
                    customAnnoButton.text('Cancel custom annotation');
                    customAnnoButton.addClass('customAnnotationProcess');
                    window.cvat.custom_annotation.checkCustomAnnotationRequest(tid, customAnnoButton);
                }

                customAnnoButton.on('click', () => {
                    if (customAnnoButton.hasClass('customAnnotationProcess')) {
                        $.post(`/custom_annotation/cancel/task/${tid}`).fail( (data) => {
                            let message = `Error during cansel custom annotation request. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                            showMessage(message);
                            throw Error(message);
                        });
                    }
                    else {
                        let dialogWindow = $(`#${window.cvat.custom_annotation.modalWindowId}`);
                        dialogWindow.attr('current_tid', tid);
                        dialogWindow.removeClass('hidden');
                    }
                });
            });
        },
        error: (data) => {
            let message = `Can not get custom annotation meta info. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
            showMessage(message);
            throw Error(message);
        }
    });
});

window.cvat.custom_annotation = {
    modalWindowId: 'customAnnotationWindow',
    customAnnoFromId: 'customAnnotationForm',
    customAnnoModelFieldId: 'customAnnotationModelField',
    customAnnoWeightsFieldId: 'customAnnotationWeightsField',
    customAnnoConfigFieldId: 'customAnnotationConfigField',
    customAnnoConvertFieldId: 'customAnnotationConvertField',
    customAnnoCloseButtonId: 'customAnnoCloseButton',
    customAnnoSubmitButtonId: 'customAnnoSubmitButton',

    checkCustomAnnotationRequest: (tid, customAnnoButton) => {
        setTimeout(timeoutCallback, 1000);
        function timeoutCallback() {
            $.get(`/custom_annotation/check/task/${tid}`).done((data) => {
                if (data.status == "started" || data.status == "queued") {
                    let progress = Math.round(data.progress) || 0;
                    customAnnoButton.text(`Cancel custom annotation (${progress}%)`);
                    setTimeout(timeoutCallback, 1000);
                }
                else {
                    customAnnoButton.text("Run custom annotation");
                    customAnnoButton.removeClass("customAnnotationProcess");
                }
            }).fail((data) => {
                let message = `Error was occured during check annotation status. ` +
                `Code: ${data.status}, text: ${data.responseText || data.statusText}`;
                badResponse(message);
            });
        }
    },
};

document.addEventListener("DOMContentLoaded", () => {
    $(`<div id="${window.cvat.custom_annotation.modalWindowId}" class="modal hidden">
        <form id="${window.cvat.custom_annotation.customAnnoFromId}" class="modal-content" autocomplete="on" onsubmit="return false" style="width: 700px;">
            <center>
                <label class="semiBold h1"> Custom annotation setup </label>
            </center>

            <table style="width: 100%; text-align: left;">
                <tr>
                    <td style="width: 25%"> <label class="regular h2"> Model </label> </td>
                    <td> <input id="${window.cvat.custom_annotation.customAnnoModelFieldId}" type="file" name="model" /> </td>
                </tr>
                <tr>
                    <td style="width: 25%"> <label class="regular h2"> Weights </label> </td>
                    <td> <input id="${window.cvat.custom_annotation.customAnnoWeightsFieldId}" type="file" name="weights" /> </td>
                </tr>
                <tr>
                    <td style="width: 25%"> <label class="regular h2"> Config </label> </td>
                    <td> <input id="${window.cvat.custom_annotation.customAnnoConfigFieldId}" type="file" name="config" accept=".json" /> </td>
                </tr>
                <tr>
                    <td style="width: 25%"> <label class="regular h2"> Convertation script </label> </td>
                    <td> <input id="${window.cvat.custom_annotation.customAnnoConvertFieldId}" type="file" name="convert" /> </td>
                </tr>
            </table>
            <div>
                <button id="${window.cvat.custom_annotation.customAnnoCloseButtonId}" class="regular h2"> Close </button>
                <button id="${window.cvat.custom_annotation.customAnnoSubmitButtonId}" class="regular h2"> Submit </button>
            </div>
        </form>

    </div>`).appendTo('body');

   let annoWindow = $(`#${window.cvat.custom_annotation.modalWindowId}`);
   let closeWindowButton = $(`#${window.cvat.custom_annotation.customAnnoCloseButtonId}`);
   let submitButton = $(`#${window.cvat.custom_annotation.customAnnoSubmitButtonId}`);

   closeWindowButton.on('click', () => {
        annoWindow.addClass('hidden');
    });

    submitButton.on('click', function() {
        const tid = annoWindow.attr('current_tid');
        const modelInput = $(`#${window.cvat.custom_annotation.customAnnoModelFieldId}`);
        const weightsInput = $(`#${window.cvat.custom_annotation.customAnnoWeightsFieldId}`);
        const configInput = $(`#${window.cvat.custom_annotation.customAnnoConfigFieldId}`);
        const convFileInput = $(`#${window.cvat.custom_annotation.customAnnoConvertFieldId}`);

        const modelFile = modelInput.prop('files')[0];
        const weightsFile = weightsInput.prop('files')[0];
        const configFile = configInput.prop('files')[0];
        const convFile = convFileInput.prop('files')[0];

        if (!modelFile || !weightsFile || !configFile || !convFile) {
            showMessage("All files must be selected");
            return;
        }

        let taskData = new FormData();
        taskData.append('model', modelFile);
        taskData.append('weights', weightsFile);
        taskData.append('config', configFile);
        taskData.append('conv_script', convFile);

        $.ajax({
            url: `/custom_annotation/create/task/${tid}`,
            type: 'POST',
            data: taskData,
            contentType: false,
            processData: false,
        }).done(() => {
                annoWindow.addClass('hidden');
                const customAnnoButton = $(`#dashboardTask_${tid} div.dashboardButtonsUI button.dashboardCustomAnno`);
                customAnnoButton.addClass('customAnnotationProcess');
                window.cvat.custom_annotation.checkCustomAnnotationRequest(tid, customAnnoButton);
        }).fail((data) => {
            let message = `Error was occured during run annotation request. ` +
                `Code: ${data.status}, text: ${data.responseText || data.statusText}`;
            badResponse(message);
        });

        function badResponse(message) {
            showMessage(message);
            throw Error(message);
        }
    });
});
