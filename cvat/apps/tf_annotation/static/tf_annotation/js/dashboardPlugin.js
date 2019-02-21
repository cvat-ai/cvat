/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* global
    userConfirm:false
    showMessage:false
*/

window.addEventListener('dashboardReady', () => {
    function checkProcess(tid, button) {
        function checkCallback() {
            $.get(`/tensorflow/annotation/check/task/${tid}`).done((statusData) => {
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
    }


    function runProcess(tid, button) {
        $.get(`/tensorflow/annotation/create/task/${tid}`).done(() => {
            showMessage('Process has started');
            button.text('Cancel TF Annotation (0%)');
            button.addClass('tfAnnotationProcess');
            checkProcess(tid, button);
        }).fail((errorData) => {
            const message = `Can not run tf annotation. Code: ${errorData.status}. `
                + `Message: ${errorData.responseText || errorData.statusText}`;
            showMessage(message);
        });
    }


    function cancelProcess(tid, button) {
        $.get(`/tensorflow/annotation/cancel/task/${tid}`).done(() => {
            button.prop('disabled', true);
        }).fail((errorData) => {
            const message = `Can not cancel tf annotation. Code: ${errorData.status}. `
                + `Message: ${errorData.responseText || errorData.statusText}`;
            showMessage(message);
        });
    }


    function setupDashboardItem(item, metaData) {
        const tid = +item.attr('tid');
        const button = $('<button> Run TF Annotation </button>');

        button.on('click', () => {
            if (button.hasClass('tfAnnotationProcess')) {
                userConfirm('The process will be canceled. Continue?', () => {
                    cancelProcess(tid, button);
                });
            } else {
                userConfirm('The current annotation will be lost. Are you sure?', () => {
                    runProcess(tid, button);
                });
            }
        });

        button.addClass('dashboardTFAnnotationButton regular dashboardButtonUI');
        button.appendTo(item.find('div.dashboardButtonsUI'));

        if ((tid in metaData) && (metaData[tid].active)) {
            button.text('Cancel TF Annotation');
            button.addClass('tfAnnotationProcess');
            checkProcess(tid, button);
        }
    }

    const elements = $('.dashboardItem');
    const tids = Array.from(elements, el => +el.getAttribute('tid'));

    $.ajax({
        type: 'POST',
        url: '/tensorflow/annotation/meta/get',
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
