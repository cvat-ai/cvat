// Copyright (C) 2021-2022 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

export const labelName = 'points cloud';
export const taskName = 'Canvas 3D functionality';
export const pcdPngZipArr = '../../cypress/e2e/canvas3d_functionality/assets/test_canvas3d.zip';
export const attrName = `Attr for ${labelName}`;
export const textDefaultValue = 'Some default value for type Text';
export const advancedConfigurationParams = false;
export const multiAttrParams = false;

it('Prepare to testing', () => {
    cy.visit('/');
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
