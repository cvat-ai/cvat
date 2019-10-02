/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

window.addEventListener('DOMContentLoaded', () => {
    $('<button class="regular h1" style="margin-left: 5px;"> Analytics </button>').on('click', () => {
        window.open('/analytics/app/kibana');
    }).appendTo('#dashboardManageButtons');
});
