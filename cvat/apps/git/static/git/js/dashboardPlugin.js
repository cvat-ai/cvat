/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* global
    showMessage:false
    DashboardView:false
*/

// GIT ENTRYPOINT
window.addEventListener('dashboardReady', () => {
    const reposWindowId = 'gitReposWindow';
    const closeReposWindowButtonId = 'closeGitReposButton';
    const reposURLTextId = 'gitReposURLText';
    const reposSyncButtonId = 'gitReposSyncButton';
    const labelStatusId = 'gitReposLabelStatus';
    const labelMessageId = 'gitReposLabelMessage';
    const createURLInputTextId = 'gitCreateURLInputText';
    const lfsCheckboxId = 'gitLFSCheckbox';

    const reposWindowTemplate = `
        <div id="${reposWindowId}" class="modal">
            <div style="width: 700px; height: auto;" class="modal-content">
                <div style="width: 100%; height: 60%; overflow-y: auto;">
                    <table style="width: 100%;">
                        <tr>
                            <td style="width: 20%;">
                                <label class="regular h2"> Repository URL: </label>
                            </td>
                            <td style="width: 80%;" colspan="2">
                                <input class="regular h2" type="text" style="width: 92%;" id="${reposURLTextId}" readonly/>
                            </td>
                        </td>
                        <tr>
                            <td style="width: 20%;">
                                <label class="regular h2"> Status: </label>
                            </td>
                            <td style="width: 60%;">
                                <div>
                                    <label class="regular h2" id="${labelStatusId}"> </label>
                                    <label class="regular h2" id="${labelMessageId}" style="word-break: break-word; user-select: text;"> </label>
                                </div>
                            </td>
                            <td style="width: 20%;">
                                <button style="width: 70%;" id="${reposSyncButtonId}" class="regular h2"> Sync </button>
                            </td>
                        </tr>
                    </table>
                </div>
                <center>
                    <button id="${closeReposWindowButtonId}" class="regular h1" style="margin-top: 15px;"> Close </button>
                </center>
            </div>
        </div>`;

    $.get('/git/repository/meta/get').done((gitData) => {
        const dashboardItems = $('.dashboardItem');
        dashboardItems.each(function setupDashboardItem() {
            const tid = +this.getAttribute('tid');
            if (tid in gitData) {
                if (['sync', 'syncing'].includes(gitData[tid])) {
                    this.style.background = 'floralwhite';
                } else if (gitData[tid] === 'merged') {
                    this.style.background = 'azure';
                } else {
                    this.style.background = 'mistyrose';
                }

                $('<button> Git Repository Sync </button>').addClass('regular dashboardButtonUI').on('click', () => {
                    $(`#${reposWindowId}`).remove();
                    const gitWindow = $(reposWindowTemplate).appendTo('body');
                    const closeReposWindowButton = $(`#${closeReposWindowButtonId}`);
                    const reposSyncButton = $(`#${reposSyncButtonId}`);
                    const gitLabelMessage = $(`#${labelMessageId}`);
                    const gitLabelStatus = $(`#${labelStatusId}`);
                    const reposURLText = $(`#${reposURLTextId}`);

                    function updateState() {
                        reposURLText.attr('placeholder', 'Waiting for server response..');
                        reposURLText.prop('value', '');
                        gitLabelMessage.css('color', '#cccc00').text('Waiting for server response..');
                        gitLabelStatus.css('color', '#cccc00').text('\u25cc');
                        reposSyncButton.attr('disabled', true);

                        $.get(`/git/repository/get/${tid}`).done((data) => {
                            reposURLText.attr('placeholder', '');
                            reposURLText.prop('value', data.url.value);

                            if (!data.status.value) {
                                gitLabelStatus.css('color', 'red').text('\u26a0');
                                gitLabelMessage.css('color', 'red').text(data.status.error);
                                reposSyncButton.attr('disabled', false);
                                return;
                            }

                            if (data.status.value === '!sync') {
                                gitLabelStatus.css('color', 'red').text('\u2606');
                                gitLabelMessage.css('color', 'red').text('Repository is not synchronized');
                                reposSyncButton.attr('disabled', false);
                            } else if (data.status.value === 'sync') {
                                gitLabelStatus.css('color', '#cccc00').text('\u2605');
                                gitLabelMessage.css('color', 'black').text('Synchronized (merge required)');
                            } else if (data.status.value === 'merged') {
                                gitLabelStatus.css('color', 'darkgreen').text('\u2605');
                                gitLabelMessage.css('color', 'darkgreen').text('Synchronized');
                            } else if (data.status.value === 'syncing') {
                                gitLabelMessage.css('color', '#cccc00').text('Synchronization..');
                                gitLabelStatus.css('color', '#cccc00').text('\u25cc');
                            } else {
                                const message = `Got unknown repository status: ${data.status.value}`;
                                gitLabelStatus.css('color', 'red').text('\u26a0');
                                gitLabelMessage.css('color', 'red').text(message);
                            }
                        }).fail((data) => {
                            gitWindow.remove();
                            const message = 'Error occured during get an repos status. '
                                + `Code: ${data.status}, text: ${data.responseText || data.statusText}`;
                            showMessage(message);
                        });
                    }

                    closeReposWindowButton.on('click', () => {
                        gitWindow.remove();
                    });

                    reposSyncButton.on('click', () => {
                        function badResponse(message) {
                            try {
                                showMessage(message);
                                throw Error(message);
                            } finally {
                                gitWindow.remove();
                            }
                        }

                        gitLabelMessage.css('color', '#cccc00').text('Synchronization..');
                        gitLabelStatus.css('color', '#cccc00').text('\u25cc');
                        reposSyncButton.attr('disabled', true);

                        $.get(`/git/repository/push/${tid}`).done((rqData) => {
                            function checkCallback() {
                                $.get(`/git/repository/check/${rqData.rq_id}`).done((statusData) => {
                                    if (['queued', 'started'].includes(statusData.status)) {
                                        setTimeout(checkCallback, 1000);
                                    } else if (statusData.status === 'finished') {
                                        updateState();
                                    } else if (statusData.status === 'failed') {
                                        const message = `Can not push to remote repository. Message: ${statusData.stderr}`;
                                        badResponse(message);
                                    } else {
                                        const message = `Check returned status "${statusData.status}".`;
                                        badResponse(message);
                                    }
                                }).fail((errorData) => {
                                    const message = 'Errors occured during pushing an repos entry. '
                                        + `Code: ${errorData.status}, text: ${errorData.responseText || errorData.statusText}`;
                                    badResponse(message);
                                });
                            }

                            setTimeout(checkCallback, 1000);
                        }).fail((errorData) => {
                            const message = 'Errors occured during pushing an repos entry. '
                                + `Code: ${errorData.status}, text: ${errorData.responseText || errorData.statusText}`;
                            badResponse(message);
                        });
                    });

                    updateState();
                }).appendTo($(this).find('div.dashboardButtonsUI')[0]);
            }
        });
    }).fail((errorData) => {
        const message = `Can not get repository meta information. Code: ${errorData.status}. `
            + `Message: ${errorData.responseText || errorData.statusText}`;
        showMessage(message);
    });

    // Setup the "Create task" dialog
    const title = 'Field for a repository URL and a relative path inside the repository. \n'
        + 'Default repository path is `annotation/<dump_file_name>.zip`. \n'
        + 'There are .zip or .xml extenstions are supported.';
    const placeh = 'github.com/user/repos [annotation/<dump_file_name>.zip]';

    $(`
        <tr>
            <td> <label class="regular h2"> Dataset Repository: </label> </td>
            <td>
                <input type="text" id="${createURLInputTextId}" class="regular" style="width: 90%", placeholder="${placeh}" title="${title}"/>
            </td>
        </tr>
        <tr>
            <td> <label class="regular h2" checked> Use LFS: </label> </td>
            <td> <input type="checkbox" checked id="${lfsCheckboxId}" </td>
        </tr>`).insertAfter($('#dashboardBugTrackerInput').parent().parent());


    DashboardView.registerDecorator('createTask', (taskData, next, onFault) => {
        const taskMessage = $('#dashboardCreateTaskMessage');

        const path = $(`#${createURLInputTextId}`).prop('value').replace(/\s/g, '');
        const lfs = $(`#${lfsCheckboxId}`).prop('checked');

        if (path.length) {
            taskMessage.css('color', 'blue');
            taskMessage.text('Git repository is being cloned..');

            $.ajax({
                url: `/git/repository/create/${taskData.id}`,
                type: 'POST',
                data: JSON.stringify({
                    path,
                    lfs,
                    tid: taskData.id,
                }),
                contentType: 'application/json',
            }).done((rqData) => {
                function checkCallback() {
                    $.ajax({
                        url: `/git/repository/check/${rqData.rq_id}`,
                        type: 'GET',
                    }).done((statusData) => {
                        if (['queued', 'started'].includes(statusData.status)) {
                            setTimeout(checkCallback, 1000);
                        } else if (statusData.status === 'finished') {
                            taskMessage.css('color', 'blue');
                            taskMessage.text('Git repository has been cloned');
                            next();
                        } else if (statusData.status === 'failed') {
                            let message = 'Repository status check failed. ';
                            if (statusData.stderr) {
                                message += statusData.stderr;
                            }

                            taskMessage.css('color', 'red');
                            taskMessage.text(message);
                            onFault();
                        } else {
                            const message = `Repository status check returned the status "${statusData.status}"`;
                            taskMessage.css('color', 'red');
                            taskMessage.text(message);
                            onFault();
                        }
                    }).fail((errorData) => {
                        const message = `Can not sent a request to clone the repository. Code: ${errorData.status}. `
                            + `Message: ${errorData.responseText || errorData.statusText}`;
                        taskMessage.css('color', 'red');
                        taskMessage.text(message);
                        onFault();
                    });
                }

                setTimeout(checkCallback, 1000);
            }).fail((errorData) => {
                const message = `Can not sent a request to clone the repository. Code: ${errorData.status}. `
                    + `Message: ${errorData.responseText || errorData.statusText}`;
                taskMessage.css('color', 'red');
                taskMessage.text(message);
                onFault();
            });
        } else {
            next();
        }
    });
});
