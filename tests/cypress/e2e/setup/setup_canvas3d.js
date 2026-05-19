// Copyright (C) CVAT.ai Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import {
    taskName,
    labelName,
    attrName,
    textDefaultValue,
    pcdPngZipArr,
    multiAttrParams,
    advancedConfigurationParams, // is false
} from '../../support/const_canvas3d';
import { defaultTaskSpec } from '../../support/default-specs';

it('Prepare for testing canvas3d', () => {
    const attributes = [
        { name: attrName, values: textDefaultValue, type: 'text' },
    ];
    if (multiAttrParams && typeof multiAttrParams === 'object') {
        attributes.push({ ...multiAttrParams });
    }
    const { taskSpec, dataSpec, extras } = defaultTaskSpec({
        taskName,
        labelName,
        attributes,
        serverFiles: [pcdPngZipArr],
        validationParams: advancedConfigurationParams,
    });
    cy.visit('/auth/login');
    cy.headlessLogin();
    cy.intercept('POST', '/api/tasks**').as('createTaskRequest');
    cy.headlessCreateTask(taskSpec, dataSpec, extras);
    cy.wait('@createTaskRequest');
});
