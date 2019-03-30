/*
 * Copyright (C) 2018 Intel Corporation
 *
 * SPDX-License-Identifier: MIT
 */

/* global
    callAnnotationUI:false
    Logger:false
    platform:false
*/

String.prototype.normalize = function() {
    let target = this;
    target = target.charAt(0).toUpperCase() + target.substr(1);
    return target;
};

window.onload = function boot() {
    window.onerror = function exception(errorMsg, url, lineNumber, colNumber, error) {
        Logger.sendException({
            message: errorMsg,
            filename: url,
            line: lineNumber,
            column: colNumber ? String(colNumber) : '',
            stack: error && error.stack ? error.stack : '',
            client: `${platform.name} ${platform.version}`,
            system: platform.os.toString(),
        }).catch(() => {});
    };

    const id = window.location.href.match('id=[0-9]+')[0].slice(3);
    callAnnotationUI(id);
};
