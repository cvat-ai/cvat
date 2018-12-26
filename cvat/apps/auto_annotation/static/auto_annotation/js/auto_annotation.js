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
        tids.push(el.id.split("_")[1]);
    }

    $.ajax({
        type: "POST",
        url: "/auto_annotation/meta/get",
        data: JSON.stringify(tids),
        contentType: "application/json; charset=utf-8",
        success: (data) => {
            newElements.each(function() {
                let elem = $(this);
                let tid = +elem.attr("id").split("_")[1];

                const autoAnnoButton = $("<button> Run auto annotation </button>").addClass("semiBold dashboardButtonUI dashboardAutoAnno");
                autoAnnoButton.appendTo(elem.find("div.dashboardButtonsUI")[0]);

                if (tid in data && data[tid].active) {
                    autoAnnoButton.text("Cancel auto annotation");
                    autoAnnoButton.addClass("autoAnnotationProcess");
                    window.cvat.autoAnnotation.checkAutoAnnotationRequest(tid, autoAnnoButton);
                }

                autoAnnoButton.on("click", () => {
                    if (autoAnnoButton.hasClass("autoAnnotationProcess")) {
                        $.post(`/auto_annotation/cancel/task/${tid}`).fail( (data) => {
                            let message = `Error during cancel auto annotation request. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
                            showMessage(message);
                            throw Error(message);
                        });
                    }
                    else {
                        let dialogWindow = $(`#${window.cvat.autoAnnotation.modalWindowId}`);
                        dialogWindow.attr("current_tid", tid);
                        dialogWindow.removeClass("hidden");
                    }
                });
            });
        },
        error: (data) => {
            let message = `Can not get auto annotation meta info. Code: ${data.status}. Message: ${data.responseText || data.statusText}`;
            window.cvat.autoAnnotation.badResponse(message);
        }
    });
});

window.cvat.autoAnnotation = {
    modalWindowId: "autoAnnotationWindow",
    autoAnnoFromId: "autoAnnotationForm",
    autoAnnoModelFieldId: "autoAnnotationModelField",
    autoAnnoWeightsFieldId: "autoAnnotationWeightsField",
    autoAnnoConfigFieldId: "autoAnnotationConfigField",
    autoAnnoConvertFieldId: "autoAnnotationConvertField",
    autoAnnoCloseButtonId: "autoAnnoCloseButton",
    autoAnnoSubmitButtonId: "autoAnnoSubmitButton",

    checkAutoAnnotationRequest: (tid, autoAnnoButton) => {
        function timeoutCallback() {
            $.get(`/auto_annotation/check/task/${tid}`).done((data) => {
                if (data.status === "started" || data.status === "queued") {
                    let progress = Math.round(data.progress) || 0;
                    autoAnnoButton.text(`Cancel auto annotation (${progress}%)`);
                    setTimeout(timeoutCallback, 1000);
                }
                else {
                    autoAnnoButton.text("Run auto annotation");
                    autoAnnoButton.removeClass("autoAnnotationProcess");
                }
            }).fail((data) => {
                let message = "Error was occurred during check annotation status. " +
                    `Code: ${data.status}, text: ${data.responseText || data.statusText}`;
                window.cvat.autoAnnotation.badResponse(message);
            });
        }
        setTimeout(timeoutCallback, 1000);
    },

    badResponse(message) {
        showMessage(message);
        throw Error(message);
    },
};

function submitButtonOnClick() {
    const annoWindow = $(`#${window.cvat.autoAnnotation.modalWindowId}`);
    const tid = annoWindow.attr("current_tid");
    const modelInput = $(`#${window.cvat.autoAnnotation.autoAnnoModelFieldId}`);
    const weightsInput = $(`#${window.cvat.autoAnnotation.autoAnnoWeightsFieldId}`);
    const configInput = $(`#${window.cvat.autoAnnotation.autoAnnoConfigFieldId}`);
    const convFileInput = $(`#${window.cvat.autoAnnotation.autoAnnoConvertFieldId}`);

    const modelFile = modelInput.prop("files")[0];
    const weightsFile = weightsInput.prop("files")[0];
    const configFile = configInput.prop("files")[0];
    const convFile = convFileInput.prop("files")[0];

    if (!modelFile || !weightsFile || !configFile || !convFile) {
        showMessage("All files must be selected");
        return;
    }

    let taskData = new FormData();
    taskData.append("model", modelFile);
    taskData.append("weights", weightsFile);
    taskData.append("config", configFile);
    taskData.append("conv_script", convFile);

    $.ajax({
        url: `/auto_annotation/create/task/${tid}`,
        type: "POST",
        data: taskData,
        contentType: false,
        processData: false,
    }).done(() => {
            annoWindow.addClass("hidden");
            const autoAnnoButton = $(`#dashboardTask_${tid} div.dashboardButtonsUI button.dashboardAutoAnno`);
            autoAnnoButton.addClass("autoAnnotationProcess");
            window.cvat.autoAnnotation.checkAutoAnnotationRequest(tid, autoAnnoButton);
    }).fail((data) => {
        let message = "Error was occurred during run annotation request. " +
            `Code: ${data.status}, text: ${data.responseText || data.statusText}`;
        window.cvat.autoAnnotation.badResponse(message);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    $(`<div id="${window.cvat.autoAnnotation.modalWindowId}" class="modal hidden">
        <form id="${window.cvat.autoAnnotation.autoAnnoFromId}" class="modal-content" autocomplete="on" onsubmit="return false" style="width: 700px;">
            <center>
                <label class="semiBold h1"> Auto annotation setup </label>
            </center>

            <table style="width: 100%; text-align: left;">
                <tr>
                    <td style="width: 25%"> <label class="regular h2"> Model </label> </td>
                    <td> <input id="${window.cvat.autoAnnotation.autoAnnoModelFieldId}" type="file" name="model" /> </td>
                </tr>
                <tr>
                    <td style="width: 25%"> <label class="regular h2"> Weights </label> </td>
                    <td> <input id="${window.cvat.autoAnnotation.autoAnnoWeightsFieldId}" type="file" name="weights" /> </td>
                </tr>
                <tr>
                    <td style="width: 25%"> <label class="regular h2"> Label map </label> </td>
                    <td> <input id="${window.cvat.autoAnnotation.autoAnnoConfigFieldId}" type="file" name="config" accept=".json" /> </td>
                </tr>
                <tr>
                    <td style="width: 25%"> <label class="regular h2"> Convertation script </label> </td>
                    <td> <input id="${window.cvat.autoAnnotation.autoAnnoConvertFieldId}" type="file" name="convert" /> </td>
                </tr>
            </table>
            <div>
                <button id="${window.cvat.autoAnnotation.autoAnnoCloseButtonId}" class="regular h2"> Close </button>
                <button id="${window.cvat.autoAnnotation.autoAnnoSubmitButtonId}" class="regular h2"> Submit </button>
            </div>
        </form>

    </div>`).appendTo("body");

    const annoWindow = $(`#${window.cvat.autoAnnotation.modalWindowId}`);
    const closeWindowButton = $(`#${window.cvat.autoAnnotation.autoAnnoCloseButtonId}`);
    const submitButton = $(`#${window.cvat.autoAnnotation.autoAnnoSubmitButtonId}`);


    closeWindowButton.on("click", () => {
        annoWindow.addClass("hidden");
    });

    submitButton.on("click", () => {
        submitButtonOnClick();
    });
});
