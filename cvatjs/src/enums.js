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

    const AttributeType = Object.freeze({
        CHECKBOX: 'checkbox',
        RADIOBUTTON: 'radio',
        SELECT: 'select',
        NUMBER: 'number',
        TEXT: 'text',
    });

    module.exports = {
        ShareFileType,
        TaskStatus,
        TaskMode,
        AttributeType,
    };
})();
