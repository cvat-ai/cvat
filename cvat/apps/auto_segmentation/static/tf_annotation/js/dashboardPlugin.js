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
            $.get(`/tensorflow/segmentation/check/task/${tid}`).done((statusData) => {
                if (['started', 'queued'].includes(statusData.status)) {
                    const progress = Math.round(statusData.progress) || '0';
                    button.text(`Cancel Auto Segmentation (${progress}%)`);
                    setTimeout(checkCallback, 5000);
                } else {
                    button.text('Run Auto Segmentation');
                    button.removeClass('tfAnnotationProcess');
                    button.prop('disabled', false);

                    if (statusData.status === 'failed') {
                        const message = `Tensorflow Segmentation failed. Error: ${statusData.stderr}`;
                        showMessage(message);
                    } else if (statusData.status !== 'finished') {
                        const message = `Tensorflow segmentation check request returned status "${statusData.status}"`;
                        showMessage(message);
                    }
                }
            }).fail((errorData) => {
                const message = `Can not sent tensorflow segmentation check request. Code: ${errorData.status}. `
                    + `Message: ${errorData.responseText || errorData.statusText}`;
                showMessage(message);
            });
        }

        setTimeout(checkCallback, 5000);
    }


    function runProcess(tid, button) {
        $.get(`/tensorflow/segmentation/create/task/${tid}`).done(() => {
            showMessage('Process has started');
            button.text('Cancel Auto Segmentation (0%)');
            button.addClass('tfAnnotationProcess');
            checkProcess(tid, button);
        }).fail((errorData) => {
            const message = `Can not run Auto Segmentation. Code: ${errorData.status}. `
                + `Message: ${errorData.responseText || errorData.statusText}`;
            showMessage(message);
        });
    }


    function cancelProcess(tid, button) {
        $.get(`/tensorflow/segmentation/cancel/task/${tid}`).done(() => {
            button.prop('disabled', true);
        }).fail((errorData) => {
            const message = `Can not cancel Auto Segmentation. Code: ${errorData.status}. `
                + `Message: ${errorData.responseText || errorData.statusText}`;
            showMessage(message);
        });
    }


    function setupDashboardItem(item, metaData) {
        const tid = +item.attr('tid');
        const button = $('<button> Run Auto Segmentation </button>');

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
            button.text('Cancel Auto Segmentation');
            button.addClass('tfAnnotationProcess');
            checkProcess(tid, button);
        }
    }

    const elements = $('.dashboardItem');
    const tids = Array.from(elements, el => +el.getAttribute('tid'));

    $.ajax({
        type: 'POST',
        url: '/tensorflow/segmentation/meta/get',
        data: JSON.stringify(tids),
        contentType: 'application/json; charset=utf-8',
    }).done((metaData) => {
        elements.each(function setupDashboardItemWrapper() {
            setupDashboardItem($(this), metaData);
        });
    }).fail((errorData) => {
        const message = `Can not get Auto Segmentation meta info. Code: ${errorData.status}. `
            + `Message: ${errorData.responseText || errorData.statusText}`;
        showMessage(message);
    });
});
