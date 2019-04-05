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


function dumpAnnotationRequest(dumpButton, taskID) {
    dumpButton = $(dumpButton);
    dumpButton.attr('disabled', true);

    $.ajax({
        url: '/api/v1/tasks/' + taskID + '/annotations/' + 'my_task_' + taskID,
        success: onDumpRequestSuccess,
        error: onDumpRequestError,
    });

    function onDumpRequestSuccess() {
        let requestInterval = 3000;
        let requestSended = false;

        let checkInterval = setInterval(function() {
            if (requestSended) return;
            requestSended = true;
            $.ajax({
                url: '/api/v1/tasks/' + taskID + '/annotations/' + 'my_task_' + taskID,
                success: onDumpCheckSuccess,
                error: onDumpCheckError,
                complete: () => requestSended = false,
            });
        }, requestInterval);

        function onDumpCheckSuccess(data) {
            // if (data.state === 'created') {
            //     clearInterval(checkInterval);
            //     getDumpedFile();
            // }
            // else if (data.state != 'started' ) {
            //     clearInterval(checkInterval);
            //     let message = 'Dump process completed with an error. ' + data.stderr;
            //     dumpButton.attr('disabled', false);
            //     showMessage(message);
            //     throw Error(message);
            // }

            // function getDumpedFile() {
            //     $.ajax({
            //         url: '/download/annotation/task/' + taskID,
            //         error: onGetDumpError,
            //         success: () => window.location = '/download/annotation/task/' + taskID,
            //         complete: () => dumpButton.attr('disabled', false)
            //     });

            //     function onGetDumpError(response) {
            //         let message = 'Get the dump request error: ' + response.responseText;
            //         showMessage(message);
            //         throw Error(message);
            //     }
            // }
        }

        function onDumpCheckError(response) {
            clearInterval(checkInterval);
            let message = 'Check the dump request error: ' + response.responseText;
            dumpButton.attr('disabled', false);
            showMessage(message);
            throw Error(message);
        }
    }

    function onDumpRequestError(response) {
        let message = "Dump request error: " + response.responseText;
        dumpButton.attr('disabled', false);
        showMessage(message);
        throw Error(message);
    }
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
    }
});


$(document).ready(() => {
    $('body').css({
        width: `${window.screen.width}px`,
        height: `${window.screen.height * 0.95}px`,
    });
});
