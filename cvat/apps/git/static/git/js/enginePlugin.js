/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    let gitReposWindowID = 'gitReposWindow';
    let closeReposWindowButtonId = 'closeGitReposButton';
    let gitRepositoryURLInputTextId = 'gitReposInputText';
    let gitRepositoryURLUpdateButtonId = 'gitReposUpdateButton';
    let gitRepositoryPushButtonId = 'gitReposPushButton';
    let gitLabelStatusId = 'gitReposLabelStatus';
    let gitLabelMessageId = 'gitReposLabelMessage';

    $(`<div id="${gitReposWindowID}" class="modal hidden">
            <div style="width: 700px; height: 120px;" class="modal-content">
                <div style="width: 100%; height: 60%; overflow-y: auto;">
                    <table style="width: 100%;">
                        <tr>
                            <td style="width: 20%;">
                                <label class="regular h2"> Repository URL: </label>
                            </td>
                            <td style="width: 60%;">
                                <input class="regular h2" type="text" style="width: 90%;" id="${gitRepositoryURLInputTextId}"/>
                            </td>
                            <td style="width: 15%;">
                                <button style="width: 70%;" id="${gitRepositoryURLUpdateButtonId}" class="regular h2"> Update </button>
                            </td>
                        </td>
                        <tr>
                            <td>
                                <label class="regular h2"> Status: </label>
                            </td>
                            <td>
                                <div>
                                    <label class="regular h2" id="${gitLabelStatusId}"> </label>
                                    <label class="regular h2" id="${gitLabelMessageId}"> </label>
                                </div>
                            </td>
                            <td>
                                <button style="width: 70%;" id="${gitRepositoryPushButtonId}" class="regular h2"> Push </button>
                            </td>
                        </tr>
                    </table>
                </div>
                <center>
                    <button id="${closeReposWindowButtonId}" class="regular h1" style="margin-top: 15px;"> Close </button>
                </center>
            </div>
        </div>
    `).appendTo('#taskAnnotationCenterPanel');

    let gitWindow = $(`#${gitReposWindowID}`);

    $(`<button class="menuButton semiBold h2"> Git Repository </button>`).on('click', () => {
        $('#annotationMenu').addClass('hidden');
        gitWindow.removeClass('hidden');
        updateRepositoryInfo();
    }).prependTo($('#engineMenuButtons'));

    /* Used unicode characters:
        updating: &#9202;
        pushed: &#10003;
        actual: &#9733;
        obsolete: &#9734;
        error: &#9888;
    */

    let closeRepositoryWindowButton = $(`#${closeReposWindowButtonId}`);
    let repositoryURLInput = $(`#${gitRepositoryURLInputTextId}`);
    let gitLabelMessage = $(`#${gitLabelMessageId}`);
    let gitLabelStatus = $(`#${gitLabelStatusId}`);
    let repositoryUpdateButton = $(`#${gitRepositoryURLUpdateButtonId}`);
    let repositoryPushButton = $(`#${gitRepositoryPushButtonId}`);

    repositoryURLInput.on('keyup keydown keypress', (e) => e.stopPropagation());

    closeRepositoryWindowButton.on('click', () => {
        gitWindow.addClass('hidden');
    });

    repositoryUpdateButton.on('click', () => {
        let gitURL = repositoryURLInput.prop('value').replace(/\s/g,'');
        if (!gitURL) {
            removeGitURL();
        }
        else {
            getGitURL((data) => {
                if (!data.url.value) {
                    createGitURL(gitURL);
                }
                else {
                    updateGitURL(gitURL);
                }
            }, () => {
                let message = `Get git URL errors. Code: ${data.status}, text: ${data.responseText || data.statusText}`;
                showMessage(message);
                throw Error(message);
            });
        }
    });

    repositoryPushButton.on('click', () => {
        // to do
    });

    function createGitURL(url) {
        $.ajax({
            url: '/git/repository/create',
            type: 'POST',
            data: JSON.stringify({
                'tid': window.cvat.task.id,
                'url': url,
            }),
            success: () => {
                updateRepositoryInfo();
            },
            error: (data) => {
                let message = `Can not update repository entry. Code: ${data.status}, text: ${data.responseText || data.statusText}`;
                showMessage(message);
                throw Error(message);
            }
        });
    }

    function updateGitURL(url) {
        $.ajax({
            url: '/git/repository/update',
            type: 'POST',
            data: JSON.stringify({
                'jid': window.cvat.job.id,
                'url': url,
            }),
            success: () => {
                updateRepositoryInfo();
            },
            error: (data) => {
                let message = `Can not update repository entry. Code: ${data.status}, text: ${data.responseText || data.statusText}`;
                showMessage(message);
                throw Error(message);
            }
        });
    }

    function removeGitURL() {
        $.ajax({
            url: '/git/repository/delete/' + window.cvat.job.id,
            type: 'DELETE',
            success: () => {
                updateRepositoryInfo();
            },
            error: (data) => {
                let message = `Can not delete repository entry. Code: ${data.status}, text: ${data.responseText || data.statusText}`;
                showMessage(message);
                throw Error(message);
            }
        });
    }

    function getGitURL(success, error) {
        $.ajax({
            url: '/git/repository/get/' + window.cvat.job.id,
            type: 'GET',
            success: success,
            error: error
        });
    }

    function updateRepositoryInfo() {
        gitLabelMessage.css('color', 'yellowgreen').text('Updating..');
        gitLabelStatus.css('color', 'yellowgreen').text('\u23F2');

        getGitURL((data) => {
            if (!data.url.value) {
                gitLabelMessage.css('color', 'black').text('Repository is not attached');
                repositoryURLInput.prop('value', 'Repository is not attached');
                return;
            }

            repositoryURLInput.prop('value', data.url.value);

            if (!data.status.value) {
                gitLabelStatus.css('color', 'red').text('\u26a0');
                gitLabelMessage.css('color', 'red').text(data.status.error);
                return;
            }

            if (data.status.value == "actual") {
                gitLabelStatus.css('color', 'darkgreen').text('\u2605');
                gitLabelMessage.css('color', 'darkgreen').text('Repository contains actual data');
            }
            else if (data.status.value == "obsolete") {
                gitLabelStatus.css('color', 'darkgreen').text('\u2606');
                gitLabelMessage.css('color', 'black').text('Repository contains obsolete data');
            }
            else {
                let message = `Got unknown repository status: ${data.status.value}`;
                gitLabelStatus.css('color', 'red').text('\u26a0');
                gitLabelMessage.css('color', 'red').text(message);
                throw Error(message);
            }
        }, (data) => {
            gitWindow.addClass('hidden');
            let message = `Get respository URL errors. Code: ${data.status}, text: ${data.responseText || data.statusText}`;
            showMessage(message);
            throw Error(message);
        });
    }
});
