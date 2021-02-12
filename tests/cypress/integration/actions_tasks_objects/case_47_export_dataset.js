// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName, labelName } from '../../support/const';

context('Export as a dataset.', () => {
    const caseId = '47';
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
        cy.saveJob();
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Go to Menu. Press "Export as a dataset" -> "CVAT for images".', () => {
            cy.server().route('GET', '/api/v1/tasks/**/dataset**').as('exportDataset');
            cy.interactMenu('Export as a dataset');
            cy.get('.cvat-menu-export-submenu-item').within(() => {
                cy.contains('CVAT for images').click();
            });
            cy.wait('@exportDataset', { timeout: 5000 }).its('status').should('equal', 202);
            cy.wait('@exportDataset').its('status').should('equal', 201);
        });
    });
});
