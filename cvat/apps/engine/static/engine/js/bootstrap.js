"use strict";

String.prototype.normalize = function() {
    let target = this;
    target = target.charAt(0).toUpperCase() + target.substr(1);
    target = target.replace(/_/g, " ");
    return target;
};

String.prototype.toJSId = function() {
    let target = this;
    target = target.replace(/\W/g,'_');
    return target;
};

window.onload = function() {
    window.onerror = function(errorMsg, url, lineNumber, colNumber, error) {
        Logger.sendException({
            message: errorMsg,
            filename: url,
            line: lineNumber,
            column: colNumber ? colNumber : '',
            stack: error && error.stack ? error.stack : '',
            browser: platform.name + ' ' + platform.version,
            os: platform.os.toString(),
        }).catch(() => { return; });
    };

    let id = window.location.href.match('id=[0-9]+')[0].slice(3);
    callAnnotationUI(id);
};
