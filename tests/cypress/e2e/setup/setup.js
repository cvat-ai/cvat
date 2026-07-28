// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    taskName, labelName, attrName,
    textDefaultValue,
    multiAttrParams, advancedConfigurationParams,
} from '../../support/const';
import { defaultTaskSpec } from '../../support/default-specs';

it('Prepare for testing', () => {
    cy.log('Seeding shared data');
    cy.visit('/auth/login');
    const attributes = [
        { name: attrName, values: textDefaultValue, type: 'text' },
        { ...multiAttrParams },
    ];
    const { taskSpec, dataSpec, extras } = defaultTaskSpec({
        taskName,
        labelName,
        attributes,
        serverFiles: ['image_main_task.zip'],
        segmentSize: advancedConfigurationParams.segmentSize,
        startFrame: advancedConfigurationParams.startFrame,
        stopFrame: advancedConfigurationParams.stopFrame,
        frameFilter: `step=${advancedConfigurationParams.frameStep}`,
    });
    cy.headlessLogin();
    cy.intercept('POST', '/api/tasks**').as('createTaskRequest');
    cy.headlessCreateTask(taskSpec, dataSpec, extras);
    cy.wait('@createTaskRequest');
});
