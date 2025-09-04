// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

/* eslint-disable security/detect-non-literal-regexp */

import {
    taskName, labelName, attrName,
    textDefaultValue,
    multiAttrParams, advancedConfigurationParams,
} from '../../support/const';
import { defaultTaskSpec } from '../../support/default-specs';

it('Prepare for testing', () => {
    cy.log('Seeding shared data');
    // FIXME: this should run once before every npx cypress run, not before every spec
    // still the only obvious solution is to run npx cypress run twice
    // double run can serve as a proof of concept and as a minimally feasible solution
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
    cy.visit('/tasks');
});
