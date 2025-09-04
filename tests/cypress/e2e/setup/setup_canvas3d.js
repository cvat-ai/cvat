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
    advancedConfigurationParams,
} from '../../support/const_canvas3d';

it('Prepare to testing canvas3d', () => {
    // TODO: refactor to headless requests
    cy.visit('/auth/login');
    cy.login();
    cy.get('.cvat-tasks-page').should('exist');
    const listItems = [];
    cy.document().then((doc) => {
        const collection = Array.from(doc.querySelectorAll('.cvat-item-task-name'));
        for (let i = 0; i < collection.length; i++) {
            listItems.push(collection[i].innerText);
        }
        if (listItems.indexOf(taskName) === -1) {
            cy.task('log', "A task doesn't exist. Creating.");
            cy.createAnnotationTask(
                taskName,
                labelName,
                attrName,
                textDefaultValue,
                pcdPngZipArr,
                multiAttrParams,
                advancedConfigurationParams,
            );
        } else {
            cy.task('log', 'The task exist. Skipping creation.');
        }
    });
});
