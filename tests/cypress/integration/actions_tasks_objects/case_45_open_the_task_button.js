// Copyright (C) 2021 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Check go to task button.', () => {
    const caseId = '45';

    before(() => {
        cy.openTaskJob(taskName);
    });

    describe(`Testing case "${caseId}"`, () => {
        it('Open a menu. Press "Open the task".', () => {
            cy.interactMenu('Open the task');
        });

        it('CVAT navigate to the task page.', () => {
            cy.get('.cvat-task-details').should('exist');
            cy.get('.cvat-task-job-list').should('exist');
            cy.contains('.cvat-task-details-task-name', taskName).should('exist');
            cy.url().should('include', '/tasks/');
        });
    });
});
