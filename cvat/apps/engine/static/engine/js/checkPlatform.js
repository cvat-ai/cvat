/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* global
    platform:false
*/

// legacy syntax for IE support

var supportedPlatforms = ['Chrome', 'Firefox'];
if (supportedPlatforms.indexOf(platform.name) === -1) {
    try {
        document.documentElement.innerHTML = "<center><h1> Your browser is detected as " + platform.name +
        ". This tool does not support it. Please use the latest version of Google Chrome, Chromium or Firefox.</h1></center>";
        window.stop();
    } catch (err) {
        document.execCommand('Stop');
    }
}
