// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

/* eslint-disable security/detect-non-literal-regexp */

import {
    taskName, labelName, attrName,
    textDefaultValue,
    multiAttrParams, advancedConfigurationParams,
} from './const';
import { defaultTaskSpec } from './default-specs';

before('Prepare for testing', () => {
    cy.visit('/auth/login');
    const attributes = [
        { name: attrName, values: textDefaultValue, type: 'Text' },
        { ...multiAttrParams },
    ];
    const { taskSpec, dataSpec, extras } = defaultTaskSpec({
        taskName,
        labelName,
        attributes,
        serverFiles: ['image_main_task.zip'],
        segmentSize: advancedConfigurationParams.segmentSize,

        // 👇 not sure about this, so help me god
        startFrame: advancedConfigurationParams.startFrame,
        stopFrame: advancedConfigurationParams.stopFrame,
        frameFilter: `step=${advancedConfigurationParams.frameStep}`,
    });
    cy.headlessLogin();
    cy.intercept('POST', '/api/tasks**').as('createTaskRequest');
    cy.headlessCreateTask(taskSpec, dataSpec, extras);
    cy.wait('@createTaskRequest');
    cy.visit('/tasks');
});
