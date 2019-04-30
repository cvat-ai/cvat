/*
* Copyright (C) 2018 Intel Corporation
* SPDX-License-Identifier: MIT
*/

(() => {
    const ShareFileType = Object.freeze({
        DIR: 'DIR',
        REG: 'REG',
    });

    const TaskStatus = Object.freeze({
        ANNOTATION: 'annotation',
        VALIDATION: 'validation',
        COMPLETED: 'completed',
    });

    const TaskMode = Object.freeze({
        ANNOTATION: 'annotation',
        INTERPOLATION: 'interpolation',
    });

    const FramesLoadingPolicy = Object.freeze({
        LOAD_ALL: 'loadAll',
        LOAD_PART: 'loadPart',
    });

    module.exports = {
        ShareFileType,
        TaskStatus,
        TaskMode,
        FramesLoadingPolicy,
    };
})();
