/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

Mousetrap.bind(window.cvat.config.shortkeys["open_analytics"].value, function() {
    window.open("/analytics/app/kibana");

    return false;
});