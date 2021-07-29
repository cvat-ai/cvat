// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Export task dataset.', () => {
    const caseId = '47';
    const exportFormat = 'CVAT for images';
    const rectangleShape2Points = {
        points: 'By 2 Points',
        type: 'Shape',
        labelName: labelName,
        firstX: 400,
        firstY: 100,
        secondX: 500,
        secondY: 200,
    };

    before(() => {
        cy.openTaskJob(taskName);
        cy.createRectangle(rectangleShape2Points);
        cy.saveJob('PATCH', 200, 'saveJobExportDataset');
    });

    describe(`Testing case "${caseId}"`, () => {
        it(`Go to Menu. Press "Export task dataset" with the "${exportFormat}" format.`, () => {
            cy.intercept('GET', '/api/v1/tasks/**/dataset**').as('exportDataset');
            cy.interactMenu('Export task dataset');
            cy.get('.cvat-modal-export-task').within(() => {
                cy.get('.cvat-modal-export-select').should('contain.text', exportFormat);
                cy.get('[type="checkbox"]').should('not.be.checked').check();
                cy.contains('button', 'OK').click();
            });
            cy.get('.cvat-notification-notice-export-task-start').should('exist');
            cy.closeNotification('.cvat-notification-notice-export-task-start');
            cy.wait('@exportDataset', { timeout: 5000 }).its('response.statusCode').should('equal', 202);
            cy.wait('@exportDataset').its('response.statusCode').should('equal', 201);
        });
    });
});
