/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

"use strict";

window.addEventListener('DOMContentLoaded', () => {
    let button = $(`<button id="dashboardOpenTaskButton" class="menuButton semiBold h2"> Open Task </button>`);
    $('#engineMenuButtons').prepend(button);

    button.on('click', () => {
        let win = window.open(`${window.location.origin }/dashboard/?jid=${window.cvat.job.id}`, '_blank');
        win.focus();
    });
});

