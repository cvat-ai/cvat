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
    newElements.each(function(idx) {
        let elem = $(newElements[idx]);
        let tid = +elem.attr('id').split('_')[1];

        $('<button> Git Repository Sync </button>').addClass('regular dashboardButtonUI')
            .on('click', () => {
                let gitDialogWindow = $(`#${window.cvat.git.reposWindowId}`);
                gitDialogWindow.attr('current_tid', tid);
                gitDialogWindow.removeClass('hidden');
                window.cvat.git.updateState();
            }).appendTo(elem.find('div.dashboardButtonsUI')[0]);
    });
});

window.cvat.git = {
    reposWindowId: 'gitReposWindow',
    closeReposWindowButtonId: 'closeGitReposButton',
    reposURLTextId: 'gitReposURLText',
    reposSyncButtonId: 'gitReposSyncButton',
    labelStatusId: 'gitReposLabelStatus',
    labelMessageId: 'gitReposLabelMessage',
    createURLInputTextId: 'gitCreateURLInputText',

    updateState: () => {
        let gitWindow = $(`#${window.cvat.git.reposWindowId}`);
        let gitLabelMessage = $(`#${window.cvat.git.labelMessageId}`);
        let gitLabelStatus = $(`#${window.cvat.git.labelStatusId}`);
        let reposURLText = $(`#${window.cvat.git.reposURLTextId}`);
        let syncButton = $(`#${window.cvat.git.reposSyncButtonId}`);

        reposURLText.prop('value', 'Getting an info..');
        gitLabelMessage.css('color', '#cccc00').text('Getting an info..');
        gitLabelStatus.css('color', '#cccc00').text('\u25cc');
        syncButton.attr("disabled", true);

        window.cvat.git.getGitURL((data) => {
            if (!data.url.value) {
                gitLabelMessage.css('color', 'black').text('Repository is not attached');
                reposURLText.attr('placeholder', 'Repository is not attached');
                return;
            }

            reposURLText.attr('placeholder', '');
            reposURLText.prop('value', data.url.value);

            if (!data.status.value) {
                gitLabelStatus.css('color', 'red').text('\u26a0');
                gitLabelMessage.css('color', 'red').text(data.status.error);
                return;
            }

            if (["empty", "!sync"].includes(data.status.value)) {
                gitLabelStatus.css('color', 'red').text('\u2606');
                gitLabelMessage.css('color', 'red').text('Repository is not synchronized');
                syncButton.attr("disabled", false);
            }
            else if (data.status.value == "sync") {
                gitLabelStatus.css('color', '#cccc00').text('\u2605');
                gitLabelMessage.css('color', 'black').text('Synchronized (merge required)');
            }
            else if (data.status.value == "merged") {
                gitLabelStatus.css('color', 'darkgreen').text('\u2605');
                gitLabelMessage.css('color', 'darkgreen').text('Synchronized');
            }
            else {
                let message = `Got unknown repository status: ${data.status.value}`;
                gitLabelStatus.css('color', 'red').text('\u26a0');
                gitLabelMessage.css('color', 'red').text(message);
                throw Error(message);
            }
        }, (data) => {
            gitWindow.addClass('hidden');
            let message = `Error was occured during get an repos URL. ` +
                `Code: ${data.status}, text: ${data.responseText || data.statusText}`;
            showMessage(message);
            throw Error(message);
        });
    },

    getGitURL: (success, error) => {
        let gitWindow = $(`#${window.cvat.git.reposWindowId}`);
        $.get(`/git/repository/get/${gitWindow.attr('current_tid')}`).done(
            success
        ).fail(error);
    },

    badSituation: (message) => {
        try {
            showMessage(message);
            throw Error(message);
        }
        finally {
            window.cvat.git.updateState();
        }
    }
};


