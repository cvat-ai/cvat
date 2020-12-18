// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

/// <reference types="cypress" />

import { taskName } from '../../support/const';

context('Check if the image is scaled and then fitted', () => {
    const caseId = '35';

    describe(`Testing case "${caseId}"`, () => {
        it('Type to task search field full name task, part of the task name. The task should exist.', () => {
            cy.server().route('GET', '/api/v1/tasks**').as('searchTask');
            cy.get('.cvat-task-page-search-task').type(`${taskName.substring(0, 3)}{Enter}`);
            cy.wait('@searchTask').its('status').should('equal', 200);
            cy.contains('.cvat-item-task-name', taskName).should('exist');
        });

        it('Type to task search field any another text does not contain the name of the task. The task should not exist.', () => {
            cy.server().route('GET', '/api/v1/tasks**').as('searchTask');
            cy.get('.cvat-task-page-search-task').type('121212{Enter}');
            cy.wait('@searchTask').its('status').should('equal', 200);
            cy.contains('.cvat-item-task-name', taskName).should('not.exist');
        });
    });
});
