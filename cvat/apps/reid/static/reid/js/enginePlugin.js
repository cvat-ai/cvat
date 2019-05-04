/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* global showMessage userConfirm */


document.addEventListener('DOMContentLoaded', () => {
    async function run(overlay, cancelButton, thresholdInput, distanceInput) {
        const collection = window.cvat.data.get();
        const data = {
            threshold: +thresholdInput.prop('value'),
            maxDistance: +distanceInput.prop('value'),
            boxes: collection.shapes.filter(el => el.type === 'rectangle'),
        };

        overlay.removeClass('hidden');
        cancelButton.prop('disabled', true);

        async function checkCallback() {
            let jobData = null;
            try {
                jobData = await $.get(`/reid/check/${window.cvat.job.id}`);
            } catch (errorData) {
                overlay.addClass('hidden');
                const message = `Can not check ReID merge. Code: ${errorData.status}. `
                    + `Message: ${errorData.responseText || errorData.statusText}`;
                showMessage(message);
            }

            if (jobData.progress) {
                cancelButton.text(`Cancel ReID Merge (${jobData.progress.toString().slice(0, 4)}%)`);
            }

            if (['queued', 'started'].includes(jobData.status)) {
                setTimeout(checkCallback, 1000);
            } else {
                overlay.addClass('hidden');

                if (jobData.status === 'finished') {
                    if (jobData.result) {
                        const result = JSON.parse(jobData.result);
                        collection.shapes = collection.shapes
                            .filter(el => el.type !== 'rectangle');
                        collection.tracks = collection.tracks
                            .concat(result);

                        window.cvat.data.clear();
                        window.cvat.data.set(collection);

                        showMessage('ReID merge has done.');
                    } else {
                        showMessage('ReID merge been canceled.');
                    }
                } else if (jobData.status === 'failed') {
                    const message = `ReID merge has fallen. Error: '${jobData.stderr}'`;
                    showMessage(message);
                } else {
                    let message = `Check request returned "${jobData.status}" status.`;
                    if (jobData.stderr) {
                        message += ` Error: ${jobData.stderr}`;
                    }
                    showMessage(message);
                }
            }
        }

        try {
            await $.ajax({
                url: `/reid/start/job/${window.cvat.job.id}`,
                type: 'POST',
                data: JSON.stringify(data),
                contentType: 'application/json',
            });

            setTimeout(checkCallback, 1000);
        } catch (errorData) {
            overlay.addClass('hidden');
            const message = `Can not start ReID merge. Code: ${errorData.status}. `
                + `Message: ${errorData.responseText || errorData.statusText}`;
            showMessage(message);
        } finally {
            cancelButton.prop('disabled', false);
        }
    }

    async function cancel(overlay, cancelButton) {
        cancelButton.prop('disabled', true);
        try {
            await $.get(`/reid/cancel/${window.cvat.job.id}`);
            overlay.addClass('hidden');
            cancelButton.text('Cancel ReID Merge (0%)');
        } catch (errorData) {
            const message = `Can not cancel ReID process. Code: ${errorData.status}. Message: ${errorData.responseText || errorData.statusText}`;
            showMessage(message);
        } finally {
            cancelButton.prop('disabled', false);
        }
    }

    const buttonsUI = $('#engineMenuButtons');
    const reidWindowId = 'reidSubmitWindow';
    const reidThresholdValueId = 'reidThresholdValue';
    const reidDistanceValueId = 'reidDistanceValue';
    const reidCancelMergeId = 'reidCancelMerge';
    const reidSubmitMergeId = 'reidSubmitMerge';
    const reidCancelButtonId = 'reidCancelReID';
    const reidOverlay = 'reidOverlay';

    $('<button> Run ReID Merge </button>').on('click', () => {
        $('#annotationMenu').addClass('hidden');
        $(`#${reidWindowId}`).removeClass('hidden');
    }).addClass('menuButton semiBold h2').prependTo(buttonsUI);

    $(`
        <div class="modal hidden" id="${reidWindowId}">
            <div class="modal-content" style="width: 300px; height: 170px;">
                <table>
                    <tr>
                        <td> <label class="regular h2"> Threshold: </label> </td>
                        <td> <input id="${reidThresholdValueId}" class="regular h1" type="number"`
                        + `title="Maximum cosine distance between embeddings of objects" min="0.05" max="0.95" value="0.5" step="0.05"> </td>
                    </tr>
                    <tr>
                        <td> <label class="regular h2"> Max Pixel Distance </label> </td>
                        <td> <input id="${reidDistanceValueId}" class="regular h1" type="number"`
                        + `title="Maximum radius that an object can diverge between neighbor frames" min="10" max="1000" value="50" step="10"> </td>
                    </tr>
                    <tr>
                        <td colspan="2"> <label class="regular h2" style="color: red;"> All boxes will be translated to box paths. Continue? </label> </td>
                    </tr>
                </table>
                <center style="margin-top: 10px;">
                    <button id="${reidCancelMergeId}" class="regular h2"> Cancel </button>
                    <button id="${reidSubmitMergeId}" class="regular h2"> Merge </button>
                </center>
            </div>
        </div>
    `).appendTo('body');

    $(`
        <div class="modal hidden force-modal" id="${reidOverlay}">
            <div class="modal-content" style="width: 300px; height: 70px;">
                <center> <label class="regular h2"> ReID is processing the data </label></center>
                <center style="margin-top: 5px;">
                    <button id="${reidCancelButtonId}" class="regular h2" style="width: 250px;"> Cancel ReID Merge (0%) </button>
                </center>
            </div>
        </div>
    `).appendTo('body');

    $(`#${reidCancelMergeId}`).on('click', () => {
        $(`#${reidWindowId}`).addClass('hidden');
    });

    $(`#${reidCancelButtonId}`).on('click', () => {
        userConfirm('ReID process will be canceld. Are you sure?', () => {
            cancel($(`#${reidOverlay}`), $(`#${reidCancelButtonId}`));
        });
    });

    $(`#${reidSubmitMergeId}`).on('click', () => {
        $(`#${reidWindowId}`).addClass('hidden');
        run($(`#${reidOverlay}`), $(`#${reidCancelButtonId}`),
            $(`#${reidThresholdValueId}`), $(`#${reidDistanceValueId}`))
            .catch((error) => {
                setTimeout(() => {
                    throw error;
                });
            });
    });
});
