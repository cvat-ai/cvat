/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

// legacy syntax for IE support

var supportedPlatforms = ['Chrome'];
if (supportedPlatforms.indexOf(platform.name) == -1) {
    try {
        document.documentElement.innerHTML = "<center><h1> You browser detected as " + platform.name +
        ". This tool not supports it. Please use latest version of Google Chrome.</h1></center>";
        window.stop();
    }
    catch (err) {
        document.execCommand('Stop');
    }
}