document.addEventListener("DOMContentLoaded", () => {
    /* CREATE TASK PLUGIN PART */
    $(`
        <tr>
            <td> <label class="regular h2"> Git Repos: </label> </td>
            <td> <input type="text" id="${window.cvat.git.createURLInputTextId}" class="regular" style="width: 90%", placeholder="github.com/user/repos"/> </td>
        </tr>
    `).insertAfter($("#dashboardBugTrackerInput").parent().parent());

    let originalCreateTaskRequest = window.createTaskRequest;
    window.createTaskRequest = function(oData, onSuccessRequest, onSuccessCreate, onError, onComplete, onUpdateStatus) {
        let gitURL = $(`#${window.cvat.git.createURLInputTextId}`).prop('value').replace(/\s/g,'');
        if (gitURL.length) {
            let taskMessage = $('#dashboardCreateTaskMessage');
            taskMessage.css('color', 'green');
            taskMessage.text('Cloning a repository..');
            $.post({
                url: '/git/repository/create',
                data: JSON.stringify({
                    'url': gitURL,
                }),
                contentType: 'application/json;charset=utf-8',
            }).done((create_data) => {
                let checkInterval = setInterval(() => {
                    $.get(`/git/repository/check/${create_data.rq_id}`).done((data) => {
                        if (["finished", "failed", "unknown"].indexOf(data.status) != -1) {
                            clearInterval(checkInterval);
                            if (data.status == "failed" || data.status == "unknown") {
                                let message = `Check request for git repostory returned "${data.status}" status`;
                                onError(`Git error. ${message}`);
                                onComplete();
                                return;
                            }
                            oData.append('git_url', gitURL);
                            oData.append('repos_path', create_data['repos_path']);
                            originalCreateTaskRequest(oData, onSuccessRequest, onSuccessCreate, onError, onComplete, onUpdateStatus);
                        }
                    }).fail((data) => {
                        let message = `Check request for git repository failed. ` +
                            `Status: ${data.status}. Message: ${data.responseText || data.statusText}`;
                        onError(`Git error. ${message}`);
                        onComplete();
                        clearInterval(checkInterval);
                        return;
                    });
                }, 1000);
            }).fail((data) => {
                let message = `Error was occured during updating an repos entry. ` +
                    `Code: ${data.status}, text: ${data.responseText || data.statusText}`;
                onError(`Git error. ${message}`);
                onComplete();
                return;
            });
        }
        else {
            originalCreateTaskRequest(oData, onSuccessRequest, onSuccessCreate, onError, onComplete, onUpdateStatus);
        }
    };

    /* GIT MODAL WINDOW PLUGIN PART */
    $(`<div id="${window.cvat.git.reposWindowId}" class="modal hidden">
        <div style="width: 700px; height: 120px;" class="modal-content">
            <div style="width: 100%; height: 60%; overflow-y: auto;">
                <table style="width: 100%;">
                    <tr>
                        <td style="width: 20%;">
                            <label class="regular h2"> Repository URL: </label>
                        </td>
                        <td style="width: 80%;" colspan="2">
                            <input class="regular h2" type="text" style="width: 92%;" id="${window.cvat.git.reposURLTextId}" readonly/>
                        </td>
                    </td>
                    <tr>
                        <td style="width: 20%;">
                            <label class="regular h2"> Status: </label>
                        </td>
                        <td style="width: 60%;">
                            <div>
                                <label class="regular h2" id="${window.cvat.git.labelStatusId}"> </label>
                                <label class="regular h2" id="${window.cvat.git.labelMessageId}"> </label>
                            </div>
                        </td>
                        <td style="width: 20%;">
                            <button style="width: 70%;" id="${window.cvat.git.reposSyncButtonId}" class="regular h2"> Sync </button>
                        </td>
                    </tr>
                </table>
            </div>
            <center>
                <button id="${window.cvat.git.closeReposWindowButtonId}" class="regular h1" style="margin-top: 15px;"> Close </button>
            </center>
        </div>
    </div>`).appendTo('body');

    let gitWindow = $(`#${window.cvat.git.reposWindowId}`);
    let closeRepositoryWindowButton = $(`#${window.cvat.git.closeReposWindowButtonId}`);
    let repositorySyncButton = $(`#${window.cvat.git.reposSyncButtonId}`);
    let gitLabelMessage = $(`#${window.cvat.git.labelMessageId}`);
    let gitLabelStatus = $(`#${window.cvat.git.labelStatusId}`);

    closeRepositoryWindowButton.on('click', () => {
        gitWindow.addClass('hidden');
    });

    repositorySyncButton.on('click', () => {
        gitLabelMessage.css('color', '#cccc00').text('Pushing..');
        gitLabelStatus.css('color', '#cccc00').text('\u25cc');
        repositorySyncButton.attr("disabled", true);

        $.get(`/git/repository/push/${gitWindow.attr('current_tid')}`).done((data) => {
            let checkInterval = setInterval(() => {
                $.get(`/git/repository/check/${data.rq_id}`).done((data) => {
                    if (["finished", "failed", "unknown"].indexOf(data.status) != -1) {
                        clearInterval(checkInterval);
                        if (data.status == "failed" || data.status == "unknown") {
                            let message = `Pushing process returned "${data.status}" status`;
                            window.cvat.git.badSituation(message);
                        }
                        window.cvat.git.updateState();
                    }
                }).fail((data) => {
                    clearInterval(checkInterval);
                    let message = `Error was occured during pushing an repos entry. ` +
                    `Code: ${data.status}, text: ${data.responseText || data.statusText}`;
                    window.cvat.git.badSituation(message);
                });
            }, 1000);
        }).fail((data) => {
            let message = `Error was occured during pushing an repos entry. ` +
                `Code: ${data.status}, text: ${data.responseText || data.statusText}`;
                window.cvat.git.badSituation(message);
        });
    });
});
