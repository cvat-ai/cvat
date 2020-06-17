/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* exported
    userConfirm
    dumpAnnotationRequest
    showMessage
    showOverlay
    uploadJobAnnotationRequest
    uploadTaskAnnotationRequest
    isDefaultFormat
*/

/* global
    Cookies:false
*/


Math.clamp = (x, min, max) => Math.min(Math.max(x, min), max);

String.customSplit = (string, separator) => {
    const regex = /"/gi;
    const occurences = [];
    let occurence = regex.exec(string);
    while (occurence) {
        occurences.push(occurence.index);
        occurence = regex.exec(string);
    }

    if (occurences.length % 2) {
        occurences.pop();
    }

    let copy = '';
    if (occurences.length) {
        let start = 0;
        for (let idx = 0; idx < occurences.length; idx += 2) {
            copy += string.substr(start, occurences[idx] - start);
            copy += string.substr(occurences[idx], occurences[idx + 1] - occurences[idx] + 1)
                .replace(new RegExp(separator, 'g'), '\0');
            start = occurences[idx + 1] + 1;
        }
        copy += string.substr(occurences[occurences.length - 1] + 1);
    } else {
        copy = string;
    }

    return copy.split(new RegExp(separator, 'g')).map(x => x.replace(/\0/g, separator));
};


function userConfirm(message, onagree, ondisagree) {
    const template = $('#confirmTemplate');
    const confirmWindow = $(template.html()).css('display', 'block');

    const annotationConfirmMessage = confirmWindow.find('.templateMessage');
    const agreeConfirm = confirmWindow.find('.templateAgreeButton');
    const disagreeConfirm = confirmWindow.find('.templateDisagreeButton');

    function hideConfirm() {
        agreeConfirm.off('click');
        disagreeConfirm.off('click');
        confirmWindow.remove();
    }

    annotationConfirmMessage.text(message);
    $('body').append(confirmWindow);

    agreeConfirm.on('click', () => {
        hideConfirm();
        if (onagree) {
            onagree();
        }
    });

    disagreeConfirm.on('click', () => {
        hideConfirm();
        if (ondisagree) {
            ondisagree();
        }
    });

    disagreeConfirm.focus();
    confirmWindow.on('keydown', (e) => {
        e.stopPropagation();
    });
}


function showMessage(message) {
    const template = $('#messageTemplate');
    const messageWindow = $(template.html()).css('display', 'block');

    const messageText = messageWindow.find('.templateMessage');
    const okButton = messageWindow.find('.templateOKButton');

    messageText.text(message);
    $('body').append(messageWindow);

    messageWindow.on('keydown', (e) => {
        e.stopPropagation();
    });

    okButton.on('click', () => {
        okButton.off('click');
        messageWindow.remove();
    });

    okButton.focus();
    return messageWindow;
}


function showOverlay(message) {
    const template = $('#overlayTemplate');
    const overlayWindow = $(template.html()).css('display', 'block');
    const overlayText = overlayWindow.find('.templateMessage');

    overlayWindow[0].getMessage = () => overlayText.html();
    overlayWindow[0].remove = () => overlayWindow.remove();
    overlayWindow[0].setMessage = (msg) => {
        overlayText.html(msg);
    };

    $('body').append(overlayWindow);
    overlayWindow[0].setMessage(message);
    return overlayWindow[0];
}

async function dumpAnnotationRequest(tid, format) {
    // URL Router on the server doesn't work correctly with slashes.
    // So, we have to replace them on the client side
    return new Promise((resolve, reject) => {
        const url = `/api/v1/tasks/${tid}/annotations`;
        let queryString = `format=${encodeURIComponent(format)}`;

        async function request() {
            $.get(`${url}?${queryString}`)
                .done((...args) => {
                    if (args[2].status === 202) {
                        setTimeout(request, 3000);
                    } else {
                        const a = document.createElement('a');
                        queryString = `${queryString}&action=download`;
                        a.href = `${url}?${queryString}`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        resolve();
                    }
                }).fail((errorData) => {
                    const message = `Can not dump annotations for the task. Code: ${errorData.status}. `
                        + `Message: ${errorData.responseText || errorData.statusText}`;
                    reject(new Error(message));
                });
        }

        setTimeout(request);
    });
}

async function uploadAnnoRequest(url, formData, format) {
    return new Promise((resolve, reject) => {
        const queryString = `format=${format}`;
        async function request(data) {
            try {
                await $.ajax({
                    url: `${url}?${queryString}`,
                    type: 'PUT',
                    data,
                    contentType: false,
                    processData: false,
                }).done((...args) => {
                    if (args[2].status === 202) {
                        setTimeout(() => request(''), 3000);
                    } else {
                        resolve();
                    }
                });
            } catch (errorData) {
                const message = `Can not upload annotations for the job. Code: ${errorData.status}. `
                    + `Message: ${errorData.responseText || errorData.statusText}`;
                reject(new Error(message));
            }
        }

        setTimeout(() => request(formData));
    });
}

async function uploadJobAnnotationRequest(jid, formData, format) {
    return uploadAnnoRequest(`/api/v1/jobs/${jid}/annotations`, formData, format);
}

async function uploadTaskAnnotationRequest(tid, formData, format) {
    return uploadAnnoRequest(`/api/v1/tasks/${tid}/annotations`, formData, format);
}

/* These HTTP methods do not require CSRF protection */
function csrfSafeMethod(method) {
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}


$.ajaxSetup({
    beforeSend(xhr, settings) {
        if (!csrfSafeMethod(settings.type) && !this.crossDomain) {
            xhr.setRequestHeader('X-CSRFToken', Cookies.get('csrftoken'));
        }
    },
});


$(document).ready(() => {
    $('body').css({
        width: `${window.screen.width}px`,
        height: `${window.screen.height * 0.95}px`,
    });
});

function isDefaultFormat(dumperName, taskMode) {
    return (dumperName === 'CVAT for video 1.1' && taskMode === 'interpolation')
    || (dumperName === 'CVAT for images 1.1' && taskMode === 'annotation');
}
