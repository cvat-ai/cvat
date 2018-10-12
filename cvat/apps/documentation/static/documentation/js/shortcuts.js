/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

Mousetrap.bind(window.cvat.config.shortkeys["open_help"].value, function() {
    window.open("/documentation/user_guide.html");

    return false;
});