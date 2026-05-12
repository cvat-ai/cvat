// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

// Audio-specific support file. Same set of commands as the default e2e.js
// minus `allure-cypress`. The audio specs render large React subtrees
// (LabelSelector inside the create-region popover, region attribute
// inspectors etc.) that occasionally exceed V8's string-length limit when
// allure-cypress tries to JSON.stringify the spec state, causing a
// `RangeError: Invalid string length` and failing otherwise-correct tests.
// We don't currently need allure reports for the audio suite, so the
// reporter is omitted here.

require('./commands');
require('./commands_projects');
require('./commands_review_pipeline');
require('./commands_canvas3d');
require('./commands_audio');
require('./commands_filters_feature');
require('./commands_models');
require('./commands_opencv');
require('./commands_organizations');
require('./commands_cloud_storages');
require('./commands_annotations_actions');
require('./commands_webhooks');
require('@cypress/code-coverage/support');
require('cypress-real-events/support');

// Chrome: ResizeObserver loop limit exceeded
// Firefox: ResizeObserver loop completed with undelivered notifications
const resizeObserverLoopErr = 'ResizeObserver loop';
Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes(resizeObserverLoopErr)) {
        return false;
    }
    return true;
});
